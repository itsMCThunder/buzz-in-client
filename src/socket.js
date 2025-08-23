import { io } from "socket.io-client";

// Use env when deployed, fallback to same-origin for local dev
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const socket = io(SOCKET_URL, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  timeout: 15000,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000
});

socket.on("connect", () => console.log("[socket] connected", socket.id));
socket.on("disconnect", (r) => console.log("[socket] disconnected", r));
socket.on("connect_error", (e) => console.error("[socket] connect_error", e?.message || e));

export default socket;
