'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PDFSidebarProps {
  onPdfSelect: (pdfId: string) => void;
  selectedPdfId: string | null;
  userId: string;
  onSignOut: () => void;
  isSigningOut: boolean;
  userName: string;
  onToggleSidebar: () => void;
  isCollapsed: boolean;
}

interface PDFItem {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: Date;
  lastAccessedAt: Date;
}

export default function PDFSidebar({ 
  onPdfSelect, 
  selectedPdfId, 
  userId, 
  onSignOut, 
  isSigningOut, 
  userName, 
  onToggleSidebar, 
  isCollapsed 
}: PDFSidebarProps) {
  const router = useRouter();
  const [pdfHistory, setPdfHistory] = useState<PDFItem[]>([]);
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load PDFs from API
  const loadPdfs = useCallback(async () => {
    try {
      setIsLoadingPdfs(true);
      const response = await fetch('/api/pdf/list');
      if (response.ok) {
        const pdfs = await response.json();
        setPdfHistory(pdfs.map((pdf: any) => ({
          ...pdf,
          uploadedAt: new Date(pdf.uploadedAt),
          lastAccessedAt: new Date(pdf.lastAccessedAt),
        })));
      }
    } catch (error) {
      console.error('Error loading PDFs:', error);
    } finally {
      setIsLoadingPdfs(false);
    }
  }, []);

  useEffect(() => {
    loadPdfs();
  }, [loadPdfs]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      // Navigate to upload page with the file
      router.push('/upload');
    } else {
      alert('Please drop a valid PDF file.');
    }
  }, [router]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div 
      className={`h-full flex flex-col ${isDragOver ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with Logo and Collapse */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Readly
            </h1>
          </div>
          
          <button
            onClick={onToggleSidebar}
            className="p-1 hover:bg-[var(--faded-white)] rounded transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          PDF History
        </h2>
        
        {/* Add PDF Button */}
        <button
          onClick={() => router.push('/upload')}
          className="w-full bg-[var(--accent)] text-white rounded-lg py-3 px-4 font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Add PDF
        </button>
      </div>

      {/* PDF List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingPdfs ? (
          <div className="p-4 text-center">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-[var(--text-muted)]">
              Loading PDFs...
            </p>
          </div>
        ) : pdfHistory.length === 0 ? (
          <div className="p-4 text-center">
            <div className="w-12 h-12 bg-[var(--faded-white)] rounded-full mx-auto mb-3 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[var(--text-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              No PDFs uploaded yet
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Click "Add PDF" to get started
            </p>
          </div>
        ) : (
          <div className="p-2">
            {pdfHistory.map((pdf) => (
              <button
                key={pdf.id}
                onClick={() => onPdfSelect(pdf.id)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedPdfId === pdf.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'hover:bg-[var(--faded-white)] text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className={`w-4 h-4 ${
                        selectedPdfId === pdf.id ? 'text-white' : 'text-[var(--accent)]'
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {pdf.title}
                    </h3>
                    <p className={`text-xs mt-1 ${
                      selectedPdfId === pdf.id ? 'text-white/70' : 'text-[var(--text-muted)]'
                    }`}>
                      {pdf.fileName}
                    </p>
                    <p className={`text-xs mt-1 ${
                      selectedPdfId === pdf.id ? 'text-white/70' : 'text-[var(--text-muted)]'
                    }`}>
                      Last opened: {formatDate(pdf.lastAccessedAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer - User info and subscription */}
      <div className="p-4 border-t border-[var(--border)] space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-[var(--faded-white)] rounded-lg">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {userName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Free Plan
            </p>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-[var(--faded-white)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {pdfHistory.length}/5 PDFs used
            </span>
          </div>
          <button className="w-full bg-[var(--text-primary)] text-white rounded-lg py-2 px-3 text-sm font-medium hover:opacity-90 transition-opacity mb-2">
            Upgrade
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={onSignOut}
          disabled={isSigningOut}
          className="w-full bg-[var(--accent)] text-white rounded-lg py-2 px-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSigningOut ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Signing out...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </>
          )}
        </button>
      </div>
    </div>
  );
}