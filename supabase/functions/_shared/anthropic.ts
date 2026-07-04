// Anthropic client factory + a small structured-generation helper shared by both
// generate-nudges and generate-reflections. Model is pinned to claude-sonnet-5 per
// explicit instruction — do not substitute another model here.
import Anthropic from 'npm:@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (client) return client;
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY in the function environment.');
  }
  client = new Anthropic({ apiKey });
  return client;
}

export const CLAUDE_MODEL = 'claude-sonnet-5';

export interface StructuredGenerationResult<T> {
  ok: true;
  data: T;
}

export interface StructuredGenerationFailure {
  ok: false;
  reason: 'refusal' | 'max_tokens' | 'parse_error' | 'api_error';
  detail: string;
}

/**
 * Calls Claude with output_config.format (structured outputs) so the response is
 * schema-valid JSON text, then parses it. Checks stop_reason before touching content —
 * a refusal returns an empty/partial content array, not an exception.
 */
export async function generateStructured<T>(params: {
  system: string;
  userContent: string;
  jsonSchema: Record<string, unknown>;
  maxTokens: number;
  effort: 'low' | 'medium';
}): Promise<StructuredGenerationResult<T> | StructuredGenerationFailure> {
  const anthropic = getAnthropicClient();

  let response;
  try {
    response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: 'user', content: params.userContent }],
      output_config: {
        effort: params.effort,
        format: { type: 'json_schema', schema: params.jsonSchema },
      },
    } as Anthropic.MessageCreateParamsNonStreaming);
  } catch (error) {
    return { ok: false, reason: 'api_error', detail: error instanceof Error ? error.message : String(error) };
  }

  if (response.stop_reason === 'refusal') {
    return { ok: false, reason: 'refusal', detail: JSON.stringify(response.stop_details ?? {}) };
  }
  if (response.stop_reason === 'max_tokens') {
    return { ok: false, reason: 'max_tokens', detail: 'Response truncated at max_tokens.' };
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { ok: false, reason: 'parse_error', detail: 'No text content block in response.' };
  }

  try {
    const data = JSON.parse(textBlock.text) as T;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: 'parse_error', detail: error instanceof Error ? error.message : String(error) };
  }
}
