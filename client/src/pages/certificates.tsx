import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Award,
  Search,
  Download,
  Trash2,
  Calendar,
  Trophy,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { printCertificate } from '@/lib/certificate-generator';
import { format } from 'date-fns';
import type { Certificate } from '@shared/schema';

export default function CertificatesPage() {
  const { user: currentUser, tenantId } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: certificates = [], isLoading } = useQuery<Certificate[]>({
    queryKey: queryKeys.certificates.all(currentUser?.id),
    queryFn: async () => {
      if (!currentUser) return [];
      return await storage.getUserCertificates(currentUser.id, tenantId || 1);
    },
    enabled: !!currentUser,
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: async (certificateId: number) => {
      if (!currentUser) throw new Error('User not authenticated');
      await storage.deleteCertificate(certificateId, currentUser.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all(currentUser?.id) });
      toast({
        title: 'Certificate Deleted',
        description: 'The certificate has been deleted successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete the certificate. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDownloadCertificate = async (certificate: Certificate) => {
    try {
      await printCertificate({ certificate });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download certificate',
        variant: 'destructive',
      });
    }
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getResourceTypeLabel = (resourceType: string): string => {
    switch (resourceType) {
      case 'quiz':
        return 'Quiz';
      case 'course':
        return 'Course';
      case 'practiceTest':
        return 'Practice Test';
      default:
        return resourceType;
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      searchQuery === '' ||
      cert.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.resourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.verificationId.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="shadow-md border-0 bg-card">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to view your certificates
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Award className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">🏆 My Certificates</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                View and download your earned certificates
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search certificates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Certificates Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" label="Loading certificates..." />
          </div>
        ) : filteredCertificates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'No certificates match your search criteria.'
                  : 'Complete quizzes or courses to earn certificates.'}
              </p>
              <Button onClick={() => navigate('/app')}>
                <FileText className="h-4 w-4 mr-2" />
                Take a Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCertificates.map((cert) => (
              <Card key={cert.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-600" />
                      <Badge variant="outline" className="text-xs">
                        {getResourceTypeLabel(cert.resourceType)}
                      </Badge>
                    </div>
                    <Badge className={getScoreBadgeColor(cert.score)}>{cert.score}%</Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{cert.resourceTitle}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{cert.userName}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(
                          cert.completedAt instanceof Date
                            ? cert.completedAt
                            : new Date(cert.completedAt),
                          'MMM d, yyyy'
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      ID: {cert.verificationId}
                    </div>
                    {cert.issuedBy && (
                      <div className="text-xs text-muted-foreground">
                        Issued by: {cert.issuedBy}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownloadCertificate(cert)}
                      className="flex-1"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Certificate?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this certificate. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCertificateMutation.mutate(cert.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {certificates.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Certificate Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{certificates.length}</div>
                  <div className="text-xs text-muted-foreground">Total Certificates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {certificates.filter((c) => c.score >= 90).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Excellence (90%+)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {certificates.length > 0
                      ? Math.round(
                          certificates.reduce((sum, c) => sum + c.score, 0) / certificates.length
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-muted-foreground">Average Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {certificates.filter((c) => c.resourceType === 'quiz').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Quiz Certificates</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
