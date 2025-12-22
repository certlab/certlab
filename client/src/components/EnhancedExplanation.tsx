import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Question } from '@shared/schema';

interface EnhancedExplanationProps {
  question: Question;
  isCorrect: boolean;
  className?: string;
}

/**
 * EnhancedExplanation component displays V2 question explanations with:
 * - Step-by-step breakdowns
 * - Reference links to study materials
 * - Video explanations
 * - Community-contributed explanations
 * - Voting system
 * - Alternative explanation views
 */
export function EnhancedExplanation({
  question,
  isCorrect,
  className = '',
}: EnhancedExplanationProps) {
  const [selectedView, setSelectedView] = useState<'primary' | 'community'>('primary');

  // Check if V2 features are available
  const hasSteps = question.explanationSteps && question.explanationSteps.length > 0;
  const hasReferences = question.referenceLinks && question.referenceLinks.length > 0;
  const hasVideo = question.videoUrl && question.videoUrl.trim() !== '';
  const hasCommunity = question.communityExplanations && question.communityExplanations.length > 0;
  const hasAlternativeViews = (question.hasAlternativeViews ?? false) || hasCommunity;

  // If no V2 features, fall back to basic explanation
  const hasV2Features = hasSteps || hasReferences || hasVideo || hasCommunity;

  return (
    <div className={`transition-all duration-300 ease-in-out ${className}`}>
      <Card
        className={`border-2 ${
          isCorrect ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isCorrect ? 'bg-success/20' : 'bg-destructive/20'
                }`}
              >
                <i
                  className={`fas text-sm ${
                    isCorrect ? 'fa-lightbulb text-success' : 'fa-info-circle text-destructive'
                  }`}
                ></i>
              </div>
              <span className={isCorrect ? 'text-success' : 'text-destructive'}>
                {isCorrect ? 'Why this is correct:' : 'Why this is incorrect:'}
              </span>
            </CardTitle>
            {hasAlternativeViews && (
              <Badge variant="outline" className="text-xs">
                <i className="fas fa-comments mr-1"></i>
                {hasCommunity ? question.communityExplanations!.length : 0} views
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Alternative Views Toggle */}
          {hasAlternativeViews && (
            <Tabs
              value={selectedView}
              onValueChange={(v) => setSelectedView(v as 'primary' | 'community')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="primary">Official Explanation</TabsTrigger>
                <TabsTrigger value="community">
                  Community Views ({hasCommunity ? question.communityExplanations!.length : 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="primary" className="space-y-4 mt-4">
                {/* Primary Explanation Content */}
                <PrimaryExplanationContent
                  question={question}
                  hasSteps={!!hasSteps}
                  hasReferences={!!hasReferences}
                  hasVideo={!!hasVideo}
                  hasV2Features={!!hasV2Features}
                  isCorrect={isCorrect}
                />
              </TabsContent>

              <TabsContent value="community" className="space-y-4 mt-4">
                {/* Community Explanations */}
                <CommunityExplanations question={question} />
              </TabsContent>
            </Tabs>
          )}

          {/* Single view when no alternative views */}
          {!hasAlternativeViews && (
            <PrimaryExplanationContent
              question={question}
              hasSteps={!!hasSteps}
              hasReferences={!!hasReferences}
              hasVideo={!!hasVideo}
              hasV2Features={!!hasV2Features}
              isCorrect={isCorrect}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Primary explanation content component
 */
function PrimaryExplanationContent({
  question,
  hasSteps,
  hasReferences,
  hasVideo,
  hasV2Features,
  isCorrect,
}: {
  question: Question;
  hasSteps: boolean;
  hasReferences: boolean;
  hasVideo: boolean;
  hasV2Features: boolean;
  isCorrect: boolean;
}) {
  return (
    <>
      {/* Basic explanation text (V1 fallback) */}
      {question.explanation && (
        <div
          className={`text-sm sm:text-base leading-relaxed ${
            isCorrect ? 'text-success/80' : 'text-destructive/80'
          }`}
        >
          {question.explanation}
        </div>
      )}

      {/* Step-by-step explanation (V2) */}
      {hasSteps && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
            <i className="fas fa-list-ol text-primary"></i>
            Step-by-Step Breakdown:
          </h4>
          <ol className="space-y-2 list-none">
            {question.explanationSteps!.map((step, index) => (
              <li key={index} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Video explanation (V2) */}
      {hasVideo && (
        <div className="space-y-2">
          <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
            <i className="fas fa-video text-primary"></i>
            Video Explanation:
          </h4>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={getEmbedUrl(question.videoUrl!)}
              title="Video explanation"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Reference links (V2) */}
      {hasReferences && (
        <div className="space-y-2">
          <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
            <i className="fas fa-book-open text-primary"></i>
            Study Materials:
          </h4>
          <div className="space-y-2">
            {question.referenceLinks!.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-sm group"
              >
                <i className={`fas ${getReferenceIcon(link.type)} text-primary`}></i>
                <span className="flex-1 text-foreground group-hover:text-primary transition-colors">
                  {link.title}
                </span>
                <i className="fas fa-external-link-alt text-xs text-muted-foreground"></i>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Voting section for primary explanation */}
      {hasV2Features && (
        <div className="flex items-center gap-4 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Was this explanation helpful?</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:text-success hover:bg-success/10"
            >
              <i className="fas fa-thumbs-up mr-1"></i>
              <span className="text-xs">{question.explanationVotes || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:text-destructive hover:bg-destructive/10"
            >
              <i className="fas fa-thumbs-down"></i>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Community explanations component
 */
function CommunityExplanations({ question }: { question: Question }) {
  const communityExplanations = question.communityExplanations || [];

  if (communityExplanations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <i className="fas fa-comments text-3xl mb-3 opacity-50"></i>
        <p className="text-sm">No community explanations yet.</p>
        <Button variant="outline" size="sm" className="mt-3">
          <i className="fas fa-plus mr-2"></i>
          Be the first to contribute
        </Button>
      </div>
    );
  }

  // Sort by verified status first, then by votes (highest first)
  const sortedExplanations = [...communityExplanations].sort((a, b) => {
    if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
    return b.votes - a.votes;
  });

  return (
    <div className="space-y-4">
      {sortedExplanations.map((explanation) => (
        <Card
          key={explanation.id}
          className={`${
            explanation.isVerified ? 'border-primary/30 bg-primary/5' : 'border-border'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {explanation.userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-foreground">
                    {explanation.userName || 'Anonymous User'}
                  </span>
                  {explanation.isVerified && (
                    <Badge variant="default" className="text-xs">
                      <i className="fas fa-check-circle mr-1"></i>
                      Verified
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(explanation.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {explanation.content}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 hover:text-success hover:bg-success/10"
              >
                <i className="fas fa-arrow-up mr-1"></i>
                <span className="text-xs">{explanation.votes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 hover:text-destructive hover:bg-destructive/10"
              >
                <i className="fas fa-arrow-down"></i>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Helper function to get embed URL for video providers
 */
function getEmbedUrl(url: string): string {
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    try {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : new URL(url).searchParams.get('v');

      // If we couldn't extract a video ID, fall back to the original URL
      if (!videoId) {
        return url;
      }

      return `https://www.youtube.com/embed/${videoId}`;
    } catch {
      // Malformed URL: return the original URL instead of throwing
      return url;
    }
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    // Validate video ID exists before constructing embed URL
    if (!videoId) {
      return url;
    }
    return `https://player.vimeo.com/video/${videoId}`;
  }

  // Default: assume it's already an embed URL
  return url;
}

/**
 * Helper function to get icon for reference link type
 */
function getReferenceIcon(type?: string): string {
  switch (type) {
    case 'documentation':
      return 'fa-file-alt';
    case 'article':
      return 'fa-newspaper';
    case 'book':
      return 'fa-book';
    case 'course':
      return 'fa-graduation-cap';
    default:
      return 'fa-link';
  }
}
