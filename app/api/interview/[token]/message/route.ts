import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';
import User from '@/models/User';
import { callAI, AIMessage } from '@/lib/ai';
import { SYSTEM_PROMPT_TEMPLATE } from '@/lib/prompts';

export async function POST(
  req: NextRequest,
  context: unknown
) {
  try {
    await dbConnect();
    const { token } = (context as { params: { token: string } }).params;
    const body = await req.json();
    const { message } = body as { message: string };

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    const application = await Application.findOne({ interviewToken: token });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (application.interviewStatus === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Interview already completed' },
        { status: 400 }
      );
    }

    // Check if expired
    if (application.interviewTokenExpiry && new Date() > application.interviewTokenExpiry) {
      return NextResponse.json(
        { success: false, error: 'This interview link has expired. Contact your landlord.' },
        { status: 400 }
      );
    }

    // Update status to in_progress if it was sent or not_started
    if (application.interviewStatus === 'sent' || application.interviewStatus === 'not_started') {
      application.interviewStatus = 'in_progress';
    }

    // Append user message to aiTranscript
    application.aiTranscript.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Fetch landlord to get custom screening questions
    const landlord = await User.findById(application.landlordId);
    const customQuestionsStr = landlord?.screeningQuestions && landlord.screeningQuestions.length > 0
      ? landlord.screeningQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
      : 'None';

    // Construct application summary
    const appSummary = `
- Applicant Name: ${application.tenantInfo.name}
- Email: ${application.tenantInfo.email}
- Phone: ${application.tenantInfo.phone}
- Current Address: ${application.tenantInfo.currentAddress}
- Proposed Move-in Date: ${new Date(application.tenantInfo.moveInDate).toLocaleDateString()}
- Employment Status: ${application.employment.status}
- Employer: ${application.employment.employer || 'N/A'}
- Job Title: ${application.employment.jobTitle || 'N/A'}
- Monthly Income: $${application.employment.monthlyIncome || 0}
- Employment Duration: ${application.employment.employmentDuration || 'N/A'}
- References: ${application.references.map(r => `${r.name} (${r.relationship}, Phone: ${r.phone}, Email: ${r.email || 'N/A'})`).join('; ') || 'None'}
- Additional Notes: ${application.additionalNotes || 'None'}
`.trim();

    // Format system prompt
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace('{applicationSummary}', appSummary)
      .replace('{customQuestions}', customQuestionsStr);

    // Map history to AIMessage format
    const history: AIMessage[] = application.aiTranscript.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    // Call OpenAI
    const reply = await callAI(history, systemPrompt);

    // Detect if interview is complete
    const isComplete = reply.includes('[INTERVIEW_COMPLETE]');
    
    // Clean up the reply (remove the complete marker)
    const cleanReply = reply.replace('[INTERVIEW_COMPLETE]', '').trim();

    // Append AI response to aiTranscript
    application.aiTranscript.push({
      role: 'assistant',
      content: cleanReply,
      timestamp: new Date(),
    });

    await application.save();

    return NextResponse.json({
      success: true,
      data: {
        reply: cleanReply,
        isComplete,
      },
    });
  } catch (error) {
    console.error('POST /api/interview/[token]/message error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
