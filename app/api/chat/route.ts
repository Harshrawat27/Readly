import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getRelevantChunks } from '@/lib/pdf-text-extractor';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, pdfId, chatId, selectedText } = await request.json();

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

    // Verify PDF exists and belongs to user, and get text content
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: userId,
      },
      select: {
        id: true,
        title: true,
        extractedText: true,
        isTextExtracted: true,
        pageCount: true,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
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

    // Save user message to database
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await prisma.message.create({
        data: {
          chatId: currentChatId,
          userId: userId,
          role: 'user',
          content: lastUserMessage.content,
        },
      });
    }

    // Get the user's current message to provide relevant context
    const userQuery = lastUserMessage?.content || '';

    // Prepare PDF context
    let pdfContext = '';
    let contextInfo = '';

    if (pdf.isTextExtracted && pdf.extractedText) {
      // If user selected text, prioritize that
      if (selectedText && selectedText.trim()) {
        pdfContext = `Selected text from PDF:\n"${selectedText.trim()}"\n\n`;
        contextInfo = 'I have access to the selected text from your PDF.';
      } else {
        // Get relevant chunks based on user query
        const chunks = createTextChunks(pdf.extractedText, {
          maxChunkSize: 3000,
          overlapSize: 200,
          preservePageBreaks: true,
        });

        const relevantChunks = getRelevantChunks(chunks, userQuery, 3);
        
        if (relevantChunks.length > 0) {
          pdfContext = `Relevant content from "${pdf.title}":\n\n${relevantChunks.join('\n\n---\n\n')}\n\n`;
          contextInfo = `I have access to relevant sections from your PDF "${pdf.title}" (${pdf.pageCount} pages).`;
        } else {
          // Use first few chunks as general context
          const generalChunks = chunks.slice(0, 2);
          pdfContext = `Content from "${pdf.title}":\n\n${generalChunks.join('\n\n---\n\n')}\n\n`;
          contextInfo = `I have access to your PDF "${pdf.title}" (${pdf.pageCount} pages).`;
        }
      }
    } else {
      contextInfo = `I can see you have a PDF titled "${pdf.title}", but I don't have access to its text content. This might be a scanned or image-based PDF.`;
    }

    // System prompt for PDF chat assistant
    const systemPrompt = `You are Readly, an intelligent PDF reading assistant. You help users understand and analyze PDF documents through conversation.

${contextInfo}

Key capabilities:
- Answer questions about PDF content with precision and clarity
- Explain complex concepts in simple terms
- Provide summaries and insights
- Help with mathematical formulas using LaTeX notation (wrap in $ for inline or $$ for display)
- Support markdown formatting for better readability

Guidelines:
- Always be helpful, accurate, and concise
- Use LaTeX for mathematical expressions: $\\int_0^\\infty e^{-x} dx = 1$
- Format responses with markdown for better readability
- If you're unsure about something, be honest about limitations
- Focus on the specific PDF context when available
- Add space after every paragraph
- Base your answers on the PDF content provided below when relevant

${pdfContext}`;

    // Prepare messages with system prompt
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: chatMessages as any,
      stream: true,
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Create a readable stream
    const encoder = new TextEncoder();
    let assistantResponse = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Log the raw chunk from OpenAI
            // console.log('OpenAI raw chunk:', JSON.stringify(chunk, null, 2));

            const content = chunk.choices[0]?.delta?.content || '';

            if (content) {
              assistantResponse += content;
              const data = JSON.stringify({
                content,
                done: false,
                chatId: currentChatId,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Log complete response before saving
          // console.log('Complete OpenAI response:', assistantResponse);

          // Save assistant response to database
          if (assistantResponse.trim()) {
            await prisma.message.create({
              data: {
                chatId: currentChatId,
                userId: userId,
                role: 'assistant',
                content: assistantResponse.trim(),
              },
            });
          }

          // Send completion signal
          const finalData = JSON.stringify({
            content: '',
            done: true,
            chatId: currentChatId,
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

// Helper function to create text chunks
function createTextChunks(text: string, options: {
  maxChunkSize: number;
  overlapSize: number;
  preservePageBreaks: boolean;
}): string[] {
  const { maxChunkSize, overlapSize } = options;
  
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  let currentPosition = 0;
  
  while (currentPosition < text.length) {
    const endPosition = Math.min(currentPosition + maxChunkSize, text.length);
    
    // Try to find a good breaking point
    let chunkEnd = endPosition;
    
    if (endPosition < text.length) {
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
    
    currentPosition = Math.max(
      chunkEnd - overlapSize,
      currentPosition + 1
    );
  }
  
  return chunks;
}
