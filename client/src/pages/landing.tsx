import { useState, lazy, Suspense, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { GraduationCap, ArrowRight, Brain, Shield, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load Login component to reduce initial bundle size
const Login = lazy(() => import('./login'));

// Features data
const features = [
  {
    title: 'Adaptive Learning',
    description:
      'AI-powered system adapts to your learning pace and identifies knowledge gaps automatically.',
    icon: Brain,
  },
  {
    title: 'Enterprise Ready',
    description:
      'Secure multi-tenant architecture designed for organizations and teams of any size.',
    icon: Shield,
  },
  {
    title: 'Smart Lectures',
    description: 'AI generates personalized lectures based on your weak topics and learning style.',
    icon: BookOpen,
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
];

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <div className="min-h-screen bg-black flex items-center justify-center">
            <LoadingSpinner size="lg" label="Loading login..." />
          </div>
        }
      >
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="py-4 bg-black sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="relative">
              <div className="absolute w-full top-2 bottom-0 bg-[linear-gradient(to_right,rgb(252,214,255),rgb(41,216,255),rgb(255,253,128),rgb(248,154,191),rgb(252,214,255))] blur-md" />
              <div className="relative flex items-center gap-2">
                <GraduationCap className="h-10 w-10 text-white" />
                <span className="text-xl font-bold">CertLab</span>
              </div>
            </div>
            <button
              className="border border-white/30 size-10 inline-flex justify-center items-center rounded-lg md:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={handleToggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X className="text-white w-5 h-5" />
              ) : (
                <Menu className="text-white w-5 h-5" />
              )}
            </button>
            <nav className="text-white/60 items-center gap-6 hidden md:flex">
              <button
                onClick={handleScrollToFeatures}
                className="hover:text-white transition duration-300"
              >
                Features
              </button>
              <button
                onClick={handleScrollToFaq}
                className="hover:text-white transition duration-300"
              >
                FAQ
              </button>
              {isAuthenticated ? (
                <button
                  onClick={handleGoToDashboard}
                  className="bg-white py-2 px-4 rounded-lg text-black font-medium"
                  data-testid="dashboard-button"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="bg-white py-2 px-4 rounded-lg text-black font-medium"
                  data-testid="get-started-button"
                >
                  Get Started
                </button>
              )}
            </nav>
          </div>
          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden mt-4 py-4 border-t border-white/20">
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleScrollToFeatures}
                  className="text-white/60 hover:text-white transition duration-300 text-left"
                >
                  Features
                </button>
                <button
                  onClick={handleScrollToFaq}
                  className="text-white/60 hover:text-white transition duration-300 text-left"
                >
                  FAQ
                </button>
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      handleGoToDashboard();
                      setMobileMenuOpen(false);
                    }}
                    className="bg-white py-2 px-4 rounded-lg text-black font-medium text-center"
                  >
                    Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleLogin();
                      setMobileMenuOpen(false);
                    }}
                    className="bg-white py-2 px-4 rounded-lg text-black font-medium text-center"
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
      <section className="relative py-[72px] md:py-24 bg-[linear-gradient(to_bottom,#000,#200d42_34%,#4f21a1_65%,#a46edb_82%)] overflow-clip">
        <div className="absolute h-[375px] w-[750px] sm:w-[900px] md:w-[1536px] md:h-[768px] lg:w-[2400px] lg:h-[1200px] rounded-[100%] bg-black left-1/2 -translate-x-1/2 border border-[#b48cde] bg-[radial-gradient(closest-side,#000_82%,#9560eb)] top-[calc(100%-96px)] md:top-[calc(100%-120px)]" />
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-center">
            <button
              className="border border-white/30 py-1 px-2 rounded-lg inline-flex gap-3"
              onClick={handleScrollToFeatures}
            >
              <span className="bg-[linear-gradient(to_right,#f87aff,#fb93d0,#ffdd99,#c3f0b2,#2fd8fe)] bg-clip-text text-transparent">
                AI-Powered Learning
              </span>
              <span className="inline-flex items-center gap-1">
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
          <div className="flex justify-center mt-8">
            <div className="inline-flex relative">
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-center">
                Master Your
                <br /> Certifications
              </h1>
            </div>
          </div>
          <div className="flex justify-center">
            <p className="text-center text-base sm:text-lg md:text-xl mt-8 max-w-md text-white/70 px-2">
              The intelligent learning platform that adapts to you. Pass CISSP, CISM, and other
              professional certifications with confidence.
            </p>
          </div>
          <div className="flex justify-center mt-8">
            {isAuthenticated ? (
              <div className="text-center">
                <p className="text-white/70 mb-4">Welcome back, {getUserDisplayName(user)}!</p>
                <button
                  onClick={handleGoToDashboard}
                  className="bg-white text-black py-3 px-5 rounded-lg font-medium"
                  data-testid="hero-dashboard-button"
                >
                  Continue Learning
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-white text-black py-3 px-5 rounded-lg font-medium"
                data-testid="hero-get-started-button"
              >
                Get Started Free
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-black py-[72px] md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tighter">
            Everything you need
          </h2>
          <div className="max-w-xl mx-auto">
            <p className="text-center mt-5 text-xl text-white/70">
              Enjoy adaptive quizzes, smart lectures, and progress tracking all in one place. Set
              goals, get reminders, and see your improvement simply and quickly.
            </p>
          </div>
          <div className="mt-16 flex flex-col md:flex-row gap-4">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="border border-white/30 px-5 py-10 text-center rounded-xl md:flex-1"
              >
                <div className="inline-flex h-14 w-14 bg-white text-black justify-center items-center rounded-lg">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-6 font-bold">{title}</h3>
                <p className="mt-2 text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-black py-[72px] md:py-24 text-center">
        <div className="container mx-auto px-4 max-w-xl relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
            Get instant access
          </h2>
          <p className="text-xl text-white/70 mt-5">
            Start your certification journey today with an app designed to track your progress and
            motivate your efforts.
          </p>
          <div className="mt-10 flex flex-col gap-2.5 max-w-sm mx-auto md:flex-row">
            {isAuthenticated ? (
              <button
                onClick={handleGoToDashboard}
                className="bg-white text-black h-12 rounded-lg px-5 font-medium w-full"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-white text-black h-12 rounded-lg px-5 font-medium w-full"
              >
                Start Free Trial
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-[72px] md:py-24 bg-gradient-to-b from-[#5f2ca8] to-black">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl lg:max-w-[648px] mx-auto text-center font-bold tracking-tighter">
            Frequently asked questions
          </h2>
          <div className="mt-12 max-w-[648px] mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-white/30">
                  <AccordionTrigger className="text-left py-4 text-white hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white/60 py-5 border-t border-white/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:justify-between gap-4">
            <div className="text-center md:text-left select-none">
              © {new Date().getFullYear()} CertLab. All rights reserved
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleScrollToFeatures}
                className="hover:text-white transition duration-200"
              >
                Features
              </button>
              <button
                onClick={handleScrollToFaq}
                className="hover:text-white transition duration-200"
              >
                FAQ
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
