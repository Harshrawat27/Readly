'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PDFSidebar from '@/components/PDFSidebar';
import PDFViewer from '@/components/PDFViewer';
import ChatPanel from '@/components/ChatPanel';

export default function PDFPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');

  const pdfId = params.id as string;

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/signin');
          },
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
      router.push('/signin');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/signin');
    }
  }, [session, isPending, router]);

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
      <header className='border-b border-[var(--border)] bg-[var(--card-background)] h-16 flex items-center px-6'>
        <div className='flex justify-between items-center w-full'>
          {/* Logo */}
          <div className='flex items-center gap-3'>
            <button
              onClick={() => router.push('/')}
              className='flex items-center gap-3 hover:opacity-80 transition-opacity'
            >
              <div className='w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center'>
                <svg
                  className='w-5 h-5 text-white'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                  <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                </svg>
              </div>
              <h1 className='text-xl font-semibold text-[var(--text-primary)]'>
                Readly
              </h1>
            </button>
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
      </header>

      {/* Main Three-Panel Layout */}
      <div className='flex h-[calc(100vh-4rem)]'>
        {/* PDF History Sidebar - 300px max */}
        <div className='w-80 max-w-[300px] bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0'>
          <PDFSidebar 
            onPdfSelect={(id) => router.push(`/pdf/${id}`)} 
            selectedPdfId={pdfId}
            userId={session.user.id}
          />
        </div>

        {/* PDF Viewer - Middle section */}
        <div className='flex-1 bg-[var(--pdf-viewer-bg)] relative'>
          <PDFViewer 
            pdfId={pdfId}
            onTextSelect={setSelectedText}
            selectedText={selectedText}
          />
        </div>

        {/* Chat Panel - Right section */}
        <div className='w-96 bg-[var(--chat-bg)] border-l border-[var(--border)] flex-shrink-0'>
          <ChatPanel 
            pdfId={pdfId}
            selectedText={selectedText}
            onTextSubmit={() => setSelectedText('')}
          />
        </div>
      </div>
    </div>
  );
}