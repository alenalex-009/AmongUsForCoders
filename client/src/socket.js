import { io } from "socket.io-client";

const URL = "https://amongusforcoders.onrender.com";

export const socket = io(URL, {
  transports: ["websocket", "polling"],
  autoConnect: true,
});

// Debug logs
socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("❌ Error:", err.message);
});