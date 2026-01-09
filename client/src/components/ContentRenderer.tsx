import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Video,
  FileType,
  Code,
  Play,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Subtitles,
} from 'lucide-react';
import type { Lecture } from '@shared/schema';

interface ContentRendererProps {
  lecture: Lecture;
  className?: string;
}

/**
 * ContentRenderer component for displaying different types of learning materials
 * Supports: Text (markdown), Video (YouTube/Vimeo/uploaded), PDF, Interactive content, and Code examples
 */
export function ContentRenderer({ lecture, className = '' }: ContentRendererProps) {
  const [showCaptions, setShowCaptions] = useState(
    lecture.accessibilityFeatures?.hasClosedCaptions || false
  );
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const renderContentByType = () => {
    switch (lecture.contentType) {
      case 'video':
        return renderVideoContent();
      case 'pdf':
        return renderPdfContent();
      case 'interactive':
        return renderInteractiveContent();
      case 'code':
        return renderCodeContent();
      case 'text':
      default:
        return renderTextContent();
    }
  };

  const renderTextContent = () => {
    return (
      <div className="prose prose-gray max-w-none dark:prose-invert">
        {lecture.content.split('\n').map((line: string, index: number) => {
          // Handle headers
          if (line.startsWith('# ')) {
            return (
              <h1
                key={index}
                className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2"
              >
                {line.replace('# ', '')}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2
                key={index}
                className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mt-8 mb-4"
              >
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3
                key={index}
                className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-3"
              >
                {line.replace('### ', '')}
              </h3>
            );
          }

          // Handle bold text
          if (line.includes('**')) {
            const segments = line.split('**');
            return (
              <p key={index} className="mb-3 text-gray-700 dark:text-gray-300">
                {segments.map((segment, i) =>
                  i % 2 === 1 ? <strong key={i}>{segment}</strong> : segment
                )}
              </p>
            );
          }

          // Handle list items
          if (line.startsWith('- ')) {
            return (
              <li key={index} className="mb-2 text-gray-700 dark:text-gray-300 ml-4">
                {line.replace('- ', '')}
              </li>
            );
          }

          // Handle numbered lists
          if (line.match(/^\d+\./)) {
            return (
              <li key={index} className="mb-2 text-gray-700 dark:text-gray-300 ml-4 list-decimal">
                {line.replace(/^\d+\.\s*/, '')}
              </li>
            );
          }

          // Handle code blocks (simple)
          if (line.startsWith('```')) {
            return null; // Handled by code content type
          }

          // Handle horizontal rules
          if (line === '---') {
            return <hr key={index} className="my-6 border-gray-200 dark:border-gray-700" />;
          }

          // Handle empty lines
          if (line.trim() === '') {
            return <br key={index} />;
          }

          // Regular paragraphs
          return (
            <p key={index} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  const renderVideoContent = () => {
    const getEmbedUrl = () => {
      if (!lecture.videoUrl) return null;

      const rawUrl = lecture.videoUrl.trim();

      if (lecture.videoProvider === 'youtube') {
        // Extract video ID from various YouTube URL formats
        const getYouTubeId = (url: string): string | null => {
          try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.replace(/^www\./, '');

            // youtu.be/<id>
            if (hostname === 'youtu.be') {
              const id = parsed.pathname.split('/').filter(Boolean)[0];
              if (id) return id;
            }

            // youtube.com or m.youtube.com
            if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
              // Standard watch URL: ?v=<id>
              const vParam = parsed.searchParams.get('v');
              if (vParam) return vParam;

              // Paths like /embed/<id>, /v/<id>, /shorts/<id>
              const segments = parsed.pathname.split('/').filter(Boolean);
              if (segments.length >= 2 && ['embed', 'v', 'shorts'].includes(segments[0])) {
                const id = segments[1];
                if (id) return id;
              }
            }
          } catch {
            // If URL constructor fails, fall back to regex
          }

          // Fallback regex covering common YouTube URL patterns
          const regex =
            /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})/;
          const match = url.match(regex);
          return match ? match[1] : null;
        };

        const videoId = getYouTubeId(rawUrl);

        if (!videoId) {
          console.warn('ContentRenderer: Unable to extract YouTube video ID from URL', {
            url: rawUrl,
            lectureId: lecture.id,
          });
          return null;
        }

        return `https://www.youtube.com/embed/${videoId}?rel=0${
          showCaptions ? '&cc_load_policy=1' : ''
        }`;
      } else if (lecture.videoProvider === 'vimeo') {
        // Extract video ID from Vimeo URL
        const match = rawUrl.match(/vimeo\.com\/(\d+)/);
        const videoId = match?.[1];

        if (!videoId) {
          console.warn('ContentRenderer: Unable to extract Vimeo video ID from URL', {
            url: rawUrl,
            lectureId: lecture.id,
          });
          return null;
        }

        return `https://player.vimeo.com/video/${videoId}`;
      }

      // For uploaded or other provider videos, use URL directly
      return rawUrl;
    };

    const embedUrl = getEmbedUrl();
    const duration = lecture.videoDuration
      ? `${Math.floor(lecture.videoDuration / 60)}:${String(lecture.videoDuration % 60).padStart(2, '0')}`
      : null;

    return (
      <div className="space-y-4">
        {/* Video Player */}
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lecture.title}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Video not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Video Controls and Info */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              {lecture.videoProvider?.toUpperCase()}
            </Badge>
            {duration && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {duration}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lecture.accessibilityFeatures?.hasClosedCaptions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCaptions(!showCaptions)}
                className="flex items-center gap-2"
              >
                <Subtitles className="h-4 w-4" />
                {showCaptions ? 'Hide' : 'Show'} Captions
              </Button>
            )}
            {lecture.accessibilityFeatures?.hasTranscript && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTranscript(!showTranscript)}
              >
                {showTranscript ? 'Hide' : 'Show'} Transcript
              </Button>
            )}
            {lecture.videoUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={lecture.videoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Transcript */}
        {showTranscript && lecture.accessibilityFeatures?.hasTranscript && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {lecture.content ? (
                  <p className="text-gray-700 dark:text-gray-300">{lecture.content}</p>
                ) : (
                  <p className="text-gray-500 italic">Transcript not available</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {lecture.description && (
          <div className="text-sm text-gray-600 dark:text-gray-400">{lecture.description}</div>
        )}
      </div>
    );
  };

  const renderPdfContent = () => {
    const totalPages = lecture.pdfPages || 0;
    const fileSize = lecture.fileSize
      ? lecture.fileSize > 1024 * 1024
        ? `${(lecture.fileSize / (1024 * 1024)).toFixed(2)} MB`
        : `${(lecture.fileSize / 1024).toFixed(2)} KB`
      : null;

    return (
      <div className="space-y-4">
        {/* PDF Viewer */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
          {lecture.pdfUrl ? (
            <iframe
              src={`${lecture.pdfUrl}#page=${currentPage}`}
              className="w-full h-[600px]"
              title={lecture.title}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-gray-500">
              <div className="text-center">
                <FileType className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">PDF not available</p>
              </div>
            </div>
          )}
        </div>

        {/* PDF Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileType className="h-3 w-3" />
              PDF
            </Badge>
            {totalPages > 0 && (
              <Badge variant="outline">
                {currentPage} / {totalPages} pages
              </Badge>
            )}
            {fileSize && <Badge variant="outline">{fileSize}</Badge>}
          </div>

          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
            {lecture.pdfUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={lecture.pdfUrl} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {lecture.description && (
          <div className="text-sm text-gray-600 dark:text-gray-400">{lecture.description}</div>
        )}
      </div>
    );
  };

  const renderInteractiveContent = () => {
    return (
      <div className="space-y-4">
        {/* Interactive Content Frame */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          {lecture.interactiveUrl ? (
            <iframe
              src={lecture.interactiveUrl}
              className="w-full h-[600px]"
              title={lecture.title}
              sandbox="allow-scripts"
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-gray-500">
              <div className="text-center">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Interactive content not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Info */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {lecture.interactiveType || 'Interactive'}
            </Badge>
          </div>

          {lecture.interactiveUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={lecture.interactiveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          )}
        </div>

        {/* Description */}
        {lecture.description && (
          <div className="text-sm text-gray-600 dark:text-gray-400">{lecture.description}</div>
        )}
      </div>
    );
  };

  const renderCodeContent = () => {
    const codeContent = lecture.codeContent || lecture.content;

    return (
      <div className="space-y-4">
        {/* Code Block */}
        <div className="relative">
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="capitalize">
              {lecture.codeLanguage || 'Code'}
            </Badge>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
            <code className={`language-${lecture.codeLanguage || 'plaintext'}`}>{codeContent}</code>
          </pre>
        </div>

        {/* Code Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(codeContent);
                // TODO: Add toast notification for success feedback
              } catch (error) {
                console.error('Failed to copy code to clipboard:', error);
                // TODO: Add toast notification for error feedback
              }
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Copy Code
          </Button>
        </div>

        {/* Description */}
        {lecture.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Code Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">{lecture.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Card className={`material-shadow ${className}`}>
      <CardHeader className="border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {lecture.contentType === 'video' && <Video className="h-5 w-5 text-purple-600" />}
            {lecture.contentType === 'pdf' && <FileType className="h-5 w-5 text-red-600" />}
            {lecture.contentType === 'code' && <Code className="h-5 w-5 text-green-600" />}
            {lecture.contentType === 'interactive' && <Play className="h-5 w-5 text-blue-600" />}
            {lecture.contentType === 'text' && <FileText className="h-5 w-5 text-gray-600" />}
            {lecture.title}
          </CardTitle>
          {lecture.accessibilityFeatures?.altText && (
            <Badge variant="outline" className="ml-auto">
              Accessible
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">{renderContentByType()}</CardContent>
    </Card>
  );
}
