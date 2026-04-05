import { io } from "socket.io-client";

// 🔥 Your deployed backend URL
const URL = "https://amongusforcoders.onrender.com";

// Create socket instance
export const socket = io(URL, {
  transports: ["websocket", "polling"], // improves stability on Render
  autoConnect: false, // manual control (recommended)
});

// ✅ Connect function
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

// ❌ Disconnect function
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// 🧠 Debug logs (VERY IMPORTANT)
socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("connect_error", (err) => {
  console.log("🚨 Connection Error:", err.message);
});