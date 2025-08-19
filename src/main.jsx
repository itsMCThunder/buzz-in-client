import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import io from "socket.io-client";
import "./index.css";

const socket = io("https://buzz-in-server.onrender.com", {
  transports: ["websocket"],
});

function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);

  // Server connection indicator
  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("room_update", (data) => {
      setPlayers(data.players || []);
      setRoomCode(data.roomCode);
    });

    socket.on("room_closed", () => {
      setError("Host ended the room.");
      setRoomCode("");
      setPlayers([]);
      setIsHost(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
      socket.off("room_closed");
    };
  }, []);

  // Host a game
  const handleHostGame = () => {
    if (!name.trim()) return setError("Enter a name to host");
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setError("");
        setIsHost(true);
      } else {
        setError(res.error || "Failed to create room");
      }
    });
  };

  // Join a game
  const handleJoinGame = () => {
    if (!roomCode.trim() || !name.trim()) {
      return setError("Enter a room code and name");
    }
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setError("");
        setIsHost(false);
      } else {
        setError(res.error || "Failed to join room");
      }
    });
  };

  return (
    <div className="app">
      <header>
        <h1>Buzz-In</h1>
        <p className={`status ${connected ? "online" : "offline"}`}>
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
      </header>

      {!roomCode ? (
        <div className="lobby">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleHostGame}>Host Game</button>

          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <button onClick={handleJoinGame}>Join Game</button>

          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <div className="room">
          <h2>Room Code: {roomCode}</h2>
          <h3>{isHost ? "You are the Host" : "You are a Player"}</h3>

          <div className="player-list">
            <h3>Players Joined:</h3>
            <ul>
              {players.map((p) => (
                <li key={p.id}>
                  {p.name} {p.id === socket.id ? "(You)" : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
