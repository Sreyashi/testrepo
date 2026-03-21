/**
 * Agent 1: Daily Reminder Scheduled Function
 * Runs every day at 7 PM UTC (checks each user's timezone).
 * Sends a reminder email to parents who haven't logged symptoms today.
 */
import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ReminderSubscription {
  email: string;
  childName: string;
  timezone: string;
  lastLogDate: string | null;
  subscribedAt: string;
  updatedAt: string;
}

function todayInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
      .format(new Date()); // returns YYYY-MM-DD format
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function buildReminderEmail(childName: string, recipientEmail: string): string {
  const siteUrl = process.env.URL ?? 'https://adhd12.netlify.app';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:500px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">

    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center;">
      <div style="font-size:40px;margin-bottom:8px;">🌟</div>
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Daily Check-In Reminder</h1>
    </div>

    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
        Hi! Just a friendly reminder to log <strong>${childName}'s</strong> behavioral observations for today.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Consistent daily tracking helps identify patterns and gives your therapist the best picture of ${childName}'s progress.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${siteUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;">
          Log Today's Symptoms →
        </a>
      </div>

      <div style="background:#f5f3ff;border-radius:8px;padding:16px;margin-top:24px;">
        <p style="margin:0;font-size:13px;color:#5b21b6;line-height:1.5;">
          💡 <strong>Tip:</strong> It only takes 2–3 minutes. Even a quick log with just the ratings helps track long-term trends for ${childName}.
        </p>
      </div>
    </div>

    <div style="padding:16px 32px 24px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        You're receiving this because you subscribed to daily reminders for ${childName}.
        <br>To unsubscribe, manage your preferences in the app under child profile settings.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export default async () => {
  console.log('[send-daily-reminders] Starting scheduled reminder job');

  const store = getStore('reminder-subscriptions');

  // List all subscriptions
  const { blobs } = await store.list();
  console.log(`[send-daily-reminders] Found ${blobs.length} subscriptions`);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const blob of blobs) {
    try {
      const sub = await store.get(blob.key, { type: 'json' }) as ReminderSubscription | null;
      if (!sub) continue;

      const todayForUser = todayInTimezone(sub.timezone);

      // Skip if they already logged today
      if (sub.lastLogDate === todayForUser) {
        skipped++;
        continue;
      }

      // Send reminder
      await resend.emails.send({
        from: 'ADHD Tracker <reminders@adhd-tracker.app>',
        to: [sub.email],
        subject: `Daily reminder: Log ${sub.childName}'s symptoms today`,
        html: buildReminderEmail(sub.childName, sub.email),
      });

      sent++;
      console.log(`[send-daily-reminders] Sent reminder to ${sub.email} for ${sub.childName}`);
    } catch (err) {
      errors++;
      console.error(`[send-daily-reminders] Error processing blob ${blob.key}:`, err);
    }
  }

  console.log(`[send-daily-reminders] Done. Sent: ${sent}, Skipped (already logged): ${skipped}, Errors: ${errors}`);
};

// Runs every day at 7 PM UTC (adjust to suit your user base timezone)
export const config: Config = {
  schedule: '0 19 * * *',
};
