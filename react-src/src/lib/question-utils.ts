import type { Question } from "./test-types";

/**
 * Extract the primary display text from any question, stripping HTML tags.
 * Falls back to an empty string if no text is found.
 */
export function getQuestionText(q: Question): string {
  const c = q.content as Record<string, unknown>;
  const raw =
    (c?.text as string | undefined) ??
    (c?.term as string | undefined) ??
    (c?.title as string | undefined) ??
    (c?.formula as string | undefined) ??
    "";
  return raw.replace(/<[^>]+>/g, "");
}
