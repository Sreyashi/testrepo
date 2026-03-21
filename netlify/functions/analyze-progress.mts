/**
 * Agent 3: Progress Analysis Agent (runs in parallel with Agent 2)
 * Uses Claude Opus 4.6 with adaptive thinking to compare today's behavioral
 * data against yesterday and the previous week, then advises whether
 * the current therapy approach is working or needs review.
 */
import type { Config, Context } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface BehaviorRating {
  attention: number;
  hyperactivity: number;
  impulsivity: number;
  emotionRegulation: number;
  socialInteraction: number;
  sleepQuality: number;
  taskCompletion: number;
  moodOverall: number;
}

interface BehaviorLog {
  date: string;
  ratings: BehaviorRating;
  positiveObservations: string[];
  challengingBehaviors: string[];
  medicationTaken: boolean;
  sleepHours?: number;
  activities: string[];
  parentNotes: string;
  triggerEvents: string[];
  overallDay: string;
}

interface AnalysisRequest {
  childName: string;
  currentLog: BehaviorLog;
  previousDay?: BehaviorLog;
  previousWeekLogs: BehaviorLog[]; // up to 14 days for comparison
  therapistName?: string;
  medications: string[];
}

interface AnalysisResult {
  overallTrend: 'improving' | 'declining' | 'stable';
  vsYesterday: string;
  vsLastWeek: string;
  therapyRecommendation: 'on_track' | 'review_recommended' | 'change_recommended';
  therapyMessage: string;
  keyObservations: string[];
  actionItems: string[];
}

function avgScore(logs: BehaviorLog[]): number {
  if (!logs.length) return 0;
  const sum = logs.reduce((acc, l) => {
    const vals = Object.values(l.ratings) as number[];
    return acc + vals.reduce((a, b) => a + b, 0) / vals.length;
  }, 0);
  return sum / logs.length;
}

function scoreForLog(log: BehaviorLog): number {
  const vals = Object.values(log.ratings) as number[];
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function formatLog(log: BehaviorLog): string {
  return `Date: ${log.date}
Overall Day: ${log.overallDay}
Ratings: Attention=${log.ratings.attention}, Hyperactivity=${log.ratings.hyperactivity}, Impulsivity=${log.ratings.impulsivity}, EmotionRegulation=${log.ratings.emotionRegulation}, SocialInteraction=${log.ratings.socialInteraction}, Sleep=${log.ratings.sleepQuality}, TaskCompletion=${log.ratings.taskCompletion}, Mood=${log.ratings.moodOverall}
Positive: ${log.positiveObservations.join('; ') || 'none'}
Challenging: ${log.challengingBehaviors.join('; ') || 'none'}
Triggers: ${log.triggerEvents.join('; ') || 'none'}
Medication Taken: ${log.medicationTaken}
Sleep Hours: ${log.sleepHours ?? 'not recorded'}
Parent Notes: "${log.parentNotes || 'none'}"`;
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: AnalysisRequest;
  try {
    body = await req.json() as AnalysisRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { childName, currentLog, previousDay, previousWeekLogs, therapistName, medications } = body;

  const todayScore = scoreForLog(currentLog);
  const yesterdayScore = previousDay ? scoreForLog(previousDay) : null;
  const weekAvgScore = previousWeekLogs.length ? avgScore(previousWeekLogs) : null;

  // Determine trend for early data to provide Claude context
  const recentTrend = previousWeekLogs.length >= 5
    ? (() => {
        const firstHalf = previousWeekLogs.slice(Math.floor(previousWeekLogs.length / 2));
        const secondHalf = previousWeekLogs.slice(0, Math.floor(previousWeekLogs.length / 2));
        const firstAvg = avgScore(firstHalf);
        const secondAvg = avgScore(secondHalf);
        return secondAvg - firstAvg; // positive = improving (recent > older)
      })()
    : null;

  const prompt = `You are an expert child behavioral analyst helping parents understand their child's ADHD management progress.

CHILD: ${childName}
CURRENT MEDICATIONS: ${medications.join(', ') || 'None listed'}
${therapistName ? `THERAPIST: ${therapistName}` : ''}

=== TODAY'S LOG ===
${formatLog(currentLog)}
Average score today: ${todayScore.toFixed(2)}/5

${previousDay ? `=== YESTERDAY'S LOG ===
${formatLog(previousDay)}
Average score yesterday: ${yesterdayScore!.toFixed(2)}/5` : '=== NO YESTERDAY LOG AVAILABLE ==='}

${previousWeekLogs.length > 0 ? `=== PREVIOUS ${previousWeekLogs.length} DAYS (most recent first) ===
${previousWeekLogs.map(formatLog).join('\n---\n')}
7-14 day average score: ${weekAvgScore!.toFixed(2)}/5
Recent trend: ${recentTrend !== null ? (recentTrend > 0.2 ? 'Improving' : recentTrend < -0.2 ? 'Declining' : 'Stable') : 'Insufficient data'}` : '=== NO HISTORICAL DATA AVAILABLE ==='}

Analyze this data carefully and respond with a JSON object (no markdown, no code blocks, just valid JSON) in exactly this format:
{
  "overallTrend": "improving" | "declining" | "stable",
  "vsYesterday": "One sentence comparing today to yesterday. Be specific about what changed.",
  "vsLastWeek": "One sentence comparing today to the past week. Note the trend direction.",
  "therapyRecommendation": "on_track" | "review_recommended" | "change_recommended",
  "therapyMessage": "2-3 sentences explaining the therapy assessment. Be direct and actionable for parents. If there's not enough data, say so honestly.",
  "keyObservations": ["observation 1", "observation 2", "observation 3"],
  "actionItems": ["specific action 1", "specific action 2"]
}

Rules:
- "on_track": therapy is working, scores stable/improving, no major concerns
- "review_recommended": 3+ consecutive days of decline OR specific recurring issues OR medication inconsistency
- "change_recommended": 7+ days of significant decline OR no improvement over 14 days despite medication compliance
- Key observations: notable patterns, what's working, what's not
- Action items: concrete things parents can do before next therapy session
- If fewer than 3 days of data: default to "on_track" with appropriate caveat in therapyMessage
- Be empathetic but honest`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text from response (thinking blocks come first, then text)
    let jsonText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        jsonText = block.text;
        break;
      }
    }

    // Parse and validate the JSON response
    const result: AnalysisResult = JSON.parse(jsonText);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-progress] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/api/analyze-progress',
};
