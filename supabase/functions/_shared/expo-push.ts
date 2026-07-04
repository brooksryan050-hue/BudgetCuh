// Sends a push notification via Expo's push service. Plain fetch — no SDK needed,
// no auth token required for basic sending (an Expo access token can be added later
// for enhanced push security if this ever needs it).
export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<ExpoPushTicket> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
  });
  const json = await response.json();
  // Expo wraps a single ticket in { data: {...} }
  return (json.data ?? json) as ExpoPushTicket;
}
