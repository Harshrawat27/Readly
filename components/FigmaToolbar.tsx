'use client';

import { useState, useRef, useEffect } from 'react';

export type ToolType =
  | 'move'
  | 'hand'
  | 'scale'
  | 'rectangle'
  | 'line'
  | 'arrow'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'pen'
  | 'text'
  | 'comment'
  | 'annotation'
  | 'measurement'
  | 'analyseimage';

export type ToolGroup = 'move' | 'shapes' | 'text' | 'comment';

interface FigmaToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

interface DropdownItem {
  id: ToolType;
  name: string;
  icon: React.ReactNode;
  shortcut?: string;
}

export default function FigmaToolbar({
  activeTool,
  onToolChange,
  onFullscreenToggle,
  isFullscreen = false,
}: FigmaToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<ToolGroup | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tool definitions
  const moveTools: DropdownItem[] = [
    { id: 'move', name: 'Move', icon: <MoveIcon />, shortcut: 'V' },
    { id: 'hand', name: 'Hand tool', icon: <HandIcon />, shortcut: 'H' },
    { id: 'scale', name: 'Scale', icon: <ScaleIcon />, shortcut: 'K' },
  ];

  const shapeTools: DropdownItem[] = [
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: <RectangleIcon />,
      shortcut: 'R',
    },
    { id: 'line', name: 'Line', icon: <LineIcon />, shortcut: 'L' },
    { id: 'arrow', name: 'Arrow', icon: <ArrowIcon />, shortcut: '↑L' },
    { id: 'ellipse', name: 'Ellipse', icon: <EllipseIcon />, shortcut: 'O' },
    { id: 'polygon', name: 'Polygon', icon: <PolygonIcon /> },
    { id: 'star', name: 'Star', icon: <StarIcon /> },
  ];

  // Remove creation tools dropdown - pen is now standalone

  const commentTools: DropdownItem[] = [
    { id: 'comment', name: 'Comment', icon: <CommentIcon />, shortcut: 'C' },
    {
      id: 'annotation',
      name: 'Annotation',
      icon: <AnnotationIcon />,
      shortcut: 'Y',
    },
    {
      id: 'measurement',
      name: 'Measurement',
      icon: <MeasurementIcon />,
      shortcut: '↑M',
    },
  ];

  const getCurrentTool = (group: ToolGroup): ToolType => {
    switch (group) {
      case 'move':
        return moveTools.find((tool) => tool.id === activeTool)?.id || 'move';
      case 'shapes':
        return (
          shapeTools.find((tool) => tool.id === activeTool)?.id || 'rectangle'
        );
      case 'comment':
        return (
          commentTools.find((tool) => tool.id === activeTool)?.id || 'comment'
        );
      default:
        return activeTool;
    }
  };

  const getCurrentToolIcon = (group: ToolGroup) => {
    const currentTool = getCurrentTool(group);
    const allTools = [...moveTools, ...shapeTools, ...commentTools];
    return allTools.find((tool) => tool.id === currentTool)?.icon;
  };

  const isToolInGroup = (group: ToolGroup): boolean => {
    switch (group) {
      case 'move':
        return moveTools.some((tool) => tool.id === activeTool);
      case 'shapes':
        return shapeTools.some((tool) => tool.id === activeTool);
      case 'comment':
        return commentTools.some((tool) => tool.id === activeTool);
      default:
        return false;
    }
  };

  const handleToolClick = (tool: ToolType, group?: ToolGroup) => {
    onToolChange(tool);
    if (group) {
      setOpenDropdown(null);
    }
  };

  const handleDropdownToggle = (group: ToolGroup) => {
    setOpenDropdown(openDropdown === group ? null : group);
  };

  const renderDropdown = (items: DropdownItem[], group: ToolGroup) => {
    if (openDropdown !== group) return null;

    return (
      <div className='absolute bottom-full mb-2 left-0 z-50'>
        <div className='bg-[var(--card-background)] rounded-lg shadow-xl border border-[var(--border)] p-1 min-w-[180px]'>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleToolClick(item.id, group)}
              className={`w-full flex items-center justify-between px-3 rounded-md py-2 text-sm transition-colors ${
                activeTool === item.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-primary)] hover:bg-[#0F0F0E] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className='flex items-center gap-3'>
                <div className='w-4 h-4 flex items-center justify-center'>
                  {item.icon}
                </div>
                <span>{item.name}</span>
              </div>
              {item.shortcut && (
                <span className='text-xs text-white opacity-70'>
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className='fixed bottom-[10px] left-1/2 transform -translate-x-1/2 z-51 figma-toolbar'
      ref={dropdownRef}
    >
      <div className='bg-[var(--card-background)] rounded-xl shadow-2xl border border-[var(--border)] p-1 flex items-center gap-1'>
        {/* Move/Selection Tools */}
        <div className='relative flex items-center'>
          {/* Icon Button - Direct tool use */}
          <button
            onClick={() => handleToolClick(getCurrentTool('move'))}
            onMouseEnter={() => setHoveredTool('move-icon')}
            onMouseLeave={() => setHoveredTool(null)}
            className={`px-2 py-2 rounded-lg transition-all duration-200 ${
              isToolInGroup('move')
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className='w-5 h-5 flex items-center justify-center'>
              {getCurrentToolIcon('move')}
            </div>
          </button>

          {/* Arrow Button - Dropdown toggle */}
          <button
            onClick={() => handleDropdownToggle('move')}
            onMouseEnter={() => setHoveredTool('move-arrow')}
            onMouseLeave={() => setHoveredTool(null)}
            className='px-1 py-2 rounded-lg transition-all duration-200 text-[var(--text-muted)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
          >
            <ChevronIcon />
          </button>

          {renderDropdown(moveTools, 'move')}

          {/* Tooltips */}
          {hoveredTool === 'move-icon' && !openDropdown && (
            <div className='absolute bottom-full mb-2 left-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              {
                moveTools.find((tool) => tool.id === getCurrentTool('move'))
                  ?.name
              }
            </div>
          )}
          {hoveredTool === 'move-arrow' && !openDropdown && (
            <div className='absolute bottom-full mb-2 right-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              Move tools
            </div>
          )}
        </div>

        {/* Shapes Tool */}
        <div className='relative flex items-center'>
          {/* Icon Button - Direct tool use */}
          <button
            onClick={() => handleToolClick(getCurrentTool('shapes'))}
            onMouseEnter={() => setHoveredTool('shapes-icon')}
            onMouseLeave={() => setHoveredTool(null)}
            className={`px-2 py-2 rounded-lg transition-all duration-200 ${
              isToolInGroup('shapes')
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className='w-5 h-5 flex items-center justify-center'>
              {getCurrentToolIcon('shapes')}
            </div>
          </button>

          {/* Arrow Button - Dropdown toggle */}
          <button
            onClick={() => handleDropdownToggle('shapes')}
            onMouseEnter={() => setHoveredTool('shapes-arrow')}
            onMouseLeave={() => setHoveredTool(null)}
            className='px-1 py-2 rounded-lg transition-all duration-200 text-[var(--text-muted)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
          >
            <ChevronIcon />
          </button>

          {renderDropdown(shapeTools, 'shapes')}

          {/* Tooltips */}
          {hoveredTool === 'shapes-icon' && !openDropdown && (
            <div className='absolute bottom-full mb-2 left-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              {
                shapeTools.find((tool) => tool.id === getCurrentTool('shapes'))
                  ?.name
              }
            </div>
          )}
          {hoveredTool === 'shapes-arrow' && !openDropdown && (
            <div className='absolute bottom-full mb-2 right-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              Shape tools
            </div>
          )}
        </div>

        {/* Pen Tool (standalone) */}
        <button
          onClick={() => handleToolClick('pen')}
          onMouseEnter={() => setHoveredTool('pen')}
          onMouseLeave={() => setHoveredTool(null)}
          className={`relative px-3 py-2 rounded-lg transition-all duration-200 ${
            activeTool === 'pen'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className='w-5 h-5 flex items-center justify-center'>
            <PenIcon />
          </div>
          {hoveredTool === 'pen' && (
            <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              Pen Tool
            </div>
          )}
        </button>

        {/* Text Tool (standalone) */}
        <button
          onClick={() => handleToolClick('text')}
          onMouseEnter={() => setHoveredTool('text')}
          onMouseLeave={() => setHoveredTool(null)}
          className={`relative px-3 py-2 rounded-lg transition-all duration-200 ${
            activeTool === 'text'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className='w-5 h-5 flex items-center justify-center'>
            <TextIcon />
          </div>
          {hoveredTool === 'text' && (
            <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              Text
            </div>
          )}
        </button>

        {/* Comment Tools */}
        <div className='relative flex items-center'>
          {/* Icon Button - Direct tool use */}
          <button
            onClick={() => handleToolClick(getCurrentTool('comment'))}
            onMouseEnter={() => setHoveredTool('comment-icon')}
            onMouseLeave={() => setHoveredTool(null)}
            className={`px-2 py-2 rounded-lg transition-all duration-200 ${
              isToolInGroup('comment')
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className='w-5 h-5 flex items-center justify-center'>
              {getCurrentToolIcon('comment')}
            </div>
          </button>

          {/* Arrow Button - Dropdown toggle */}
          <button
            onClick={() => handleDropdownToggle('comment')}
            onMouseEnter={() => setHoveredTool('comment-arrow')}
            onMouseLeave={() => setHoveredTool(null)}
            className='px-1 py-2 rounded-lg transition-all duration-200 text-[var(--text-muted)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
          >
            <ChevronIcon />
          </button>

          {renderDropdown(commentTools, 'comment')}

          {/* Tooltips */}
          {hoveredTool === 'comment-icon' && !openDropdown && (
            <div className='absolute bottom-full mb-2 left-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              {
                commentTools.find(
                  (tool) => tool.id === getCurrentTool('comment')
                )?.name
              }
            </div>
          )}
          {hoveredTool === 'comment-arrow' && !openDropdown && (
            <div className='absolute bottom-full mb-2 right-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              Comment tools
            </div>
          )}
        </div>

        {/* Analyse Image Tool (standalone) */}
        <button
          onClick={() => handleToolClick('analyseimage')}
          onMouseEnter={() => setHoveredTool('analyseimage')}
          onMouseLeave={() => setHoveredTool(null)}
          className={`relative px-3 py-2 rounded-lg transition-all duration-200 ${
            activeTool === 'analyseimage'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className='w-5 h-5 flex items-center justify-center'>
            <AnalyseImageIcon />
          </div>
          {hoveredTool === 'analyseimage' && (
            <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              Analyse Image
            </div>
          )}
        </button>

        {/* Fullscreen Tool (standalone) */}
        <button
          onClick={onFullscreenToggle || (() => {})}
          onMouseEnter={() => setHoveredTool('fullscreen')}
          onMouseLeave={() => setHoveredTool(null)}
          className={`relative px-3 py-2 rounded-lg transition-all duration-200 ${
            isFullscreen
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)]'
          } ${!onFullscreenToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!onFullscreenToggle}
        >
          <div className='w-5 h-5 flex items-center justify-center'>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </div>
          {hoveredTool === 'fullscreen' && (
            <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap shadow-lg'>
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

// Icon Components
const MoveIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='w-full h-full'>
    <path d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' />
  </svg>
);

const HandIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='w-full h-full'>
    <path d='M12 2c2.21 0 4 1.79 4 4v6h1c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-8c-1.1 0-2-.9-2-2v-6c0-2.21 1.79-4 4-4z' />
  </svg>
);

const ScaleIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='w-full h-full'>
    <path d='M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z' />
  </svg>
);

const RectangleIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
  </svg>
);

const LineIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <line x1='5' y1='19' x2='19' y2='5' />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <line x1='7' y1='17' x2='17' y2='7' />
    <polyline points='7,7 17,7 17,17' />
  </svg>
);

const EllipseIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <circle cx='12' cy='12' r='9' />
  </svg>
);

const PolygonIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <polygon points='12,2 19,7 19,17 12,22 5,17 5,7' />
  </svg>
);

const StarIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='w-full h-full'>
    <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
  </svg>
);

const PenIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <path d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' />
  </svg>
);

const TextIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <polyline points='4,7 4,4 20,4 20,7' />
    <line x1='9' y1='20' x2='15' y2='20' />
    <line x1='12' y1='4' x2='12' y2='20' />
  </svg>
);

const CommentIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
  </svg>
);

const AnnotationIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <rect x='2' y='3' width='20' height='14' rx='2' ry='2' />
    <line x1='8' y1='21' x2='16' y2='21' />
    <line x1='12' y1='17' x2='12' y2='21' />
  </svg>
);

const MeasurementIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <path d='M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3' />
  </svg>
);

const ChevronIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-3 h-3'
  >
    <polyline points='6,9 12,15 18,9' />
  </svg>
);

const FullscreenIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <path d='M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3' />
  </svg>
);

const FullscreenExitIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <path d='M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3' />
  </svg>
);

const AnalyseImageIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-full h-full'
  >
    <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
    <circle cx='9' cy='9' r='2' />
    <path d='M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21' />
    <path d='M9 9L21 21' />
  </svg>
);
