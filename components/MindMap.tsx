'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  Panel,
  Position,
} from 'reactflow';

import 'reactflow/dist/style.css';

interface MindMapProps {
  pdfId: string;
  onClose: () => void;
}

interface PDFChunk {
  id: string;
  content: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
}

// Custom node styles that match the theme
const nodeDefaults = {
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

const MindMap: React.FC<MindMapProps> = ({ pdfId, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Generate mind map from PDF content
  const generateMindMap = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch PDF chunks/content
      const response = await fetch(`/api/pdf/${pdfId}/extract`);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF content');
      }

      const data = await response.json();
      const chunks: PDFChunk[] = data.chunks || [];

      if (chunks.length === 0) {
        throw new Error('No content found in PDF. Please ensure the PDF has been processed.');
      }

      // Group content by pages
      const pageGroups = chunks.reduce((acc, chunk) => {
        if (!acc[chunk.pageNumber]) {
          acc[chunk.pageNumber] = [];
        }
        acc[chunk.pageNumber].push(chunk);
        return acc;
      }, {} as Record<number, PDFChunk[]>);

      // Create central node
      const centralNode: Node = {
        id: 'central',
        type: 'default',
        position: { x: 400, y: 300 },
        data: {
          label: 'PDF Overview',
        },
        style: {
          background: 'var(--accent)',
          color: 'var(--button-primary-text)',
          border: '2px solid var(--accent)',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          width: 180,
          height: 60,
        },
        ...nodeDefaults,
      };

      const generatedNodes: Node[] = [centralNode];
      const generatedEdges: Edge[] = [];

      // Create nodes for each page
      const pageNumbers = Object.keys(pageGroups).map(Number).sort((a, b) => a - b);
      const radius = 200;
      const angleStep = (2 * Math.PI) / pageNumbers.length;

      pageNumbers.forEach((pageNumber, index) => {
        const angle = index * angleStep;
        const x = 400 + radius * Math.cos(angle);
        const y = 300 + radius * Math.sin(angle);

        const pageContent = pageGroups[pageNumber]
          .map(chunk => chunk.content)
          .join(' ')
          .slice(0, 100) + '...';

        // Page node
        const pageNode: Node = {
          id: `page-${pageNumber}`,
          type: 'default',
          position: { x, y },
          data: {
            label: `Page ${pageNumber}`,
          },
          style: {
            background: 'var(--card-background)',
            color: 'var(--text-primary)',
            border: '2px solid var(--border)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            width: 120,
            height: 40,
          },
          ...nodeDefaults,
        };

        generatedNodes.push(pageNode);

        // Edge from central to page
        generatedEdges.push({
          id: `central-page-${pageNumber}`,
          source: 'central',
          target: `page-${pageNumber}`,
          style: {
            stroke: 'var(--accent)',
            strokeWidth: 2,
          },
          animated: false,
        });

        // Extract key topics from page content (simple keyword extraction)
        const topics = extractTopics(pageContent);
        
        topics.forEach((topic, topicIndex) => {
          const topicAngle = angle + (topicIndex - 1) * 0.3;
          const topicX = x + 100 * Math.cos(topicAngle);
          const topicY = y + 100 * Math.sin(topicAngle);

          const topicNode: Node = {
            id: `topic-${pageNumber}-${topicIndex}`,
            type: 'default',
            position: { x: topicX, y: topicY },
            data: {
              label: topic,
            },
            style: {
              background: 'var(--faded-white)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--divider)',
              borderRadius: '6px',
              fontSize: '12px',
              width: 100,
              height: 30,
            },
            ...nodeDefaults,
          };

          generatedNodes.push(topicNode);

          // Edge from page to topic
          generatedEdges.push({
            id: `page-${pageNumber}-topic-${topicIndex}`,
            source: `page-${pageNumber}`,
            target: `topic-${pageNumber}-${topicIndex}`,
            style: {
              stroke: 'var(--divider)',
              strokeWidth: 1,
            },
            animated: false,
          });
        });
      });

      setNodes(generatedNodes);
      setEdges(generatedEdges);
      setIsLoading(false);
    } catch (err) {
      console.error('Error generating mind map:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate mind map');
      setIsLoading(false);
    }
  }, [pdfId, setNodes, setEdges]);

  // Simple topic extraction function
  const extractTopics = (content: string): string[] => {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Get word frequency
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Return top 3 most frequent words
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  };

  useEffect(() => {
    generateMindMap();
  }, [generateMindMap]);

  const proOptions = { hideAttribution: true };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-background)] p-8 rounded-lg shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            <span className="text-[var(--text-primary)]">Generating mind map...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--card-background)] p-8 rounded-lg shadow-xl max-w-md">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Error</h3>
          <p className="text-[var(--text-muted)] mb-6">{error}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={generateMindMap}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--faded-white)] text-[var(--text-primary)] rounded hover:bg-[var(--border)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--background)] z-50">
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          proOptions={proOptions}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls 
            style={{
              background: 'var(--card-background)',
              border: '1px solid var(--border)',
            }}
          />
          <MiniMap 
            style={{
              background: 'var(--card-background)',
              border: '1px solid var(--border)',
            }}
            nodeColor="var(--accent)"
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1} 
            color="var(--divider)"
          />
          
          {/* Custom Panel with Close Button */}
          <Panel position="top-right">
            <div className="flex items-center space-x-2 bg-[var(--card-background)] p-3 rounded-lg border border-[var(--border)] shadow-lg">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">PDF Mind Map</h3>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-[var(--faded-white)] transition-colors"
                title="Close Mind Map"
              >
                <svg
                  className="w-4 h-4 text-[var(--text-muted)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default MindMap;