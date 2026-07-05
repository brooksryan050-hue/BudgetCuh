// First line of business logic in both functions — proves the request came from our
// own pg_cron job (via the x-cron-secret header) before any DB read or Claude call.
// This is deliberately a separate, low-privilege secret from the service-role key,
// which never appears in the cron job body — see migrations/0002_ai_features.sql.

// Plain `!==` short-circuits on the first mismatched byte, which leaks how many
// leading characters matched via response timing. Compare every byte regardless of
// where the first difference is so the comparison takes the same time either way.
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) return false;

  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

export function assertCronSecret(req: Request): Response | null {
  const expected = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');

  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
