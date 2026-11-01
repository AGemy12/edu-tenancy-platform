"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { openMeeting } from "@/lib/open-meeting";
import type { RingingSession } from "@/lib/types";

/** Refetched on every `session:ring` push and after a reconnect (see RealtimeBridge). */
export const ringingKey = ["sessions", "ringing"] as const;

/** When the ring stops, on this device's clock (the server says how long is left, not when). */
export type Ringing = RingingSession & { ringsUntil: number };

/** The live session calling this student now, or null. */
export function useRingingSession(enabled: boolean) {
  return useQuery({
    queryKey: ringingKey,
    queryFn: async (): Promise<Ringing | null> => {
      const { session } = (await api.get<{ session: RingingSession | null }>("/sessions/ringing")).data;
      return session ? { ...session, ringsUntil: Date.now() + session.ringMs } : null;
    },
    enabled,
    // Pushes say when it changes; while a session calls, also check now and then (it may end unseen).
    refetchInterval: (q) => (q.state.data ? 60_000 : false),
  });
}

/** Enters the session's meeting in a new tab (and records attendance). */
export const joinSession = (id: string) => openMeeting(async () => (await api.post<{ url: string }>(`/sessions/${id}/join`)).data);
