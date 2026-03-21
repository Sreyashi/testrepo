/**
 * Agent 2: Therapist Email Agent
 * Triggered after a parent submits daily symptom log.
 * Sends a formatted behavioral report email to the child's therapist.
 */
import type { Config, Context } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

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
  medicationTime?: string;
  medicationNotes?: string;
  sleepHours?: number;
  activities: string[];
  parentNotes: string;
  triggerEvents: string[];
  environment: string;
  overallDay: string;
}

interface EmailRequest {
  childName: string;
  therapistName: string;
  therapistEmail: string;
  parentEmail: string;
  currentLog: BehaviorLog;
  recentLogs: BehaviorLog[]; // last 7 days for context
}

const RATING_LABEL: Record<number, string> = {
  1: 'Very Challenging',
  2: 'Challenging',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

function avgRating(logs: BehaviorLog[], key: keyof BehaviorRating): string {
  if (!logs.length) return 'N/A';
  const avg = logs.reduce((s, l) => s + l.ratings[key], 0) / logs.length;
  return avg.toFixed(1);
}

function ratingColor(r: number): string {
  if (r >= 4.5) return '#10b981';
  if (r >= 3.5) return '#22c55e';
  if (r >= 2.5) return '#eab308';
  if (r >= 1.5) return '#f97316';
  return '#ef4444';
}

async function generateNarrativeSummary(
  childName: string,
  log: BehaviorLog,
  recentLogs: BehaviorLog[]
): Promise<string> {
  const prompt = `You are a clinical assistant helping a therapist understand a child's behavioral report.

Child name: ${childName}
Today's date: ${log.date}
Overall day assessment: ${log.overallDay}

Today's ratings (1=Very Challenging, 5=Excellent):
- Attention & Focus: ${log.ratings.attention}
- Hyperactivity: ${log.ratings.hyperactivity}
- Impulsivity Control: ${log.ratings.impulsivity}
- Emotional Regulation: ${log.ratings.emotionRegulation}
- Social Interaction: ${log.ratings.socialInteraction}
- Sleep Quality: ${log.ratings.sleepQuality}
- Task Completion: ${log.ratings.taskCompletion}
- Overall Mood: ${log.ratings.moodOverall}

Positive observations: ${log.positiveObservations.join(', ') || 'None noted'}
Challenging behaviors: ${log.challengingBehaviors.join(', ') || 'None noted'}
Triggers today: ${log.triggerEvents.join(', ') || 'None noted'}
Medication taken: ${log.medicationTaken ? `Yes (${log.medicationTime || 'time not noted'})` : 'No'}
Sleep: ${log.sleepHours ?? 'not recorded'} hours
Activities: ${log.activities.join(', ') || 'None noted'}
Parent notes: "${log.parentNotes || 'No additional notes'}"

7-day average ratings:
- Attention: ${avgRating(recentLogs, 'attention')}
- Hyperactivity: ${avgRating(recentLogs, 'hyperactivity')}
- Emotional Regulation: ${avgRating(recentLogs, 'emotionRegulation')}

Write a concise 2-3 sentence clinical narrative summary for the therapist. Focus on what stands out today versus recent trends. Be factual and professional. Do not use bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

function buildHtmlEmail(
  childName: string,
  therapistName: string,
  log: BehaviorLog,
  recentLogs: BehaviorLog[],
  narrative: string
): string {
  const today = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const ratingRows = (
    [
      ['Attention & Focus', log.ratings.attention],
      ['Hyperactivity', log.ratings.hyperactivity],
      ['Impulsivity Control', log.ratings.impulsivity],
      ['Emotional Regulation', log.ratings.emotionRegulation],
      ['Social Interaction', log.ratings.socialInteraction],
      ['Sleep Quality', log.ratings.sleepQuality],
      ['Task Completion', log.ratings.taskCompletion],
      ['Overall Mood', log.ratings.moodOverall],
    ] as [string, number][]
  )
    .map(([label, rating]) => {
      const color = ratingColor(rating);
      const bar = '■'.repeat(rating) + '□'.repeat(5 - rating);
      return `
      <tr>
        <td style="padding:6px 12px;font-size:14px;color:#374151;">${label}</td>
        <td style="padding:6px 12px;font-size:14px;font-weight:600;color:${color};">
          ${bar} ${RATING_LABEL[rating]}
        </td>
      </tr>`;
    })
    .join('');

  const weekAvgRows = (
    [
      ['Attention', 'attention'],
      ['Hyperactivity', 'hyperactivity'],
      ['Emotional Regulation', 'emotionRegulation'],
      ['Task Completion', 'taskCompletion'],
    ] as [string, keyof BehaviorRating][]
  )
    .map(([label, key]) => {
      const today_val = log.ratings[key];
      const week_avg = parseFloat(avgRating(recentLogs, key));
      const delta = today_val - week_avg;
      const arrow = delta > 0.3 ? '↑' : delta < -0.3 ? '↓' : '→';
      const arrowColor = delta > 0.3 ? '#10b981' : delta < -0.3 ? '#ef4444' : '#6b7280';
      return `<tr>
        <td style="padding:4px 12px;font-size:13px;color:#374151;">${label}</td>
        <td style="padding:4px 12px;font-size:13px;color:#374151;">${today_val}/5</td>
        <td style="padding:4px 12px;font-size:13px;color:#374151;">${week_avg}/5</td>
        <td style="padding:4px 12px;font-size:13px;font-weight:700;color:${arrowColor};">${arrow}</td>
      </tr>`;
    })
    .join('');

  const positiveList = log.positiveObservations.length
    ? log.positiveObservations.map(o => `<li style="margin:4px 0;color:#166534;">${o}</li>`).join('')
    : '<li style="color:#6b7280;">None recorded today</li>';

  const challengingList = log.challengingBehaviors.length
    ? log.challengingBehaviors.map(o => `<li style="margin:4px 0;color:#991b1b;">${o}</li>`).join('')
    : '<li style="color:#6b7280;">None recorded today</li>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
      <div style="color:#c7d2fe;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Daily Behavioral Report</div>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${childName} — ${today}</h1>
      <div style="margin-top:8px;color:#e0e7ff;font-size:14px;">Overall Day:
        <strong style="color:#ffffff;">${log.overallDay.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong>
      </div>
    </div>

    <!-- Narrative -->
    <div style="padding:24px 32px;background:#f5f3ff;border-left:4px solid #7c3aed;margin:0;">
      <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">${narrative}</p>
    </div>

    <!-- Ratings -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 16px;font-size:16px;color:#1e1b4b;font-weight:600;">Behavioral Ratings</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${ratingRows}</tbody>
      </table>
    </div>

    <!-- Week Comparison -->
    ${recentLogs.length >= 3 ? `
    <div style="padding:0 32px 24px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#1e1b4b;font-weight:600;">Today vs 7-Day Average</h2>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;">
        <thead>
          <tr>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Dimension</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Today</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">7-Day Avg</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Trend</th>
          </tr>
        </thead>
        <tbody>${weekAvgRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Observations -->
    <div style="padding:0 32px 24px;display:grid;">
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:12px;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#166534;">✓ Positive Observations</h3>
        <ul style="margin:0;padding-left:20px;">${positiveList}</ul>
      </div>
      ${log.challengingBehaviors.length ? `
      <div style="background:#fef2f2;border-radius:8px;padding:16px;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#991b1b;">⚠ Challenging Behaviors</h3>
        <ul style="margin:0;padding-left:20px;">${challengingList}</ul>
      </div>` : ''}
    </div>

    <!-- Medication & Sleep -->
    <div style="padding:0 32px 24px;">
      <div style="display:flex;gap:12px;">
        <div style="flex:1;background:#eff6ff;border-radius:8px;padding:14px;">
          <div style="font-size:12px;color:#1e40af;font-weight:600;margin-bottom:4px;">💊 Medication</div>
          <div style="font-size:14px;color:#1e3a8a;">${log.medicationTaken ? `Taken at ${log.medicationTime || 'time not noted'}` : 'Not taken today'}</div>
          ${log.medicationNotes ? `<div style="font-size:12px;color:#3b82f6;margin-top:4px;">${log.medicationNotes}</div>` : ''}
        </div>
        <div style="flex:1;background:#f0f9ff;border-radius:8px;padding:14px;">
          <div style="font-size:12px;color:#0369a1;font-weight:600;margin-bottom:4px;">🌙 Sleep</div>
          <div style="font-size:14px;color:#0c4a6e;">${log.sleepHours ?? 'Not recorded'} hours</div>
        </div>
      </div>
    </div>

    <!-- Parent Notes -->
    ${log.parentNotes ? `
    <div style="padding:0 32px 24px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#374151;font-weight:600;">Parent Notes</h3>
      <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-size:14px;color:#374151;line-height:1.6;">${log.parentNotes}</div>
    </div>` : ''}

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6b7280;">This report was automatically generated by the ADHD Behavioral Tracker</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Sent to ${therapistName} • ${today}</p>
    </div>
  </div>
</body>
</html>`;
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: EmailRequest;
  try {
    body = await req.json() as EmailRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { childName, therapistName, therapistEmail, parentEmail, currentLog, recentLogs } = body;

  if (!therapistEmail || !currentLog) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Generate a short AI narrative summary using Claude
    const narrative = await generateNarrativeSummary(childName, currentLog, recentLogs);

    // Build and send email
    const html = buildHtmlEmail(childName, therapistName, currentLog, recentLogs, narrative);

    const today = new Date(currentLog.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });

    await resend.emails.send({
      from: 'ADHD Tracker <reports@adhd-tracker.app>',
      to: [therapistEmail],
      replyTo: parentEmail || undefined,
      subject: `Daily Report: ${childName} — ${today}`,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[send-therapist-email] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/api/send-therapist-email',
};
