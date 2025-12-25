import { useState, lazy, Suspense, useCallback } from 'react';
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

// Modern professional color schemes with sophisticated palettes
const COLOR_SCHEMES = {
  slate: {
    name: 'Slate Professional',
    bg: 'bg-[#F8FAFC]',
    bgHex: '#F8FAFC',
    cardBg: 'bg-[#F1F5F9]',
    primary: 'bg-gradient-to-br from-[#0891B2] to-[#06B6D4]',
    secondary: 'bg-gradient-to-br from-[#F59E0B] to-[#FBBF24]',
    text: 'text-[#0F172A]',
    textLight: 'text-[#475569]',
    // Modern soft shadows for depth
    shadow: 'shadow-[10px_10px_20px_rgba(15,23,42,0.08),-10px_-10px_20px_rgba(255,255,255,0.9)]',
    hoverShadow:
      'hover:shadow-[15px_15px_30px_rgba(15,23,42,0.12),-15px_-15px_30px_rgba(255,255,255,1)]',
    innerShadow:
      'shadow-[inset_8px_8px_16px_rgba(15,23,42,0.06),inset_-8px_-8px_16px_rgba(255,255,255,0.95)]',
    // Button styling for color switcher
    buttonGradient: 'from-[#0891B2] to-[#06B6D4]',
    buttonShadow: 'shadow-[6px_6px_12px_rgba(15,23,42,0.15),-6px_-6px_12px_rgba(255,255,255,0.9)]',
    buttonRing: 'ring-[#0891B2]',
  },
  olive: {
    name: 'Dark Olive',
    bg: 'bg-[#F5F3EF]',
    bgHex: '#F5F3EF',
    cardBg: 'bg-[#EBE7E0]',
    primary: 'bg-gradient-to-br from-[#6B8E23] to-[#8BA83F]',
    secondary: 'bg-gradient-to-br from-[#D2691E] to-[#E07B39]',
    text: 'text-[#3A3428]',
    textLight: 'text-[#5A5248]',
    shadow: 'shadow-[10px_10px_20px_rgba(58,52,40,0.1),-10px_-10px_20px_rgba(255,255,255,0.85)]',
    hoverShadow:
      'hover:shadow-[15px_15px_30px_rgba(58,52,40,0.15),-15px_-15px_30px_rgba(255,255,255,0.95)]',
    innerShadow:
      'shadow-[inset_8px_8px_16px_rgba(58,52,40,0.08),inset_-8px_-8px_16px_rgba(255,255,255,0.9)]',
    // Button styling for color switcher
    buttonGradient: 'from-[#6B8E23] to-[#8BA83F]',
    buttonShadow: 'shadow-[6px_6px_12px_rgba(58,52,40,0.15),-6px_-6px_12px_rgba(255,255,255,0.85)]',
    buttonRing: 'ring-[#6B8E23]',
  },
  midnight: {
    name: 'Midnight Blue',
    bg: 'bg-[#F0F4F8]',
    bgHex: '#F0F4F8',
    cardBg: 'bg-[#E2EAF1]',
    primary: 'bg-gradient-to-br from-[#1E40AF] to-[#3B82F6]',
    secondary: 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA]',
    text: 'text-[#1E293B]',
    textLight: 'text-[#475569]',
    shadow: 'shadow-[10px_10px_20px_rgba(30,41,59,0.09),-10px_-10px_20px_rgba(255,255,255,0.88)]',
    hoverShadow:
      'hover:shadow-[15px_15px_30px_rgba(30,41,59,0.13),-15px_-15px_30px_rgba(255,255,255,0.98)]',
    innerShadow:
      'shadow-[inset_8px_8px_16px_rgba(30,41,59,0.07),inset_-8px_-8px_16px_rgba(255,255,255,0.93)]',
    // Button styling for color switcher
    buttonGradient: 'from-[#1E40AF] to-[#3B82F6]',
    buttonShadow: 'shadow-[6px_6px_12px_rgba(30,41,59,0.15),-6px_-6px_12px_rgba(255,255,255,0.88)]',
    buttonRing: 'ring-[#1E40AF]',
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
  const [colorScheme, setColorScheme] = useState<ColorScheme>('slate');

  const theme = COLOR_SCHEMES[colorScheme];

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
        className="hidden md:fixed md:top-24 md:right-6 z-50 md:flex flex-col gap-3"
        role="group"
        aria-label="Color theme selector"
      >
        <div className={`${theme.cardBg} ${theme.shadow} rounded-3xl p-2 flex flex-col gap-2`}>
          {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((schemeKey) => {
            const scheme = COLOR_SCHEMES[schemeKey];
            const isActive = colorScheme === schemeKey;

            return (
              <button
                key={schemeKey}
                onClick={() => setColorScheme(schemeKey)}
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${scheme.buttonGradient} ${
                  isActive ? `ring-4 ${scheme.buttonRing} ring-offset-2` : ''
                } ${scheme.buttonShadow} hover:scale-110 transition-all duration-300 motion-reduce:transform-none`}
                style={
                  isActive
                    ? ({ '--tw-ring-offset-color': scheme.bgHex } as React.CSSProperties)
                    : undefined
                }
                aria-label={`${scheme.name} theme`}
                aria-pressed={isActive}
                title={scheme.name}
              />
            );
          })}
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
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
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
            {features.map(({ title, description, icon: Icon }) => (
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
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className={`${theme.cardBg} rounded-[2.5rem] p-10 ${theme.shadow} ${theme.hoverShadow} hover:scale-105 transition-all motion-reduce:transform-none`}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-500" />
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
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  value={faq.question}
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
