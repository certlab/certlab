import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { queryKeys } from "@/lib/queryClient";

export default function LecturePage() {
  const { id } = useParams<{ id: string }>();
  
  const { data: lecture, isLoading, error } = useQuery({
    queryKey: queryKeys.lecture.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/lecture/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load study guide');
      }
      return response.json();
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <ContentSkeleton lines={6} showHeader={true} />
        </div>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <BookOpen className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Study Guide Not Found</h2>
              <p className="text-gray-600 mb-4">
                The study guide you're looking for could not be found or may have been removed.
              </p>
              <Button onClick={() => window.location.href = '/app/dashboard'}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{lecture.title}</h1>
              <p className="text-gray-600">
                Generated on {new Date(lecture.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Study Guide Content */}
        <Card className="material-shadow">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Personalized Study Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="prose prose-gray max-w-none">
              {lecture.content.split('\n').map((line: string, index: number) => {
                // Handle headers
                if (line.startsWith('# ')) {
                  return (
                    <h1 key={index} className="text-3xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      {line.replace('# ', '')}
                    </h1>
                  );
                }
                if (line.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
                      {line.replace('## ', '')}
                    </h2>
                  );
                }
                if (line.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-xl font-semibold text-gray-700 mt-6 mb-3">
                      {line.replace('### ', '')}
                    </h3>
                  );
                }
                
                // Handle bold text
                if (line.includes('**')) {
                  const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  return (
                    <p key={index} className="mb-3 text-gray-700" dangerouslySetInnerHTML={{ __html: boldText }} />
                  );
                }
                
                // Handle list items
                if (line.startsWith('- ')) {
                  return (
                    <li key={index} className="mb-2 text-gray-700 ml-4">
                      {line.replace('- ', '')}
                    </li>
                  );
                }
                
                // Handle numbered lists
                if (line.match(/^\d+\./)) {
                  return (
                    <li key={index} className="mb-2 text-gray-700 ml-4 list-decimal">
                      {line.replace(/^\d+\.\s*/, '')}
                    </li>
                  );
                }
                
                // Handle horizontal rules
                if (line === '---') {
                  return <hr key={index} className="my-6 border-gray-200" />;
                }
                
                // Handle empty lines
                if (line.trim() === '') {
                  return <br key={index} />;
                }
                
                // Handle emojis and special formatting
                if (line.includes('🎉') || line.includes('📈') || line.includes('🎯')) {
                  return (
                    <div key={index} className="my-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                      <p className="text-blue-800 font-medium">{line}</p>
                    </div>
                  );
                }
                
                // Regular paragraphs
                return (
                  <p key={index} className="mb-3 text-gray-700 leading-relaxed">
                    {line}
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="flex-1"
          >
            Print Study Guide
          </Button>
          <Button 
            onClick={() => window.history.back()}
            className="flex-1"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}