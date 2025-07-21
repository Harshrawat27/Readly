'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PDFSidebar from '@/components/PDFSidebar';
import PDFViewer from '@/components/PDFViewer';
import ChatPanel from '@/components/ChatPanel';
import ResizableDivider from '@/components/ResizableDivider';

export default function PDFPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarContentVisible, setSidebarContentVisible] = useState(true);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [chatPanelWidth, setChatPanelWidth] = useState(384);

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
      <div className='main-layout flex h-[calc(100vh-4rem)] overflow-hidden'>
        {/* PDF History Sidebar - Collapsible */}
        <div className={`bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed 
            ? 'w-0' 
            : 'w-80 max-w-[300px]'
        } overflow-hidden`}>
          <div className={`w-80 h-full transition-opacity duration-200 ease-in-out ${
            sidebarContentVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <PDFSidebar 
              onPdfSelect={(id) => router.push(`/pdf/${id}`)} 
              selectedPdfId={pdfId}
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

        {/* Sidebar Toggle Button - Visible when sidebar is collapsed */}
        {sidebarCollapsed && (
          <div className='absolute left-4 top-1/2 transform -translate-y-1/2 z-10'>
            <button
              onClick={() => {
                setSidebarCollapsed(false);
                setTimeout(() => setSidebarContentVisible(true), 100);
              }}
              className='p-2 bg-[var(--card-background)] hover:bg-[var(--faded-white)] rounded-lg border border-[var(--border)] shadow-md transition-colors'
            >
              <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M9 18l6-6-6-6' />
              </svg>
            </button>
          </div>
        )}

        {/* PDF Viewer - Middle section with horizontal scroll */}
        <div className={`flex-1 bg-[var(--pdf-viewer-bg)] relative transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'ml-0' : ''
        } overflow-x-auto overflow-y-hidden`}>
          <div className='h-full' style={{ minWidth: `${pdfScale * 100}%`, width: `${pdfScale * 100}%` }}>
            <PDFViewer 
              pdfId={pdfId}
              onTextSelect={setSelectedText}
              selectedText={selectedText}
              scale={pdfScale}
              onScaleChange={setPdfScale}
            />
          </div>
        </div>

        {/* Resizable Divider */}
        <ResizableDivider
          onResize={setChatPanelWidth}
          defaultWidth={chatPanelWidth}
          minWidth={300}
          maxWidth={600}
        />

        {/* Chat Panel - Right section with resizable width */}
        <div 
          className='bg-[var(--chat-bg)] flex-shrink-0 overflow-hidden h-full'
          style={{ width: `${chatPanelWidth}px` }}
        >
          <div className='h-full overflow-hidden'>
            <ChatPanel 
              pdfId={pdfId}
              selectedText={selectedText}
              onTextSubmit={() => setSelectedText('')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}