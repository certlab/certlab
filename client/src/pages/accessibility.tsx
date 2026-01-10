import ContrastAnalyzer from '@/components/ContrastAnalyzer';

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-background">
      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        aria-labelledby="accessibility-title"
      >
        <div className="space-y-6">
          <header>
            <h1 id="accessibility-title" className="text-3xl font-bold text-foreground">
              Accessibility Tools
            </h1>
            <p className="text-muted-foreground mt-2">
              Analyze and improve the accessibility of your chosen theme.
            </p>
          </header>

          <ContrastAnalyzer />

          <section aria-labelledby="accessibility-info-title">
            <h2
              id="accessibility-info-title"
              className="text-2xl font-semibold text-foreground mb-4"
            >
              About Accessibility
            </h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <p className="text-sm text-foreground">
                CertLab is committed to providing an accessible learning experience for all users.
              </p>
              <p className="text-sm text-muted-foreground">
                We follow WCAG 2.2 Level AA standards to ensure our platform is usable by people
                with various disabilities, including those who use screen readers, keyboard
                navigation, or require high contrast displays.
              </p>
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Key Accessibility Features:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Keyboard navigation support throughout the application</li>
                  <li>Skip to main content link for efficient navigation</li>
                  <li>ARIA labels and landmarks for screen readers</li>
                  <li>High contrast theme options for better visibility</li>
                  <li>Semantic HTML structure with proper heading hierarchy</li>
                  <li>Focus indicators on all interactive elements</li>
                </ul>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  For more information, see our{' '}
                  <a
                    href="https://github.com/archubbuck/certlab/blob/main/ACCESSIBILITY.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  >
                    full accessibility statement
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
