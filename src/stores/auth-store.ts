import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { AuthResponse, AuthUser } from "@/lib/types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** true once the persisted state has been read from storage */
  hydrated: boolean;
  setSession: (res: AuthResponse, rememberMe?: boolean) => void;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser | null) => void;
  /** Ends the session; in support mode it returns to the platform admin's own session instead. */
  clear: () => void;
  setHydrated: () => void;
  /** Support mode: keeps the platform admin's session aside and signs in as the member. */
  enterSupport: (res: AuthResponse) => void;
  /** Back to the platform admin's own session; false when there was nothing to return to. */
  leaveSupport: () => boolean;
};

const SESSION_COOKIE = "edu.session";
const REMEMBER_KEY = "edu.remember";
/** The platform admin's own session while they work as a member. */
const SUPPORT_RETURN_KEY = "edu.support.return";
type SavedSession = Pick<AuthState, "accessToken" | "refreshToken" | "user">;

/* ── "Remember me": localStorage keeps the session across browser restarts,
      sessionStorage drops it when the tab/browser closes. ── */

function readRemember(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

let remember = readRemember();

function setRemember(value: boolean) {
  remember = value;
  try {
    if (value) localStorage.setItem(REMEMBER_KEY, "1");
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {}
}

const dynamicStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (remember) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {}
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {}
  },
};

function setSessionCookie(on: boolean) {
  if (typeof document === "undefined") return;
  if (!on) {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
    return;
  }
  // Persistent cookie only when remembering; otherwise a browser-session cookie.
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : "";
  document.cookie = `${SESSION_COOKIE}=1; path=/; samesite=lax${maxAge}`;
}

function readReturn(): SavedSession | null {
  try {
    const raw = dynamicStorage.getItem(SUPPORT_RETURN_KEY);
    return typeof raw === "string" ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setSession: (res, rememberMe = false) => {
        setRemember(rememberMe);
        setSessionCookie(true);
        set({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
      },
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => {
        // A support session that ends (signed out, closed, or ran out) goes back to the console.
        if (get().leaveSupport()) return;
        setSessionCookie(false);
        setRemember(false);
        set({ accessToken: null, refreshToken: null, user: null });
      },
      setHydrated: () => set({ hydrated: true }),
      enterSupport: (res) => {
        const { accessToken, refreshToken, user } = get();
        // Entering again from inside support mode keeps the original admin session.
        if (!readReturn()) dynamicStorage.setItem(SUPPORT_RETURN_KEY, JSON.stringify({ accessToken, refreshToken, user }));
        set({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
      },
      leaveSupport: () => {
        const saved = readReturn();
        if (!saved) return false;
        dynamicStorage.removeItem(SUPPORT_RETURN_KEY);
        set({ accessToken: saved.accessToken, refreshToken: saved.refreshToken, user: saved.user });
        return true;
      },
    }),
    {
      name: "edu.auth",
      storage: createJSONStorage(() => dynamicStorage),
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
