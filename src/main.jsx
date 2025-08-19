import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SERVER_URL, {
  transports: ["websocket"],
  path: "/socket.io",
});

function App() {
  const [stage, setStage] = useState("menu"); // menu | hostName | lobby | play
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Sync room state from server
  useEffect(() => {
    socket.on("room_state", (data) => {
      setRoom(data);
      if (stage !== "play" && stage !== "lobby") {
        setStage("play");
      }
    });

    socket.on("room_update", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    return () => {
      socket.off("room_state");
      socket.off("room_update");
    };
  }, [stage]);

  // Create room as host
  const createRoom = () => {
    if (!name.trim()) return;
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setIsHost(true);
        setStage("play");
      } else {
        alert(res.error || "Failed to create room");
      }
    });
  };

  // Join existing room
  const joinRoom = () => {
    if (!roomCode.trim() || !name.trim()) return;
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setIsHost(false);
        setStage("play");
      } else {
        alert(res.error || "Failed to join room");
      }
    });
  };

  // Host controls
  const clearBuzzers = () => {
    socket.emit("clear_buzzers", { roomCode });
  };

  const lockBuzzers = (locked) => {
    socket.emit("lock_buzzers", { roomCode, locked });
  };

  const nextQuestion = () => {
    socket.emit("next_question", { roomCode });
  };

  const adjustScore = (playerId, delta) => {
    socket.emit("adjust_score", { roomCode, playerId, delta });
  };

  const assignTeam = (playerId, team) => {
    socket.emit("assign_team", { roomCode, playerId, team }, (res) => {
      if (!res.ok) alert(res.error);
    });
  };

  // Player buzzer
  const buzz = () => {
    socket.emit("buzz", { roomCode });
  };

  // ---------------- RENDER ----------------
  if (stage === "menu") {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h1>Buzz-In</h1>
        <button onClick={() => setStage("hostName")}>Host a Game</button>
        <div style={{ marginTop: 20 }}>
          <input
            placeholder="Enter Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <input
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={joinRoom}>Join Game</button>
        </div>
      </div>
    );
  }

  if (stage === "hostName") {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h2>Enter Your Name (Host)</h2>
        <input
          placeholder="Host Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={createRoom}>Create Room</button>
      </div>
    );
  }

  if (!room) {
    return <h2 style={{ textAlign: "center" }}>Loading room...</h2>;
  }

  // ---------------- HOST VIEW ----------------
  if (isHost) {
    const queue = room.buzzQueue || [];
    const players = room.players || [];

    return (
      <div style={{ padding: 20 }}>
        <h2>Host Panel - Room {room.roomCode}</h2>

        <h3>Team Scores</h3>
        <p>Tipsy: {room.teamScores?.tipsy || 0}</p>
        <p>Wobbly: {room.teamScores?.wobbly || 0}</p>

        <div style={{ margin: "20px 0" }}>
          <button onClick={() => lockBuzzers(!room.locked)}>
            {room.locked ? "Unlock Buzzers" : "Lock Buzzers"}
          </button>
          <button onClick={clearBuzzers}>Clear Buzzers</button>
          <button onClick={nextQuestion}>Next Question</button>
        </div>

        <h3>Buzz Queue</h3>
        {queue.length === 0 ? (
          <p>No buzzes yet</p>
        ) : (
          <div>
            {queue.map((id, index) => {
              const player = players.find((p) => p.id === id);
              if (!player) return null;
              return (
                <div key={id} style={{ marginBottom: 10 }}>
                  <strong>{player.name}</strong> (Team: {player.team || "Unassigned"}) - Score:{" "}
                  {player.score || 0}
                  {index === 0 && (
                    <div>
                      <button onClick={() => adjustScore(player.id, 50)}>+50</button>
                      <button onClick={() => adjustScore(player.id, 0)}>0</button>
                      <button onClick={() => adjustScore(player.id, -50)}>-50</button>
                    </div>
                  )}
                  <div>
                    <button onClick={() => assignTeam(player.id, "tipsy")}>Assign Tipsy</button>
                    <button onClick={() => assignTeam(player.id, "wobbly")}>Assign Wobbly</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h3>All Players</h3>
        {players.map((p) => (
          <p key={p.id}>
            {p.name} - {p.team || "No team"} - Score: {p.score || 0}
          </p>
        ))}
      </div>
    );
  }

  // ---------------- PLAYER VIEW ----------------
  const me = room.players.find((p) => p.id === socket.id);

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Room {room.roomCode}</h2>
      <h3>Welcome, {me?.name}</h3>
      <p>Your Team: {me?.team || "Unassigned"}</p>

      <h3>Team Scores</h3>
      <p>Tipsy: {room.teamScores?.tipsy || 0}</p>
      <p>Wobbly: {room.teamScores?.wobbly || 0}</p>

      <button onClick={buzz} disabled={room.locked}>
        Buzz!
      </button>

      <h3>Players</h3>
      {room.players.map((p) => (
        <p key={p.id}>
          {p.name} - {p.team || "No team"} - Score: {p.score || 0}
        </p>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
