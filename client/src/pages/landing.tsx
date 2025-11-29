import { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Shield,
  BookOpen,
  Target,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Brain,
  Trophy,
  Users,
  Star,
  Zap,
  BarChart3,
  Clock,
  Award,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useLocation } from 'wouter';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load Login component to reduce initial bundle size
const Login = lazy(() => import('./login'));

// Features data
const features = [
  {
    icon: Brain,
    title: 'Adaptive Learning',
    description:
      'AI-powered system adapts to your learning pace and identifies knowledge gaps automatically.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Shield,
    title: 'Enterprise Ready',
    description:
      'Secure multi-tenant architecture designed for organizations and teams of any size.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: BookOpen,
    title: 'Smart Lectures',
    description: 'AI generates personalized lectures based on your weak topics and learning style.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Trophy,
    title: 'Achievement System',
    description: 'Gamified progress tracking with badges, streaks, and level progression.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Comprehensive insights into your progress with detailed performance metrics.',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: Clock,
    title: 'Practice Tests',
    description: 'Simulate real exam conditions with timed practice tests and instant feedback.',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

// Steps data
const steps = [
  {
    number: '01',
    title: 'Create Your Account',
    description:
      'Sign up in seconds and choose your certification path. No credit card required to start.',
  },
  {
    number: '02',
    title: 'Take Assessment Quiz',
    description:
      'Our AI evaluates your current knowledge level and creates a personalized study plan.',
  },
  {
    number: '03',
    title: 'Study & Practice',
    description:
      'Access adaptive quizzes, smart lectures, and practice tests tailored to your needs.',
  },
  {
    number: '04',
    title: 'Get Certified',
    description: 'Track your progress and ace your certification exam with confidence.',
  },
];

// Testimonials data
const testimonials = [
  {
    quote:
      'CertLab helped me pass my CISSP on the first attempt. The adaptive learning system identified exactly where I needed to focus.',
    author: 'Sarah Chen',
    role: 'Security Analyst',
    avatar: 'SC',
  },
  {
    quote:
      'The gamification features kept me motivated throughout my study journey. I actually looked forward to my daily practice sessions!',
    author: 'Marcus Johnson',
    role: 'IT Manager',
    avatar: 'MJ',
  },
  {
    quote:
      "As someone who struggled with traditional study methods, CertLab's AI-powered approach was a game changer for my CISM prep.",
    author: 'Emily Rodriguez',
    role: 'Compliance Officer',
    avatar: 'ER',
  },
];

// FAQ data
const faqs = [
  {
    question: 'What certifications does CertLab support?',
    answer:
      'CertLab currently supports CISSP and CISM certifications, with more being added regularly. Our platform is designed to help you master these industry-leading security certifications.',
  },
  {
    question: 'How does the adaptive learning work?',
    answer:
      'Our AI analyzes your quiz performance in real-time, identifying knowledge gaps and adjusting question difficulty. This ensures you spend more time on topics you need to improve while reinforcing your strengths.',
  },
  {
    question: 'Can I use CertLab on mobile devices?',
    answer:
      'Yes! CertLab is fully responsive and works on all devices. Study on your desktop at home and continue on your phone during your commute.',
  },
  {
    question: 'Is there a free trial available?',
    answer:
      'Absolutely! You can create a free account and access our core features. No credit card required to get started.',
  },
  {
    question: 'How is my progress tracked?',
    answer:
      "CertLab tracks your performance across all quizzes, practice tests, and study sessions. You'll see detailed analytics including mastery scores by topic, study streaks, and predicted readiness for the actual exam.",
  },
];

// Stats data
const stats = [
  { value: '10K+', label: 'Active Learners' },
  { value: '95%', label: 'Pass Rate' },
  { value: '500K+', label: 'Questions Answered' },
  { value: '4.9', label: 'User Rating' },
];

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = () => {
    setShowLogin(true);
  };

  const handleGoToDashboard = () => {
    setLocation('/app');
  };

  const getUserDisplayName = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) return user.firstName;
    if (user?.lastName) return user.lastName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  if (showLogin) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingSpinner size="lg" label="Loading login..." />
          </div>
        }
      >
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">CertLab</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Testimonials
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </a>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Button onClick={handleGoToDashboard} data-testid="dashboard-button">
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleLogin} data-testid="get-started-button">
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Certification Prep
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Master Your{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Certifications
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The intelligent learning platform that adapts to you. Pass CISSP, CISM, and other
              professional certifications with confidence using AI-powered quizzes and personalized
              study plans.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground">
                    Welcome back, {getUserDisplayName(user)}!
                  </p>
                  <Button
                    onClick={handleGoToDashboard}
                    size="lg"
                    className="text-lg px-8"
                    data-testid="hero-dashboard-button"
                  >
                    Continue Learning
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleLogin}
                    size="lg"
                    className="text-lg px-8"
                    data-testid="hero-get-started-button"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8"
                    onClick={() =>
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Learn More
                  </Button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform combines cutting-edge AI with proven learning methodologies
              to help you achieve your certification goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your Path to Certification</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and follow our proven four-step process to certification
              success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent -translate-x-4" />
                )}
                <div className="text-5xl font-bold text-primary/20 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by Certification Seekers</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of professionals who have achieved their certification goals with
              CertLab.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-10" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Certified?
            </h2>
            <p className="text-lg sm:text-xl opacity-90 mb-8">
              Join thousands of professionals who trust CertLab for their certification journey.
              Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button
                  onClick={handleGoToDashboard}
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleLogin}
                    size="lg"
                    variant="secondary"
                    className="text-lg px-8"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 bg-transparent border-white text-white hover:bg-white/10"
                  >
                    Contact Sales
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Got questions? We've got answers. If you can't find what you're looking for, feel free
              to contact our support team.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-lg font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">CertLab</span>
              </div>
              <p className="text-muted-foreground max-w-md">
                The intelligent certification learning platform. Master CISSP, CISM, and more with
                AI-powered adaptive learning.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-foreground transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="hover:text-foreground transition-colors">
                    Testimonials
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-foreground transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Certifications</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    CISSP
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    CISM
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Coming Soon
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-muted-foreground text-sm">
            <p>© {new Date().getFullYear()} CertLab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
