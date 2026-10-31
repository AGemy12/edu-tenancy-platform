"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";
import { useEffect } from "react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import type { AuthResponse, AuthUser, RegisterTenantInput } from "@/lib/types";
import type { CreateTenantInput } from "@/lib/schemas";
import { useAuthStore } from "@/stores/auth-store";

export const authKeys = { me: ["auth", "me"] as const };

/** Only same-app dashboard paths are allowed as a post-login redirect (no open redirects). */
function safeNext(next: string | null) {
  return next && next.startsWith("/dashboard") ? next : "/dashboard";
}

/** Reads the current user from the store and keeps it fresh from the API. */
export function useCurrentUser() {
  const { user, accessToken, hydrated, setUser, clear } = useAuthStore();
  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: async () => (await api.get<AuthUser>("/auth/me")).data,
    enabled: hydrated && Boolean(accessToken),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  useEffect(() => {
    if (query.isError) clear();
  }, [query.isError, clear]);

  return {
    user,
    isLoading: !hydrated || (Boolean(accessToken) && !user && query.isPending),
    isAuthed: hydrated && Boolean(accessToken && user),
  };
}

export function useLogin() {
  const router = useRouter();
  const t = useT();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: { email: string; password: string; rememberMe?: boolean }) =>
      (await api.post<AuthResponse>("/auth/login", input, { skipAuth: true })).data,
    onSuccess: (data, input) => {
      setSession(data, Boolean(input.rememberMe));
      toast.success(t("common.session.welcome", { name: data.user.fullName }));
      // Sign-in proves who they are; with more than one space, they choose where to go.
      const spaces = (data.user.memberships?.length ?? 0) + (data.user.isPlatformAdmin ? 1 : 0);
      router.push(spaces > 1 ? "/spaces" : safeNext(new URLSearchParams(window.location.search).get("next")));
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.session.loginFailed"))),
  });
}

/** Moves the session into another of the user's centers (null = the platform console). Everything cached belongs to the old one. */
export function useSwitchMembership() {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const { setSession } = useAuthStore();
  return useMutation({
    mutationFn: async (membershipId: string | null) =>
      (await api.post<AuthResponse>("/auth/switch", { membershipId, refreshToken: useAuthStore.getState().refreshToken ?? undefined })).data,
    onSuccess: (data) => {
      setSession(data, Boolean(data.rememberMe));
      qc.clear();
      toast.success(t("spaces.switched", { name: data.user.tenant?.name ?? t("spaces.platform") }));
      router.push("/dashboard");
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.actionFailed"))),
  });
}

/** A signed-in user starts a center of their own and lands in it. */
export function useCreateTenant() {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const { setSession } = useAuthStore();
  return useMutation({
    mutationFn: async (input: CreateTenantInput) =>
      (await api.post<AuthResponse>("/auth/tenants", { ...input, refreshToken: useAuthStore.getState().refreshToken ?? undefined })).data,
    onSuccess: (data) => {
      setSession(data, Boolean(data.rememberMe));
      qc.clear();
      toast.success(t("common.session.tenantCreated"), { description: t("common.session.trialStarted") });
      router.push("/dashboard");
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.session.registerFailed"))),
  });
}

export function useForgotPassword() {
  const t = useT();
  return useMutation({
    mutationFn: async (input: { email: string }) =>
      (await api.post<{ ok: true; devResetUrl?: string }>("/auth/forgot-password", input, { skipAuth: true })).data,
    onSuccess: () => toast.success(t("common.session.resetRequested")),
    onError: (err) => toast.error(getErrorMessage(err, t("common.session.resetRequestFailed"))),
  });
}

export function useResetPassword() {
  const router = useRouter();
  const t = useT();
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) =>
      (await api.post<{ ok: true }>("/auth/reset-password", input, { skipAuth: true })).data,
    onSuccess: () => {
      toast.success(t("common.session.passwordChanged"));
      router.push("/login");
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.session.resetFailed"))),
  });
}

export function useRegisterTenant() {
  const router = useRouter();
  const t = useT();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: RegisterTenantInput) =>
      (await api.post<AuthResponse>("/auth/register", input, { skipAuth: true })).data,
    onSuccess: (data) => {
      setSession(data, true);
      toast.success(t("common.session.tenantCreated"), { description: t("common.session.trialStarted") });
      router.push("/dashboard");
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.session.registerFailed"))),
  });
}

export function useUpdateProfile() {
  const t = useT();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (input: { fullName: string; email: string; phone: string | null; currentPassword?: string }) =>
      (await api.patch<AuthUser>("/auth/me", input)).data,
    onSuccess: (user) => {
      setUser(user);
      qc.setQueryData(authKeys.me, user);
      toast.success(t("profile.details.saved"));
    },
    onError: (err) => toast.error(getErrorMessage(err, t("profile.details.saveFailed"))),
  });
}

export function useChangePassword() {
  const t = useT();
  return useMutation({
    // Sending our own refresh token keeps this session; every other device is signed out.
    mutationFn: async (input: { currentPassword: string; newPassword: string }) =>
      (
        await api.post<{ ok: true }>("/auth/change-password", {
          ...input,
          refreshToken: useAuthStore.getState().refreshToken ?? undefined,
        })
      ).data,
    onSuccess: () => toast.success(t("profile.password.changed")),
    onError: (err) => toast.error(getErrorMessage(err, t("profile.password.changeFailed"))),
  });
}

/**
 * Platform admin: enter a center as one of its members (support mode), under a request the
 * center approved. Everything cached belongs to the console.
 */
export function useStartSupport() {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const enterSupport = useAuthStore((s) => s.enterSupport);
  return useMutation({
    mutationFn: async (requestId: string) => (await api.post<AuthResponse>("/support/sessions", { requestId })).data,
    onSuccess: (data) => {
      enterSupport(data);
      qc.clear();
      toast.success(t("support.entered", { name: data.user.fullName, center: data.user.tenant?.name ?? "" }));
      router.push("/dashboard");
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.actionFailed"))),
  });
}

/** Leaves support mode: closes the session on the server and returns to the console (SupportBanner moves the page). */
export function useLeaveSupport() {
  return async () => {
    // Sent (with the support token) before the admin's own session comes back.
    await api.post("/support/sessions/current/end").catch(() => undefined);
    useAuthStore.getState().leaveSupport();
  };
}

export function useLogout() {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const { refreshToken, clear } = useAuthStore();
  const leaveSupport = useLeaveSupport();
  return () => {
    // Signing out of support mode only leaves it; the admin stays signed in.
    if (useAuthStore.getState().user?.support) return void leaveSupport();
    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    clear();
    qc.clear();
    toast(t("common.session.signedOut"));
    router.push("/login");
  };
}
