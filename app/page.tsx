'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (!isPending && session) {
      router.push('/new');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Navigation */}
      <nav className="border-b backdrop-blur-xl sticky top-0 z-50" style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.8)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#c96342] to-[#e07c54] bg-clip-text text-transparent">
                ReadItEasy
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/signin"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white shadow-lg"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#c96342]/10 via-transparent to-[#e07c54]/10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-[#c96342]/20 to-[#e07c54]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-[#e07c54]/20 to-[#c96342]/20 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                  Meet{' '}
                  <span className="inline-flex items-center px-4 py-2 rounded-2xl text-lg font-bold mr-3 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white shadow-xl">
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    AI
                  </span>
                  <br />as Your Personal AI Reader
                </h1>
                <p className="text-xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Transform your PDF reading experience with AI-powered analysis, smart annotations, and intelligent conversations with your documents.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <Link
                  href="/signup"
                  className="group px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 hover:scale-105 text-center bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white shadow-2xl hover:shadow-[#c96342]/25"
                >
                  Try Now 
                  <svg className="inline w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </Link>
                <Link
                  href="/signin"
                  className="group px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 hover:scale-105 text-center border-2 border-[#c96342]/30 hover:border-[#c96342] hover:bg-[#c96342]/5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg className="inline w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  Watch Demo
                </Link>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="relative w-full max-w-lg mx-auto">
                {/* Main AI Reader Image Placeholder with glassmorphism */}
                <div className="relative w-full h-96 rounded-3xl shadow-2xl transform rotate-6 hover:rotate-3 transition-all duration-500 bg-gradient-to-br from-[#c96342] via-[#d96b47] to-[#e07c54] border border-white/20 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-white/10 rounded-3xl"></div>
                  <div className="h-full w-full flex items-center justify-center relative z-10">
                    <div className="text-center text-white">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <p className="font-bold text-xl">AI Reader Visual</p>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements with premium design */}
                <div className="absolute -top-4 -left-4 w-28 h-28 rounded-3xl shadow-2xl animate-float bg-gradient-to-br from-white to-gray-50 border border-gray-200 backdrop-blur-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#c96342]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                
                <div className="absolute -bottom-4 -right-4 w-36 h-28 rounded-3xl shadow-2xl animate-pulse bg-gradient-to-br from-white to-gray-50 border border-gray-200 backdrop-blur-xl flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-6 h-6 text-[#c96342] mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 11H7v4h2v-4zm4 0h-2v4h2v-4zm4 0h-2v4h2v-4zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V8h14v12z"/>
                    </svg>
                    <span className="text-sm font-bold text-[#c96342]">Smart Analysis</span>
                  </div>
                </div>

                {/* Additional floating element */}
                <div className="absolute top-1/2 -left-8 w-20 h-20 rounded-2xl shadow-xl animate-bounce bg-gradient-to-r from-[#c96342]/20 to-[#e07c54]/20 backdrop-blur-xl border border-white/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#c96342]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section with gradient background */}
      <div className="py-20 bg-gradient-to-r from-[#c96342]/5 via-white to-[#e07c54]/5 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4 group">
              <div className="text-5xl font-black bg-gradient-to-r from-[#c96342] to-[#e07c54] bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">100k+</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Trusted</div>
              <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Active users worldwide</p>
            </div>
            <div className="space-y-4 group">
              <div className="text-5xl font-black bg-gradient-to-r from-[#c96342] to-[#e07c54] bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">750k</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Documents</div>
              <p className="text-lg" style={{ color: 'var(--text-muted)' }}>PDFs analyzed daily</p>
            </div>
            <div className="space-y-4 group">
              <div className="text-5xl font-black bg-gradient-to-r from-[#c96342] to-[#e07c54] bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">85%</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Comprehension</div>
              <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Increase in understanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#c96342]/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* Left Visual */}
            <div className="relative order-2 lg:order-1">
              <div className="w-full h-96 rounded-3xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-all duration-500 bg-gradient-to-br from-white via-gray-50 to-[#c96342]/10 border border-gray-200 backdrop-blur-xl">
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-20 h-20 text-[#c96342] mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <p className="font-bold text-xl text-[#c96342]">Reading Experience</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div className="space-y-8 order-1 lg:order-2">
              <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-[#c96342] bg-clip-text text-transparent">
                Transform Your Reading Experience with Ease
              </h2>
              
              {/* User Avatars with premium design */}
              <div className="flex items-center gap-6">
                <div className="flex -space-x-4">
                  <div className="w-12 h-12 rounded-full border-4 border-white bg-gradient-to-r from-[#c96342] to-[#e07c54] shadow-lg"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-white bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-lg"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-white bg-gradient-to-r from-[#059669] to-[#10b981] shadow-lg"></div>
                </div>
                <div className="text-base" style={{ color: 'var(--text-muted)' }}>
                  <strong className="bg-gradient-to-r from-[#c96342] to-[#e07c54] bg-clip-text text-transparent">1000+</strong> students and professionals use ReadItEasy daily
                </div>
              </div>

              <p className="text-xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Experience the power of AI-driven document analysis. Chat with your PDFs, generate mind maps, and understand complex content with unprecedented ease.
              </p>
              
              <Link
                href="/signup"
                className="group inline-flex items-center px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white shadow-xl hover:shadow-2xl"
              >
                Try Now 
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section with premium cards */}
      <div className="py-24 bg-gradient-to-br from-gray-50 via-white to-[#c96342]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-8 bg-gradient-to-r from-gray-900 via-gray-800 to-[#c96342] bg-clip-text text-transparent">
              Experience the Unique Benefits of Choosing ReadItEasy AI
            </h2>
            <p className="text-xl max-w-4xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Unlock the full potential of your PDF documents with our comprehensive AI analysis tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Accessibility Text */}
            <div className="group p-8 rounded-3xl border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-white via-gray-50 to-[#c96342]/5 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-r from-[#c96342] to-[#e07c54] shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#c96342] bg-clip-text text-transparent">Accessibility Text</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Make your documents accessible with AI-powered text extraction and readability enhancements for everyone.
              </p>
            </div>

            {/* High Accuracy Text */}
            <div className="group p-8 rounded-3xl border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-white via-gray-50 to-[#4f46e5]/5 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#4f46e5] bg-clip-text text-transparent">High Accuracy Text</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Get advanced AI technology for accurate content processing and precision analysis capabilities.
              </p>
            </div>

            {/* Voice Options Text */}
            <div className="group p-8 rounded-3xl border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-white via-gray-50 to-[#059669]/5 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-r from-[#059669] to-[#10b981] shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#059669] bg-clip-text text-transparent">Voice Options Text</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Listen to your documents with natural text-to-speech and voice interaction capabilities.
              </p>
            </div>

            {/* Multilingual Support Text */}
            <div className="group p-8 rounded-3xl border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-white via-gray-50 to-[#dc2626]/5 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-r from-[#dc2626] to-[#f87171] shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07M18.5,10H16.5L12,22H14L15.12,19H19.87L21,22H23L18.5,10M15.88,17L17.5,12.67L19.12,17H15.88Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#dc2626] bg-clip-text text-transparent">Multilingual Support Text</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Support for 50+ languages with intelligent translation and cross-lingual document analysis.
              </p>
            </div>

            {/* User-Friendly Interface */}
            <div className="group p-8 rounded-3xl border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-white via-gray-50 to-[#7c3aed]/5 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-r from-[#7c3aed] to-[#a855f7] shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#7c3aed] bg-clip-text text-transparent">User-Friendly Interface</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Intuitive design that makes complex document analysis simple and enjoyable for all users.
              </p>
            </div>

            {/* Integration Capabilities */}
            <div className="group p-8 rounded-3xl border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-white via-gray-50 to-[#ea580c]/5 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-r from-[#ea580c] to-[#fb923c] shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59,13.41C11,13.8 11,14.4 10.59,14.81C10.2,15.2 9.6,15.2 9.19,14.81L7.77,13.39L7.77,16A1,1 0 0,1 6.77,17H3A1,1 0 0,1 2,16V13A1,1 0 0,1 3,12H6.77L9.19,9.58C9.6,9.17 10.2,9.17 10.59,9.58C11,9.97 11,10.57 10.59,10.97L9.83,11.73L10.59,12.5C11,12.91 11,13.5 10.59,13.91L10.59,13.41M14.5,16A1,1 0 0,1 13.5,17A1,1 0 0,1 12.5,16V8A1,1 0 0,1 13.5,7A1,1 0 0,1 14.5,8V16M18,14A1,1 0 0,1 17,15A1,1 0 0,1 16,14V10A1,1 0 0,1 17,9A1,1 0 0,1 18,10V14M21.5,12A1,1 0 0,1 20.5,13A1,1 0 0,1 19.5,12V8A1,1 0 0,1 20.5,7A1,1 0 0,1 21.5,8V12Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#ea580c] bg-clip-text text-transparent">Integration Capabilities</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Seamlessly integrate with your existing workflow and favorite productivity tools.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section with premium step design */}
      <div className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c96342]/10 via-transparent to-[#e07c54]/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl lg:text-5xl font-bold mb-8 bg-gradient-to-r from-gray-900 via-gray-800 to-[#c96342] bg-clip-text text-transparent">
            Excited to try it out? See how ReadItEasy AI works.
          </h2>
          <p className="text-xl mb-16 max-w-3xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            Get started with ReadItEasy AI in 4 easy steps
          </p>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12 p-12 rounded-3xl bg-gradient-to-r from-white via-gray-50 to-[#c96342]/10 border border-gray-200 shadow-2xl backdrop-blur-xl">
              <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-[#c96342] to-[#e07c54] shadow-2xl text-white font-bold text-2xl">
                01
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#c96342] bg-clip-text text-transparent">Upload Your Document Text</h3>
                <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Simply drag and drop your PDF or select it from your device</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row items-center gap-12 p-12 rounded-3xl bg-gradient-to-r from-white via-gray-50 to-[#4f46e5]/10 border border-gray-200 shadow-2xl backdrop-blur-xl">
              <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-2xl text-white font-bold text-2xl">
                02
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#4f46e5] bg-clip-text text-transparent">Select Language and Voice Text</h3>
                <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Choose your preferred language and voice settings for optimal experience</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-12 p-12 rounded-3xl bg-gradient-to-r from-white via-gray-50 to-[#059669]/10 border border-gray-200 shadow-2xl backdrop-blur-xl">
              <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-[#059669] to-[#10b981] shadow-2xl text-white font-bold text-2xl">
                03
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#059669] bg-clip-text text-transparent">Listen and Comprehend Text</h3>
                <p className="text-lg" style={{ color: 'var(--text-muted)' }}>AI analyzes your document and provides intelligent insights and summaries</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row items-center gap-12 p-12 rounded-3xl bg-gradient-to-r from-white via-gray-50 to-[#dc2626]/10 border border-gray-200 shadow-2xl backdrop-blur-xl">
              <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-[#dc2626] to-[#f87171] shadow-2xl text-white font-bold text-2xl">
                04
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-[#dc2626] bg-clip-text text-transparent">Download and Share Text</h3>
                <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Export your analyzed content and annotations in multiple formats</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA Section with blur effects and grid */}
      <div className="relative py-32 overflow-hidden">
        {/* Background with grid pattern and blur effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#c96342] via-[#d96b47] to-[#e07c54]"></div>
          
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          ></div>
          
          {/* Blur circles */}
          <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-white/5 rounded-full blur-2xl"></div>
          
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 backdrop-blur-sm bg-white/5"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 leading-tight">
            Discover the power of effortless comprehension with ReadItEasy AI
            <span className="block text-3xl lg:text-5xl mt-4 font-light">completely free!</span>
          </h2>
          <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            Start your journey to smarter document analysis today and transform how you interact with PDFs forever
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/signup"
              className="group px-12 py-5 rounded-2xl text-xl font-bold transition-all duration-300 hover:scale-105 bg-white text-[#c96342] shadow-2xl hover:shadow-white/25 backdrop-blur-xl"
            >
              Start Free Trial 
              <svg className="inline w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </Link>
            
            <Link
              href="/signin"
              className="group px-12 py-5 rounded-2xl text-xl font-bold transition-all duration-300 hover:scale-105 bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 backdrop-blur-xl"
            >
              <svg className="inline w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              Watch Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Solutions Section with premium gradient cards */}
      <div className="py-24 bg-gradient-to-br from-gray-50 via-white to-[#c96342]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-8 bg-gradient-to-r from-gray-900 via-gray-800 to-[#c96342] bg-clip-text text-transparent">
              Solutions for Every Need
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Creative */}
            <div className="group p-10 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#a855f7] relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-3xl mb-8 mx-auto transform -rotate-6 group-hover:rotate-0 transition-transform duration-500 bg-white/20 backdrop-blur-xl shadow-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A1,1 0 0,0 14,8H18A1,1 0 0,0 19,7V5.73C18.4,5.39 18,4.74 18,4A2,2 0 0,1 20,2A2,2 0 0,1 22,4C22,4.74 21.6,5.39 21,5.73V7A3,3 0 0,1 18,10H14A3,3 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M12,15A2,2 0 0,1 14,17A2,2 0 0,1 12,19A2,2 0 0,1 10,17A2,2 0 0,1 12,15M8,2A2,2 0 0,1 10,4C10,4.74 9.6,5.39 9,5.73V7A1,1 0 0,0 10,8H14A1,1 0 0,0 15,7V5.73C14.4,5.39 14,4.74 14,4A2,2 0 0,1 16,2A2,2 0 0,1 18,4C18,4.74 17.6,5.39 17,5.73V7A3,3 0 0,1 14,10H10A3,3 0 0,1 7,7V5.73C6.4,5.39 6,4.74 6,4A2,2 0 0,1 8,2Z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-6">Creative</h3>
                <p className="text-white/90 text-center leading-relaxed">Transform creative documents with AI-powered insights and visual analysis</p>
              </div>
            </div>

            {/* Student */}
            <div className="group p-10 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-3xl mb-8 mx-auto transform rotate-6 group-hover:rotate-0 transition-transform duration-500 bg-white/20 backdrop-blur-xl shadow-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-6">Student</h3>
                <p className="text-white/90 text-center leading-relaxed">Perfect for academic research, study guides, and educational content analysis</p>
              </div>
            </div>

            {/* Creator */}
            <div className="group p-10 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-[#f59e0b] via-[#d97706] to-[#b45309] relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-3xl mb-8 mx-auto transform -rotate-3 group-hover:rotate-0 transition-transform duration-500 bg-white/20 backdrop-blur-xl shadow-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5,16L3,5H1V3H4L6,14L8,11L13,14L18,7L22,10V12L17,8L12,15L7,12L5,16M9,19A1,1 0 0,1 8,20A1,1 0 0,1 7,19A1,1 0 0,1 8,18A1,1 0 0,1 9,19M20,19A1,1 0 0,1 19,20A1,1 0 0,1 18,19A1,1 0 0,1 19,18A1,1 0 0,1 20,19Z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-6">Creator</h3>
                <p className="text-white/90 text-center leading-relaxed">Empower content creators with intelligent document processing and insights</p>
              </div>
            </div>

            {/* Company */}
            <div className="group p-10 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-[#dc2626] via-[#b91c1c] to-[#991b1b] relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-3xl mb-8 mx-auto transform rotate-3 group-hover:rotate-0 transition-transform duration-500 bg-white/20 backdrop-blur-xl shadow-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,7V3H2V21H22V7H12M6,19H4V17H6V19M6,15H4V13H6V15M6,11H4V9H6V11M6,7H4V5H6V7M10,19H8V17H10V19M10,15H8V13H10V15M10,11H8V9H10V11M10,7H8V5H10V7M20,19H12V17H14V15H12V13H14V11H12V9H20V19M18,11H16V13H18V11M18,15H16V17H18V15Z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-6">Company</h3>
                <p className="text-white/90 text-center leading-relaxed">Enterprise-grade document analysis for businesses and organizations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Subscribe CTA with dramatic gradient */}
      <div className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-[#c96342]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-6xl lg:text-8xl font-black mb-12 bg-gradient-to-r from-white via-gray-200 to-[#c96342] bg-clip-text text-transparent">
            Subscribe!
          </h2>
          <p className="text-2xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed">
            Join thousands of users transforming their document experience with cutting-edge AI technology
          </p>
          <Link
            href="/signup"
            className="group inline-flex items-center px-12 py-6 rounded-3xl text-2xl font-bold transition-all duration-300 hover:scale-110 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white shadow-2xl hover:shadow-[#c96342]/50"
          >
            Get Started Now 
            <svg className="w-7 h-7 ml-4 group-hover:translate-x-2 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Premium Footer */}
      <footer className="border-t py-16 bg-gradient-to-br from-gray-50 to-white" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-[#c96342] to-[#e07c54] bg-clip-text text-transparent">ReadItEasy</h3>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>Transform your PDF experience with AI-powered analysis and intelligent reading.</p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Product</h4>
              <div className="space-y-3">
                <Link href="/features" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Features</Link>
                <Link href="/pricing" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Pricing</Link>
                <Link href="/api" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>API</Link>
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Company</h4>
              <div className="space-y-3">
                <Link href="/about" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>About</Link>
                <Link href="/careers" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Careers</Link>
                <Link href="/contact" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Contact</Link>
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Legal</h4>
              <div className="space-y-3">
                <Link href="/privacy" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Privacy</Link>
                <Link href="/terms" className="block text-lg hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Terms</Link>
              </div>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>&copy; 2024 ReadItEasy. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}