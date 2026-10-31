import { create } from "zustand";

/** How long a "typing" signal lasts without another one. */
export const TYPING_TTL_MS = 5_000;

type Presence = { online: boolean; lastSeenAt?: string | null };

type ChatState = {
  /** The conversation on screen (and the tab visible): its messages count as read on arrival. */
  activeConversationId: string | null;
  /** conversationId → membershipId → when the signal runs out. */
  typing: Record<string, Record<string, number>>;
  /** Live presence, newer than what the API returned with a conversation. */
  presence: Record<string, Presence>;
  setActive: (id: string | null) => void;
  typingStarted: (conversationId: string, membershipId: string) => void;
  typingStopped: (conversationId: string, membershipId: string) => void;
  setPresence: (membershipId: string, presence: Presence) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>()((set) => ({
  activeConversationId: null,
  typing: {},
  presence: {},
  setActive: (id) => set({ activeConversationId: id }),
  typingStarted: (conversationId, membershipId) =>
    set((s) => ({ typing: { ...s.typing, [conversationId]: { ...s.typing[conversationId], [membershipId]: Date.now() + TYPING_TTL_MS } } })),
  typingStopped: (conversationId, membershipId) =>
    set((s) => {
      const current = { ...s.typing[conversationId] };
      delete current[membershipId];
      return { typing: { ...s.typing, [conversationId]: current } };
    }),
  setPresence: (membershipId, presence) => set((s) => ({ presence: { ...s.presence, [membershipId]: presence } })),
  reset: () => set({ activeConversationId: null, typing: {}, presence: {} }),
}));
