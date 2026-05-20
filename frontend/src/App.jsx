import { useState, useRef, useEffect, useCallback } from "react";

const REACTIONS = ["🔥", "😂", "😮", "❤️", "👏", "💀"];

const generateCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();


function FloatingReaction({ emoji, id, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  const left = 20 + Math.random() * 60;
  return (
    <div key={id} style={{ position: "absolute", bottom: 60, left: `${left}%`, fontSize: 28, animation: "floatUp 2.8s ease-out forwards", pointerEvents: "none", zIndex: 50 }}>
      {emoji}
    </div>
  );
}

export default function CoWatch() {
  const [screen, setScreen] = useState("landing");
  const [tab, setTab] = useState("create");
  const [roomCode, setRoomCode] = useState(generateCode());
  const [joinCode, setJoinCode] = useState("");
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [participants, setParticipants] = useState([]);
  const [localMuted, setLocalMuted] = useState(false);
  const [localCamOff, setLocalCamOff] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [myName, setMyName] = useState("You");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [urlError, setUrlError] = useState("");

  const videoRef = useRef(null);
  const videoWrapRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null); // store the actual MediaStream
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume / 100;
  }, [volume]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // --- CAMERA HELPERS ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Camera access denied", e);
    }
  };

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const toggleCam = async () => {
    if (localCamOff) {
      // turning ON
      await startCamera();
      setLocalCamOff(false);
    } else {
      // turning OFF
      stopCamera();
      setLocalCamOff(true);
    }
  };

  const enterRoom = (host) => {
    const name = userName.trim() || (host ? "Host" : "Guest");
    setMyName(name);
    setIsHost(host);
setParticipants([
  { id: "me", name, color: "#a78bfa", host, muted: false, camOff: false, isMe: true },
]);
    setScreen("room");
    startCamera();
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    if (file.size > 10 * 1024 * 1024 * 1024) { setUrlError("File must be under 10GB"); return; }
    setVideoSrc(URL.createObjectURL(file));
    setUrlError("");
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const loadUrl = () => {
    if (!videoUrl.trim()) return;
    setVideoSrc(videoUrl.trim());
    setUrlError("");
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  // --- FULLSCREEN ---
  const toggleFullscreen = () => {
    const el = videoWrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(err => console.warn("Fullscreen error:", err));
    } else {
      document.exitFullscreen();
    }
  };

  const sendReaction = (emoji) => {
    setReactions(r => [...r, { emoji, id: Date.now() + Math.random() }]);
    setMessages(m => [...m, {
      id: Date.now(), user: myName, color: "#a78bfa", text: emoji,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isReaction: true
    }]);
  };

  const sendMsg = () => {
    if (!msgInput.trim()) return;
    setMessages(m => [...m, {
      id: Date.now(), user: myName, color: "#a78bfa", text: msgInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);
    setMsgInput("");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── LANDING ───────────────────────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <div style={{ minHeight: "100vh", background: "#08060f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', Georgia, serif", position: "relative", overflow: "hidden" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          ::selection { background: #7c3aed44; }
          .land-input { width: 100%; background: #1a1525; border: 1px solid #3d2a6e; color: #e8d5ff; padding: 12px 16px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; transition: border 0.2s; }
          .land-input:focus { border-color: #7c3aed; }
          .land-input::placeholder { color: #6b5a8a; }
          .btn-primary { background: linear-gradient(135deg, #7c3aed, #4f1d96); color: #fff; border: none; padding: 13px 24px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; width: 100%; transition: opacity 0.2s, transform 0.1s; }
          .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
          .btn-primary:active { transform: scale(0.98); }
          .tab-btn { background: none; border: none; color: #6b5a8a; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; padding: 8px 20px; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
          .tab-btn.active { background: #1a1525; color: #c084fc; }
          @keyframes starFloat { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.3)} }
        `}</style>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{ position: "absolute", width: 2, height: 2, borderRadius: "50%", background: "#c084fc", top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: Math.random() * 0.6 + 0.1, animation: `starFloat ${3 + Math.random() * 4}s ease-in-out infinite`, animationDelay: `${Math.random() * 5}s` }} />
        ))}
        <div style={{ width: 420, background: "#110d1f", border: "1px solid #2a1d4a", borderRadius: 20, padding: "40px 36px", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
            <h1 style={{ color: "#e8d5ff", fontSize: 32, fontWeight: 900, letterSpacing: "-0.5px" }}>CoWatch</h1>
            <p style={{ color: "#6b5a8a", fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>Watch together. Feel together.</p>
          </div>
          <div style={{ display: "flex", background: "#0d0a1a", borderRadius: 10, padding: 4, marginBottom: 28 }}>
            <button className={`tab-btn${tab === "create" ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setTab("create")}>Create Room</button>
            <button className={`tab-btn${tab === "join" ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setTab("join")}>Join Room</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input className="land-input" placeholder="Your name (optional)" value={userName} onChange={e => setUserName(e.target.value)} />
            {tab === "create" ? (
              <>
                <div style={{ background: "#1a1525", border: "1px solid #3d2a6e", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#c084fc", fontFamily: "'DM Sans', sans-serif", fontSize: 15, letterSpacing: 2, fontWeight: 500 }}>{roomCode}</span>
                  <button onClick={() => setRoomCode(generateCode())} style={{ background: "none", border: "none", color: "#6b5a8a", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>↻ New</button>
                </div>
                <button className="btn-primary" onClick={() => enterRoom(true)}>Create Room</button>
              </>
            ) : (
              <>
                <input className="land-input" placeholder="Enter room code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={8} style={{ letterSpacing: 2 }} />
                <button className="btn-primary" onClick={() => { setRoomCode(joinCode || roomCode); enterRoom(false); }}>Join Room</button>
              </>
            )}
          </div>
          <p style={{ color: "#3d2a6e", fontSize: 12, fontFamily: "'DM Sans', sans-serif", textAlign: "center", marginTop: 20 }}>Up to 10 participants · Videos up to 10GB</p>
        </div>
      </div>
    );
  }

  // ─── ROOM ──────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ height: "100vh", background: "#08060f", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif", overflow: "hidden", color: "#e8d5ff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; scrollbar-width: thin; scrollbar-color: #2a1d4a transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a1d4a; border-radius: 4px; }
        ::selection { background: #7c3aed44; }
        .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #b49dd4; cursor: pointer; border-radius: 8px; padding: 8px 10px; font-size: 16px; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .icon-btn:hover { background: rgba(124,58,237,0.2); border-color: #7c3aed55; color: #c084fc; }
        .icon-btn.active { background: rgba(124,58,237,0.3); border-color: #7c3aed; color: #c084fc; }
        .icon-btn.danger { background: rgba(220,38,38,0.15); border-color: #dc2626; color: #f87171; }
        .chat-input { background: #1a1525; border: 1px solid #2a1d4a; color: #e8d5ff; padding: 10px 14px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; flex: 1; transition: border 0.2s; }
        .chat-input:focus { border-color: #7c3aed; }
        .chat-input::placeholder { color: #4a3a6a; }
        .rxn-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 6px 10px; font-size: 18px; cursor: pointer; transition: transform 0.1s, background 0.15s; }
        .rxn-btn:hover { background: rgba(124,58,237,0.2); transform: scale(1.2); }
        .sidebar-tab { background: none; border: none; color: #6b5a8a; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 6px 16px; cursor: pointer; border-radius: 6px; transition: all 0.15s; }
        .sidebar-tab.active { background: #1a1525; color: #c084fc; }
        .participant-card { background: #110d1f; border: 1px solid #1e163a; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; transition: border 0.2s; }
        .participant-card:hover { border-color: #3d2a6e; }
        .participant-card.speaking { border-color: #34d399; box-shadow: 0 0 12px #34d39933; }
        .settings-panel { position: fixed; top: 0; right: 0; width: 320px; height: 100vh; background: #0d0a1a; border-left: 1px solid #1e163a; z-index: 100; display: flex; flex-direction: column; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #1e163a; }
        .settings-row:last-child { border-bottom: none; }
        .toggle { width: 38px; height: 22px; background: #1a1525; border-radius: 11px; cursor: pointer; position: relative; border: 1px solid #2a1d4a; transition: background 0.2s; }
        .toggle.on { background: #7c3aed; border-color: #7c3aed; }
        .toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: left 0.2s; }
        .toggle.on::after { left: 18px; }
        @keyframes floatUp { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-120px) scale(1.5)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .msg-row { animation: fadeIn 0.2s ease-out; }
        .seek-bar { width: 100%; height: 4px; background: #2a1d4a; border-radius: 2px; outline: none; cursor: pointer; -webkit-appearance: none; }
        .seek-bar::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #c084fc; border-radius: 50%; cursor: pointer; }
        .vol-bar { width: 80px; height: 4px; background: #2a1d4a; border-radius: 2px; outline: none; cursor: pointer; -webkit-appearance: none; }
        .vol-bar::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: #c084fc; border-radius: 50%; cursor: pointer; }
        .overlay-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
        .modal-box { background: #110d1f; border: 1px solid #2a1d4a; border-radius: 16px; padding: 28px; width: 360px; }
        .drop-zone { border: 2px dashed #3d2a6e; border-radius: 12px; padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .drop-zone.over { border-color: #7c3aed; background: rgba(124,58,237,0.08); }
        .drop-zone:hover { border-color: #5b21b6; }
        .video-wrap:fullscreen { background: #000; display: flex; align-items: center; justify-content: center; }
        .video-wrap:fullscreen video { width: 100%; height: 100%; object-fit: contain; }
        .fs-btn { position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; padding: 6px 10px; font-size: 16px; cursor: pointer; transition: background 0.15s; z-index: 10; }
        .fs-btn:hover { background: rgba(124,58,237,0.5); }
        @keyframes starFloat { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.3)} }
      `}</style>

      {/* TOP NAV */}
      <div style={{ height: 52, background: "#0a0814", borderBottom: "1px solid #1a1330", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🎬</span>
          <span style={{ fontFamily: "'Playfair Display', serif", color: "#c084fc", fontSize: 18, fontWeight: 700 }}>CoWatch</span>
          <span style={{ background: "#1a1525", border: "1px solid #2a1d4a", borderRadius: 6, padding: "2px 10px", fontSize: 12, color: "#8b7aaa", letterSpacing: 1 }}>{roomCode}</span>
          {isHost && <span style={{ background: "#7c3aed22", border: "1px solid #7c3aed55", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#c084fc" }}>HOST</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#0d0a1a", borderRadius: 8, padding: "4px 10px", fontSize: 13, color: "#6b5a8a" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 6px #34d399" }} />
            {participants.length} watching
          </div>
          <button className="icon-btn" onClick={() => setShowInvite(true)}>👥 Invite</button>
          <button className="icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT — VIDEO + PARTICIPANTS */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* VIDEO PLAYER WRAP — fullscreen target */}
          <div ref={videoWrapRef} className="video-wrap" style={{ flex: 1, background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {videoSrc ? (
              <video ref={videoRef} src={videoSrc}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                {isHost ? (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎞️</div>
                    <p style={{ fontSize: 16, color: "#6b5a8a", marginBottom: 4 }}>No video loaded</p>
                    <p style={{ fontSize: 13, color: "#3d2a6e" }}>Use the controls below to load a video</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                    <p style={{ fontSize: 16, color: "#6b5a8a" }}>Waiting for host to load a video…</p>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", animation: `starFloat ${1+i*0.3}s ease-in-out infinite`, animationDelay: `${i*0.2}s` }} />)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Floating reactions */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
              {reactions.map(r => <FloatingReaction key={r.id} emoji={r.emoji} id={r.id} onDone={() => setReactions(prev => prev.filter(x => x.id !== r.id))} />)}
            </div>

            {/* Live badge */}
            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: playing ? "#34d399" : "#f87171" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: playing ? "#34d399" : "#f87171", boxShadow: playing ? "0 0 8px #34d399" : "none" }} />
              {playing ? "LIVE" : "PAUSED"}
            </div>

            {/* ⛶ FULLSCREEN BUTTON */}
            <button className="fs-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? "⛶" : "⛶"}
              <span style={{ fontSize: 11, marginLeft: 4 }}>{isFullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          </div>

          {/* VIDEO CONTROLS */}
          <div style={{ background: "#0a0814", borderTop: "1px solid #1a1330", padding: "10px 20px", flexShrink: 0 }}>
            <input type="range" className="seek-bar" min={0} max={duration || 100} value={currentTime} step={0.1}
              onChange={e => { if (videoRef.current) { videoRef.current.currentTime = +e.target.value; setCurrentTime(+e.target.value); } }}
              style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isHost && (
                <button className="icon-btn" onClick={togglePlay} style={{ fontSize: 18, padding: "6px 14px" }}>
                  {playing ? "⏸" : "▶️"}
                </button>
              )}
              <span style={{ fontSize: 12, color: "#6b5a8a", minWidth: 90 }}>{formatTime(currentTime)} / {formatTime(duration)}</span>
              <span style={{ fontSize: 14 }}>🔊</span>
              <input type="range" className="vol-bar" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)} />
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 6 }}>
                {REACTIONS.map(r => <button key={r} className="rxn-btn" onClick={() => sendReaction(r)}>{r}</button>)}
              </div>
              <button className={`icon-btn${localMuted ? " danger" : ""}`} onClick={() => setLocalMuted(m => !m)}>
                {localMuted ? "🔇" : "🎙️"}
              </button>
              {/* FIXED CAM TOGGLE */}
              <button className={`icon-btn${localCamOff ? " danger" : ""}`} onClick={toggleCam}>
                {localCamOff ? "📵" : "📷"}
              </button>
            </div>

            {isHost && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <div className={`drop-zone${dragOver ? " over" : ""}`}
                  style={{ flex: 1, padding: "10px 16px", textAlign: "left", fontSize: 13, color: "#6b5a8a" }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}>
                  📁 {videoSrc ? "Change video file" : "Drop video here or click to upload (max 10GB)"}
                </div>
                <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                <span style={{ color: "#3d2a6e" }}>or</span>
                <input className="chat-input" placeholder="Paste video URL…" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && loadUrl()} />
                <button className="icon-btn" onClick={loadUrl} style={{ padding: "8px 14px" }}>Load</button>
              </div>
            )}
            {urlError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{urlError}</p>}
          </div>

          {/* PARTICIPANT GRID */}
          <div style={{ background: "#080613", borderTop: "1px solid #1a1330", padding: "12px 16px", flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: "#4a3a6a", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>Participants ({participants.length}/10)</p>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {participants.map(p => (
                <div key={p.id} className={`participant-card${p.id === "p1" ? " speaking" : ""}`} style={{ minWidth: 90, width: 90 }}>
                  {p.isMe ? (
                    <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: "#1a1525", border: "2px solid #a78bfa44", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {localCamOff ? (
                        <span style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa" }}>{p.name[0]}</span>
                      ) : (
                        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: p.color + "22", border: `2px solid ${p.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: p.color }}>{p.name[0]}</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                    {p.host && <span style={{ fontSize: 10 }}>👑</span>}
                    <span style={{ fontSize: 11, color: "#8b7aaa", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.isMe ? "You" : p.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(p.isMe ? localMuted : p.muted) && <span style={{ fontSize: 10 }}>🔇</span>}
                    {(p.isMe ? localCamOff : p.camOff) && <span style={{ fontSize: 10 }}>📵</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ width: 300, background: "#0a0814", borderLeft: "1px solid #1a1330", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #1a1330", display: "flex", gap: 6 }}>
            <button className={`sidebar-tab${sidebarTab === "chat" ? " active" : ""}`} onClick={() => setSidebarTab("chat")}>💬 Chat</button>
            <button className={`sidebar-tab${sidebarTab === "people" ? " active" : ""}`} onClick={() => setSidebarTab("people")}>👥 People</button>
          </div>

          {sidebarTab === "chat" ? (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map(m => (
                  <div key={m.id} className="msg-row">
                    {m.isReaction ? (
                      <div style={{ textAlign: "center", fontSize: 13, color: "#4a3a6a" }}>
                        <span style={{ color: m.color }}>{m.user}</span> reacted {m.text}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: m.color + "33", border: `1px solid ${m.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: m.color, flexShrink: 0 }}>{m.user[0]}</div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: m.color }}>{m.user}</span>
                          <span style={{ fontSize: 11, color: "#3d2a6e", marginLeft: "auto" }}>{m.time}</span>
                        </div>
                        <p style={{ fontSize: 14, color: "#c5b8e0", lineHeight: 1.5, marginLeft: 28 }}>{m.text}</p>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: "10px 12px", borderTop: "1px solid #1a1330", display: "flex", gap: 8 }}>
                <input className="chat-input" placeholder="Say something…" value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} />
                <button className="icon-btn" onClick={sendMsg} style={{ padding: "8px 14px" }}>↑</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {participants.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#110d1f", borderRadius: 10, border: "1px solid #1e163a" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.color + "22", border: `2px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {p.isMe && !localCamOff ? (
                      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: p.color, fontWeight: 700, fontSize: 14 }}>{p.name[0]}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {p.host && <span style={{ fontSize: 11 }}>👑</span>}
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#c5b8e0" }}>{p.isMe ? "You" : p.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#4a3a6a", display: "flex", gap: 6, marginTop: 2 }}>
                      {(p.isMe ? localMuted : p.muted) ? <span>🔇 Muted</span> : <span style={{ color: "#34d39988" }}>🎙️ Live</span>}
                      {(p.isMe ? localCamOff : p.camOff) && <span>📵 No cam</span>}
                    </div>
                  </div>
                  {isHost && !p.isMe && (
                    <button className="icon-btn" style={{ fontSize: 12, padding: "4px 8px", color: "#f87171", borderColor: "#f8717133" }}>Kick</button>
                  )}
                </div>
              ))}
              <div style={{ padding: "10px", background: "#110d1f", borderRadius: 10, border: "1px dashed #2a1d4a", textAlign: "center", cursor: "pointer", color: "#4a3a6a", fontSize: 13 }} onClick={() => setShowInvite(true)}>
                + Invite someone ({10 - participants.length} slots left)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INVITE MODAL */}
      {showInvite && (
        <div className="overlay-modal" onClick={() => setShowInvite(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#e8d5ff", fontSize: 22, marginBottom: 20 }}>Invite to Room</h2>
            <p style={{ fontSize: 13, color: "#6b5a8a", marginBottom: 8 }}>Share this code:</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <div style={{ flex: 1, background: "#1a1525", border: "1px solid #3d2a6e", borderRadius: 10, padding: "12px 16px", fontSize: 18, letterSpacing: 4, color: "#c084fc", fontWeight: 700, textAlign: "center" }}>{roomCode}</div>
              <button className="icon-btn" onClick={copyCode} style={{ padding: "10px 16px" }}>{copied ? "✓" : "📋"}</button>
            </div>
            <button className="icon-btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowInvite(false)}>Close</button>
          </div>
        </div>
      )}

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150 }} onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e163a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#e8d5ff", fontSize: 20 }}>Settings</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div style={{ padding: "16px 24px", flex: 1, overflowY: "auto" }}>
              <p style={{ fontSize: 11, color: "#4a3a6a", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Audio / Video</p>
              <div className="settings-row">
                <span style={{ fontSize: 14, color: "#c5b8e0" }}>Microphone</span>
                <div className={`toggle${!localMuted ? " on" : ""}`} onClick={() => setLocalMuted(m => !m)} />
              </div>
              <div className="settings-row">
                <span style={{ fontSize: 14, color: "#c5b8e0" }}>Camera</span>
                <div className={`toggle${!localCamOff ? " on" : ""}`} onClick={toggleCam} />
              </div>
              <div className="settings-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 14, color: "#c5b8e0" }}>Volume: {volume}%</span>
                <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)} className="seek-bar" />
              </div>
              <p style={{ fontSize: 11, color: "#4a3a6a", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, marginTop: 20 }}>Room</p>
              <div className="settings-row">
                <span style={{ fontSize: 14, color: "#c5b8e0" }}>Room Code</span>
                <span style={{ fontSize: 14, color: "#c084fc", letterSpacing: 2 }}>{roomCode}</span>
              </div>
              <div className="settings-row">
                <span style={{ fontSize: 14, color: "#c5b8e0" }}>Your Name</span>
                <input className="chat-input" value={myName} onChange={e => setMyName(e.target.value)} style={{ width: 120, textAlign: "right" }} />
              </div>
              <div style={{ marginTop: 24 }}>
                <button className="icon-btn danger" style={{ width: "100%", justifyContent: "center", padding: 12 }}
                  onClick={() => { stopCamera(); setScreen("landing"); setShowSettings(false); }}>
                  🚪 Leave Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
