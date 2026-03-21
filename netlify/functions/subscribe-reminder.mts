/**
 * Agent 1: Reminder Subscription Endpoint
 * Parents call this to subscribe/update/unsubscribe from daily email reminders.
 * Stores subscription data in Netlify Blobs.
 */
import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

interface SubscribeRequest {
  action: 'subscribe' | 'unsubscribe' | 'update_log_date';
  email: string;
  childName: string;
  timezone?: string; // e.g., "America/New_York"
  lastLogDate?: string; // ISO date string YYYY-MM-DD
}

interface ReminderSubscription {
  email: string;
  childName: string;
  timezone: string;
  lastLogDate: string | null;
  subscribedAt: string;
  updatedAt: string;
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: SubscribeRequest;
  try {
    body = await req.json() as SubscribeRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { action, email, childName, timezone, lastLogDate } = body;

  if (!email || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const store = getStore('reminder-subscriptions');
    // Use email as key (base64 encoded to avoid special chars)
    const key = Buffer.from(email.toLowerCase().trim()).toString('base64');

    if (action === 'unsubscribe') {
      await store.delete(key);
      return new Response(JSON.stringify({ success: true, message: 'Unsubscribed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_log_date') {
      const existing = await store.get(key, { type: 'json' }) as ReminderSubscription | null;
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Subscription not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const updated: ReminderSubscription = {
        ...existing,
        lastLogDate: lastLogDate ?? new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };
      await store.setJSON(key, updated);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // action === 'subscribe'
    const subscription: ReminderSubscription = {
      email: email.toLowerCase().trim(),
      childName,
      timezone: timezone ?? 'America/New_York',
      lastLogDate: lastLogDate ?? null,
      subscribedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.setJSON(key, subscription);

    return new Response(JSON.stringify({ success: true, message: 'Subscribed to daily reminders' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[subscribe-reminder] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/api/subscribe-reminder',
};
