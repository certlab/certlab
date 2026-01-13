import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  User,
  Trophy,
  FileText,
} from 'lucide-react';
import { storage } from '@/lib/storage-factory';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isValidVerificationId } from '@/lib/certificate-generator';
import { format } from 'date-fns';
import type { Certificate } from '@shared/schema';

export default function VerifyCertificatePage() {
  const params = useParams<{ verificationId?: string }>();
  const [verificationId, setVerificationId] = useState(params.verificationId || '');
  const [searchTrigger, setSearchTrigger] = useState(0);

  const { data: certificate, isLoading } = useQuery<Certificate | null>({
    queryKey: ['certificate', 'verify', verificationId, searchTrigger],
    queryFn: async () => {
      if (!verificationId.trim()) return null;
      return await storage.getCertificateByVerificationId(verificationId.trim());
    },
    enabled: !!verificationId.trim(),
  });

  const handleVerify = () => {
    setSearchTrigger((prev) => prev + 1);
  };

  const isValid = isValidVerificationId(verificationId);

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

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Award className="h-10 w-10 text-amber-600" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Certificate Verification
          </h1>
          <p className="text-muted-foreground">
            Verify the authenticity of CertLab certificates using the verification ID
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Enter Verification ID</CardTitle>
            <CardDescription>
              The verification ID can be found at the bottom of the certificate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                  value={verificationId}
                  onChange={(e) => setVerificationId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="pl-9 font-mono text-sm"
                />
              </div>
              <Button onClick={handleVerify} disabled={!verificationId.trim()}>
                Verify
              </Button>
            </div>
            {verificationId && !isValid && (
              <p className="text-sm text-destructive mt-2">
                Invalid verification ID format. Please check and try again.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center">
                <LoadingSpinner size="lg" />
                <p className="text-muted-foreground mt-4">Verifying certificate...</p>
              </div>
            </CardContent>
          </Card>
        ) : certificate ? (
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-green-900">Certificate Verified</CardTitle>
                  <CardDescription>This is a valid CertLab certificate</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-6 space-y-4">
                {/* Certificate Details */}
                <div className="flex items-start gap-4 pb-4 border-b">
                  <Trophy className="h-8 w-8 text-amber-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{certificate.resourceTitle}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">
                        {getResourceTypeLabel(certificate.resourceType)}
                      </Badge>
                      <Badge className={getScoreBadgeColor(certificate.score)}>
                        Score: {certificate.score}%
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Recipient Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Recipient</p>
                      <p className="font-medium">{certificate.userName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Completion Date</p>
                      <p className="font-medium">
                        {format(
                          certificate.completedAt instanceof Date
                            ? certificate.completedAt
                            : new Date(certificate.completedAt),
                          'MMMM d, yyyy'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Issued By</p>
                      <p className="font-medium">{certificate.issuedBy}</p>
                    </div>
                  </div>

                  {certificate.organizationName && (
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Organization</p>
                        <p className="font-medium">{certificate.organizationName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verification ID */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Verification ID</p>
                  <p className="font-mono text-sm bg-muted px-3 py-2 rounded break-words overflow-wrap-anywhere">
                    {certificate.verificationId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : verificationId && searchTrigger > 0 ? (
          <Card className="border-2 border-red-200 bg-red-50/50">
            <CardContent className="py-8">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-red-100 rounded-full mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-red-900 mb-2">Certificate Not Found</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  No certificate was found with this verification ID. Please check that you've
                  entered the correct ID and try again.
                </p>
                <div className="bg-white rounded-lg p-4 w-full max-w-md">
                  <p className="text-sm text-muted-foreground mb-2">Common issues:</p>
                  <ul className="text-sm text-left space-y-1 text-muted-foreground">
                    <li>• Verification ID contains typos</li>
                    <li>• Certificate may have been deleted</li>
                    <li>• Certificate was not issued by CertLab</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Information Box */}
        <Card className="mt-8 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">About Certificate Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                All CertLab certificates include a unique verification ID that can be used to
                confirm their authenticity. This system helps prevent certificate fraud and ensures
                that all certificates are genuine.
              </p>
              <p className="font-medium text-foreground">What we verify:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Certificate was issued by CertLab</li>
                <li>Recipient name and completion date</li>
                <li>Achievement type and score</li>
                <li>Issuing organization</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
