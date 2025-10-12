import SubscriptionPlans from "@/components/SubscriptionPlans";

export default function SubscriptionPlansPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* Plans Component */}
        <SubscriptionPlans />
      </div>
    </div>
  );
}