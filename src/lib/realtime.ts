import { io, type Socket } from "socket.io-client";
import { API_URL, pageLocale, refreshAccessToken } from "./api";
import { useAuthStore } from "@/stores/auth-store";

/**
 * The real-time channel to the API (Socket.IO on `<api>/realtime`). It signs in with the same
 * access token as REST; when the server closes it because the token ran out (or refuses a stale
 * one), the token is refreshed and the socket reconnects. Pushes are hints: after every
 * (re)connect the app refetches what it shows, so nothing is lost while offline.
 */

const url = new URL(API_URL);
const PATH = `${url.pathname.replace(/\/$/, "")}/realtime`;
const MAX_AUTH_RETRIES = 3;

let socket: Socket | null = null;
let authRetries = 0;

export function getSocket() {
  return socket;
}

export function connectRealtime(): Socket {
  if (socket) return socket;
  const s = io(url.origin, {
    path: PATH,
    transports: ["websocket"],
    // Read on every (re)connect, so a refreshed token is picked up.
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken, lang: pageLocale() }),
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 15_000,
  });

  s.on("connect", () => {
    authRetries = 0;
  });

  // The server closed it (token expired, account blocked): Socket.IO won't retry by itself.
  s.on("disconnect", (reason) => {
    if (reason === "io server disconnect") void reauthenticate(s);
  });

  // A refused handshake (expired token) isn't retried either.
  s.on("connect_error", (err) => {
    if (err.message === "unauthorized") void reauthenticate(s);
  });

  socket = s;
  return s;
}

export function disconnectRealtime() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  authRetries = 0;
}

async function reauthenticate(s: Socket) {
  if (s !== socket || authRetries >= MAX_AUTH_RETRIES) return;
  authRetries += 1;
  const token = await refreshAccessToken();
  // No token: the session is over (the dashboard sends the person to sign in).
  if (token && s === socket) setTimeout(() => s === socket && s.connect(), 300 * authRetries);
}
