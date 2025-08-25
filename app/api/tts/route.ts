import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    console.log('TTS Request received for text length:', text?.length);

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text is too long. Maximum 4096 characters allowed.' },
        { status: 400 }
      );
    }

    console.log('Calling OpenAI TTS API with streaming...');

    // Use MP3 format for MediaSource streaming compatibility
    const response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts', // Faster model optimized for streaming
      voice: 'coral',
      input: text,
      response_format: 'mp3', // MP3 for better MediaSource compatibility
      speed: 1.0,
    });

    console.log('OpenAI TTS streaming response received, forwarding stream...');

    // PROPER streaming - forward the OpenAI stream correctly
    console.log('OpenAI response ready, streaming to frontend...');

    // Return the OpenAI stream directly - no manipulation
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    console.error('Text-to-speech error:', error);

    // Handle OpenAI API errors
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof error.status === 'number'
    ) {
      return NextResponse.json(
        {
          error: 'OpenAI API error',
          details:
            (error as { message?: string }).message || 'Unknown API error',
        },
        { status: error.status }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
