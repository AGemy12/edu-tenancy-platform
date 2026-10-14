import type { Locale } from "../config";
import type { Path, Shape } from "../translate";
import type { Messages } from "./ar";

export type { Messages };
export type Dictionary = Shape<Messages>;
/** Every translatable key, e.g. "library.upload.title". */
export type MessageKey = Path<Messages>;

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./ar").then((m) => m.ar),
  en: () => import("./en").then((m) => m.en),
};

/** Loads one locale's dictionary (server side; the result is passed to the client provider). */
export const getMessages = (locale: Locale) => loaders[locale]();
