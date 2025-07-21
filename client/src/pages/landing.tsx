import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, BookOpen, Trophy, Users, ArrowRight, CheckCircle } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CertLab</h1>
          </div>
          <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Master Your 
            <span className="text-blue-600 dark:text-blue-400"> Certification Journey</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            AI-powered learning platform designed to help you ace cybersecurity certifications with 
            personalized study paths, adaptive quizzes, and real-world practice scenarios.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleLogin} size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              Start Learning
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose CertLab?
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Our platform combines cutting-edge AI with authentic certification content to deliver 
            the most effective learning experience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Adaptive Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                AI-powered algorithms adjust difficulty and focus areas based on your performance, 
                ensuring optimal learning efficiency.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Achievement System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Stay motivated with badges, streaks, and progress tracking that makes learning 
                engaging and rewarding.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Expert Content</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Access thousands of authentic certification questions and AI-generated study 
                materials from industry experts.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Certifications Section */}
      <section className="bg-white dark:bg-gray-800 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Supported Certifications
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Comprehensive preparation for industry-leading cybersecurity certifications
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "CISSP", desc: "Certified Information Systems Security Professional", count: "15,582 questions" },
              { name: "Cloud+", desc: "CompTIA Cloud+ Certification", count: "20,763 questions" },
              { name: "CC", desc: "Certified in Cybersecurity", count: "8,375 questions" },
              { name: "CGRC", desc: "Certified in Governance, Risk and Compliance", count: "6,153 questions" },
              { name: "CISM", desc: "Certified Information Security Manager", count: "5,259 questions" },
              { name: "CISA", desc: "Certified Information Systems Auditor", count: "1,540 questions" },
            ].map((cert) => (
              <Card key={cert.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    {cert.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm mb-2">{cert.desc}</CardDescription>
                  <p className="text-xs text-blue-600 font-medium">{cert.count}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Start Your Journey?
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of professionals who have advanced their careers with CertLab's 
            AI-powered certification training.
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-12 py-3">
            Get Started Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-6 w-6" />
            <span className="text-xl font-bold">CertLab</span>
          </div>
          <p className="text-gray-400">
            Empowering cybersecurity professionals with AI-driven learning solutions.
          </p>
        </div>
      </footer>
    </div>
  );
}