import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const pdfId = resolvedParams.id;
    const userId = session.user.id;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
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

    if (!pdf.textExtracted || pdf.chunks.length === 0) {
      return NextResponse.json(
        { error: 'PDF text not extracted. Please extract text first.' },
        { status: 400 }
      );
    }

    const { summaryType = 'overview' } = await request.json();

    // Combine chunks into manageable sections for summarization
    const maxTokensPerSection = 3000;
    const sections = [];
    let currentSection = '';
    let currentTokenCount = 0;

    for (const chunk of pdf.chunks) {
      const chunkTokens = chunk.content.length / 4; // Rough token estimation
      
      if (currentTokenCount + chunkTokens > maxTokensPerSection && currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = chunk.content;
        currentTokenCount = chunkTokens;
      } else {
        currentSection += (currentSection ? ' ' : '') + chunk.content;
        currentTokenCount += chunkTokens;
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    // Generate summaries for each section
    const sectionSummaries = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      const systemPrompt = getSummarySystemPrompt(summaryType);
      
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: `Please summarize the following text from "${pdf.title}" (Section ${i + 1} of ${sections.length}):\n\n${section}` 
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });

        const summary = response.choices[0]?.message?.content || '';
        if (summary) {
          sectionSummaries.push({
            section: i + 1,
            totalSections: sections.length,
            summary: summary.trim(),
          });
        }
      } catch (error) {
        console.error(`Error summarizing section ${i + 1}:`, error);
        sectionSummaries.push({
          section: i + 1,
          totalSections: sections.length,
          summary: `[Error generating summary for section ${i + 1}]`,
        });
      }
    }

    // Generate final comprehensive summary
    const combinedSummaries = sectionSummaries.map(s => s.summary).join('\n\n');
    
    let finalSummary = '';
    if (sectionSummaries.length > 1) {
      try {
        const finalResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert summarizer. Create a comprehensive ${summaryType} of the document based on the section summaries provided. Maintain key insights, main points, and important details while ensuring coherence and readability.` 
            },
            { 
              role: 'user', 
              content: `Create a comprehensive summary of "${pdf.title}" based on these section summaries:\n\n${combinedSummaries}` 
            },
          ],
          temperature: 0.3,
          max_tokens: 800,
        });

        finalSummary = finalResponse.choices[0]?.message?.content || '';
      } catch (error) {
        console.error('Error generating final summary:', error);
        finalSummary = combinedSummaries; // Fallback to combined summaries
      }
    } else {
      finalSummary = sectionSummaries[0]?.summary || '';
    }

    return NextResponse.json({
      summary: finalSummary.trim(),
      summaryType,
      sectionsProcessed: sectionSummaries.length,
      chunksProcessed: pdf.chunks.length,
      sectionSummaries, // Include individual section summaries for reference
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF summary' },
      { status: 500 }
    );
  }
}

function getSummarySystemPrompt(summaryType: string): string {
  const basePrompt = `You are an expert document summarizer. Your task is to create accurate, comprehensive summaries while preserving key information and insights.`;

  const summaryPrompts = {
    overview: `${basePrompt} Create a comprehensive overview that captures the main themes, key points, and important conclusions. Focus on providing a clear understanding of the document's content and purpose.`,
    
    detailed: `${basePrompt} Create a detailed summary that includes main points, supporting evidence, key findings, methodologies (if applicable), and important details. Preserve technical terms and specific information while maintaining readability.`,
    
    bullet: `${basePrompt} Create a structured summary using bullet points and subheadings. Organize information hierarchically to highlight main topics, subtopics, and key details in an easily scannable format.`,
    
    academic: `${basePrompt} Create an academic-style summary suitable for research purposes. Include main hypotheses, methodologies, key findings, implications, and conclusions. Maintain formal tone and preserve technical accuracy.`,
  };

  return summaryPrompts[summaryType as keyof typeof summaryPrompts] || summaryPrompts.overview;
}