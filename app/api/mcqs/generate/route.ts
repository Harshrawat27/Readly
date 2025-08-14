import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MCQOption {
  text: string;
  isCorrect: boolean;
}

interface MCQ {
  id: string;
  question: string;
  options: MCQOption[];
  explanation: string;
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

    // Create a comprehensive prompt for generating high-quality MCQs
    const prompt = `You are an expert educator creating multiple choice questions from academic content.

CONTENT TO ANALYZE:
${content.substring(0, 4000)} // Limit content to avoid token limits

INSTRUCTIONS:
1. Generate exactly ${quantity} high-quality multiple choice questions from this content
2. Each question should have 4 options (A, B, C, D) with only ONE correct answer
3. Create plausible wrong answers that are related to the content but clearly incorrect
4. Wrong answers should be challenging but not trick questions
5. Focus on key concepts, important terms, and main ideas from the content
6. Avoid trivial questions about articles, prepositions, or common words
7. Questions should test understanding and application, not just memorization
8. Include a brief explanation for why the correct answer is right
9. Assign appropriate difficulty levels

QUESTION TYPES TO INCLUDE:
- Definition questions: "What is [concept]?"
- Application questions: "Which of the following best describes [process]?"
- Analysis questions: "What is the main cause of [phenomenon]?"
- Comparison questions: "How does [A] differ from [B]?"
- Evaluation questions: "Which statement about [topic] is most accurate?"

FORMAT: Return a JSON array of objects with this exact structure:
[
  {
    "question": "Clear, specific question text",
    "options": [
      {"text": "Option A text", "isCorrect": false},
      {"text": "Option B text", "isCorrect": true},
      {"text": "Option C text", "isCorrect": false},
      {"text": "Option D text", "isCorrect": false}
    ],
    "explanation": "Brief explanation of why the correct answer is right",
    "difficulty": "easy|medium|hard"
  }
]

QUALITY STANDARDS:
- Questions must be meaningful and educational
- Options should be similar in length and style
- Correct answers should be unambiguously correct
- Wrong answers should be plausible but clearly incorrect
- Avoid "All of the above" or "None of the above" options
- Make sure each question is specific to the provided content
- Explanations should be 1-2 sentences and educational

Generate ${quantity} MCQs now:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert educator who creates high-quality educational assessments. Always respond with valid JSON containing multiple choice questions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let mcqs: Omit<MCQ, 'id'>[];
    try {
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      mcqs = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error(`Invalid response format from AI ${parseError}`);
    }

    // Validate and format the MCQs
    const formattedMCQs: MCQ[] = mcqs
      .filter(
        (mcq) =>
          mcq.question &&
          mcq.options &&
          Array.isArray(mcq.options) &&
          mcq.options.length === 4 &&
          mcq.options.filter((opt) => opt.isCorrect).length === 1 &&
          mcq.question.length > 10 &&
          mcq.explanation &&
          mcq.explanation.length > 10
      )
      .slice(0, quantity)
      .map((mcq, index) => ({
        id: `ai-mcq-${index + 1}`,
        question: mcq.question.trim(),
        options: mcq.options.map((opt) => ({
          text: opt.text.trim(),
          isCorrect: opt.isCorrect,
        })),
        explanation: mcq.explanation.trim(),
        difficulty: mcq.difficulty || 'medium',
      }));

    if (formattedMCQs.length === 0) {
      throw new Error('No valid MCQs could be generated from this content');
    }

    console.log(`Generated ${formattedMCQs.length} AI MCQs`);

    return NextResponse.json({
      mcqs: formattedMCQs,
      count: formattedMCQs.length,
    });
  } catch (error) {
    console.error('Error generating AI MCQs:', error);

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
      { error: 'Failed to generate MCQs. Please try again.' },
      { status: 500 }
    );
  }
}
