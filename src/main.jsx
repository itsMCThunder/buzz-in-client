import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import io from "socket.io-client";

const socket = io("https://your-server-url.onrender.com"); // replace with your server URL

function App() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);

  useEffect(() => {
    socket.on("room_update", (data) => setRoom({ ...data }));
    socket.on("room_closed", () => setRoom(null));
    return () => {
      socket.off("room_update");
      socket.off("room_closed");
    };
  }, []);

  const createRoom = () => {
    socket.emit("create_room", { hostName: playerName }, ({ roomCode }) => {
      setRoomCode(roomCode);
      setIsHost(true);
    });
  };

  const joinRoom = () => {
    socket.emit("join_room", { roomCode, name: playerName }, ({ ok }) => {
      if (ok) setIsHost(false);
    });
  };

  const buzz = () => socket.emit("buzz", { roomCode });

  const awardPoints = (playerId, points) => {
    socket.emit("award_points", { roomCode, playerId, points });
  };

  const resetBuzz = () => {
    socket.emit("reset_buzz", { roomCode });
  };

  if (!room) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Buzz In Game</h1>
        <input
          type="text"
          placeholder="Your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="p-2 border mb-2"
        />
        <button
          onClick={createRoom}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-2"
        >
          Create Room
        </button>
        <input
          type="text"
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="p-2 border mb-2"
        />
        <button
          onClick={joinRoom}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Join Room
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h2 className="text-xl font-bold">Room: {roomCode}</h2>
      <ul className="mt-4">
        {room.players.map((p) => (
          <li key={p.id} className="mb-2">
            {p.name} — {p.score} pts{" "}
            {isHost && (
              <span>
                <button
                  className="ml-2 px-2 py-1 bg-green-400 rounded"
                  onClick={() => awardPoints(p.id, +1)}
                >
                  +1
                </button>
                <button
                  className="ml-2 px-2 py-1 bg-red-400 rounded"
                  onClick={() => awardPoints(p.id, -1)}
                >
                  -1
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {!isHost && (
        <button
          onClick={buzz}
          disabled={room.buzzed !== null}
          className="mt-4 bg-yellow-400 px-6 py-3 rounded font-bold"
        >
          Buzz!
        </button>
      )}

      {isHost && (
        <button
          onClick={resetBuzz}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Reset Buzz
        </button>
      )}

      {room.buzzed && (
        <div className="mt-4 text-lg font-bold">
          Buzzed: {room.players.find((p) => p.id === room.buzzed)?.name}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
