'use client';

interface CitationProps {
  pageNumber: number;
  previewText: string;
  onNavigateToPage: (pageNumber: number) => void;
}

export default function Citation({
  pageNumber,
  onNavigateToPage,
}: CitationProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigateToPage(pageNumber);
  };

  return (
    <span className='relative inline-block'>
      <button
        className='inline-flex items-center whitespace-nowrap justify-center w-8 h-5 text-xs font-medium text-white bg-[#7e4431] rounded-full hover:opacity-50 transition-colors cursor-pointer ml-0.5 mr-0.5'
        onClick={handleClick}
      >
        {pageNumber}
      </button>
    </span>
  );
}
