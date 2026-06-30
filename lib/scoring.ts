import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';
import { callAI } from './ai';
import { SCORING_SYSTEM_PROMPT } from './prompts';

/**
 * Run the scoring process on an application.
 * Calls the OpenAI API to perform actual scoring.
 * @param applicationId - The ID of the application to score
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runScoring(applicationId: string): Promise<any> {
  await dbConnect();
  
  const application = await Application.findById(applicationId).populate('unitId');
  if (!application) {
    throw new Error('Application not found');
  }

  // Check if transcript is too short (<3 exchanges/user messages)
  const userMessages = application.aiTranscript.filter(m => m.role === 'user');
  if (userMessages.length < 3) {
    const insufficientScore = {
      overall: null,
      incomeStability: null,
      communicationClarity: null,
      rentalHistorySignals: null,
      redFlags: [],
      recommendation: 'review_manually' as const,
      scoreSummary: 'Insufficient interview data',
      scoredAt: new Date(),
    };
    application.aiScore = insufficientScore;
    await application.save();
    return insufficientScore;
  }

  // Format form data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rentAmount = (application.unitId as any)?.rentAmount || 0;
  const formData = {
    tenantInfo: {
      name: application.tenantInfo.name,
      email: application.tenantInfo.email,
      phone: application.tenantInfo.phone,
      currentAddress: application.tenantInfo.currentAddress,
      moveInDate: application.tenantInfo.moveInDate,
    },
    employment: {
      status: application.employment.status,
      employer: application.employment.employer,
      jobTitle: application.employment.jobTitle,
      monthlyIncome: application.employment.monthlyIncome,
      employmentDuration: application.employment.employmentDuration,
    },
    unitDetails: {
      rentAmount: rentAmount,
    }
  };

  // Format transcript
  const transcriptText = application.aiTranscript
    .map(entry => `${entry.role === 'assistant' ? 'AI' : 'Applicant'}: ${entry.content}`)
    .join('\n');

  const promptContent = `Applicant Form Data:
${JSON.stringify(formData, null, 2)}

Interview Transcript:
${transcriptText}`;

  const messages = [
    {
      role: 'user' as const,
      content: promptContent,
    }
  ];

  try {
    const responseText = await callAI(messages, SCORING_SYSTEM_PROMPT, { responseFormat: 'json_object' });
    const parsed = JSON.parse(responseText);

    const aiScore = {
      overall: typeof parsed.overall === 'number' ? parsed.overall : null,
      incomeStability: typeof parsed.income_stability === 'number' ? parsed.income_stability : null,
      communicationClarity: typeof parsed.communication_clarity === 'number' ? parsed.communication_clarity : null,
      rentalHistorySignals: typeof parsed.rental_history_signals === 'number' ? parsed.rental_history_signals : null,
      redFlags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      recommendation: parsed.recommendation || 'review_manually',
      scoreSummary: parsed.score_summary || '',
      scoredAt: parsed.scored_at ? new Date(parsed.scored_at) : new Date(),
    };

    application.aiScore = aiScore;
    await application.save();

    return aiScore;
  } catch (error) {
    console.error('Error in runScoring:', error);
    throw error;
  }
}
