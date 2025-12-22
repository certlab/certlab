import { useState, lazy, Suspense, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  GraduationCap,
  ArrowRight,
  Brain,
  Shield,
  BookOpen,
  Menu,
  X,
  Target,
  Zap,
  Trophy,
  TrendingUp,
  Star,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load Login component to reduce initial bundle size
const Login = lazy(() => import('./login'));

// Clay style color schemes with proper claymorphism shadows
const COLOR_SCHEMES = {
  peachy: {
    name: 'Peachy Clay',
    bg: 'bg-[#FFE5D9]',
    cardBg: 'bg-[#FFD7C4]',
    primary: 'bg-gradient-to-br from-[#FF6B6B] to-[#FFA07A]',
    secondary: 'bg-gradient-to-br from-[#FFB6B6] to-[#FFC7AB]',
    text: 'text-[#8B4513]',
    textLight: 'text-[#A0522D]',
    // Claymorphism shadows: outer shadow (bottom-right) + inner shadow (top-left for depth)
    shadow: 'shadow-[10px_10px_20px_rgba(139,69,19,0.15),-10px_-10px_20px_rgba(255,255,255,0.7)]',
    hoverShadow:
      'hover:shadow-[15px_15px_30px_rgba(139,69,19,0.2),-15px_-15px_30px_rgba(255,255,255,0.9)]',
    innerShadow:
      'shadow-[inset_8px_8px_16px_rgba(139,69,19,0.1),inset_-8px_-8px_16px_rgba(255,255,255,0.8)]',
  },
  minty: {
    name: 'Minty Clay',
    bg: 'bg-[#D4F1F4]',
    cardBg: 'bg-[#B8E6E9]',
    primary: 'bg-gradient-to-br from-[#05C896] to-[#4ECDC4]',
    secondary: 'bg-gradient-to-br from-[#81D8D0] to-[#9FEDD7]',
    text: 'text-[#1A535C]',
    textLight: 'text-[#2B6777]',
    shadow: 'shadow-[10px_10px_20px_rgba(26,83,92,0.15),-10px_-10px_20px_rgba(255,255,255,0.7)]',
    hoverShadow:
      'hover:shadow-[15px_15px_30px_rgba(26,83,92,0.2),-15px_-15px_30px_rgba(255,255,255,0.9)]',
    innerShadow:
      'shadow-[inset_8px_8px_16px_rgba(26,83,92,0.1),inset_-8px_-8px_16px_rgba(255,255,255,0.8)]',
  },
  lavender: {
    name: 'Lavender Clay',
    bg: 'bg-[#E8D5F2]',
    cardBg: 'bg-[#D4BEE4]',
    primary: 'bg-gradient-to-br from-[#A78BFA] to-[#C084FC]',
    secondary: 'bg-gradient-to-br from-[#C4B5FD] to-[#DDD6FE]',
    text: 'text-[#4A1A6B]',
    textLight: 'text-[#6B2E8F]',
    shadow: 'shadow-[10px_10px_20px_rgba(74,26,107,0.15),-10px_-10px_20px_rgba(255,255,255,0.7)]',
    hoverShadow:
      'hover:shadow-[15px_15px_30px_rgba(74,26,107,0.2),-15px_-15px_30px_rgba(255,255,255,0.9)]',
    innerShadow:
      'shadow-[inset_8px_8px_16px_rgba(74,26,107,0.1),inset_-8px_-8px_16px_rgba(255,255,255,0.8)]',
  },
} as const;

type ColorScheme = keyof typeof COLOR_SCHEMES;

// Features data with more details
const features = [
  {
    title: 'Adaptive Learning',
    description:
      'AI-powered system adapts to your learning pace and identifies knowledge gaps automatically.',
    icon: Brain,
  },
  {
    title: 'Smart Progress Tracking',
    description:
      'Visualize your journey with detailed analytics and insights into your performance.',
    icon: TrendingUp,
  },
  {
    title: 'Personalized Lectures',
    description: 'AI generates custom lectures based on your weak topics and learning style.',
    icon: BookOpen,
  },
  {
    title: 'Practice Tests',
    description:
      'Realistic exam simulations to build confidence and identify areas for improvement.',
    icon: Target,
  },
  {
    title: 'Fast & Efficient',
    description:
      'Study smarter, not harder. Our platform optimizes your study time for maximum retention.',
    icon: Zap,
  },
  {
    title: 'Achievement System',
    description: 'Earn badges and track milestones to stay motivated throughout your journey.',
    icon: Trophy,
  },
];

// Stats data
const stats = [
  { value: '10K+', label: 'Active Learners' },
  { value: '95%', label: 'Pass Rate' },
  { value: '500K+', label: 'Questions Answered' },
  { value: '4.9/5', label: 'User Rating' },
];

// Testimonials data
const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Security Analyst',
    content:
      'CertLab helped me pass my CISSP on the first try. The adaptive learning really made a difference.',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'IT Manager',
    content:
      "The best certification prep platform I've used. The AI-powered lectures filled in my knowledge gaps perfectly.",
    rating: 5,
  },
  {
    name: 'Emily Watson',
    role: 'Cybersecurity Consultant',
    content:
      'I love the progress tracking and achievement system. It kept me motivated throughout my CISM preparation.',
    rating: 5,
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
    question: 'How long does it take to prepare for a certification?',
    answer:
      'It varies by individual and certification, but most users spend 2-3 months preparing with CertLab. Our adaptive system helps optimize your study time based on your current knowledge level.',
  },
];

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorScheme>('peachy');

  const theme = COLOR_SCHEMES[colorScheme];

  // Auto-redirect authenticated users to the app
  useEffect(() => {
    if (isAuthenticated && !showLogin) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, showLogin, navigate]);

  const handleLogin = useCallback(() => {
    setShowLogin(true);
  }, []);

  const handleGoToDashboard = useCallback(() => {
    navigate('/app');
  }, [navigate]);

  const handleScrollToFeatures = useCallback(() => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, []);

  const handleScrollToFaq = useCallback(() => {
    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

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
          <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
            <LoadingSpinner size="lg" label="Loading login..." />
          </div>
        }
      >
        <Login />
      </Suspense>
    );
  }

  return (
    <div
      className={`min-h-screen ${theme.bg} ${theme.text} overflow-x-hidden transition-colors duration-500`}
    >
      {/* Color Scheme Switcher - Floating on the right */}
      <div
        className="fixed top-24 right-6 z-50 flex flex-col gap-3"
        role="group"
        aria-label="Color theme selector"
      >
        <div className={`${theme.cardBg} ${theme.shadow} rounded-3xl p-2 flex flex-col gap-2`}>
          <button
            onClick={() => setColorScheme('peachy')}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B6B] to-[#FFA07A] ${
              colorScheme === 'peachy'
                ? 'ring-4 ring-[#FF6B6B] ring-offset-2 ring-offset-[#FFE5D9]'
                : ''
            } shadow-[6px_6px_12px_rgba(139,69,19,0.2),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:scale-110 transition-all duration-300 motion-reduce:transform-none`}
            aria-label="Peachy clay theme"
            aria-pressed={colorScheme === 'peachy'}
            title="Peachy Clay"
          />
          <button
            onClick={() => setColorScheme('minty')}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-[#05C896] to-[#4ECDC4] ${
              colorScheme === 'minty'
                ? 'ring-4 ring-[#05C896] ring-offset-2 ring-offset-[#D4F1F4]'
                : ''
            } shadow-[6px_6px_12px_rgba(26,83,92,0.2),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:scale-110 transition-all duration-300 motion-reduce:transform-none`}
            aria-label="Minty clay theme"
            aria-pressed={colorScheme === 'minty'}
            title="Minty Clay"
          />
          <button
            onClick={() => setColorScheme('lavender')}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A78BFA] to-[#C084FC] ${
              colorScheme === 'lavender'
                ? 'ring-4 ring-[#A78BFA] ring-offset-2 ring-offset-[#E8D5F2]'
                : ''
            } shadow-[6px_6px_12px_rgba(74,26,107,0.2),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:scale-110 transition-all duration-300 motion-reduce:transform-none`}
            aria-label="Lavender clay theme"
            aria-pressed={colorScheme === 'lavender'}
            title="Lavender Clay"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className={`py-5 px-4 ${theme.cardBg} ${theme.shadow} sticky top-0 z-40`}>
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`${theme.primary} p-4 rounded-3xl ${theme.shadow}`}>
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <span className={`text-3xl font-bold ${theme.text}`}>CertLab</span>
            </div>
            <button
              className={`${theme.cardBg} size-12 inline-flex justify-center items-center rounded-2xl md:hidden ${theme.shadow} hover:scale-105 transition-transform motion-reduce:transform-none`}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={handleToggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X className={`${theme.text} w-6 h-6`} />
              ) : (
                <Menu className={`${theme.text} w-6 h-6`} />
              )}
            </button>
            <nav className={`${theme.textLight} items-center gap-8 hidden md:flex`}>
              <button
                onClick={handleScrollToFeatures}
                className={`${theme.text} hover:scale-105 transition-transform motion-reduce:transform-none font-bold text-lg`}
              >
                Features
              </button>
              <button
                onClick={handleScrollToFaq}
                className={`${theme.text} hover:scale-105 transition-transform motion-reduce:transform-none font-bold text-lg`}
              >
                FAQ
              </button>
              {isAuthenticated ? (
                <button
                  onClick={handleGoToDashboard}
                  className={`${theme.primary} text-white py-3 px-8 rounded-3xl font-bold text-lg ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none`}
                  data-testid="dashboard-button"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className={`${theme.primary} text-white py-3 px-8 rounded-3xl font-bold text-lg ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none`}
                  data-testid="get-started-button"
                >
                  Get Started
                </button>
              )}
            </nav>
          </div>
          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden mt-6 py-4">
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleScrollToFeatures}
                  className={`${theme.text} hover:scale-105 transition-transform motion-reduce:transform-none text-left font-bold text-lg`}
                >
                  Features
                </button>
                <button
                  onClick={handleScrollToFaq}
                  className={`${theme.text} hover:scale-105 transition-transform motion-reduce:transform-none text-left font-bold text-lg`}
                >
                  FAQ
                </button>
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      handleGoToDashboard();
                      setMobileMenuOpen(false);
                    }}
                    className={`${theme.primary} text-white py-3 px-8 rounded-3xl font-bold text-center ${theme.shadow}`}
                  >
                    Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleLogin();
                      setMobileMenuOpen(false);
                    }}
                    className={`${theme.primary} text-white py-3 px-8 rounded-3xl font-bold text-center ${theme.shadow}`}
                  >
                    Get Started
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-center mb-10">
            <div
              className={`inline-flex items-center gap-3 ${theme.cardBg} py-3 px-6 rounded-full ${theme.shadow} hover:scale-105 transition-all motion-reduce:transform-none cursor-pointer`}
              onClick={handleScrollToFeatures}
            >
              <Sparkles className={`w-5 h-5 ${theme.text}`} />
              <span className={`${theme.text} font-bold text-lg`}>
                AI-Powered Adaptive Learning
              </span>
              <ArrowRight className={`w-5 h-5 ${theme.textLight}`} />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="max-w-5xl text-center">
              <h1
                className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-8 ${theme.text}`}
              >
                Master Your
                <br />
                Certifications
              </h1>
              <p
                className={`text-2xl md:text-3xl ${theme.textLight} max-w-3xl mx-auto mb-12 leading-relaxed font-semibold`}
              >
                The intelligent learning platform that adapts to you. Pass CISSP, CISM, and other
                professional certifications with confidence.
              </p>

              {isAuthenticated ? (
                <div className="flex flex-col items-center gap-6">
                  <p className={`${theme.textLight} text-xl font-bold`}>
                    Welcome back, {getUserDisplayName(user)}!
                  </p>
                  <button
                    onClick={handleGoToDashboard}
                    className={`${theme.primary} text-white py-5 px-12 rounded-full font-bold text-xl ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none inline-flex items-center gap-3`}
                    data-testid="hero-dashboard-button"
                  >
                    Continue Learning
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <button
                    onClick={handleLogin}
                    className={`${theme.primary} text-white py-5 px-12 rounded-full font-bold text-xl ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none inline-flex items-center gap-3`}
                    data-testid="hero-get-started-button"
                  >
                    Get Started Free
                    <ArrowRight className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleScrollToFeatures}
                    className={`${theme.cardBg} ${theme.text} py-5 px-12 rounded-full font-bold text-xl ${theme.shadow} hover:scale-105 transition-all motion-reduce:transform-none inline-flex items-center gap-3`}
                  >
                    Learn More
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className={`${theme.cardBg} rounded-[3rem] p-12 ${theme.shadow}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={`text-5xl md:text-6xl font-black ${theme.text} mb-3`}>
                    {stat.value}
                  </div>
                  <div className={`${theme.textLight} font-bold text-lg`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="inline-block mb-6">
              <span
                className={`${theme.cardBg} ${theme.text} px-6 py-2 rounded-full text-sm font-black uppercase tracking-wider ${theme.shadow}`}
              >
                Features
              </span>
            </div>
            <h2
              className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 ${theme.text}`}
            >
              Everything you need
              <br />
              to succeed
            </h2>
            <p className={`text-2xl ${theme.textLight} max-w-3xl mx-auto font-semibold`}>
              Powerful features designed to accelerate your certification journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ title, description, icon: Icon }, index) => (
              <div
                key={title}
                className={`${theme.cardBg} rounded-[2.5rem] p-10 ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none duration-300`}
              >
                <div
                  className={`${theme.primary} inline-flex p-5 rounded-3xl mb-6 ${theme.innerShadow}`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-2xl font-black mb-4 ${theme.text}`}>{title}</h3>
                <p className={`${theme.textLight} leading-relaxed text-lg font-semibold`}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="inline-block mb-6">
              <span
                className={`${theme.secondary} text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-wider ${theme.shadow}`}
              >
                Testimonials
              </span>
            </div>
            <h2
              className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tight ${theme.text}`}
            >
              Loved by learners
              <br />
              worldwide
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`${theme.cardBg} rounded-[2.5rem] p-10 ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none`}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className={`${theme.textLight} mb-8 leading-relaxed font-semibold text-lg`}>
                  &quot;{testimonial.content}&quot;
                </p>
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-3xl ${theme.primary} flex items-center justify-center text-white font-black text-2xl ${theme.shadow}`}
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className={`font-black text-lg ${theme.text}`}>{testimonial.name}</div>
                    <div className={`text-base ${theme.textLight} font-semibold`}>
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div
            className={`${theme.cardBg} rounded-[3rem] p-16 md:p-20 ${theme.shadow} text-center`}
          >
            <h2
              className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-8 ${theme.text}`}
            >
              Ready to ace your
              <br />
              certification exam?
            </h2>
            <p className={`text-2xl ${theme.textLight} mb-12 max-w-3xl mx-auto font-semibold`}>
              Join thousands of successful learners who have mastered their certifications with
              CertLab&apos;s AI-powered platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
              {isAuthenticated ? (
                <button
                  onClick={handleGoToDashboard}
                  className={`${theme.primary} text-white py-5 px-12 rounded-full font-bold text-xl ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none inline-flex items-center justify-center gap-3`}
                >
                  Go to Dashboard
                  <ArrowRight className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className={`${theme.primary} text-white py-5 px-12 rounded-full font-bold text-xl ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none inline-flex items-center justify-center gap-3`}
                >
                  Start Free Trial
                  <ArrowRight className="w-6 h-6" />
                </button>
              )}
            </div>

            <div
              className={`flex items-center justify-center gap-8 text-base ${theme.textLight} font-bold`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <span>Free forever plan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="inline-block mb-6">
              <span
                className={`${theme.secondary} text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-wider ${theme.shadow}`}
              >
                FAQ
              </span>
            </div>
            <h2
              className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tight ${theme.text}`}
            >
              Frequently asked
              <br />
              questions
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-6">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className={`${theme.cardBg} rounded-[2rem] px-8 ${theme.shadow} ${theme.hoverShadow} hover:scale-[1.02] transition-all border-none`}
                >
                  <AccordionTrigger
                    className={`text-left py-8 ${theme.text} hover:no-underline font-black text-xl`}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent
                    className={`${theme.textLight} pb-8 leading-relaxed text-lg font-semibold`}
                  >
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${theme.cardBg} py-16 ${theme.shadow}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:justify-between gap-10 mb-10">
            <div className="flex items-center gap-4">
              <div className={`${theme.primary} p-4 rounded-3xl ${theme.shadow}`}>
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <span className={`text-3xl font-black ${theme.text}`}>CertLab</span>
            </div>
            <div className="flex flex-wrap gap-8">
              <button
                onClick={handleScrollToFeatures}
                className={`${theme.text} hover:scale-105 transition-transform motion-reduce:transform-none font-bold text-lg`}
              >
                Features
              </button>
              <button
                onClick={handleScrollToFaq}
                className={`${theme.text} hover:scale-105 transition-transform motion-reduce:transform-none font-bold text-lg`}
              >
                FAQ
              </button>
            </div>
          </div>
          <div
            className={`pt-8 border-t-2 ${theme.text} border-opacity-20 text-center md:text-left`}
          >
            <p className={`select-none ${theme.textLight} font-bold text-lg`}>
              © {new Date().getFullYear()} CertLab. All rights reserved. Built with AI-powered
              learning technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
