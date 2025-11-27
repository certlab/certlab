/**
 * LEGACY SERVER AUTHENTICATION MODULE
 * 
 * ⚠️ IMPORTANT: This file is part of the legacy server-based architecture and is NOT used
 * in the current client-only version of CertLab. The application now runs entirely in the
 * browser using IndexedDB for storage and Web Crypto API for password hashing.
 * 
 * This code is preserved for potential future server-side deployment scenarios, such as:
 * - Multi-user environments requiring centralized data
 * - Enterprise deployments with PostgreSQL backend
 * - Syncing data across devices
 * 
 * For the current client-only implementation, see:
 * - client/src/lib/client-auth.ts (browser-based authentication)
 * - client/src/lib/client-storage.ts (IndexedDB storage)
 * 
 * SECURITY NOTES FOR SERVER MODE:
 * - Uses bcrypt for password hashing (industry standard)
 * - Salt rounds set to 12 (provides ~300ms hash time on modern hardware)
 * - Higher salt rounds increase security but also increase CPU usage during login/registration
 * - Consider rate limiting login attempts in production to prevent brute-force attacks
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { randomUUID } from "crypto";

/**
 * Bcrypt salt rounds configuration.
 * 
 * Security trade-offs:
 * - 10 rounds: ~100ms hash time (minimum recommended)
 * - 12 rounds: ~300ms hash time (recommended for most applications)
 * - 14 rounds: ~1.2s hash time (high-security applications)
 * 
 * 12 rounds provides a good balance between security and user experience.
 * Increase this value if brute-force attacks become a concern, but be aware
 * of the impact on server CPU and user login/registration times.
 */
const BCRYPT_SALT_ROUNDS = 12;

export function getSession() {
  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error("Environment variable DATABASE_URL is required");
  }
  if (!process.env.SESSION_SECRET) {
    throw new Error("Environment variable SESSION_SECRET is required");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000, // Convert milliseconds to seconds for connect-pg-simple
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, cb) => {
    cb(null, user.id);
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        const { passwordHash, ...sanitizedUser } = user;
        cb(null, sanitizedUser);
      } else {
        cb(null, undefined);
      }
    } catch (error) {
      cb(error);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        const { passwordHash, ...sanitizedUser } = user;
        return res.json({ user: sanitizedUser });
      });
    })(req, res, next);
  });

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      // Create user with a generated UUID
      const userId = randomUUID();
      const user = await storage.createUser({
        id: userId,
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        tenantId: 1, // Default tenant
        role: 'user', // Default role
      });

      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        const { passwordHash, ...sanitizedUser } = user;
        return res.status(201).json({ user: sanitizedUser });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
