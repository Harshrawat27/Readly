'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import PDFSidebar from '@/components/PDFSidebar';
import ChatPanel from '@/components/ChatPanel';
import ResizableDivider from '@/components/ResizableDivider';
import { usePDFServiceWorker } from '@/hooks/usePDFServiceWorker';

// Lazy load PDF viewer for better performance
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className='h-full flex items-center justify-center'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]'></div>
    </div>
  ),
});

interface PDFLayoutProps {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
  };
  onSignOut: () => void;
  isSigningOut: boolean;
  pdfId: string;
  selectedText: string;
  onTextSelect: (text: string) => void;
  onTextSubmit: () => void;
}

// Memoized component to prevent unnecessary re-renders
const PDFLayout = memo(function PDFLayout({
  session,
  onSignOut,
  isSigningOut,
  pdfId,
  selectedText,
  onTextSelect,
  onTextSubmit,
}: PDFLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(384);
  const [currentPdfId, setCurrentPdfId] = useState(pdfId);

  // Use service worker for PDF caching
  const { clearPDFCache } = usePDFServiceWorker();

  // Sync currentPdfId with pdfId prop when it changes (for direct URL access)
  useEffect(() => {
    setCurrentPdfId(pdfId);
  }, [pdfId]);

  // Enhanced sign out with cache clearing
  const handleSignOut = useCallback(async () => {
    clearPDFCache();
    sessionStorage.clear();
    await onSignOut();
  }, [onSignOut, clearPDFCache]);

  // Handle PDF selection
  const handlePdfSelect = useCallback((id: string) => {
    setCurrentPdfId(id);
    // Update URL without navigation/remounting
    window.history.replaceState(null, '', `/pdf/${id}`);
  }, []);

  return (
    <div className='h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]'>
      {/* Main Three-Panel Layout - Full height */}
      <div className='main-layout flex h-full'>
        {/* PDF History Sidebar - Collapsible */}
        <div
          className={`bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-16' : 'w-80 max-w-[400px]'
          }`}
        >
          <PDFSidebar
            onPdfSelect={handlePdfSelect}
            selectedPdfId={currentPdfId}
            userId={session.user.id}
            onSignOut={handleSignOut}
            isSigningOut={isSigningOut}
            userName={session.user.name}
            onToggleSidebar={() => {
              setSidebarCollapsed(!sidebarCollapsed);
            }}
            isCollapsed={sidebarCollapsed}
          />
        </div>

        {/* PDF Viewer - Flexible middle section */}
        <div
          className='flex-1 bg-[var(--pdf-viewer-bg)] relative overflow-hidden'
          style={{ minWidth: '400px' }}
        >
          <PDFViewer
            pdfId={currentPdfId}
            onTextSelect={onTextSelect}
            selectedText={selectedText}
            currentUser={{
              id: session.user.id,
              name: session.user.name,
              image: session.user.image || undefined,
            }}
          />
        </div>

        {/* Resizable Divider */}
        <ResizableDivider
          onResize={setChatPanelWidth}
          defaultWidth={chatPanelWidth}
          minWidth={300}
          maxWidth={600}
        />

        {/* Chat Panel - Fixed width section */}
        <div
          className='bg-[var(--chat-bg)] flex-shrink-0'
          style={{
            width: `${chatPanelWidth}px`,
            minWidth: `${chatPanelWidth}px`,
            maxWidth: `${chatPanelWidth}px`,
          }}
        >
          <ChatPanel
            pdfId={currentPdfId}
            selectedText={selectedText}
            onTextSubmit={onTextSubmit}
          />
        </div>
      </div>
    </div>
  );
});

export default PDFLayout;
