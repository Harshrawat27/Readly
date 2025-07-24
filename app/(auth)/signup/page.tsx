'use client';
import Image from 'next/image';
import { signIn, signUp, useSession } from '@/lib/auth-client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [error, setError] = useState('');
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect to home if already authenticated (only after loading is complete)
  useEffect(() => {
    if (!isPending && session) {
      router.push('/');
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

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
    } catch (error) {
      console.error('Sign-up error:', error);
      setError('Failed to sign up with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGitHubSignUp = async () => {
    setIsGitHubLoading(true);
    setError('');
    try {
      await signIn.social({
        provider: 'github',
        callbackURL: '/',
      });
    } catch (error) {
      console.error('Sign-up error:', error);
      setError('Failed to sign up with GitHub. Please try again.');
    } finally {
      setIsGitHubLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailLoading(true);
    setError('');
    try {
      await signUp.email({
        email,
        password,
        name,
        callbackURL: '/',
      });
    } catch (error) {
      console.error('Email sign-up error:', error);
      setError('Failed to create account. Please try again.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex'>
      {/* Left side - Sign up form */}
      <div className='flex-1 flex items-center justify-center px-8 py-12'>
        <div className='w-full max-w-[400px] space-y-8'>
          {/* Logo */}
          <div className='flex items-center gap-3 mb-16'>
            <div className='w-7 h-7 bg-[var(--accent)] rounded-full flex items-center justify-center'>
              <svg
                className='w-4 h-4 text-white'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M12 2L2 7v10c0 5.55 3.84 10 9 9 1.41-.07 2.72-.45 3.9-1.1' />
                <path d='M22 12c0 1-.18 1.95-.5 2.84a10 10 0 0 1-2.4 3.16' />
                <path d='M8.5 8.5l7 7' />
                <path d='M15.5 8.5l-7 7' />
              </svg>
            </div>
            <span className='text-[22px] font-medium text-[var(--text-primary)]'>
              Readly
            </span>
          </div>

          {/* Header */}
          <div className='space-y-3 mb-12'>
            <h1 className='text-[56px] font-light leading-[1.1] text-[var(--text-primary)] tracking-[-0.02em]'>
              Create your
              <br />
              account
            </h1>
            <p className='text-[18px] text-[var(--text-secondary)] leading-[1.4] mt-4'>
              Join thousands of users who trust our platform.
            </p>
          </div>

          {/* Sign up form */}
          <div className='space-y-4'>
            {/* Error message */}
            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[10px] text-[14px]'>
                {error}
              </div>
            )}

            {/* Google Sign Up */}
            <button
              onClick={handleGoogleSignUp}
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
                  Sign up with Google
                </span>
              )}
            </button>

            <button
              onClick={handleGitHubSignUp}
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
                  Sign up with GitHub
                </span>
              )}
            </button>

            {/* Divider */}
            <div className='relative my-6'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-[var(--divider)]'></div>
              </div>
              <div className='relative flex justify-center text-[14px]'>
                <span className='px-3 bg-[var(--background)] text-[var(--text-muted)]'>
                  OR
                </span>
              </div>
            </div>

            {/* Email/Password form */}
            <form onSubmit={handleEmailSignUp} className='space-y-4'>
              <input
                type='text'
                placeholder='Enter your full name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className='w-full px-4 py-[14px] border border-[var(--input-border)] rounded-[10px] text-[15px] placeholder-[var(--text-muted)] bg-[var(--input-background)] focus:outline-none focus:border-[var(--text-primary)] transition-colors'
              />

              <input
                type='email'
                placeholder='Enter your email address'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='w-full px-4 py-[14px] border border-[var(--input-border)] rounded-[10px] text-[15px] placeholder-[var(--text-muted)] bg-[var(--input-background)] focus:outline-none focus:border-[var(--text-primary)] transition-colors'
              />

              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Create a password'
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
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className='text-center'>
                <span className='text-[14px] text-[var(--text-secondary)]'>
                  Already have an account?{' '}
                  <Link
                    href='/signin'
                    className='text-[var(--text-primary)] hover:underline font-medium'
                  >
                    Sign In
                  </Link>
                </span>
              </div>
            </form>
          </div>

          {/* Terms */}
          <div className='text-center pt-6'>
            <p className='text-[12px] text-[var(--text-muted)] leading-[1.4]'>
              By creating an account, you agree to our{' '}
              <a
                href='#'
                className='text-[var(--text-primary)] hover:underline'
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href='#'
                className='text-[var(--text-primary)] hover:underline'
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Placeholder for slider */}
      <div className='hidden lg:flex flex-1 bg-[var(--faded-white)] items-center justify-center px-8 py-12'>
        <div className='w-full max-w-lg'>
          <div className='bg-white rounded-[16px] border border-[var(--border)] p-8 shadow-sm'>
            <div className='text-center space-y-4'>
              <div className='w-16 h-16 bg-[var(--faded-white)] rounded-full mx-auto'></div>
              <h3 className='text-lg font-medium text-[var(--text-primary)]'>
                Join Readly Today
              </h3>
              <p className='text-[var(--text-secondary)] text-sm'>
                Start your reading journey with thousands of books at your
                fingertips.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
