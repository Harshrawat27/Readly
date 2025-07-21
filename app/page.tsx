'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import PDFSidebar from '@/components/PDFSidebar';
import PDFViewer from '@/components/PDFViewer';
import ChatPanel from '@/components/ChatPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarContentVisible, setSidebarContentVisible] = useState(true);
  const [chatWidth, setChatWidth] = useState(384); // Default 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 600) {
        setChatWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/signin');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

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
    <div className='max-h-100vh overflow-hidden bg-[var(--background)] text-[var(--text-primary)]'>
      {/* Main Three-Panel Layout - Full height */}
      <div className='flex h-screen'>
        {/* PDF History Sidebar - Collapsible */}
        <div
          className={`bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-0' : 'w-80 max-w-[300px]'
          } overflow-hidden`}
        >
          <div className={`w-80 h-full transition-opacity duration-200 ease-in-out ${
            sidebarContentVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <PDFSidebar
              onPdfSelect={setSelectedPdfId}
              selectedPdfId={selectedPdfId}
              userId={session.user.id}
              onSignOut={handleSignOut}
              isSigningOut={isLoading}
              userName={session.user.name}
              onToggleSidebar={() => {
                if (sidebarCollapsed) {
                  // Opening sidebar: first expand, then show content
                  setSidebarCollapsed(false);
                  setTimeout(() => setSidebarContentVisible(true), 100);
                } else {
                  // Closing sidebar: first hide content, then collapse
                  setSidebarContentVisible(false);
                  setTimeout(() => setSidebarCollapsed(true), 200);
                }
              }}
              isCollapsed={sidebarCollapsed}
            />
          </div>
        </div>

        {/* PDF Viewer - Middle section */}
        <div className='flex-1 bg-[var(--pdf-viewer-bg)] relative'>
          {/* Collapse button when sidebar is collapsed */}
          {sidebarCollapsed && (
            <button
              onClick={() => {
                setSidebarCollapsed(false);
                setTimeout(() => setSidebarContentVisible(true), 100);
              }}
              className='absolute top-4 left-4 z-10 p-2 bg-[var(--card-background)] border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors'
            >
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M9 18l6-6-6-6' />
              </svg>
            </button>
          )}

          <ErrorBoundary>
            <PDFViewer
              pdfId={selectedPdfId}
              onTextSelect={setSelectedText}
              selectedText={selectedText}
            />
          </ErrorBoundary>
        </div>

        {/* Resizer */}
        <div
          className='w-1 bg-[var(--border)] hover:bg-[var(--accent)] cursor-col-resize transition-colors'
          onMouseDown={handleMouseDown}
        />

        {/* Chat Panel - Right section with resizable width */}
        <div
          className='bg-[var(--chat-bg)] border-l border-[var(--border)] flex-shrink-0'
          style={{ width: `${chatWidth}px` }}
        >
          <ErrorBoundary>
            <ChatPanel
              pdfId={selectedPdfId}
              selectedText={selectedText}
              onTextSubmit={() => setSelectedText('')}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
