// api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  canUserPerformAction,
  incrementQuestionUsage,
} from '@/lib/subscription-utils';
import { uploadImageToS3 } from '@/lib/s3';
import { Citation } from '@/types/citations';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, pdfId, chatId, selectedImage } = await request.json();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      );
    }

    // Verify PDF exists and belongs to user
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: userId,
      },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Check subscription limits for questions
    const canAsk = await canUserPerformAction(userId, 'ask_question');
    if (!canAsk.allowed) {
      return NextResponse.json(
        {
          error: canAsk.reason,
          requiresUpgrade: canAsk.requiresUpgrade || false,
        },
        { status: 403 }
      );
    }

    // Get or create chat
    let currentChatId = chatId;
    if (!currentChatId) {
      const newChat = await prisma.chat.create({
        data: {
          userId: userId,
          pdfId: pdfId,
          title: `Chat about ${pdf.title}`,
        },
      });
      currentChatId = newChat.id;
    }

    // Save user message to database (last user message)
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      let imageUrl = null;

      // Upload image to S3 if present
      if (selectedImage) {
        try {
          const s3Key = await uploadImageToS3(selectedImage, userId, pdfId);
          imageUrl = s3Key; // Store S3 key, not signed URL
          console.log('Image uploaded to S3 with key:', s3Key);
        } catch (error) {
          console.error('Failed to upload image to S3:', error);
          // Fall back to storing base64 in imageData field for backwards compatibility
        }
      }

      // create message record
      await prisma.message.create({
        data: {
          chatId: currentChatId,
          userId: userId,
          role: 'user',
          content: lastUserMessage.content,
          imageUrl: imageUrl,
          imageData: imageUrl ? null : selectedImage || null, // Fallback to base64 if S3 failed
        },
      });
    }

    // Build relevant PDF context
    const userMessage = messages[messages.length - 1]?.content || '';
    const relevantChunks = getRelevantChunks(pdf.chunks, userMessage, 5);

    const pdfContext =
      relevantChunks.length > 0
        ? `\n\nRelevant content from "${pdf.title}":\n\n${relevantChunks
            .map(
              (chunk) =>
                `[Page ${chunk.pageNumber}, Chunk ID: ${chunk.id}]\n${
                  chunk.content
                }`
            )
            .join('\n\n---\n\n')}\n\n`
        : '';

    // System prompt for PDF chat assistant
    const systemPrompt = `You are Readly, an intelligent PDF reading assistant. You help users understand and analyze PDF documents through conversation. it's very important to use  LaTeX markdown notation for math formulas (wrap in $ for inline or $$ for display)

    Key capabilities:
    - Answer questions about PDF content with precision and clarity
    - Explain complex concepts in simple terms
    - Provide summaries and insights
    - Help with mathematical formulas using LaTeX notation (wrap in $ for inline or $$ for display)
    - Support markdown formatting for better readability
    - Reference specific page numbers when citing content with citations
    - don't add in math formulas starting and ending \`( and \`) instead add $$ and $$ if iniline then single $ start and end if separete line $$ start and end

    IMPORTANT CITATION FORMAT:
    When referencing information from the PDF, always include citations in this exact format at the end of sentences or paragraphs:
    [CITE:page_number:chunk_id:quoted_text]
    
    For example:
    - "The concept of machine learning is defined as..." [CITE:5:chunk_123:machine learning is defined as a subset of artificial intelligence]
    - "According to the study, 85% of participants..." [CITE:12:chunk_456:85% of participants showed significant improvement]

    Guidelines:
    - Use **markdown formatting** in your responses
    - For mathematical expressions, use LaTeX syntax:
      - Inline math: $x = y + z$
      - Display math: $E = mc^2$
      - if there is any formula on separet line it should come between this $$ x = y + z $$
    - Format your responses with proper headings, lists, and emphasis
    - Use code blocks for code examples: \`\`\`language\n...\`\`\`
    - Use > for quotes and important notes
    - ALWAYS include citations when referencing specific content from the PDF
    - If you're unsure about something, be honest about limitations
    - Focus on the specific PDF context when available

    ${
      pdfContext
        ? `You have access to relevant sections from the PDF document. Use this content to provide accurate, contextual responses. ALWAYS include citations using the [CITE:page:chunk:text] format when referencing this content.${pdfContext}`
        : 'When users select text from the PDF, help them understand or elaborate on that specific content with proper citations.'
    }`;

    // Prepare messages with system prompt and handle image if present
    let chatMessages;
    if (selectedImage && messages.length > 0) {
      // If there's a selected image, modify the last user message to include it
      const lastMessage = messages[messages.length - 1];
      const otherMessages = messages.slice(0, -1);

      const messageWithImage = {
        role: 'user',
        content: [
          { type: 'text', text: lastMessage.content },
          {
            type: 'image_url',
            image_url: {
              url: selectedImage,
            },
          },
        ],
      };

      chatMessages = [
        { role: 'system', content: systemPrompt },
        ...otherMessages,
        messageWithImage,
      ];
    } else {
      chatMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    }

    // Create streaming response from OpenAI
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages:
        chatMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      stream: true,
      temperature: 0.7,
      max_tokens: 10000,
    });

    // Create a readable stream to pipe SSE to client
    const encoder = new TextEncoder();
    let assistantResponse = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';

            if (content) {
              assistantResponse += content;
              const data = JSON.stringify({
                content: content,
                done: false,
                chatId: currentChatId,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Save assistant response to database
          if (assistantResponse.trim()) {
            // Parse citations from the response
            const { cleanContent, citations } = parseCitations(assistantResponse.trim(), relevantChunks);
            
            await prisma.message.create({
              data: {
                chatId: currentChatId,
                userId: userId,
                role: 'assistant',
                content: cleanContent,
                citations: citations.length > 0 ? JSON.parse(JSON.stringify(citations)) : null,
              },
            });

            // Increment user's question usage after successful response
            await incrementQuestionUsage(userId);
          }

          // Send completion signal with parsed content and citations
          const { cleanContent: finalCleanContent, citations: finalCitations } = parseCitations(assistantResponse.trim(), relevantChunks);
          const finalData = JSON.stringify({
            content: '',
            done: true,
            chatId: currentChatId,
            finalContent: finalCleanContent,
            citations: finalCitations,
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            error: 'An error occurred while processing your request',
            done: true,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// Simple text similarity function for finding relevant chunks (kept as you had it)
function getRelevantChunks(
  chunks: Array<{
    id: string;
    content: string;
    pageNumber: number;
    chunkIndex: number;
  }>,
  query: string,
  limit: number = 5
) {
  if (!chunks || chunks.length === 0 || !query.trim()) {
    return chunks?.slice(0, limit) || [];
  }

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2); // Only consider words longer than 2 characters

  if (queryWords.length === 0) {
    return chunks.slice(0, limit);
  }

  // Score each chunk based on keyword matches
  const scoredChunks = chunks.map((chunk) => {
    const content = chunk.content.toLowerCase();
    let score = 0;
    let matchedWords = 0;

    for (const word of queryWords) {
      const matches = (content.match(new RegExp(word, 'g')) || []).length;
      if (matches > 0) {
        score += matches;
        matchedWords++;
      }
    }

    // Bonus for chunks that match more different query words
    const wordCoverageBonus = matchedWords / queryWords.length;
    score += wordCoverageBonus * 10;

    return {
      ...chunk,
      relevanceScore: score,
    };
  });

  // Sort by relevance score and return top chunks
  return scoredChunks
    .filter((chunk) => chunk.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

// Function to parse citations from AI response
function parseCitations(content: string, availableChunks: Array<{id: string; pageNumber: number; content: string}>): {
  cleanContent: string;
  citations: Citation[];
} {
  const citations: Citation[] = [];
  let citationCounter = 1;
  
  // Regex to match [CITE:page:chunk:text] format
  const citationRegex = /\[CITE:(\d+):([\w-]+):(.*?)\]/g;
  
  const cleanContent = content.replace(citationRegex, (match, pageNum, chunkId, quotedText) => {
    const pageNumber = parseInt(pageNum);
    
    // Find the chunk in available chunks
    const chunk = availableChunks.find(c => c.id === chunkId);
    
    if (chunk) {
      const citation: Citation = {
        id: `cite_${citationCounter}`,
        pageNumber,
        text: quotedText.trim(),
        chunkId,
      };
      
      citations.push(citation);
      
      // Replace with clickable citation marker
      return `<sup class="citation-marker" data-citation-id="${citation.id}">[${citationCounter++}]</sup>`;
    }
    
    return match; // Keep original if chunk not found
  });
  
  return {
    cleanContent,
    citations,
  };
}
