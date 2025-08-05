'use client';

import { useState, useCallback, useEffect } from 'react';
import PDFSidebar from '@/components/PDFSidebar';
import PDFViewer from '@/components/PDFViewer';
import ChatPanel from '@/components/ChatPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AppLayoutProps {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  onSignOut: () => void;
  isSigningOut: boolean;
  selectedPdfId: string | null;
  onPdfSelect: (id: string) => void;
  selectedText: string;
  onTextSelect: (text: string) => void;
  onTextSubmit: () => void;
}

export default function AppLayout({
  session,
  onSignOut,
  isSigningOut,
  selectedPdfId,
  onPdfSelect,
  selectedText,
  onTextSelect,
  onTextSubmit,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatWidth, setChatWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);

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
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className='h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]'>
      {/* Main Three-Panel Layout - Full height */}
      <div className='flex h-full'>
        {/* PDF History Sidebar - Collapsible */}
        <div
          className={`bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-16' : 'w-80 max-w-[400px]'
          }`}
        >
          <PDFSidebar
            onPdfSelect={onPdfSelect}
            selectedPdfId={selectedPdfId}
            userId={session.user.id}
            onSignOut={onSignOut}
            isSigningOut={isSigningOut}
            userName={session.user.name}
            onToggleSidebar={() => {
              setSidebarCollapsed(!sidebarCollapsed);
            }}
            isCollapsed={sidebarCollapsed}
          />
        </div>

        {/* PDF Viewer - Fixed middle section */}
        <div className='flex-1 min-w-0 bg-[var(--pdf-viewer-bg)] relative'>
          <ErrorBoundary>
            <PDFViewer
              pdfId={selectedPdfId}
              onTextSelect={onTextSelect}
              selectedText={selectedText}
            />
          </ErrorBoundary>
        </div>

        {/* Resizer */}
        <div
          className='w-1 bg-[var(--border)] hover:bg-[var(--accent)] cursor-col-resize transition-colors flex-shrink-0'
          onMouseDown={handleMouseDown}
        />

        {/* Chat Panel - Fixed width section */}
        <div
          className='bg-[var(--chat-bg)] border-l border-[var(--border)] flex-shrink-0'
          style={{ width: `${chatWidth}px`, minWidth: `${chatWidth}px`, maxWidth: `${chatWidth}px` }}
        >
          <ErrorBoundary>
            <ChatPanel
              pdfId={selectedPdfId}
              selectedText={selectedText}
              onTextSubmit={onTextSubmit}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}