import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-provider';
import {
  importPersonalFromFile,
  type ImportProgress,
  type ImportResult,
} from '@/lib/import-personal-questions';

interface ImportState {
  isImporting: boolean;
  progress: ImportProgress | null;
  result: ImportResult | null;
}

export default function PersonalImportPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [importState, setImportState] = useState<ImportState>({
    isImporting: false,
    progress: null,
    result: null,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to import questions.',
        variant: 'destructive',
      });
      return;
    }

    setImportState({ isImporting: true, progress: null, result: null });

    try {
      const result = await importPersonalFromFile(file, user.id, (progress) => {
        setImportState((prev) => ({ ...prev, progress }));
      });

      setImportState({ isImporting: false, progress: null, result });

      if (result.success) {
        toast({
          title: 'Import Successful!',
          description: `Imported ${result.questionsImported} questions to your personal question bank from ${file.name}`,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: result.errors[0] || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setImportState({
        isImporting: false,
        progress: null,
        result: {
          success: false,
          categoriesCreated: 0,
          subcategoriesCreated: 0,
          questionsImported: 0,
          questionsSkipped: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        },
      });

      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }

    // Reset file input
    event.target.value = '';
  };

  const progressPercentage =
    importState.progress &&
    importState.progress.total > 0 &&
    importState.progress.current !== undefined
      ? (importState.progress.current / importState.progress.total) * 100
      : 0;

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Import Personal Questions</h1>
        <p className="text-muted-foreground">
          Import questions into your personal question bank using YAML files
        </p>
      </div>

      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertTitle>About Personal Question Bank</AlertTitle>
        <AlertDescription>
          Questions imported here are <strong>private to you</strong> and won't be visible to other
          users or added to the shared question bank. Use this feature to create custom practice
          questions or import questions from external sources.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload YAML File
          </CardTitle>
          <CardDescription>
            Import questions from your own YAML file. The file must follow the required format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {importState.isImporting && importState.progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{importState.progress.status}</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {importState.result && (
            <Alert variant={importState.result.success ? 'default' : 'destructive'}>
              {importState.result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importState.result.success ? 'Import Successful' : 'Import Failed'}
              </AlertTitle>
              <AlertDescription>
                {importState.result.success ? (
                  <div className="space-y-1 mt-2">
                    <div>✓ {importState.result.questionsImported} questions imported</div>
                    {importState.result.categoriesCreated > 0 && (
                      <div>✓ {importState.result.categoriesCreated} categories created</div>
                    )}
                    {importState.result.subcategoriesCreated > 0 && (
                      <div>✓ {importState.result.subcategoriesCreated} subcategories created</div>
                    )}
                    {importState.result.questionsSkipped > 0 && (
                      <div className="text-yellow-600 dark:text-yellow-400">
                        ⚠ {importState.result.questionsSkipped} questions skipped due to validation
                        errors
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    {importState.result.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm">
                        • {error}
                      </div>
                    ))}
                    {importState.result.errors.length > 10 && (
                      <div className="text-sm mt-1 font-medium">
                        ... and {importState.result.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={importState.isImporting}
            >
              {importState.isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Choose YAML File
                </>
              )}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>YAML Format Example</AlertTitle>
            <AlertDescription>
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto">
                {`category: CustomCategory
description: My personal practice questions
questions:
  - text: "What is the capital of France?"
    options:
      - id: 0
        text: "London"
      - id: 1
        text: "Paris"
      - id: 2
        text: "Berlin"
    correctAnswer: 1
    explanation: "Paris is the capital of France"
    difficultyLevel: 1
    tags: ["geography", "easy"]
    subcategory: "European Capitals"
  
  - text: "What is 2 + 2?"
    options:
      - id: 0
        text: "3"
      - id: 1
        text: "4"
      - id: 2
        text: "5"
    correctAnswer: 1
    explanation: "Basic arithmetic"
    difficultyLevel: 1
    tags: ["math"]
    subcategory: "Arithmetic"`}
              </pre>
              <div className="mt-3 space-y-2 text-sm">
                <p className="font-medium">Required fields:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">category</code> - The
                    certification or topic name
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">questions</code> - Array
                    of question objects
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">text</code> - The
                    question text
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">options</code> - 2-10
                    answer options with id and text
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">correctAnswer</code> -
                    The ID of the correct option
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">difficultyLevel</code> -
                    1 (Easy) to 5 (Expert)
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">subcategory</code> - The
                    topic or domain name
                  </li>
                </ul>
                <p className="font-medium mt-3">Optional fields:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">description</code> -
                    Brief description of the question set
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">explanation</code> -
                    Explanation of the correct answer
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">tags</code> - Array of
                    tag strings for categorization
                  </li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Import Tips</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-2">
            <li>Questions are validated before import - invalid questions will be skipped</li>
            <li>Option IDs must be sequential starting from 0 (e.g., 0, 1, 2, 3)</li>
            <li>The correctAnswer must match one of the option IDs</li>
            <li>Categories and subcategories are created automatically if they don't exist</li>
            <li>
              Duplicate questions are not automatically detected - you may import the same question
              multiple times
            </li>
            <li>
              All imported questions are private to you and stored in your personal question bank
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
