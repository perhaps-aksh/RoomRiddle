/**
 * Free-tier text providers. Each one turns {system, user} into one short reply
 * or throws. No game knowledge lives here; the prompt and every check are
 * built elsewhere. Keys never leave the server.
 */

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  signal: AbortSignal;
}

export interface AiProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number | null,
    message: string,
  ) {
    super(`${provider}: ${message}`);
    this.name = 'ProviderError';
  }

  /** Quota or rate limit: worth resting the provider for a while. */
  get limited(): boolean {
    return this.status === 429;
  }

  /** Bad, revoked or blocked key: no point retrying soon. */
  get denied(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

type Fetch = typeof fetch;

/** Google AI Studio (Gemini). Free tier, keyed by GEMINI_API_KEY. */
export function geminiProvider(apiKey: string, model: string, fetchImpl: Fetch = fetch): AiProvider {
  const name = `gemini:${model}`;
  return {
    name,
    async complete({system, user, maxTokens, temperature, signal}) {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal,
          headers: {'content-type': 'application/json', 'x-goog-api-key': apiKey},
          body: JSON.stringify({
            systemInstruction: {parts: [{text: system}]},
            contents: [{role: 'user', parts: [{text: user}]}],
            generationConfig: {maxOutputTokens: maxTokens, temperature, thinkingConfig: {thinkingBudget: 0}},
          }),
        },
      );
      if (!response.ok) throw new ProviderError(name, response.status, `HTTP ${response.status}`);
      const body = (await response.json()) as {
        candidates?: {content?: {parts?: {text?: string}[]}; finishReason?: string}[];
      };
      const candidate = body.candidates?.[0];
      const text = (candidate?.content?.parts ?? []).map(p => p.text ?? '').join('').trim();
      if (!text) throw new ProviderError(name, response.status, `empty reply (${candidate?.finishReason ?? 'no candidate'})`);
      return text;
    },
  };
}

/** Groq (OpenAI-compatible chat API). Free tier, keyed by GROQ_API_KEY. */
export function groqProvider(apiKey: string, model: string, fetchImpl: Fetch = fetch): AiProvider {
  const name = `groq:${model}`;
  const reasoning = /gpt-oss/.test(model) ? 'low' : /qwen3/.test(model) ? 'none' : null;
  return {
    name,
    async complete({system, user, maxTokens, temperature, signal}) {
      const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: {'content-type': 'application/json', authorization: `Bearer ${apiKey}`},
        body: JSON.stringify({
          model,
          // Reasoning models spend tokens thinking first; keep that short and budget for it.
          ...(reasoning ? {reasoning_effort: reasoning, max_tokens: maxTokens + 400} : {max_tokens: maxTokens}),
          temperature,
          messages: [
            {role: 'system', content: system},
            {role: 'user', content: user},
          ],
        }),
      });
      if (!response.ok) throw new ProviderError(name, response.status, `HTTP ${response.status}`);
      const body = (await response.json()) as {choices?: {message?: {content?: string}}[]};
      const text = (body.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (!text) throw new ProviderError(name, response.status, 'empty reply');
      return text;
    },
  };
}
