import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, AlertCircle, RefreshCw, Mail, HelpCircle } from "lucide-react";
import { Link, useSearch } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConfirmationResponse {
  success: boolean;
  plan?: string;
  billingInterval?: string;
  message?: string;
  error?: string;
}

export default function SubscriptionSuccess() {
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const sessionId = params.get("session_id");
  const [processing, setProcessing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // If session_id is present, use it. Otherwise, use fallback endpoint
  const confirmEndpoint = sessionId 
    ? `/api/subscription/confirm?session_id=${sessionId}`
    : `/api/subscription/confirm-pending`;

  const { data, error, isLoading, refetch, failureCount } = useQuery<ConfirmationResponse>({
    queryKey: [confirmEndpoint],
    enabled: true, // Always enabled, will try fallback if no session_id
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle errors with useEffect instead of deprecated onError
  useEffect(() => {
    if (error && failureCount > 0) {
      setRetryCount(failureCount);
      // Show toast for retries
      if (failureCount < 3) {
        toast({
          title: "Verifying subscription...",
          description: `Please wait, we're confirming your payment (attempt ${failureCount}/3)`,
        });
      }
    }
  }, [error, failureCount, toast]);

  useEffect(() => {
    if (data || (error && retryCount >= 3)) {
      setProcessing(false);
      // Invalidate subscription status and user queries to refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [data, error, retryCount]);

  // Show loading while trying to confirm (either with session_id or fallback)
  // Removed the "Session Not Found" early return - we'll try fallback confirmation first

  if (isLoading || processing) {
    return (
      <div className="container max-w-2xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing Your Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please wait while we confirm your subscription...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if confirmation failed (either network error or success:false response)
  const confirmationFailed = error || (data && !data.success);
  
  if (confirmationFailed) {
    // Determine error type for better messaging
    const errorMessage = data?.message || data?.error || (error as any)?.message || "";
    const isNetworkError = errorMessage.includes("network") || errorMessage.includes("fetch");
    const isVerificationError = errorMessage.includes("verify") || errorMessage.includes("confirm");
    const isTimeoutError = errorMessage.includes("timeout");
    const isPendingCheckoutNotFound = errorMessage.includes("pending checkout") || errorMessage.includes("No pending");
    
    return (
      <div className="container max-w-2xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Unable to Confirm Subscription
            </CardTitle>
            <CardDescription>
              We encountered an issue while verifying your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isNetworkError 
                  ? "Connection Issue" 
                  : isTimeoutError 
                  ? "Verification Timeout"
                  : isPendingCheckoutNotFound
                  ? "No Pending Checkout Found"
                  : "Verification Failed"}
              </AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>
                  {isNetworkError
                    ? "We couldn't connect to our servers. Please check your internet connection and try again."
                    : isTimeoutError
                    ? "The verification process took too long. Your payment may still have been processed."
                    : isPendingCheckoutNotFound
                    ? "We couldn't find a pending checkout for your account. This might mean your subscription is already active, or the checkout session expired."
                    : errorMessage || "We couldn't verify your subscription status. Your payment may still have been processed."}
                </p>
                <p className="text-sm font-medium mt-2">
                  {isPendingCheckoutNotFound 
                    ? "Check your subscription status below to see if you're already subscribed."
                    : "Don't worry - if your payment went through, you'll receive an email confirmation shortly."}
                </p>
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Next Steps
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>Check your email for a payment confirmation from Polar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>Wait a few minutes and check your subscription status</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>If issues persist, contact support with your session ID: <code className="bg-muted px-1 rounded">{sessionId}</code></span>
                </li>
              </ol>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                onClick={() => refetch()}
                className="w-full sm:w-auto"
                data-testid="retry-verification-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Link href="/app/subscription/manage">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  data-testid="check-status-button"
                >
                  Check Subscription Status
                </Button>
              </Link>
              <Link href="/app">
                <Button 
                  variant="ghost" 
                  className="w-full sm:w-auto"
                  data-testid="dashboard-button-error"
                >
                  Go to Dashboard
                </Button>
              </Link>
            </div>
            
            {/* Support Contact */}
            <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                Need help? Contact our support team at{" "}
                <a 
                  href="mailto:support@certlab.ai?subject=Subscription Confirmation Issue" 
                  className="font-medium underline text-blue-600 hover:text-blue-700"
                >
                  support@certlab.ai
                </a>{" "}
                with your session ID for immediate assistance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="success-title">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Subscription Successful!
          </CardTitle>
          <CardDescription>
            Welcome to your new plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What's Next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Your subscription is now active</li>
              <li>• You have full access to all plan features</li>
              <li>• Daily quiz limits have been updated</li>
              <li>• Check your email for confirmation and receipt</li>
            </ul>
          </div>

          {data && data.plan && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Your Plan</p>
              <p className="text-2xl font-bold capitalize">{data.plan}</p>
              {data.billingInterval && (
                <p className="text-sm text-muted-foreground">
                  Billed {data.billingInterval === 'month' ? 'monthly' : data.billingInterval === 'year' ? 'yearly' : data.billingInterval}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Link href="/app">
              <Button size="lg" data-testid="dashboard-button">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/app">
              <Button variant="outline" size="lg" data-testid="start-learning-button">
                Start Learning
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}