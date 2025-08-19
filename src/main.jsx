// main.jsx — Buzz-In Client (React Frontend)

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";

// 🔌 Initialize socket connection to Render backend
const socket = io("https://buzz-in-server-1.onrender.com", {
  path: "/socket.io",
  transports: ["websocket", "polling"],
});

function App() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  // 🔔 Socket connection status
  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      setConnected(false);
      setError("Failed to connect to server");
    });

    // Room state updates from backend
    socket.on("room_state", (state) => {
      setRoom(state);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("room_state");
    };
  }, []);

  // Host a game
  const handleHostGame = () => {
    if (!name.trim()) return setError("Enter a name to host");
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setError("");
      } else {
        setError(res.error || "Failed to create room");
      }
    });
  };

  // Join a game
  const handleJoinGame = () => {
    if (!roomCode.trim() || !playerName.trim()) {
      return setError("Enter room code and name to join");
    }
    socket.emit("join_room", { roomCode, name: playerName }, (res) => {
      if (res.ok) {
        setError("");
      } else {
        setError(res.error || "Failed to join room");
      }
    });
  };

  return (
    <div className="app">
      {/* 🔌 Connection Banner */}
      <div
        style={{
          backgroundColor: connected ? "#28a745" : "#dc3545",
          color: "white",
          padding: "8px",
          textAlign: "center",
        }}
      >
        {connected ? "🟢 Connected to Server" : "🔴 Disconnected"}
      </div>

      <h1>Buzz-In</h1>

      {/* Host Section */}
      <div>
        <h2>Host a Game</h2>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={handleHostGame}>Host Game</button>
      </div>

      {/* Join Section */}
      <div>
        <h2>Join a Game</h2>
        <input
          type="text"
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <input
          type="text"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button onClick={handleJoinGame}>Join Game</button>
      </div>

      {/* Error Display */}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* Room State Debug */}
      {room && (
        <div style={{ marginTop: "20px" }}>
          <h3>Room: {room.roomCode}</h3>
          <h4>Players:</h4>
          <ul>
            {room.players.map((p) => (
              <li key={p.id}>
                {p.name} {p.team ? `(${p.team})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
