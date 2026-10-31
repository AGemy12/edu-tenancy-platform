"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { openMeeting } from "@/lib/open-meeting";
import type { AuthUser, CallState, CallStatus, ChatCall, Conversation } from "@/lib/types";

/** Under the conversations prefix, so a reconnect refetches it with the chats. */
export const callKeys = {
  state: (conversationId: string) => ["conversations", "call", conversationId] as const,
};

/** As on the server: a call nobody picked up within this long counts as missed. */
export const RING_MS = 2 * 60_000;

/** The call's status as of `now` (a ring nobody answered turns missed without a push). */
export function callStatus(call: ChatCall, now = Date.now()): CallStatus {
  return call.status === "RINGING" && now - new Date(call.createdAt).getTime() > RING_MS ? "MISSED" : call.status;
}

/** Calls are between a teacher and their student, from their direct chat. */
export function canCall(user: AuthUser, c: Pick<Conversation, "kind" | "peer"> | undefined) {
  if (!c || c.kind !== "DIRECT" || !c.peer || c.peer.blocked) return false;
  return (user.role === "TEACHER" && c.peer.role === "STUDENT") || (user.role === "STUDENT" && c.peer.role === "TEACHER");
}

/** Whether a call can be placed now (a session of theirs is on), and the call to rejoin. Refreshed every minute: the window opens and closes with time. */
export function useCallState(conversationId: string, enabled: boolean) {
  return useQuery({
    queryKey: callKeys.state(conversationId),
    queryFn: async () => (await api.get<CallState>(`/conversations/${conversationId}/call`)).data,
    enabled,
    refetchInterval: 60_000,
  });
}

type Entered = { url: string; call: ChatCall };

/** Rings the other side and opens the meeting (or joins the call already on). */
export const placeCall = (conversationId: string) => openMeeting(async () => (await api.post<Entered>(`/conversations/${conversationId}/call`)).data);

/** Answers a ringing call, or goes back into one, in a new tab. */
export const joinCall = (callId: string) => openMeeting(async () => (await api.post<Entered>(`/calls/${callId}/join`)).data);

/** Declines, calls off or hangs up. */
export const endCall = async (callId: string) => (await api.post<ChatCall>(`/calls/${callId}/end`)).data;
