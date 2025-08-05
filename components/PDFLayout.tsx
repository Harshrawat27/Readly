'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFSidebar from '@/components/PDFSidebar';
import PDFViewer from '@/components/PDFViewer';
import ChatPanel from '@/components/ChatPanel';
import ResizableDivider from '@/components/ResizableDivider';

interface PDFLayoutProps {
  session: any;
  onSignOut: () => void;
  isSigningOut: boolean;
  pdfId: string;
  selectedText: string;
  onTextSelect: (text: string) => void;
  onTextSubmit: () => void;
}

export default function PDFLayout({
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
            onPdfSelect={(id) => router.push(`/pdf/${id}`)}
            selectedPdfId={pdfId}
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

        {/* PDF Viewer - Flexible middle section */}
        <div 
          className='flex-1 bg-[var(--pdf-viewer-bg)] relative overflow-hidden'
          style={{ minWidth: '400px' }}
        >
          <PDFViewer
            pdfId={pdfId}
            onTextSelect={onTextSelect}
            selectedText={selectedText}
            currentUser={{
              id: session.user.id,
              name: session.user.name,
              image: session.user.image,
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
            maxWidth: `${chatPanelWidth}px`
          }}
        >
          <ChatPanel
            pdfId={pdfId}
            selectedText={selectedText}
            onTextSubmit={onTextSubmit}
          />
        </div>
      </div>
    </div>
  );
}