import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import io from "socket.io-client";
import "./App.css";

const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:3001");

function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);

  // Check server connection
  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("room_update", (room) => {
      setPlayers(room.players || []);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
    };
  }, []);

  // Host a game
  const handleHostGame = () => {
    if (!name.trim()) return setError("Enter a name to host");
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setIsHost(true);
        setError("");
      } else {
        setError(res.error || "Failed to create room");
      }
    });
  };

  // Join a game
  const handleJoinGame = () => {
    if (!name.trim() || !roomCode.trim())
      return setError("Enter name and room code");
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setIsHost(false);
        setError("");
      } else {
        setError(res.error || "Failed to join room");
      }
    });
  };

  return (
    <div className="app-container">
      <header>
        <h1>⚡ Buzz-In Game</h1>
        <p className="status">
          {connected ? (
            <span className="online">🟢 Connected</span>
          ) : (
            <span className="offline">🔴 Disconnected</span>
          )}
        </p>
      </header>

      <main>
        {!roomCode ? (
          <div className="lobby">
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="buttons">
              <button className="btn-primary" onClick={handleHostGame}>
                Host Game
              </button>
              <button className="btn-secondary" onClick={handleJoinGame}>
                Join Game
              </button>
            </div>
            <input
              type="text"
              placeholder="Room Code (for joining)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            {error && <p className="error">{error}</p>}
          </div>
        ) : (
          <div className="game-room">
            <h2>Room Code: {roomCode}</h2>
            <div className="players-list">
              {players.map((p) => (
                <div key={p.id} className="player-card">
                  <span>{p.name}</span>
                  <span className="score">Score: {p.score}</span>
                </div>
              ))}
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="host-controls">
                <h3 className="controls-title">Host Controls</h3>
                <div className="point-buttons">
                  <button
                    className="btn btn-positive"
                    onClick={() =>
                      socket.emit("award_points", {
                        roomCode,
                        playerId: currentPlayer?.id || players[0]?.id,
                        delta: 50,
                      })
                    }
                  >
                    +50
                  </button>
                  <button
                    className="btn btn-neutral"
                    onClick={() =>
                      socket.emit("award_points", {
                        roomCode,
                        playerId: currentPlayer?.id || players[0]?.id,
                        delta: 0,
                      })
                    }
                  >
                    0
                  </button>
                  <button
                    className="btn btn-negative"
                    onClick={() =>
                      socket.emit("award_points", {
                        roomCode,
                        playerId: currentPlayer?.id || players[0]?.id,
                        delta: -50,
                      })
                    }
                  >
                    -50
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
