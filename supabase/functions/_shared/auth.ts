// First line of business logic in both functions — proves the request came from our
// own pg_cron job (via the x-cron-secret header) before any DB read or Claude call.
// This is deliberately a separate, low-privilege secret from the service-role key,
// which never appears in the cron job body — see migrations/0002_ai_features.sql.
export function assertCronSecret(req: Request): Response | null {
  const expected = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');

  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
