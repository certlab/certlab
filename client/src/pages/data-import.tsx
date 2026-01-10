import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-provider';
import {
  importFromBundledYAML,
  importFromFile,
  clearCategoryQuestions,
  type ImportProgress,
  type ImportResult,
} from '@/lib/import-questions';

interface CategoryImportState {
  isImporting: boolean;
  progress: ImportProgress | null;
  result: ImportResult | null;
}

export default function DataImportPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = Boolean(user?.role === 'admin');

  const [cisspState, setCisspState] = useState<CategoryImportState>({
    isImporting: false,
    progress: null,
    result: null,
  });
  const [cismState, setCismState] = useState<CategoryImportState>({
    isImporting: false,
    progress: null,
    result: null,
  });
  const [fileImportState, setFileImportState] = useState<CategoryImportState>({
    isImporting: false,
    progress: null,
    result: null,
  });
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [categoryToClear, setCategoryToClear] = useState<string>('');

  const handleImportCategory = async (category: 'CISSP' | 'CISM') => {
    const setState = category === 'CISSP' ? setCisspState : setCismState;

    setState({ isImporting: true, progress: null, result: null });

    try {
      const result = await importFromBundledYAML(category, (progress) => {
        setState((prev) => ({ ...prev, progress }));
      });

      setState({ isImporting: false, progress: null, result });

      if (result.success) {
        toast({
          title: 'Import Successful!',
          description: `Imported ${result.questionsImported} questions for ${category}`,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: result.errors[0] || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setState({
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
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileImportState({ isImporting: true, progress: null, result: null });

    try {
      const result = await importFromFile(file, (progress) => {
        setFileImportState((prev) => ({ ...prev, progress }));
      });

      setFileImportState({ isImporting: false, progress: null, result });

      if (result.success) {
        toast({
          title: 'Import Successful!',
          description: `Imported ${result.questionsImported} questions from ${file.name}`,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: result.errors[0] || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setFileImportState({
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

  const handleClearCategory = async () => {
    try {
      const deleted = await clearCategoryQuestions(categoryToClear);
      toast({
        title: 'Questions Cleared',
        description: `Deleted ${deleted} questions from ${categoryToClear}`,
      });
    } catch (error) {
      toast({
        title: 'Clear Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setClearDialogOpen(false);
      setCategoryToClear('');
    }
  };

  const openClearDialog = (categoryName: string) => {
    setCategoryToClear(categoryName);
    setClearDialogOpen(true);
  };

  const renderImportCard = (
    title: string,
    description: string,
    category: 'CISSP' | 'CISM',
    state: CategoryImportState
  ) => {
    const progressPercentage =
      state.progress && state.progress.total > 0 && state.progress.current !== undefined
        ? (state.progress.current / state.progress.total) * 100
        : 0;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                {title}
              </CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
            <Badge variant="outline" className="ml-2">
              500 Questions
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.isImporting && state.progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{state.progress.status}</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {state.result && (
            <Alert variant={state.result.success ? 'default' : 'destructive'}>
              {state.result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {state.result.success ? 'Import Successful' : 'Import Failed'}
              </AlertTitle>
              <AlertDescription>
                {state.result.success ? (
                  <div className="space-y-1 mt-2">
                    <div>✓ {state.result.questionsImported} questions imported</div>
                    {state.result.categoriesCreated > 0 && (
                      <div>✓ {state.result.categoriesCreated} categories created</div>
                    )}
                    {state.result.subcategoriesCreated > 0 && (
                      <div>✓ {state.result.subcategoriesCreated} subcategories created</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2">
                    {state.result.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => handleImportCategory(category)}
              disabled={state.isImporting}
              className="flex-1"
            >
              {state.isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import Sample Data
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => openClearDialog(category)}
              disabled={state.isImporting}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
        <p className="text-muted-foreground">
          Import sample certification questions or upload your own YAML data files
        </p>
      </div>

      {!isAdmin && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Admin Access Required</AlertTitle>
          <AlertDescription>
            Data import is restricted to administrators only. This is because imported questions are
            added to the shared question bank that all users access. If you need to import sample
            data, please contact your system administrator.
            <br />
            <br />
            <strong>For Administrators:</strong> To enable admin access, update your user role to
            'admin' in the Firestore database under <code>/users/{'{userId}'}</code>.
          </AlertDescription>
        </Alert>
      )}

      {isAdmin && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>About Sample Data</AlertTitle>
          <AlertDescription>
            Each sample dataset contains 500 practice questions across multiple domains. Importing
            will add questions to the shared question bank accessible by all users. If questions
            already exist, use the "Clear" button first to remove old data before re-importing.
          </AlertDescription>
        </Alert>
      )}

      {isAdmin && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {renderImportCard(
              'CISSP Questions',
              'Certified Information Systems Security Professional',
              'CISSP',
              cisspState
            )}

            {renderImportCard(
              'CISM Questions',
              'Certified Information Security Manager',
              'CISM',
              cismState
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Custom YAML File
              </CardTitle>
              <CardDescription>
                Import questions from your own YAML file. The file must follow the required format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fileImportState.isImporting && fileImportState.progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{fileImportState.progress.status}</span>
                    <span className="font-medium">
                      {Math.round(
                        (fileImportState.progress.current / fileImportState.progress.total) * 100
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (fileImportState.progress.current / fileImportState.progress.total) * 100
                    }
                    className="h-2"
                  />
                </div>
              )}

              {fileImportState.result && (
                <Alert variant={fileImportState.result.success ? 'default' : 'destructive'}>
                  {fileImportState.result.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {fileImportState.result.success ? 'Import Successful' : 'Import Failed'}
                  </AlertTitle>
                  <AlertDescription>
                    {fileImportState.result.success ? (
                      <div className="space-y-1 mt-2">
                        <div>✓ {fileImportState.result.questionsImported} questions imported</div>
                        {fileImportState.result.categoriesCreated > 0 && (
                          <div>✓ {fileImportState.result.categoriesCreated} categories created</div>
                        )}
                        {fileImportState.result.subcategoriesCreated > 0 && (
                          <div>
                            ✓ {fileImportState.result.subcategoriesCreated} subcategories created
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        {fileImportState.result.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
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
                  disabled={fileImportState.isImporting}
                >
                  {fileImportState.isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
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
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                    {`category: CISSP
description: Sample questions
questions:
  - text: "Question text?"
    options:
      - id: 0
        text: "Option A"
      - id: 1
        text: "Option B"
    correctAnswer: 1
    explanation: "Why this is correct"
    difficultyLevel: 1
    tags: ["tag1", "tag2"]
    subcategory: "Domain Name"`}
                  </pre>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear {categoryToClear} Questions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {categoryToClear} questions? This action cannot be
              undone. All imported questions for this certification will be permanently removed from
              your local database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCategory}>
              Delete All Questions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
