// Safety net for the daily/weekly/monthly cron functions (generate-nudges,
// generate-reflections): each Claude call costs real money and free users aren't
// paywalled for these features, so a runaway signup spike would otherwise translate
// directly into an uncapped Anthropic bill. This caps how many users a single cron
// run will generate for; past the cap, the run stops early and gets flagged in
// ai_generation_runs.error_summary instead of continuing indefinitely.
const DEFAULT_MAX_DAILY_AI_GENERATIONS = 2000;

export function getDailyGenerationCap(envVar: string): number {
  const raw = Deno.env.get(envVar);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_DAILY_AI_GENERATIONS;
}
