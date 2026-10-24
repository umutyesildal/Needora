import 'server-only';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const MODELS = {
  fast: process.env.OPENAI_MODEL_FAST || 'gpt-6-luna',
  smart: process.env.OPENAI_MODEL_SMART || 'gpt-6-astra',
  research: process.env.OPENAI_MODEL_RESEARCH || 'gpt-5.6-sol',
};

// One JSON-schema-constrained call; retries once, then throws.
export async function structured<S extends z.ZodTypeAny>(opts: {
  model: string;
  schema: S;
  name: string;
  system: string;
  user: string;
}): Promise<z.infer<S>> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai.responses.parse({
        model: opts.model,
        input: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        text: { format: zodTextFormat(opts.schema, opts.name) },
      });
      if (res.output_parsed == null) throw new Error(`no parsed output (status ${res.status})`);
      return res.output_parsed as z.infer<S>;
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`OpenAI ${opts.name} (${opts.model}) failed: ${last instanceof Error ? last.message : String(last)}`);
}
