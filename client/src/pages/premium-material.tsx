/**
 * Premium Material Demo Page
 *
 * DEMO/REFERENCE IMPLEMENTATION ONLY
 * 
 * This page demonstrates how to use the PremiumContentGate component to restrict access
 * to premium content based on purchase verification. It serves as a reference for
 * developers implementing premium content protection in other pages.
 * 
 * This page is NOT currently routed in App.tsx. To make it accessible:
 * 1. Add a route in client/src/App.tsx:
 *    <Route path="/app/premium-material/:productId" element={<PremiumMaterialPage />} />
 * 2. Link to it from the marketplace or other pages
 * 
 * Alternatively, this file can remain as documentation and be removed from the build
 * by moving it to a docs/examples directory.
 */

import { useParams } from 'react-router-dom';
import { PremiumContentGate } from '@/components/PremiumContentGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Video, FileText } from 'lucide-react';

export default function PremiumMaterialPage() {
  const { productId } = useParams<{ productId: string }>();
  const productIdNum = productId ? parseInt(productId, 10) : 1;

  return (
    <div className="container mx-auto p-6">
      <PremiumContentGate productId={productIdNum} productTitle="Advanced Study Material">
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Advanced Study Material
            </h1>
            <p className="text-muted-foreground mt-2">
              Premium content for certification preparation
            </p>
          </div>

          {/* Content Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Lectures
                </CardTitle>
                <CardDescription>Comprehensive video lessons</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Access to 20+ hours of premium video content covering all exam topics in depth.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="font-medium">Module 1: Introduction</p>
                    <p className="text-sm text-muted-foreground">Duration: 45 minutes</p>
                  </div>
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="font-medium">Module 2: Core Concepts</p>
                    <p className="text-sm text-muted-foreground">Duration: 1.5 hours</p>
                  </div>
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="font-medium">Module 3: Advanced Topics</p>
                    <p className="text-sm text-muted-foreground">Duration: 2 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Study Notes
                </CardTitle>
                <CardDescription>Detailed written materials</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Comprehensive PDF notes with diagrams, examples, and practice questions.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="font-medium">Chapter 1: Fundamentals</p>
                    <p className="text-sm text-muted-foreground">25 pages</p>
                  </div>
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="font-medium">Chapter 2: Practical Applications</p>
                    <p className="text-sm text-muted-foreground">35 pages</p>
                  </div>
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="font-medium">Chapter 3: Case Studies</p>
                    <p className="text-sm text-muted-foreground">20 pages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Content */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Exercises</CardTitle>
              <CardDescription>Test your knowledge with interactive exercises</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Exercise Set 1: Basics</p>
                    <p className="text-sm text-muted-foreground">50 questions</p>
                  </div>
                  <span className="text-sm text-muted-foreground">Not started</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Exercise Set 2: Intermediate</p>
                    <p className="text-sm text-muted-foreground">75 questions</p>
                  </div>
                  <span className="text-sm text-muted-foreground">Not started</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Exercise Set 3: Advanced</p>
                    <p className="text-sm text-muted-foreground">100 questions</p>
                  </div>
                  <span className="text-sm text-muted-foreground">Not started</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PremiumContentGate>
    </div>
  );
}
