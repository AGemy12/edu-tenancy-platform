import { Fragment, createElement, type ReactNode } from "react";
import { intlLocale, type Locale } from "./config";

/**
 * A message with plural forms, picked with Intl.PluralRules. Arabic uses all six
 * categories (zero/one/two/few/many/other); English only needs one/other.
 */
export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };

/** Marks a plural message so dictionaries keep the `Plural` type. */
export const plural = (forms: Plural): Plural => forms;

/** Same keys as `T`, strings stay strings: used to make every locale match the Arabic dictionary. */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Shape<T[K]>;
};

/** "library.upload.title" style paths to every message in `T`. */
export type Path<T> = {
  [K in keyof T & string]: T[K] extends string | Plural ? K : `${K}.${Path<T[K]>}`;
}[keyof T & string];

export type Params = Record<string, string | number>;

type Tree = { [key: string]: string | Plural | Tree };

function lookup(messages: Tree, key: string): string | Plural | undefined {
  let node: string | Plural | Tree | undefined = messages;
  for (const part of key.split(".")) {
    if (!node || typeof node === "string") return undefined;
    node = (node as Tree)[part];
  }
  return node as string | Plural | undefined;
}

const isPlural = (v: unknown): v is Plural => typeof v === "object" && v !== null && "other" in v;

export function createTranslator<K extends string>(locale: Locale, messages: object) {
  const rules = new Intl.PluralRules(intlLocale(locale));
  const tree = messages as Tree;

  function resolve(key: K, params?: Params): string {
    const entry = lookup(tree, key);
    if (entry === undefined || (typeof entry === "object" && !isPlural(entry))) {
      if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing "${key}" (${locale})`);
      return key;
    }
    if (typeof entry === "string") return entry;
    const count = Number(params?.count ?? 0);
    return entry[rules.select(count)] ?? entry.other;
  }

  /** Translates `key`, replacing `{name}` placeholders with `params.name`. */
  function t(key: K, params?: Params): string {
    const text = resolve(key, params);
    return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : text;
  }

  /** Like `t`, but placeholders can be React nodes (e.g. `{ name: <strong>…</strong> }`). */
  function rich(key: K, values: Record<string, ReactNode>): ReactNode {
    const text = resolve(key, values as Params);
    const parts = text.split(/(\{\w+\})/g).map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      return m && m[1] in values ? values[m[1]] : part;
    });
    // Passed as separate children, so React needs no keys.
    return createElement(Fragment, null, ...parts);
  }

  /** True when `key` exists (for dynamic keys built from enum values). */
  const has = (key: string) => lookup(tree, key) !== undefined;

  return { t, rich, has };
}
