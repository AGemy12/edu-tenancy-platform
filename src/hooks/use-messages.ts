"use client";

import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useT } from "@/i18n/provider";
import type { AuthUser, ChatContact, ChatMessage, Conversation, ConversationDetail } from "@/lib/types";

export const chatKeys = {
  all: ["conversations"] as const,
  inboxes: ["conversations", "inbox"] as const,
  inbox: (archived: boolean) => ["conversations", "inbox", archived] as const,
  unread: ["conversations", "unread"] as const,
  contacts: (q: string) => ["conversations", "contacts", q] as const,
  detail: (id: string) => ["conversations", "detail", id] as const,
  messages: (id: string) => ["conversations", "messages", id] as const,
};

/** Messaging is for center members, never in support mode (a member's chats are theirs). */
export const canUseMessages = (user: AuthUser | null | undefined) =>
  Boolean(user && user.role !== "SUPER_ADMIN" && user.membershipId && !user.support);

export function useInbox(archived = false, enabled = true) {
  return useQuery({
    queryKey: chatKeys.inbox(archived),
    queryFn: async () => (await api.get<Conversation[]>("/conversations", { params: { archived: archived || undefined } })).data,
    enabled,
  });
}

export function useChatUnread(enabled = true) {
  return useQuery({
    queryKey: chatKeys.unread,
    queryFn: async () => (await api.get<{ messages: number; conversations: number }>("/conversations/unread")).data,
    enabled,
    staleTime: 60_000,
  });
}

export function useContacts(q: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.contacts(q),
    queryFn: async () => (await api.get<ChatContact[]>("/conversations/contacts", { params: { q: q || undefined } })).data,
    enabled,
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: chatKeys.detail(id ?? ""),
    queryFn: async () => (await api.get<ConversationDetail>(`/conversations/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
  });
}

/* ── Messages: pages newest first in the cache; `flatten` gives oldest → newest ── */

export type MessagePage = { items: ChatMessage[]; hasMore: boolean };
type MessagePages = InfiniteData<MessagePage, string | null>;

export function useMessages(id: string | null) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(id ?? ""),
    queryFn: async ({ pageParam }) =>
      (await api.get<MessagePage>(`/conversations/${id}/messages`, { params: { before: pageParam ?? undefined, take: 40 } })).data,
    initialPageParam: null as string | null,
    // The oldest message of the oldest page loaded.
    getNextPageParam: (last) => (last.hasMore ? (last.items[0]?.id ?? null) : null),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

export function flattenMessages(data: InfiniteData<MessagePage, unknown> | undefined) {
  return data ? [...data.pages].reverse().flatMap((p) => p.items) : [];
}

/** Adds or replaces a message (matched by id, or by the sender's clientId for our own pending ones). */
export function upsertMessage(qc: QueryClient, m: ChatMessage) {
  qc.setQueryData<MessagePages>(chatKeys.messages(m.conversationId), (data) => {
    if (!data?.pages.length) return data;
    let found = false;
    const pages = data.pages.map((p) => ({
      ...p,
      items: p.items.map((x) => {
        if (x.id === m.id || (m.clientId && x.clientId === m.clientId && x.senderId === m.senderId)) {
          found = true;
          return m;
        }
        return x;
      }),
    }));
    if (!found) pages[0] = { ...pages[0], items: [...pages[0].items, m] };
    return { ...data, pages };
  });
}

/** Applies `fn` to the cached inbox rows of one conversation. */
export function patchInbox(qc: QueryClient, id: string, fn: (c: Conversation) => Conversation) {
  qc.setQueriesData<Conversation[]>({ queryKey: chatKeys.inboxes }, (rows) => rows?.map((c) => (c.id === id ? fn(c) : c)));
  qc.setQueryData<ConversationDetail>(chatKeys.detail(id), (d) => (d ? { ...d, ...fn(d) } : d));
}

/** A new message moves its conversation to the top of the inbox. */
export function bumpInbox(qc: QueryClient, m: ChatMessage, opts: { mine: boolean; read: boolean }) {
  let known = false;
  qc.setQueriesData<Conversation[]>({ queryKey: chatKeys.inbox(false) }, (rows) => {
    if (!rows) return rows;
    const row = rows.find((c) => c.id === m.conversationId);
    if (!row) return rows;
    known = true;
    const updated: Conversation = {
      ...row,
      lastMessage: m,
      lastMessageAt: m.createdAt,
      unreadCount: opts.mine || opts.read ? 0 : row.unreadCount + 1,
      // The peer wrote: they have read everything up to here.
      peer: row.peer && m.senderId === row.peer.membershipId ? { ...row.peer, lastReadAt: m.createdAt } : row.peer,
    };
    return [updated, ...rows.filter((c) => c.id !== m.conversationId)];
  });
  return known;
}

export function newClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2)}`;
}

export function useSendMessage(conversationId: string, me: { membershipId: string; fullName: string; role: AuthUser["role"] }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; clientId: string; replyTo?: ChatMessage | null }) =>
      (
        await api.post<ChatMessage>(`/conversations/${conversationId}/messages`, {
          body: input.body,
          clientId: input.clientId,
          replyToId: input.replyTo?.id,
        })
      ).data,
    onMutate: (input) => {
      // Shown at once, marked as sending; the stored message replaces it (same clientId).
      const draft: ChatMessage = {
        id: `pending:${input.clientId}`,
        conversationId,
        kind: "TEXT",
        body: input.body,
        params: null,
        senderId: me.membershipId,
        sender: { fullName: me.fullName, role: me.role },
        clientId: input.clientId,
        replyTo: input.replyTo
          ? { id: input.replyTo.id, body: input.replyTo.body, deleted: Boolean(input.replyTo.deletedAt), senderName: input.replyTo.sender?.fullName ?? null }
          : null,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        pending: "sending",
      };
      upsertMessage(qc, draft);
      bumpInbox(qc, draft, { mine: true, read: true });
    },
    onSuccess: (m) => upsertMessage(qc, m),
    onError: (err, input) => {
      toast.error(getErrorMessage(err));
      qc.setQueryData<MessagePages>(chatKeys.messages(conversationId), (data) =>
        data
          ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((x) => (x.clientId === input.clientId && x.pending ? { ...x, pending: "failed" as const } : x)) })) }
          : data,
      );
    },
  });
}

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => (await api.patch<ChatMessage>(`/messages/${id}`, { body })).data,
    onSuccess: (m) => upsertMessage(qc, m),
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<ChatMessage>(`/messages/${id}`)).data,
    onSuccess: (m) => upsertMessage(qc, m),
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

/** Marks a conversation read (badge and receipts); quiet on failure, the next read catches up. */
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ lastReadAt: string }>(`/conversations/${id}/read`)).data,
    onMutate: (id) => patchInbox(qc, id, (c) => ({ ...c, unreadCount: 0 })),
    onSettled: () => qc.invalidateQueries({ queryKey: chatKeys.unread }),
  });
}

/* ── Conversations ── */

function useChatMutation<TInput>(fn: (input: TInput) => Promise<Conversation | ConversationDetail | { ok: boolean }>, opts?: { success?: string }) {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      if ("participants" in data) qc.setQueryData(chatKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: chatKeys.inboxes });
      if (opts?.success) toast.success(opts.success);
    },
    onError: (err) => toast.error(getErrorMessage(err, t("common.toast.actionFailed"))),
  });
}

export function useStartDirect() {
  return useChatMutation(async (membershipId: string) => (await api.post<Conversation>("/conversations/direct", { membershipId })).data);
}

export type GroupInput = { title?: string; courseId?: string; membershipIds?: string[]; adminsOnly?: boolean };

export function useCreateGroup() {
  return useChatMutation(async (input: GroupInput) => (await api.post<Conversation>("/conversations/groups", input)).data);
}

export function useUpdateGroup(id: string) {
  const t = useT();
  return useChatMutation(
    async (input: { title?: string; adminsOnly?: boolean }) => (await api.patch<ConversationDetail>(`/conversations/${id}`, input)).data,
    { success: t("common.toast.saved") },
  );
}

export function useAddMembers(id: string) {
  return useChatMutation(async (membershipIds: string[]) => (await api.post<ConversationDetail>(`/conversations/${id}/members`, { membershipIds })).data);
}

export function useSetMemberRole(id: string) {
  return useChatMutation(
    async ({ membershipId, isAdmin }: { membershipId: string; isAdmin: boolean }) =>
      (await api.patch<ConversationDetail>(`/conversations/${id}/members/${membershipId}`, { isAdmin })).data,
  );
}

export function useRemoveMember(id: string) {
  const qc = useQueryClient();
  return useChatMutation(async (membershipId: string) => {
    const res = (await api.delete<{ ok: boolean }>(`/conversations/${id}/members/${membershipId}`)).data;
    qc.invalidateQueries({ queryKey: chatKeys.detail(id) });
    return res;
  });
}

export function useConversationSettings(id: string) {
  return useChatMutation(async (input: { muted?: boolean; archived?: boolean }) => (await api.patch<Conversation>(`/conversations/${id}/settings`, input)).data);
}
