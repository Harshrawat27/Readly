import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function POST(request: NextRequest) {
  try {
    const { content, quantity } = await request.json();

    if (!content || !quantity) {
      return NextResponse.json(
        { error: 'Missing content or quantity' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Create a comprehensive prompt for generating high-quality flashcards
    const prompt = `You are an expert educator creating study flashcards from academic content. 

CONTENT TO ANALYZE:
${content.substring(0, 4000)} // Limit content to avoid token limits

INSTRUCTIONS:
1. Generate exactly ${quantity} high-quality flashcards from this content
2. Create diverse question types: definitions, explanations, processes, applications, comparisons, cause-effect
3. Focus on key concepts, important terms, and main ideas
4. Avoid trivial questions like "What is 'and'" or "What is 'the'"
5. Questions should test understanding, not just memorization
6. Answers should be comprehensive but concise
7. Assign appropriate difficulty levels

QUESTION TYPES TO INCLUDE:
- "What is [concept]?" (for definitions)
- "How does [process] work?" (for mechanisms)
- "Why does [phenomenon] occur?" (for explanations)
- "What are the key features of [topic]?" (for characteristics)
- "How do you [perform action]?" (for procedures)
- "What causes [effect]?" (for cause-effect relationships)
- "Compare [A] and [B]" (for comparisons)

FORMAT: Return a JSON array of objects with this exact structure:
[
  {
    "question": "Clear, specific question",
    "answer": "Comprehensive answer",
    "difficulty": "easy|medium|hard"
  }
]

QUALITY STANDARDS:
- Questions must be meaningful and educational
- Avoid questions about articles, prepositions, or common words
- Focus on concepts that would be valuable for studying
- Ensure answers provide real learning value
- Make questions specific to the content provided

Generate ${quantity} flashcards now:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert educator who creates high-quality study materials. Always respond with valid JSON containing educational flashcards.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let flashcards: Omit<FlashCard, 'id'>[];
    try {
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      flashcards = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error(`Invalid response format from AI ${parseError}`);
    }

    // Validate and format the flashcards
    const formattedFlashcards: FlashCard[] = flashcards
      .filter(
        (card) =>
          card.question &&
          card.answer &&
          card.question.length > 10 &&
          card.answer.length > 10 &&
          !card.question.toLowerCase().includes('what is and') &&
          !card.question.toLowerCase().includes('what is the') &&
          !card.question.toLowerCase().includes('what is a') &&
          !card.question.toLowerCase().includes('what is this')
      )
      .slice(0, quantity)
      .map((card, index) => ({
        id: `ai-card-${index + 1}`,
        question: card.question.trim(),
        answer: card.answer.trim(),
        difficulty: card.difficulty || 'medium',
      }));

    if (formattedFlashcards.length === 0) {
      throw new Error(
        'No valid flashcards could be generated from this content'
      );
    }

    console.log(`Generated ${formattedFlashcards.length} AI flashcards`);

    return NextResponse.json({
      flashcards: formattedFlashcards,
      count: formattedFlashcards.length,
    });
  } catch (error) {
    console.error('Error generating AI flashcards:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        );
      }
      if (
        error.message.includes('quota') ||
        error.message.includes('rate limit')
      ) {
        return NextResponse.json(
          {
            error:
              'AI service temporarily unavailable. Please try again later.',
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate flashcards. Please try again.' },
      { status: 500 }
    );
  }
}
