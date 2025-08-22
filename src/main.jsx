import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import GameLobby from "./GameLobby";

const socket = io(); // Connects to the same host the app was served from

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  // ✅ Handle connection state
  useEffect(() => {
    socket.on("connect", () => {
      setConnected(true);
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setRoom(null);
    });

    // ✅ Room updates
    socket.on("room_update", (data) => {
      setRoom(data);
    });

    // ✅ Error from server
    socket.on("error_message", (msg) => {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
      socket.off("error_message");
    };
  }, []);

  // ✅ Create Room
  const handleCreateRoom = () => {
    if (!name) return setError("Please enter your name");
    socket.emit("create_room", { hostName: name, mode: "default" }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setIsHost(true);
      } else {
        setError(res.error || "Failed to create room");
      }
    });
  };

  // ✅ Join Room
  const handleJoinRoom = () => {
    if (!name || !roomCode) return setError("Enter name and room code");
    socket.emit("join_room", { playerName: name, code: roomCode }, (res) => {
      if (res.ok) {
        setIsHost(false);
      } else {
        setError(res.error || "Failed to join room");
      }
    });
  };

  // If in room → show GameLobby
  if (room) {
    return <GameLobby socket={socket} room={room} isHost={isHost} name={name} />;
  }

  // Otherwise → show landing screen
  return (
    <div className="bg-animated min-h-screen flex items-center justify-center text-white">
      <div className="app-container">
        <h1 className="neon-title">Buzz-In Game</h1>

        <div className="status">
          {connected ? (
            <span className="online">Server online</span>
          ) : (
            <span className="offline">Server offline</span>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="buttons">
          <button className="btn btn-primary" onClick={handleCreateRoom}>
            Create Room
          </button>
        </div>

        <input
          type="text"
          placeholder="Room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />

        <div className="buttons">
          <button className="btn btn-secondary" onClick={handleJoinRoom}>
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
