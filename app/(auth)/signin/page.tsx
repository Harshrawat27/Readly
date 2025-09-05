'use client';
import { signIn, useSession } from '@/lib/auth-client';
import { useState, useEffect } from 'react';
// import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  // const [email, setEmail] = useState('');
  // const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [error, setError] = useState('');
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect to app if already authenticated (only after loading is complete)
  useEffect(() => {
    if (!isPending && session) {
      router.push('/new');
    }
  }, [session, isPending, router]);

  // Show loading while checking session
  if (isPending) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[var(--background)]'>
        <div className='text-center space-y-4'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto'></div>
          <p className='text-[var(--text-muted)] text-sm'>Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting authenticated users
  if (session) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[var(--background)]'>
        <div className='text-center space-y-4'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto'></div>
          <p className='text-[var(--text-muted)] text-sm'>Redirecting...</p>
        </div>
      </div>
    );
  }
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: '/new',
      });
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setIsGitHubLoading(true);
    setError('');
    try {
      await signIn.social({
        provider: 'github',
        callbackURL: '/new',
      });
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in with GitHub. Please try again.');
    } finally {
      setIsGitHubLoading(false);
    }
  };

  // Commented out email/password functionality
  /*
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailLoading(true);
    setError('');
    try {
      await signIn.email({
        email,
        password,
        callbackURL: '/new',
      });
    } catch (error) {
      console.error('Email sign-in error:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsEmailLoading(false);
    }
  };
  */
  return (
    <div className='min-h-screen flex'>
      {/* Left side - Sign in form */}
      <div className='flex-1 flex items-center justify-center px-8 py-12 text-center'>
        <div className='w-full max-w-[400px] space-y-8'>
          {/* Logo */}
          <div className='flex items-center justify-center gap-3 mb-16'>
            <Image
              src='/logo-white.svg'
              alt='ReaditEasy Logo'
              width={32}
              height={32}
              className='object-contain'
            />

            <span className='text-[22px] font-medium text-[var(--text-primary)]'>
              ReaditEasy
            </span>
          </div>

          {/* Header */}
          <div className='space-y-3 mb-12'>
            <h1 className='text-[56px] font-light leading-[1.1] text-[var(--text-primary)] tracking-[-0.02em]'>
              Your ideas,
              <br />
              amplified
            </h1>
            <p className='text-[18px] text-[var(--text-secondary)] leading-[1.4] mt-4'>
              Privacy-first AI that helps you create in confidence.
            </p>
          </div>

          {/* Sign in form */}
          <div className='space-y-4'>
            {/* Error message */}
            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[10px] text-[14px]'>
                {error}
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isGitHubLoading || isEmailLoading}
              className='group w-full flex items-center justify-center gap-3 px-4 py-[14px] border border-[var(--border)] rounded-[10px] hover:bg-[var(--faded-white)] transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg className='w-5 h-5' viewBox='0 0 24 24'>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                />
              </svg>
              {isGoogleLoading ? (
                <div className='w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin'></div>
              ) : (
                <span className='text-[15px] font-medium text-black group-hover:text-white'>
                  Continue with Google
                </span>
              )}
            </button>

            <button
              onClick={handleGitHubSignIn}
              disabled={isGoogleLoading || isGitHubLoading || isEmailLoading}
              className='group w-full flex items-center justify-center gap-3 px-4 py-[14px] border border-[var(--border)] rounded-[10px] hover:bg-[var(--faded-white)] transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='black'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M12 0.296875C5.372 0.296875 0 5.66887 0 12.2969C0 17.6889 3.438 22.2099 8.205 23.7999C8.805 23.9099 9.025 23.5499 9.025 23.2299C9.025 22.9399 9.015 22.1599 9.01 21.1799C5.672 21.8999 4.968 19.5899 4.968 19.5899C4.422 18.1599 3.633 17.7999 3.633 17.7999C2.546 17.0599 3.717 17.0799 3.717 17.0799C4.922 17.1599 5.555 18.3199 5.555 18.3199C6.633 20.1599 8.422 19.6599 9.05 19.3599C9.158 18.5799 9.467 18.0399 9.81 17.7399C7.145 17.4399 4.343 16.3799 4.343 11.6699C4.343 10.3399 4.801 9.25987 5.572 8.41987C5.444 8.11987 5.032 6.85987 5.688 5.20987C5.688 5.20987 6.703 4.88987 9 6.51987C9.982 6.23987 11.038 6.09987 12.094 6.09487C13.15 6.09987 14.206 6.23987 15.189 6.51987C17.484 4.88987 18.498 5.20987 18.498 5.20987C19.155 6.85987 18.744 8.11987 18.616 8.41987C19.39 9.25987 19.844 10.3399 19.844 11.6699C19.844 16.3899 17.037 17.4349 14.361 17.7299C14.805 18.1099 15.202 18.8799 15.202 20.0299C15.202 21.6899 15.188 22.8799 15.188 23.2299C15.188 23.5499 15.406 23.9149 16.016 23.7949C20.785 22.2049 24 17.6839 24 12.2969C24 5.66887 18.627 0.296875 12 0.296875Z'
                />
              </svg>

              {isGitHubLoading ? (
                <div className='w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin'></div>
              ) : (
                <span className='text-[15px] font-medium text-black group-hover:text-white'>
                  Continue with GitHub
                </span>
              )}
            </button>

            {/* Divider */}
            {/* <div className='relative my-6'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-[var(--divider)]'></div>
              </div>
              <div className='relative flex justify-center text-[14px]'>
                <span className='px-3 bg-[var(--background)] text-[var(--text-muted)]'>
                  OR
                </span>
              </div>
            </div> */}

            {/* Commented out Email/Password form */}
            {/* <form onSubmit={handleEmailSignIn} className='space-y-4'>
              <input
                type='email'
                placeholder='Enter your personal or work email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='w-full px-4 py-[14px] border border-[var(--input-border)] rounded-[10px] text-[15px] placeholder-[var(--text-muted)] bg-[var(--input-background)] focus:outline-none focus:border-[var(--text-primary)] transition-colors'
              />

              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Enter your password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='w-full px-4 py-[14px] border border-[var(--input-border)] rounded-[10px] text-[15px] placeholder-[var(--text-muted)] bg-[var(--input-background)] focus:outline-none focus:border-[var(--text-primary)] transition-colors'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <button
                type='submit'
                disabled={isGoogleLoading || isGitHubLoading || isEmailLoading}
                className='w-full bg-[var(--button-primary)] text-[var(--button-primary-text)] py-[14px] rounded-[10px] text-[15px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {isEmailLoading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className='text-center'>
                <span className='text-[14px] text-[var(--text-secondary)]'>
                  Don&apos;t have an account?{' '}
                  <Link href='/signup' className='hover:underline font-medium'>
                    <strong className='text-accent'>Sign Up</strong>
                  </Link>
                </span>
              </div>
            </form> */}

            {/* <div className='text-center'>
              <span className='text-[14px] text-[var(--text-secondary)]'>
                Don&apos;t have an account?{' '}
                <Link href='/signup' className='hover:underline font-medium'>
                  <strong className='text-accent'>Sign Up</strong>
                </Link>
              </span>
            </div> */}
          </div>

          {/* Learn more link
          <div className='flex justify-center pt-12'>
            <a
              href='#'
              className='text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors'
            >
              Learn more
              <svg
                className='w-4 h-4 transform rotate-90'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </a>
          </div> */}

          {/* Pagination dots */}
          {/* <div className='flex justify-center gap-2 pt-6'>
            <div className='w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-30'></div>
            <div className='w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-30'></div>
            <div className='w-2 h-2 rounded-full bg-[var(--text-primary)]'></div>
          </div> */}
        </div>
      </div>

      {/* Right side - PDF Chat Sliders */}
      <div className='hidden lg:flex flex-1 bg-[var(--faded-white)] items-center justify-center px-8 py-12'>
        <div className='w-full max-w-lg'>
          <ChatSliders />
        </div>
      </div>
    </div>
  );
}

// Chat Sliders Component
function ChatSliders() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<{
    [key: number]: number;
  }>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  });

  const chatData = [
    {
      pdfTitle: 'Steve Jobs Biography',
      messages: [
        {
          role: 'user',
          content: "What was Steve Jobs' key philosophy on product design?",
        },
        {
          role: 'assistant',
          content:
            'Steve Jobs believed in simplicity and perfection. He famously said "Simplicity is the ultimate sophistication" and insisted that great products should be intuitive, with every detail serving a purpose.',
          citations: ['Page 127', 'Chapter 8'],
        },
      ],
    },
    {
      pdfTitle: 'Financial Charts Analysis',
      messages: [
        {
          role: 'user',
          content: 'Can you analyze this chart from the report?',
          imageData:
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIgc3Ryb2tlPSIjZGRkIi8+CiAgPGxpbmUgeDE9IjIwIiB5MT0iODAiIHgyPSIxODAiIHkyPSI4MCIgc3Ryb2tlPSIjY2NjIi8+CiAgPGxpbmUgeDE9IjIwIiB5MT0iMjAiIHgyPSIyMCIgeTI9IjgwIiBzdHJva2U9IiNjY2MiLz4KICA8cGF0aCBkPSJNMjAsNzAgNDAsNTAgNjAsNjAgODAsNDAgMTAwLDMwIDEyMCwzNSAxNDAsMjUgMTYwLDMwIDE4MCwyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDI4NWY0IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxMDAiIHk9IjE1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0iQXJpYWwiIGZpbGw9IiM2NjYiPlJldmVudWUgR3Jvd3RoPC90ZXh0Pgo8L3N2Zz4=',
        },
        {
          role: 'assistant',
          content:
            'This revenue growth chart shows a positive upward trend over the time period. The data indicates consistent growth with some minor fluctuations, suggesting healthy business performance and market expansion.',
          citations: ['Page 18', 'Figure 3.2'],
        },
      ],
    },
    {
      pdfTitle: 'The Psychology of Persuasion',
      messages: [
        {
          role: 'user',
          content:
            'What are the 6 principles of influence mentioned in this book?',
        },
        {
          role: 'assistant',
          content:
            'Robert Cialdini outlines six key principles: Reciprocity, Commitment & Consistency, Social Proof, Authority, Liking, and Scarcity. These principles explain how people make decisions and can be ethically applied in persuasion.',
          citations: ['Page 8-12', 'Introduction'],
        },
      ],
    },
    {
      pdfTitle: 'Clean Code Principles',
      messages: [
        {
          role: 'user',
          content: 'What makes code "clean" according to this book?',
        },
        {
          role: 'assistant',
          content:
            'Clean code is readable, simple, and expressive. It should be written for humans to read, not just computers to execute. Key principles include meaningful names, small functions, and clear intent.',
          citations: ['Chapter 2', 'Page 34'],
        },
      ],
    },
  ];

  // Auto-advance slides every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % chatData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [chatData.length]);

  // Show messages with staggered animation for current slide
  useEffect(() => {
    // Reset visibility
    setVisibleMessages((prev) => ({ ...prev, [currentSlide]: 0 }));

    const showUserMessage = setTimeout(() => {
      setVisibleMessages((prev) => ({ ...prev, [currentSlide]: 1 }));
    }, 300);

    const showAssistantMessage = setTimeout(() => {
      setVisibleMessages((prev) => ({ ...prev, [currentSlide]: 2 }));
    }, 800);

    return () => {
      clearTimeout(showUserMessage);
      clearTimeout(showAssistantMessage);
    };
  }, [currentSlide]);

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentChat = chatData[currentSlide];
  const currentVisibleCount = visibleMessages[currentSlide];

  return (
    <div className='w-full'>
      {/* Chat Messages - No box styling */}
      <div className='space-y-4 min-h-[400px] flex flex-col overflow-hidden'>
        {/* User Message */}
        <div
          className={`flex justify-end transition-all duration-500 ease-out ${
            currentVisibleCount >= 1
              ? 'opacity-100 transform-none'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className='bg-[#0F0F0E] text-white rounded-lg p-3 max-w-[80%] shadow-sm'>
            {/* Image if present */}
            {'imageData' in currentChat.messages[0] &&
              currentChat.messages[0].imageData && (
                <div className='mb-2'>
                  <Image
                    src={currentChat.messages[0].imageData}
                    alt='Selected from PDF'
                    width={200}
                    height={128}
                    className='max-w-full h-32 object-contain rounded border bg-white'
                  />
                </div>
              )}
            <div className='text-sm break-words whitespace-pre-wrap'>
              {currentChat.messages[0].content}
            </div>
            <div className='text-xs text-white/70 mt-2'>{formatTime()}</div>
          </div>
        </div>

        {/* Assistant Message */}
        <div
          className={`flex justify-start transition-all duration-500 ease-out ${
            currentVisibleCount >= 2
              ? 'opacity-100 transform-none'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className='min-w-0 rounded-lg p-3 max-w-[80%] break-words overflow-hidden group bg-white shadow-sm border border-gray-200'>
            <div
              className='text-sm text-gray-800 break-words leading-relaxed overflow-wrap-break-word'
              style={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {currentChat.messages[1].content}
            </div>

            {/* Citations - Circular like in image */}
            {currentChat.messages[1].citations && (
              <div className='mt-3 flex flex-wrap gap-1'>
                {currentChat.messages[1].citations.map((citation, index) => (
                  <span
                    key={index}
                    className='inline-flex items-center justify-center w-10 h-6 bg-orange-100 text-orange-600 text-xs rounded-full border border-orange-200 font-medium'
                  >
                    {citation.includes('Page')
                      ? citation.replace('Page ', '')
                      : citation.includes('Chapter')
                      ? citation.replace('Chapter ', '')
                      : String(index + 1)}
                  </span>
                ))}
              </div>
            )}

            <div className='text-xs text-gray-500 mt-2 flex items-center justify-between'>
              <span>{formatTime()}</span>
            </div>

            {/* Action Icons - Copy, Like, Dislike, Read Aloud */}
            <div className='flex items-center gap-2 mt-2 transition-opacity'>
              {/* Copy */}
              <button className='flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors'>
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
                  <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                </svg>
              </button>

              {/* Like */}
              <button className='flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors'>
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M7 10v12' />
                  <path d='M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z' />
                </svg>
              </button>

              {/* Dislike */}
              <button className='flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors'>
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M17 14V2' />
                  <path d='M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z' />
                </svg>
              </button>

              {/* Read Aloud */}
              <button className='flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors'>
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M11 5L6 9H2v6h4l5 4V5Z' />
                  <path d='M15.54 8.46a5 5 0 0 1 0 7.07' />
                  <path d='M19.07 4.93a10 10 0 0 1 0 14.14' />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className='flex-1' />
      </div>

      {/* Slide indicators (3 dots below) */}
      <div className='flex justify-center gap-2 mt-6'>
        {chatData.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentSlide ? 'bg-[var(--accent)]' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
