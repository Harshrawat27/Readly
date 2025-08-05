import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { canUserPerformAction, incrementQuestionUsage } from '@/lib/subscription-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, pdfId, chatId } = await request.json();

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
          requiresUpgrade: canAsk.requiresUpgrade || false
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

    // System prompt for PDF chat assistant
    const systemPrompt = `You are Readly, an intelligent PDF reading assistant. You help users understand and analyze PDF documents through conversation.

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
- add space after every para

When users select text from the PDF, help them understand or elaborate on that specific content.`;

    // Prepare messages with system prompt
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: chatMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
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

            // Increment user's question usage after successful response
            await incrementQuestionUsage(userId);
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
