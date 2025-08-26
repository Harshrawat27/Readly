'use client';

interface HighlightColorPickerProps {
  x: number;
  y: number;
  visible: boolean;
  selectedText: string;
  onHighlight: (color: string, text: string) => void;
  onAskReadly: (text: string) => void;
  onClose: () => void;
}

const highlightColors = [
  {
    name: 'Yellow',
    color: '#FDE047',
    bg: 'bg-yellow-400',
    hover: 'hover:bg-yellow-500',
  },
  {
    name: 'Green',
    color: '#4ADE80',
    bg: 'bg-green-400',
    hover: 'hover:bg-green-500',
  },
  {
    name: 'Blue',
    color: '#60A5FA',
    bg: 'bg-blue-400',
    hover: 'hover:bg-blue-500',
  },
  {
    name: 'Pink',
    color: '#F472B6',
    bg: 'bg-pink-400',
    hover: 'hover:bg-pink-500',
  },
  {
    name: 'Purple',
    color: '#A78BFA',
    bg: 'bg-purple-400',
    hover: 'hover:bg-purple-500',
  },
];

export default function HighlightColorPicker({
  x,
  y,
  visible,
  selectedText,
  onHighlight,
  onAskReadly,
  onClose,
}: HighlightColorPickerProps) {
  if (!visible) return null;

  return (
    <>
      {/* Backdrop to close when clicking outside */}
      <div
        className='fixed inset-0 z-40'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Color picker popup */}
      <div
        className='fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 highlight-color-picker'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{
          left: Math.max(10, Math.min(x - 120, window.innerWidth - 250)),
          top: Math.max(10, y - 10),
        }}
      >
        {/* <div
          className='text-xs text-gray-600 mb-2 max-w-xs truncate'
          title={selectedText}
        >
          &quot;{selectedText}&quot;
        </div> */}

        {/* Color options */}
        <div className='flex gap-2 mb-3'>
          {highlightColors.map((color) => (
            <button
              key={color.name}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Color button clicked:', color.name, color.color);
                // Call highlight first, wait for it to complete, then close
                try {
                  await onHighlight(color.color, selectedText);
                } catch (error) {
                  console.error('Highlight error:', error);
                }
                onClose();
              }}
              className={`w-8 h-8 rounded-full border-2 border-gray-300 ${color.bg} ${color.hover} transition-all hover:scale-110 hover:shadow-md`}
              title={`Highlight with ${color.name}`}
            />
          ))}
        </div>

        {/* Ask Readly button */}
        <button
          onClick={() => {
            onAskReadly(selectedText);
            onClose();
          }}
          className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity text-sm'
        >
          <svg
            className='w-4 h-4'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M8 12h8' />
            <path d='M12 8v8' />
          </svg>
          Ask readiteasy
        </button>
      </div>
    </>
  );
}
