'use client';

import { useState, useCallback } from 'react';

interface PDFSidebarProps {
  onPdfSelect: (pdfId: string) => void;
  selectedPdfId: string | null;
  userId: string;
}

interface PDFItem {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: Date;
  lastAccessedAt: Date;
}

export default function PDFSidebar({ onPdfSelect, selectedPdfId, userId }: PDFSidebarProps) {
  const [pdfHistory, setPdfHistory] = useState<PDFItem[]>([
    // Dummy data for now
    {
      id: '1',
      title: 'Sample Document 1',
      fileName: 'document1.pdf',
      uploadedAt: new Date('2024-01-15'),
      lastAccessedAt: new Date('2024-01-20'),
    },
    {
      id: '2',
      title: 'Research Paper',
      fileName: 'research.pdf',
      uploadedAt: new Date('2024-01-10'),
      lastAccessedAt: new Date('2024-01-18'),
    },
  ]);

  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const handleAddPdf = useCallback(async () => {
    setIsUploadingPdf(true);
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        setIsUploadingPdf(false);
        return;
      }

      try {
        // TODO: Upload file to server and save to database
        console.log('Selected file:', file.name);
        
        // For now, add dummy entry
        const newPdf: PDFItem = {
          id: Date.now().toString(),
          title: file.name.replace('.pdf', ''),
          fileName: file.name,
          uploadedAt: new Date(),
          lastAccessedAt: new Date(),
        };
        
        setPdfHistory(prev => [newPdf, ...prev]);
        onPdfSelect(newPdf.id);
        
      } catch (error) {
        console.error('Error uploading PDF:', error);
      } finally {
        setIsUploadingPdf(false);
      }
    };
    
    input.click();
  }, [onPdfSelect]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          PDF History
        </h2>
        
        {/* Add PDF Button */}
        <button
          onClick={handleAddPdf}
          disabled={isUploadingPdf}
          className="w-full bg-[var(--accent)] text-white rounded-lg py-3 px-4 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploadingPdf ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </>
          ) : (
            <>
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
            </>
          )}
        </button>
      </div>

      {/* PDF List */}
      <div className="flex-1 overflow-y-auto">
        {pdfHistory.length === 0 ? (
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

      {/* Footer - User subscription info */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="bg-[var(--faded-white)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Free Plan
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {pdfHistory.length}/5 PDFs used
          </p>
          <button className="w-full bg-[var(--text-primary)] text-white rounded-lg py-2 px-3 text-sm font-medium hover:opacity-90 transition-opacity">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}