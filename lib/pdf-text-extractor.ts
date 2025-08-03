// Use pdfreader for Node.js server-side PDF text extraction
import { PdfReader } from 'pdfreader';

export interface PDFTextExtractionResult {
  text: string;
  pageCount: number;
  chunks: string[];
  success: boolean;
  error?: string;
}

export interface ChunkingOptions {
  maxChunkSize: number;
  overlapSize: number;
  preservePageBreaks: boolean;
}

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  maxChunkSize: 4000, // ~1000 tokens for most models
  overlapSize: 200,   // Overlap between chunks for context
  preservePageBreaks: true
};

/**
 * Extract text content from PDF buffer using pdfreader
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  options: Partial<ChunkingOptions> = {}
): Promise<PDFTextExtractionResult> {
  return new Promise((resolve) => {
    const chunkingOptions = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
    
    let fullText = '';
    let pageCount = 0;
    let currentPage = 0;
    const pages: { [key: number]: string } = {};
    
    const reader = new PdfReader();
    
    // Parse PDF from buffer
    reader.parseBuffer(pdfBuffer, (err: any, item: any) => {
      if (err) {
        console.error('PDF parsing error:', err);
        resolve({
          text: '',
          pageCount: 0,
          chunks: [],
          success: false,
          error: err.message || 'Failed to parse PDF'
        });
        return;
      }
      
      if (!item) {
        // End of file - process all collected text
        try {
          // Combine all pages in order
          fullText = Object.keys(pages)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(pageNum => pages[parseInt(pageNum)] || '')
            .join('\n\n');
          
          // Validate extraction
          if (!fullText || fullText.trim().length === 0) {
            resolve({
              text: '',
              pageCount,
              chunks: [],
              success: false,
              error: 'No text content found in PDF. This might be a scanned/image-based PDF.'
            });
            return;
          }
          
          // Clean up the extracted text
          const cleanedText = cleanupPDFText(fullText);
          
          // Create chunks for AI processing
          const chunks = createTextChunks(cleanedText, chunkingOptions);
          
          resolve({
            text: cleanedText,
            pageCount,
            chunks,
            success: true
          });
        } catch (error) {
          resolve({
            text: '',
            pageCount: 0,
            chunks: [],
            success: false,
            error: error instanceof Error ? error.message : 'Text processing error'
          });
        }
        return;
      }
      
      if (item.page) {
        // New page detected
        currentPage = item.page;
        pageCount = Math.max(pageCount, currentPage);
        if (!pages[currentPage]) {
          pages[currentPage] = '';
        }
      } else if (item.text) {
        // Text content found
        if (currentPage > 0) {
          pages[currentPage] = (pages[currentPage] || '') + item.text + ' ';
        }
      }
    });
  });
}

/**
 * Clean up extracted PDF text
 */
function cleanupPDFText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page headers/footers (common patterns)
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/^\d+\s*$/gm, '') // Remove standalone page numbers
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Trim whitespace
    .trim();
}

/**
 * Split text into chunks for AI processing
 */
export function createTextChunks(text: string, options: ChunkingOptions): string[] {
  const { maxChunkSize, overlapSize, preservePageBreaks } = options;
  
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  let currentPosition = 0;
  
  while (currentPosition < text.length) {
    const endPosition = Math.min(currentPosition + maxChunkSize, text.length);
    
    // Try to find a good breaking point (sentence, paragraph, or page)
    let chunkEnd = endPosition;
    
    if (endPosition < text.length) {
      // Look for natural breaking points in order of preference
      const breakPoints = [
        text.lastIndexOf('\n\n', endPosition), // Paragraph break
        text.lastIndexOf('. ', endPosition),   // Sentence end
        text.lastIndexOf(' ', endPosition)     // Word boundary
      ];
      
      for (const breakPoint of breakPoints) {
        if (breakPoint > currentPosition + maxChunkSize * 0.7) {
          chunkEnd = breakPoint + (breakPoint === breakPoints[1] ? 2 : 1);
          break;
        }
      }
    }
    
    const chunk = text.slice(currentPosition, chunkEnd).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    
    // Move position with overlap for context continuity
    currentPosition = Math.max(
      chunkEnd - overlapSize,
      currentPosition + 1 // Ensure progress
    );
  }
  
  return chunks;
}

/**
 * Get relevant chunks for a query using simple keyword matching
 * This is a basic implementation - you might want to use embeddings for better results
 */
export function getRelevantChunks(
  chunks: string[],
  query: string,
  maxChunks: number = 3
): string[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  if (queryWords.length === 0) {
    // Return first few chunks if no meaningful query
    return chunks.slice(0, maxChunks);
  }
  
  // Score chunks based on keyword matches
  const scoredChunks = chunks.map((chunk, index) => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    
    queryWords.forEach(word => {
      const matches = (chunkLower.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    });
    
    return { chunk, score, index };
  });
  
  // Sort by score and return top chunks
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .sort((a, b) => a.index - b.index) // Maintain original order
    .map(item => item.chunk);
}

/**
 * Extract text from PDF file for immediate processing
 */
export async function extractTextFromPDFFile(file: File): Promise<PDFTextExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractTextFromPDF(buffer);
}

/**
 * Extract text from PDF URL/S3 path
 */
export async function extractTextFromPDFUrl(url: string): Promise<PDFTextExtractionResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return extractTextFromPDF(buffer);
  } catch (error) {
    return {
      text: '',
      pageCount: 0,
      chunks: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch PDF'
    };
  }
}