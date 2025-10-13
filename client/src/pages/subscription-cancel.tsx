import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function SubscriptionCancel() {
  return (
    <div className="container max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="cancel-title">
            <XCircle className="h-6 w-6 text-orange-600" />
            Subscription Cancelled
          </CardTitle>
          <CardDescription>
            Your checkout was cancelled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              No charges were made to your payment method. You can return to the plans page 
              to select a different plan or continue with the free tier.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What You Can Do:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Continue using the free plan (5 quizzes per day)</li>
              <li>• Browse available certification categories</li>
              <li>• Try a quiz to see the platform in action</li>
              <li>• Upgrade to Pro anytime for unlimited access</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <Link href="/app/subscription-plans">
              <Button size="lg" data-testid="view-plans-button">
                <ArrowLeft className="h-4 w-4 mr-2" />
                View Plans Again
              </Button>
            </Link>
            <Link href="/app">
              <Button variant="outline" size="lg" data-testid="dashboard-button">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}