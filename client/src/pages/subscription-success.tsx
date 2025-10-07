import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Link, useSearch } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface ConfirmationResponse {
  success: boolean;
  plan?: string;
  billingInterval?: string;
  message?: string;
}

export default function SubscriptionSuccess() {
  const searchParams = useSearch();
  const sessionId = new URLSearchParams(searchParams).get("session_id");
  const [processing, setProcessing] = useState(true);

  const { data, error, isLoading } = useQuery<ConfirmationResponse>({
    queryKey: ["/api/subscription/confirm", sessionId],
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (data || error) {
      setProcessing(false);
      // Invalidate subscription status to refresh it
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  }, [data, error]);

  if (!sessionId) {
    return (
      <div className="container max-w-2xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Invalid Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              No checkout session found. Please try subscribing again.
            </p>
            <Link href="/subscription/plans">
              <Button>View Plans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Subscription Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                There was an issue processing your subscription. Your payment may still have been processed.
                Please check your email or contact support.
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
              <Link href="/subscription/manage">
                <Button variant="outline">Check Subscription Status</Button>
              </Link>
            </div>
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

          {data?.plan && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Your Plan</p>
              <p className="text-2xl font-bold capitalize">{data.plan}</p>
              {data.billingInterval && (
                <p className="text-sm text-muted-foreground">
                  Billed {data.billingInterval}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Link href="/dashboard">
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