import Header from "@/components/Header";
import ContrastAnalyzer from "@/components/ContrastAnalyzer";

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Accessibility Tools</h1>
            <p className="text-muted-foreground mt-2">
              Analyze and improve the accessibility of your chosen theme.
            </p>
          </div>
          
          <ContrastAnalyzer />
        </div>
      </main>
    </div>
  );
}