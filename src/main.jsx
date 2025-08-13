import "./index.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import io from "socket.io-client";
import logoUrl from "./assets/logo.svg";
import buzzSfx from "./assets/buzz.mp3";
import dingSfx from "./assets/ding.mp3";

const palette = { accent: "#8f7dff", accent2: "#43d9ad", muted: "#9aa1b1" };
const serverURL = (import.meta.env?.VITE_SERVER_URL || "http://localhost:5175").replace(/\/$/, "");
const socket = io(serverURL, { path: "/socket.io", transports: ["websocket", "polling"], reconnection: true });

function App() {
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState("home"); // home | host | player
  const [room, setRoom] = useState(null);

  // audio + timers
  const buzzAudioRef = useRef(null);
  const dingAudioRef = useRef(null);
  const prevRoomRef = useRef(null);
  const dingTimerRef = useRef(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_state", (payload) => setRoom(payload));
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_state");
    };
  }, []);

  // Buzz + 15s Ding (host only)
  useEffect(() => {
    const current = room;
    const prev = prevRoomRef.current;
    const isHost = current && current.hostId === socket.id;

    const clearDing = () => {
      if (dingTimerRef.current) {
        clearTimeout(dingTimerRef.current);
        dingTimerRef.current = null;
      }
    };

    // play buzz on new entrant to queue
    if (isHost && current && prev) {
      const a = (prev.buzzQueue || []).length;
      const b = (current.buzzQueue || []).length;
      if (b > a && b > 0) {
        try {
          buzzAudioRef.current?.play();
        } catch {}
      }
    }

    // cancel ding on confirm or queue clear
    const prevTop = prev && prev.buzzQueue && prev.buzzQueue[0];
    const currTop = current && current.buzzQueue && current.buzzQueue[0];
    if (current && (current.showScores || !currTop)) clearDing();

    const newFirst = isHost && currTop && currTop !== prevTop;
    if (newFirst) {
      clearDing();
      dingTimerRef.current = setTimeout(() => {
        const latest = prevRoomRef.current || current;
        const stillHost = latest && latest.hostId === socket.id;
        const stillTop = latest && latest.buzzQueue && latest.buzzQueue[0];
        const notConfirmed = latest && !latest.showScores;
        if (stillHost && stillTop && notConfirmed) {
          try {
            dingAudioRef.current?.play();
          } catch {}
        }
      }, 15000);
    }

    prevRoomRef.current = current;
  }, [room]);

  return (
    <div className="container">
      {/* hidden audio for host cues */}
      <audio ref={buzzAudioRef} src={buzzSfx} preload="auto" />
      <audio ref={dingAudioRef} src={dingSfx} preload="auto" />

      {view === "home" && (
        <Home
          connected={connected}
          onHost={() => setView("host")}
          onJoin={() => setView("player")}
        />
      )}
      {view === "host" && <Host room={room} onBack={() => setView("home")} />}
      {view === "player" && <Player room={room} onBack={() => setView("home")} />}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div className="card" style={style}>
      {children}
    </div>
  );
}

function Home({ onHost, onJoin, connected }) {
  return (
    <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
      <div className="row">
        <img src={logoUrl} alt="logo" height="40" />
        <div>
          <div style={{ fontWeight: 900 }}>Buzz-In Live</div>
          <div style={{ color: palette.muted, fontSize: 12 }}>
            Lobby + Buzzer + Scoreboard
          </div>
        </div>
      </div>

      <div style={{ color: connected ? "#43d9ad" : "#ff5d73", fontSize: 12 }}>
        Server: {connected ? "Connected" : "Not connected"} · Server URL: {serverURL}
      </div>

      <h1 style={{ fontSize: 40, margin: 0 }}>
        Buzz-In! <span style={{ color: palette.accent }}>Live</span>
      </h1>
      <p style={{ color: palette.muted, marginTop: 4 }}>
        Host a game with a lobby code and let contestants buzz in.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn"
          style={{ background: "#8f7dff", color: "#0b1220" }}
          onClick={onHost}
        >
          Host a Game
        </button>
        <button className="btn" onClick={onJoin}>
          Join a Game
        </button>
      </div>
    </div>
  );
}

// Shared styles
const inputStyle = {
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.1)",
  padding: "12px 14px",
  borderRadius: 12,
  outline: "none",
};
const pillBtn = (bg) => ({
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.12)",
  background: bg,
});

function Host({ room, onBack }) {
  const [hostName, setHostName] = useState("");
  const [created, setCreated] = useState(false);

  const playersSorted =
    useMemo(
      () =>
        room?.players?.slice().sort((a, b) => (b.score || 0) - (a.score || 0)) ||
        [],
      [room]
    ) || [];
  const buzzQueue = room?.buzzQueue || [];

  const createRoom = () => {
    socket.emit(
      "create_room",
      { hostName: hostName || "Host" },
      (res) => {
        if (res?.ok) setCreated(true);
        else alert(res?.error || "Create failed");
      }
    );
  };
  const clearBuzz = () =>
    socket.emit("clear_buzzers", { roomCode: room?.roomCode });
  const lock = (locked) =>
    socket.emit("lock_buzzers", { roomCode: room?.roomCode, locked });
  const award = (pid) =>
    socket.emit("award", { roomCode: room?.roomCode, playerId: pid, delta: 50 });
  const penalty = (pid) =>
    socket.emit("penalty", {
      roomCode: room?.roomCode,
      playerId: pid,
      delta: -50,
    });
  const next = () => socket.emit("next_question", { roomCode: room?.roomCode });

  // Team assignment (host-only)
  const assign = (pid, team) =>
    socket.emit(
      "assign_team",
      { roomCode: room?.roomCode, playerId: pid, team },
      (r) => {
        if (!r?.ok) alert(r?.error || "Assign failed");
      }
    );

  return (
    <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
      <button
        className="btn"
        onClick={onBack}
        style={{ width: 120, background: "transparent", color: palette.muted }}
      >
        ← Back
      </button>

      {!created ? (
        <Card>
          <h2 style={{ marginTop: 0 }}>Create Lobby</h2>
          <div className="row">
            <input
              placeholder="Your name (Host)"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              style={inputStyle}
            />
            <button
              className="btn"
              style={{ background: "#8f7dff", color: "#0b1220" }}
              onClick={createRoom}
            >
              Create
            </button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ color: palette.muted, fontSize: 12 }}>Lobby Code</div>
                <div style={{ fontSize: 36, letterSpacing: 6 }}>
                  {room?.roomCode || "----"}
                </div>
              </div>
              <div className="row">
                <button
                  className="btn"
                  onClick={() => lock(!room?.locked)}
                  style={{
                    background: room?.locked ? "#43d9ad" : "transparent",
                    color: room?.locked ? "#0b1220" : "#fff",
                  }}
                >
                  {room?.locked ? "Unlock" : "Lock"} Buzzers
                </button>
                <button className="btn" onClick={clearBuzz}>
                  Clear Queue
                </button>
                <button
                  className="btn"
                  onClick={next}
                  style={{ background: "#43d9ad", color: "#0b1220" }}
                >
                  Next
                </button>
              </div>
            </div>

            {/* Team totals */}
            <div className="row" style={{ gap: 12, marginTop: 12 }}>
              <div className="card" style={{ padding: 10, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: palette.muted }}>Team Tipsy</div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>
                  {room?.teamScores?.tipsy ?? 0}
                </div>
              </div>
              <div className="card" style={{ padding: 10, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: palette.muted }}>
                  Team Wobbly
                </div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>
                  {room?.teamScores?.wobbly ?? 0}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <h3 style={{ marginTop: 0 }}>Buzz Queue</h3>
                {buzzQueue.length === 0 && (
                  <div style={{ color: palette.muted }}>No buzzes yet…</div>
                )}
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {buzzQueue.map((id, idx) => {
                    const p = room?.players?.find((x) => x.id === id);
                    return (
                      <li
                        key={id}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          background:
                            idx === 0
                              ? "rgba(80,227,164,.12)"
                              : "rgba(255,255,255,.04)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{p?.name || id}</div>
                          <div style={{ color: palette.muted, fontSize: 12 }}>
                            #{idx + 1}
                          </div>
                        </div>
                        {idx === 0 && (
                          <div className="row" style={{ gap: 8 }}>
                            <button
                              className="btn"
                              onClick={() => award(id)}
                              title="Correct (+50)"
                              style={pillBtn("#50e3a4")}
                            >
                              ✓
                            </button>
                            <button
                              className="btn"
                              onClick={() => penalty(id)}
                              title="Wrong (−50)"
                              style={pillBtn("#ff5d73")}
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h3 style={{ marginTop: 0 }}>Players</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {playersSorted.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: "rgba(255,255,255,.04)",
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {p.name}
                        {room?.hostId === p.id ? " (Host)" : ""}{" "}
                        {p.team ? (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 12,
                              padding: "4px 8px",
                              borderRadius: 999,
                              background:
                                p.team === "tipsy"
                                  ? "rgba(143,125,255,.16)"
                                  : "rgba(67,217,173,.16)",
                            }}
                          >
                            {p.team === "tipsy" ? "Team Tipsy" : "Team Wobbly"}
                          </span>
                        ) : null}
                      </div>
                      <div className="row">
                        <div
                          style={{
                            color: palette.accent2,
                            fontWeight: 800,
                            width: 60,
                            textAlign: "right",
                          }}
                        >
                          {p.score}
                        </div>
                        <button
                          className="btn"
                          onClick={() => assign(p.id, "tipsy")}
                          style={pillBtn("rgba(143,125,255,.18)")}
                        >
                          Tipsy
                        </button>
                        <button
                          className="btn"
                          onClick={() => assign(p.id, "wobbly")}
                          style={pillBtn("rgba(67,217,173,.18)")}
                        >
                          Wobbly
                        </button>
                        <button
                          className="btn"
                          onClick={() => assign(p.id, null)}
                          style={pillBtn("rgba(255,255,255,.08)")}
                        >
                          —
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {room?.showScores && <ScoreboardModal room={room} onNext={next} />}
        </>
      )}
    </div>
  );
}

function Player({ room, onBack }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const inRoom = !!room;
  const playersSorted =
    useMemo(
      () =>
        room?.players?.slice().sort((a, b) => (b.score || 0) - (a.score || 0)) ||
        [],
      [room]
    ) || [];

  const join = () =>
    socket.emit(
      "join_room",
      { roomCode: code.trim(), name: name || "Player" },
      (res) => {
        if (!res?.ok) alert(res?.error || "Join failed");
      }
    );
  const buzz = () => {
    if (room) socket.emit("buzz", { roomCode: room.roomCode });
  };

  return (
    <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
      <button
        className="btn"
        onClick={onBack}
        style={{ width: 120, background: "transparent", color: palette.muted }}
      >
        ← Back
      </button>

      {!inRoom ? (
        <Card>
          <h2 style={{ marginTop: 0 }}>Join Lobby</h2>
          <div style={{ display: "grid", gap: 12, maxWidth: 500 }}>
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Lobby code (e.g., 3GQZ)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={inputStyle}
            />
            <button
              className="btn"
              onClick={join}
              style={{ background: "#8f7dff", color: "#0b1220" }}
            >
              Join
            </button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ color: palette.muted, fontSize: 12 }}>Lobby Code</div>
                <div style={{ fontSize: 36, letterSpacing: 6 }}>
                  {room?.roomCode || "----"}
                </div>
              </div>
              <div>
                <div style={{ color: palette.muted, fontSize: 12 }}>Buzzers</div>
                <div style={{ fontWeight: 800 }}>{room?.locked ? "Locked" : "Open"}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
              <button
                className="btn buzz"
                onClick={buzz}
                disabled={room?.locked}
                style={{ opacity: room?.locked ? 0.6 : 1 }}
              >
                BUZZ!
              </button>
              <div style={{ color: palette.muted, fontSize: 12 }}>
                Tap once — order is recorded. Wait for your turn.
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0 }}>Leaderboard</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {playersSorted.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(255,255,255,.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {i + 1}. {p.name}
                  </div>
                  <div style={{ color: "#43d9ad", fontWeight: 800 }}>{p.score}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ScoreboardModal({ room, onNext }) {
  const playersSorted =
    room.players.slice().sort((a, b) => (b.score || 0) - (a.score || 0)) || [];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 10,
      }}
    >
      <div className="card" style={{ width: "min(720px, 95vw)" }}>
        <h2 style={{ marginTop: 0 }}>Scores</h2>

        {/* Team totals */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div className="card" style={{ padding: 10, borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: palette.muted }}>Team Tipsy</div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>
              {room?.teamScores?.tipsy ?? 0}
            </div>
          </div>
          <div className="card" style={{ padding: 10, borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: palette.muted }}>Team Wobbly</div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>
              {room?.teamScores?.wobbly ?? 0}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {playersSorted.map((p, i) => (
            <div
              key={p.id}
              style={{
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,255,255,.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {i + 1}. {p.name}
              </div>
              <div style={{ color: "#43d9ad", fontWeight: 800 }}>{p.score}</div>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onNext} style={{ background: "#43d9ad", color: "#0b1220" }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
