import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure cookies in production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}



export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let config;
  try {
    config = await getOidcConfig();
  } catch (error) {
    console.error("Failed to initialize OIDC config:", error);
    throw error;
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  console.log("Setting up auth for domains:", domains);
  
  for (const domain of domains) {
    console.log(`Registering strategy for domain: ${domain}`);
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }
  
  console.log("Registered strategies:", Object.keys((passport as any)._strategies || {}));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname;
    console.log(`Login attempt for hostname: ${hostname}`);
    console.log(`Available strategies:`, (passport as any)._strategies ? Object.keys((passport as any)._strategies) : 'None');
    
    // Map localhost to the Replit domain for development
    let authDomain = hostname;
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
      authDomain = domains[0]; // Use the first Replit domain
      console.log(`Mapping localhost to Replit domain: ${authDomain}`);
    }
    
    passport.authenticate(`replitauth:${authDomain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname;
    
    // Map localhost to the Replit domain for development
    let authDomain = hostname;
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
      authDomain = domains[0]; // Use the first Replit domain
    }
    
    passport.authenticate(`replitauth:${authDomain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Auto-authenticate test user in development environment
  if (process.env.NODE_ENV === 'development') {
    const testUserId = '999999'; // Use numeric string ID for compatibility
    
    // Ensure test user exists in database with proper subscription data
    let testUser = await storage.getUser(testUserId);
    if (!testUser) {
      try {
        await storage.upsertUser({
          id: testUserId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          profileImageUrl: null,
        });
        testUser = await storage.getUser(testUserId);
        
        // Set test user subscription data for development
        // This ensures the test user has actual subscription data in the database
        await storage.updateUser(testUserId, {
          subscriptionBenefits: {
            plan: 'pro', // Give test user pro plan for demo
            quizzesPerDay: -1, // Unlimited for testing
            categoriesAccess: ['all'],
            analyticsAccess: 'advanced',
            lastSyncedAt: new Date().toISOString(),
          },
        });
        
        console.log('Development: Created test user with Pro subscription for automatic authentication');
      } catch (error) {
        console.error('Failed to create test user:', error);
      }
    } 
    
    // ALWAYS update the test user's subscription to Pro in development
    // This ensures consistent pro benefits for testing
    if (testUser) {
      const currentBenefits = testUser.subscriptionBenefits as any;
      
      // Always update to ensure test user has pro benefits
      // This prevents any Polar sync or other process from overwriting them
      if (!currentBenefits || 
          currentBenefits.plan !== 'pro' || 
          currentBenefits.quizzesPerDay !== -1 ||
          currentBenefits.analyticsAccess !== 'advanced') {
        
        await storage.updateUser(testUserId, {
          subscriptionBenefits: {
            plan: 'pro', // Give test user pro plan for demo
            quizzesPerDay: -1, // Unlimited for testing
            categoriesAccess: ['all'],
            analyticsAccess: 'advanced',
            lastSyncedAt: new Date().toISOString(),
          },
        });
        console.log('Development: Updated test user with Pro subscription benefits');
      }
    }

    // Mock user session for development
    if (testUser) {
      (req as any).user = {
        claims: {
          sub: testUserId,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        },
        access_token: 'dev-mock-token',
        refresh_token: 'dev-mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      
      // Mock isAuthenticated function
      (req as any).isAuthenticated = () => true;
      
      console.log('Development: Auto-authenticated test user');
      return next();
    }
  }

  // Production authentication logic
  // Check if user is authenticated via passport
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;

  // Check if token has expired
  if (user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
      } catch (error) {
        console.error("Token refresh failed:", error);
        return res.status(401).json({ message: "Unauthorized" });
      }
    }
  }

  return next();
};