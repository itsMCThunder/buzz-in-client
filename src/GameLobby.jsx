import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";

function PlayerList({ players = [], buzzedId, isHost, onAward }) {
  return (
    <div className="mt-4 grid gap-2">
      {players.map((p) => {
        const buzzed = buzzedId === p.id;
        return (
          <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${buzzed ? "bg-amber-900/40 border-amber-600" : "bg-neutral-800 border-neutral-700"}`}>
            <div className="truncate">
              <span className="font-semibold">{p.name}</span>
              <span className="opacity-60"> · {p.id.slice(0, 6)}</span>
              {buzzed ? <span className="ml-2 px-2 py-0.5 text-sm rounded bg-amber-600">BUZZED</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700">{p.score ?? 0} pts</span>
              {isHost ? (
                <>
                  <button className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500" onClick={() => onAward(p.id, 1)}>+1</button>
                  <button className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500" onClick={() => onAward(p.id, -1)}>−1</button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GameLobby({ roomCode }) {
  const [room, setRoom] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    setSelfId(socket.id);

    const onUpdate = (s) => s && setRoom(s);
    const onErr = (m) => console.warn("[lobby] error_message:", m);

    socket.on("room_update", onUpdate);
    socket.on("error_message", onErr);

    // ensure context
    socket.emit("create_room", { roomCode });
    socket.emit("join_room", { roomCode, playerName: "Player" });

    return () => {
      socket.off("room_update", onUpdate);
      socket.off("error_message", onErr);
    };
  }, [roomCode]);

  const isHost = useMemo(() => room && selfId && room.hostId === selfId, [room, selfId]);

  const resetBuzz = useCallback(() => socket.emit("reset_buzz", { roomCode }), [roomCode]);
  const buzz = useCallback(() => socket.emit("buzz", { roomCode }), [roomCode]);
  const award = useCallback((sid, points) => socket.emit("award_points", { roomCode, playerId: sid, points }), [roomCode]);

  return (
    <div className="min-h-screen p-6 bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Room {roomCode}</h2>
          <button className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700" onClick={() => navigate("/")}>Leave</button>
        </div>

        {room ? (
          <>
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between">
                <div>Players: {room.players?.length || 0}</div>
                <div>Host: {room.hostId?.slice(0, 6) || "unknown"}</div>
              </div>
              <PlayerList players={room.players || []} buzzedId={room.buzzed} isHost={isHost} onAward={award} />
            </div>

            <div className="flex items-center gap-3">
              {isHost ? (
                <button className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500" onClick={resetBuzz}>Reset buzz</button>
              ) : (
                <button className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500" onClick={buzz}>Buzz</button>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">Waiting for room state…</div>
        )}
      </div>
    </div>
  );
}
