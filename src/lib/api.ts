import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthResponse } from "./types";

/** Language of the current page (set on <html> by the [lang] root layout). */
function pageLocale(): "ar" | "en" {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ar";
}

const BUILT_IN = {
  ar: { unexpected: "حدث خطأ غير متوقع", network: "تعذر الاتصال بالخادم" },
  en: { unexpected: "Something went wrong", network: "Can't reach the server" },
};

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Skip attaching the bearer token and the 401 refresh flow (login, register, refresh). */
    skipAuth?: boolean;
  }
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

/** Plain client with no interceptors, used for the refresh call itself. */
const bare = axios.create({ baseURL: API_URL, headers: { "Content-Type": "application/json" } });

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config: RetriableConfig) => {
  // The API answers errors (and emails) in this language.
  config.headers["Accept-Language"] = pageLocale();
  if (!config.skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const { refreshToken, setTokens, clear } = useAuthStore.getState();
    if (!refreshToken) return null;
    try {
      const { data } = await bare.post<AuthResponse>("/auth/refresh", { refreshToken });
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      clear();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && config && !config._retry && !config.skipAuth) {
      config._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from an API/axios error (the backend localizes its messages). */
export function getErrorMessage(err: unknown, fallback = BUILT_IN[pageLocale()].unexpected): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(pageLocale() === "ar" ? "، " : ", ");
    if (typeof data?.message === "string") return data.message;
    if (err.code === "ERR_NETWORK") return BUILT_IN[pageLocale()].network;
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
