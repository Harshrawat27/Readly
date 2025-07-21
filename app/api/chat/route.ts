import { log } from 'console';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, pdfId } = await request.json();

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
      messages: chatMessages as any,
      stream: true,
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Create a readable stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';

            if (content) {
              const data = JSON.stringify({ content, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Send completion signal
          const finalData = JSON.stringify({ content: '', done: true });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          // console.log(
          //   controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
          // );

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
