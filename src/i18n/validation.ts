import type { MessageKey } from "./messages";
import type { Params } from "./translate";

/**
 * Zod schemas are module-level constants, so their messages can't be translated when
 * they're defined. Instead they carry an encoded key that `translateMessage` turns into
 * text at render time. A param prefixed with "@" is itself a key (e.g. a field label).
 */
const PREFIX = "i18n:";

type ValidationKey = Extract<MessageKey, `validation.${string}`>;
type LabelKey = Extract<MessageKey, `fields.${string}`>;

export function vmsg(key: ValidationKey, params?: Params): string {
  return PREFIX + JSON.stringify(params ? [key, params] : [key]);
}

/** Field label reference for `vmsg` params. */
export const label = (key: LabelKey) => `@${key}`;

export function translateMessage(t: (key: MessageKey, params?: Params) => string, message: string | undefined) {
  if (!message?.startsWith(PREFIX)) return message;
  try {
    const [key, params] = JSON.parse(message.slice(PREFIX.length)) as [MessageKey, Params?];
    const resolved = params
      ? Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, typeof v === "string" && v.startsWith("@") ? t(v.slice(1) as MessageKey) : v]),
        )
      : undefined;
    return t(key, resolved);
  } catch {
    return message;
  }
}
