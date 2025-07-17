'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      // Sign out using better-auth client
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/signin');
          },
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
      router.push('/signin'); // Fallback redirect
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to signin if not authenticated (only after loading is complete)
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/signin');
    }
  }, [session, isPending, router]);

  // Show loading while checking authentication
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

  // Show loading while redirecting unauthenticated users
  if (!session) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[var(--background)]'>
        <div className='text-center space-y-4'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto'></div>
          <p className='text-[var(--text-muted)] text-sm'>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[var(--background)] text-[var(--text-primary)]'>
      {/* Header */}
      <header className='border-b border-[var(--border)] bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-6'>
            {/* Logo */}
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center'>
                <svg
                  className='w-5 h-5 text-white'
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
              <h1 className='text-xl font-semibold text-[var(--text-primary)]'>
                Readly
              </h1>
            </div>

            {/* User Info and Logout */}
            <div className='flex items-center gap-4'>
              <div className='text-sm text-[var(--text-secondary)]'>
                Welcome, {session.user.name}
              </div>
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className='px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {isLoading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    Signing out...
                  </>
                ) : (
                  'Sign Out'
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='text-center space-y-8'>
          {/* Welcome Message */}
          <div className='space-y-4'>
            <h2 className='text-4xl font-light text-[var(--text-primary)]'>
              Welcome to Readly
            </h2>
            <p className='text-xl text-[var(--text-secondary)] max-w-2xl mx-auto'>
              Your personal reading companion. Discover, organize, and enjoy
              your favorite books all in one place.
            </p>
          </div>

          {/* User Stats Card */}
          <div className='bg-white rounded-lg border border-[var(--border)] p-8 max-w-md mx-auto'>
            <div className='space-y-4'>
              <div className='w-16 h-16 bg-[var(--faded-white)] rounded-full mx-auto flex items-center justify-center'>
                <svg
                  className='w-8 h-8 text-[var(--accent)]'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                  <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                </svg>
              </div>
              <div className='text-center'>
                <h3 className='text-lg font-medium text-[var(--text-primary)]'>
                  {session.user.name}
                </h3>
                <p className='text-sm text-[var(--text-secondary)]'>
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Coming Soon */}
          <div className='bg-[var(--faded-white)] rounded-lg p-8 max-w-2xl mx-auto'>
            <h3 className='text-2xl font-medium text-[var(--text-primary)] mb-4'>
              More Features Coming Soon
            </h3>
            <p className='text-[var(--text-secondary)]'>
              We're working on bringing you an amazing reading experience with
              book recommendations, reading progress tracking, and much more!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
