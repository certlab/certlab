import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, ChevronRight } from 'lucide-react';

// Course data structure matching CLAY OS design
interface Course {
  id: string;
  title: string;
  progress: number;
  next: string; // "QUIZ 3" or "ESSAY"
  grade: string; // "A-", "B+", etc.
}

const continueLearningCourse = {
  title: 'Advanced Algorithms',
  progress: 75,
};

const courses: Course[] = [
  {
    id: '1',
    title: 'Advanced Algorithms',
    progress: 75,
    next: 'QUIZ 3',
    grade: 'A-',
  },
  {
    id: '2',
    title: 'Intro to Psychology',
    progress: 60,
    next: 'ESSAY',
    grade: 'B+',
  },
];

export default function MyCoursesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Continue Learning Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg overflow-hidden">
            <CardContent className="p-8">
              <p className="text-sm font-medium text-primary-foreground/80 mb-2 tracking-wider">
                CONTINUE LEARNING
              </p>
              <h2 className="text-3xl font-bold mb-6">{continueLearningCourse.title}</h2>

              <div className="flex items-center justify-between">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold px-8"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Resume
                </Button>

                <div className="text-right">
                  <p className="text-sm text-primary-foreground/80 mb-1">Progress</p>
                  <p className="text-3xl font-bold">{continueLearningCourse.progress}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 w-full bg-primary-foreground/20 rounded-full h-3">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-300"
                  style={{ width: `${continueLearningCourse.progress}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-foreground">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">NEXT: {course.next}</p>

                    {/* Grade Badge */}
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 font-semibold"
                    >
                      Grade: {course.grade}
                    </Badge>
                  </div>

                  {/* Arrow Button */}
                  <Button
                    size="icon"
                    className="rounded-full bg-primary hover:bg-primary/90 w-12 h-12"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm font-semibold">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
