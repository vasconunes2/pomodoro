import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Play, Pause, RotateCcw, Wallet, ShoppingBag, X, Check, Lock, Settings, Music, Trash2, ArrowRight, Link as LinkIcon, Info, Plus, BarChart3, PictureInPicture2 } from 'lucide-react';

// --- CONFIGURATION ---
const COINS_REWARD = 10;
const FOCUS_MAX_TIME = 60;
const BREAK_MAX_TIME = 15;
const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;

// Sound Effects
const SOUND_ALARM = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const SOUND_CHIME = "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3";

const THEMES = [
  { id: 'mug', name: 'Classic Mug', cost: 0, icon: '☕' },
  { id: 'candle', name: 'Midnight Candle', cost: 50, icon: '🕯️' },
  { id: 'horizon', name: 'Golden Horizon', cost: 150, icon: '🌅' },
  { id: 'bonsai', name: 'Zen Bonsai', cost: 300, icon: '🌳' },
];

// --- DEFAULT PLAYLISTS (Nature Removed) ---
const DEFAULT_PLAYLISTS = [
  { id: 'lofi', name: 'Lofi Girl', url: 'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM' },
  { id: 'piano', name: 'Peaceful Piano', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { id: 'alpha', name: 'Alpha Waves', url: 'https://open.spotify.com/embed/playlist/5XBZaWeBRk5QBL5BdI3D2A?si=abeefe9bb86b4a7f' },
];

const lerpColor = (a, b, amount) => {
  const ah = parseInt(a.replace(/#/g, ''), 16),
    bh = parseInt(b.replace(/#/g, ''), 16),
    ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
    br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
    rr = ar + amount * (br - ar),
    rg = ag + amount * (bg - ag),
    rb = ab + amount * (bb - ab);
  return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}

export default function App() {
  // --- STATES ---
  const [mode, setMode] = useState('FOCUS');
  const [focusDuration, setFocusDuration] = useState(DEFAULT_FOCUS);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_FOCUS * 60);
  const [isActive, setIsActive] = useState(false);

  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [tempName, setTempName] = useState("");
  const [customLink, setCustomLink] = useState("");

  const alarmAudio = useRef(new Audio(SOUND_ALARM));
  const chimeAudio = useRef(new Audio(SOUND_CHIME));

  // PIP REFS
  const pipVideoRef = useRef(null);
  const pipCanvasRef = useRef(null);

  // --- PERSISTENCE ---
  const [userName, setUserName] = useState(() => localStorage.getItem('pomodoro-user') || '');

  // Custom Playlists Persistence
  const [myPlaylists, setMyPlaylists] = useState(() => {
    const saved = localStorage.getItem('pomodoro-custom-playlists');
    return saved ? JSON.parse(saved) : [];
  });

  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('pomodoro-coins');
    const parsed = parseInt(saved, 10);
    return (isNaN(parsed)) ? 0 : parsed;
  });

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('pomodoro-stats');
    return saved ? JSON.parse(saved) : { focus: 0, break: 0 };
  });

  const [activityLog, setActivityLog] = useState(() => {
    const saved = localStorage.getItem('pomodoro-activity');
    return saved ? JSON.parse(saved) : {};
  });

  const [unlockedThemes, setUnlockedThemes] = useState(() => {
    const saved = localStorage.getItem('pomodoro-unlocked');
    return saved ? JSON.parse(saved) : ['mug'];
  });
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('pomodoro-theme') || 'mug';
  });

  // Default to Lofi
  const [currentPlaylist, setCurrentPlaylist] = useState(DEFAULT_PLAYLISTS[0].url);

  // Save Effects
  useEffect(() => { localStorage.setItem('pomodoro-coins', coins); }, [coins]);
  useEffect(() => { localStorage.setItem('pomodoro-stats', JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem('pomodoro-activity', JSON.stringify(activityLog)); }, [activityLog]);
  useEffect(() => { localStorage.setItem('pomodoro-unlocked', JSON.stringify(unlockedThemes)); }, [unlockedThemes]);
  useEffect(() => { localStorage.setItem('pomodoro-theme', currentTheme); }, [currentTheme]);
  useEffect(() => { localStorage.setItem('pomodoro-custom-playlists', JSON.stringify(myPlaylists)); }, [myPlaylists]);
  useEffect(() => { if (userName) localStorage.setItem('pomodoro-user', userName); }, [userName]);

  useEffect(() => {
    if (!userName) { setShowNamePrompt(true); }
  }, []);

  // --- HELPER FORMAT ---
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(mode === 'FOCUS' ? focusDuration * 60 : breakDuration * 60);
    }
  }, [focusDuration, breakDuration, mode]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (mode === 'FOCUS') {
        alarmAudio.current.play().catch(e => console.log("Audio blocked", e));
        setCoins((c) => c + COINS_REWARD);
        setStats((s) => ({ ...s, focus: s.focus + 1 }));

        // Heatmap Logic
        const todayKey = new Date().toISOString().split('T')[0];
        setActivityLog(prev => ({
          ...prev,
          [todayKey]: (prev[todayKey] || 0) + 1
        }));

        setMode('BREAK');
        setTimeLeft(breakDuration * 60);
      } else {
        chimeAudio.current.play().catch(e => console.log("Audio blocked", e));
        setStats((s) => ({ ...s, break: s.break + 1 }));
        setMode('FOCUS');
        setTimeLeft(focusDuration * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, breakDuration, focusDuration]);

  // FEATURE: TAB TITLE DYNAMIC
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      document.title = `(${formatTime(timeLeft)}) Focus Café ☕`;
    } else if (timeLeft === 0 && !isActive) {
      document.title = "🔔 ACABOU! Bom trabalho!";
    } else {
      document.title = "Focus Café";
    }
    return () => { document.title = "Focus Café"; };
  }, [timeLeft, isActive]);

  // ---------------------------------------------------------
  // FEATURE: PICTURE-IN-PICTURE (CANVAS DRAWING FIXED)
  // ---------------------------------------------------------

  // 1. Função isolada para desenhar o frame (usamos useCallback para ser estável)
  const drawToCanvas = useCallback(() => {
    if (pipCanvasRef.current) {
      const ctx = pipCanvasRef.current.getContext('2d');
      const width = 512;
      const height = 512;

      // Limpa e desenha Fundo
      ctx.fillStyle = mode === 'FOCUS' ? '#0c0a09' : '#064e3b';
      ctx.fillRect(0, 0, width, height);

      // Tempo
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 150px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatTime(timeLeft), width / 2, height / 2);

      // Texto do Estado
      let statusText = mode === 'FOCUS' ? "FOCUS" : "BREAK";
      let statusColor = mode === 'FOCUS' ? '#fbbf24' : '#34d399';

      if (!isActive) {
        statusText = "PAUSED"; // Ou "READY"
        statusColor = '#94a3b8';
      }

      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = statusColor;
      ctx.fillText(statusText, width / 2, (height / 2) + 120);
    }
  }, [timeLeft, mode, isActive]);

  // 2. Atualiza o canvas sempre que os dados mudam
  useEffect(() => {
    drawToCanvas();
  }, [drawToCanvas]);

  // 3. Ativar PiP Manualmente (Instantâneo)
  const togglePip = async () => {
    try {
      const video = pipVideoRef.current;
      const canvas = pipCanvasRef.current;

      if (!video || !canvas) return;

      // Se já estiver aberto, fecha
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }

      // TRUQUE: Força o desenho IMEDIATAMENTE antes de abrir
      // Isto garante que o canvas não está preto/vazio
      drawToCanvas();

      // Configura o stream se ainda não existir
      if (!video.srcObject) {
        // 30 FPS para manter o video ativo mesmo parado
        const stream = canvas.captureStream(30);
        video.srcObject = stream;
      }

      // Play é obrigatório
      await video.play();

      // Solicita PiP
      if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      } else if (video.webkitSetPresentationMode) {
        // Safari/Mac fix
        await video.webkitSetPresentationMode('picture-in-picture');
      }
    } catch (err) {
      console.log("PiP Error:", err);
      alert("Erro ao abrir PiP. O navegador pode ter bloqueado.");
    }
  };

  // ---------------------------------------------------------


  // --- ACTIONS ---
  const switchMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(newMode === 'FOCUS' ? focusDuration * 60 : breakDuration * 60);
  };

  const buyTheme = (themeId, cost) => {
    if (coins >= cost && !unlockedThemes.includes(themeId)) {
      setCoins(c => c - cost);
      setUnlockedThemes([...unlockedThemes, themeId]);
    }
  };

  const handleTimeChange = (val) => {
    let num = parseInt(val);
    if (isNaN(num)) return;
    const max = mode === 'FOCUS' ? FOCUS_MAX_TIME : BREAK_MAX_TIME;
    if (num < 1) num = 1;
    if (num > max) num = max;
    if (mode === 'FOCUS') setFocusDuration(num);
    else setBreakDuration(num);
  };

  const resetStats = () => {
    if (confirm("Are you sure you want to reset your stats?")) {
      setStats({ focus: 0, break: 0 });
      setActivityLog({});
    }
  };

  const clearPlaylists = () => {
    if (confirm("Delete all your saved playlists?")) {
      setMyPlaylists([]);
    }
  };

  const removePlaylist = (id, e) => {
    e.stopPropagation();
    setMyPlaylists(myPlaylists.filter(pl => pl.id !== id));
  };

  const submitName = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserName(tempName);
      setShowNamePrompt(false);
    }
  };

  const processLink = (link) => {
    let embedUrl = link;
    if (link.includes('open.spotify.com')) {
      if (!link.includes('/embed/')) {
        embedUrl = link.replace('.com/', '.com/embed/');
      }
      embedUrl = embedUrl.split('?')[0];
    }
    return embedUrl;
  };

  const handlePlayLink = () => {
    if (!customLink) return;
    const url = processLink(customLink);
    setCurrentPlaylist(url);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handlePlayLink();
    }
  };

  const handleSavePlaylist = () => {
    if (!customLink) return;
    const name = prompt("Name this playlist:");
    if (name) {
      const url = processLink(customLink);
      const newPlaylist = { id: Date.now(), name, url };
      setMyPlaylists([...myPlaylists, newPlaylist]);
      setCustomLink("");
      setCurrentPlaylist(url);
    }
  };

  const totalTime = mode === 'FOCUS' ? focusDuration * 60 : breakDuration * 60;
  const fillPercentageDecimal = timeLeft / totalTime;
  const progressDecimal = 1 - fillPercentageDecimal;
  const allPlaylists = [...DEFAULT_PLAYLISTS, ...myPlaylists];

  return (
    <>
      <style>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>

      <div className={`h-screen w-full overflow-hidden transition-colors duration-700 ease-in-out flex flex-col items-center justify-between py-6 font-sans relative ${mode === 'FOCUS' ? 'bg-[#0c0a09] text-[#e5e5e5]' : 'bg-[#064e3b] text-[#ecfdf5]'}`}>

        {/* --- NAME PROMPT --- */}
        <AnimatePresence>
          {showNamePrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-sm text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-8 tracking-tight">Focus Café</h1>
                <form onSubmit={submitName} className="flex flex-col gap-4">
                  <label className="text-xl font-medium text-white/80">What should I call you?</label>
                  <input autoFocus type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your Name" className="w-full bg-white/10 border-b-2 border-white/30 p-4 text-center text-2xl text-white focus:outline-none focus:border-amber-500 transition-colors font-bold" />
                  <button type="submit" disabled={!tempName.trim()} className="mt-4 py-3 rounded-full bg-amber-600 text-white font-bold disabled:opacity-50 hover:bg-amber-700 transition-all flex items-center justify-center gap-2">Get Started <ArrowRight size={18} /></button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- SETTINGS MODAL --- */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-sm bg-white/10 border border-white/10 p-8 rounded-3xl relative">
                <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><X /></button>
                <h2 className="text-2xl font-bold flex items-center gap-3 text-white mb-6"><Settings /> Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase font-bold text-white/50 mb-2">Display Name</label>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-bold" />
                  </div>
                  <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                    <button onClick={clearPlaylists} className="w-full py-3 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 flex items-center justify-center gap-2 font-bold transition-all">
                      <Trash2 size={18} /> Clear My Playlists
                    </button>
                    <button onClick={resetStats} className="w-full py-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 flex items-center justify-center gap-2 font-bold transition-all">
                      <Trash2 size={18} /> Reset Stats & History
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- STATS / HEATMAP MODAL --- */}
        <AnimatePresence>
          {isStatsOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-sm bg-[#0c0a09] border border-white/10 p-6 rounded-3xl relative shadow-2xl">
                <button onClick={() => setIsStatsOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={18} /></button>

                <h2 className="text-2xl font-bold flex items-center gap-3 text-emerald-400 mb-2"><BarChart3 /> Activity</h2>
                <p className="text-white/40 text-sm mb-6 font-mono">Last 30 days performance</p>

                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (29 - i));
                    const dateKey = d.toISOString().split('T')[0];
                    const count = activityLog[dateKey] || 0;

                    let colorClass = "bg-white/5";
                    if (count >= 1) colorClass = "bg-emerald-900/60";
                    if (count >= 3) colorClass = "bg-emerald-600/80";
                    if (count >= 6) colorClass = "bg-emerald-400";

                    return (
                      <div key={i} className="group relative">
                        <div className={`w-8 h-8 rounded-md transition-all border border-white/5 ${colorClass}`}></div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
                          {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {count}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{Object.values(activityLog).reduce((a, b) => a + b, 0)}</div>
                    <div className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Total Sessions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400">{coins}</div>
                    <div className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Current Coins</div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MUSIC MODAL --- */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: isMusicOpen ? 0 : "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 z-[60] bg-[#121212] border-t border-white/10 rounded-t-3xl p-6 shadow-2xl min-h-[550px]"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-400"><Music /> Spotify Vibe</h2>
            <button onClick={() => setIsMusicOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={18} /></button>
          </div>

          <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
            {allPlaylists.map(pl => {
              const isCustom = typeof pl.id === 'number';
              return (
                <button
                  key={pl.id}
                  onClick={() => setCurrentPlaylist(pl.url)}
                  className={`group relative px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border flex items-center gap-2 ${currentPlaylist === pl.url ? 'bg-green-600 border-green-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  {pl.name}
                  {isCustom && (
                    <span
                      onClick={(e) => removePlaylist(pl.id, e)}
                      className="ml-1 p-0.5 bg-black/20 rounded-full hover:bg-red-500/80 transition-colors"
                    >
                      <X size={12} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Paste Spotify Link & Add..."
              value={customLink}
              onKeyDown={handleKeyDown}
              onChange={(e) => setCustomLink(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 outline-none placeholder:text-white/20"
            />
            <button onClick={handlePlayLink} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg border border-white/10 text-white/70" title="Play only">
              <LinkIcon size={18} />
            </button>
            <button onClick={handleSavePlaylist} className="bg-green-600 hover:bg-green-500 p-2 rounded-lg border border-green-500 text-white shadow-lg" title="Save to list">
              <Plus size={18} />
            </button>
          </div>

          <div className="w-full h-[250px] bg-black/20 rounded-xl overflow-hidden relative shadow-lg">
            {currentPlaylist ? (
              <iframe style={{ borderRadius: "12px" }} src={currentPlaylist} width="100%" height="100%" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-2"><Music size={40} /><div className="text-sm">Select a playlist to start</div></div>
            )}
          </div>

          <div className="mt-4 flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/5 text-left">
            <Info className="text-blue-400 mt-0.5 shrink-0" size={16} />
            <div className="text-xs text-white/50 leading-relaxed">
              <strong className="text-white block mb-0.5">Hearing only 30s previews?</strong>
              To listen to full songs, you must be <strong>logged in to Spotify</strong> in this browser.
            </div>
          </div>
        </motion.div>

        {/* --- SHOP MODAL --- */}
        <AnimatePresence>
          {isShopOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 z-[60] bg-[#0c0a09]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl relative shadow-2xl">
                <button onClick={() => setIsShopOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><X /></button>
                <h2 className="text-3xl font-bold flex items-center gap-3 text-amber-500 mb-8"><ShoppingBag /> Theme Shop</h2>
                <div className="grid grid-cols-2 gap-6">
                  {THEMES.map(theme => {
                    const isUnlocked = unlockedThemes.includes(theme.id);
                    const isSelected = currentTheme === theme.id;
                    const canAfford = coins >= theme.cost;
                    return (
                      <div key={theme.id} className={`bg-black/20 border p-6 rounded-2xl flex flex-col items-center text-center transition-all ${isSelected ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10'}`}>
                        <div className="text-5xl mb-4 filter drop-shadow-md">{theme.icon}</div>
                        <h3 className="font-bold text-lg mb-1">{theme.name}</h3>
                        {!isUnlocked && <div className="text-sm font-mono text-amber-300/70 mb-4">{theme.cost} Coins</div>}
                        <div className="mt-4 w-full">
                          {isSelected ? (<div className="flex items-center justify-center gap-2 text-amber-500 font-bold bg-amber-950/30 py-2 rounded-xl text-sm"><Check size={16} /> Selected</div>) : isUnlocked ? (<button onClick={() => setCurrentTheme(theme.id)} className="w-full py-2 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Select</button>) : (<button onClick={() => buyTheme(theme.id, theme.cost)} disabled={!canAfford} className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-sm ${canAfford ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}>{canAfford ? 'Buy' : <><Lock size={14} /> Locked</>}</button>)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- TOP HEADER --- */}
        <div className="w-full max-w-lg flex justify-between items-start z-10 px-6 pt-2">
          <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-start group z-50 pt-1">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Hello,</div>
            <div className="font-bold text-xl text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
              {userName} <Settings size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
            </div>
          </button>

          <div className="flex flex-col items-end text-[10px] font-mono font-medium text-white/50 mt-1">
            <div className="flex items-center gap-1">Focus: <span className="text-amber-400">{stats.focus}</span></div>
            <div className="flex items-center gap-1">Breaks: <span className="text-emerald-400">{stats.break}</span></div>
          </div>
        </div>

        { }
        <div className="absolute top-[88px] left-6 z-20">
          <button onClick={() => setIsStatsOpen(true)} className="p-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-emerald-300">
            <BarChart3 size={18} />
          </button>
        </div>

        { }
        <div className="absolute top-[140px] left-6 z-20">
          <button onClick={togglePip} className="p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition text-blue-300" title="Picture-in-Picture">
            <PictureInPicture2 size={18} />
          </button>
        </div>

        {/* --- WALLET --- */}
        <div className="absolute top-[88px] right-6 flex gap-2 z-20">
          <button onClick={() => setIsShopOpen(true)} className="p-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-amber-300 relative">
            <ShoppingBag size={18} />
            {!unlockedThemes.includes('horizon') && !unlockedThemes.includes('bonsai') && coins >= 150 && (<span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0c0a09]"></span>)}
          </button>
          <div className="bg-black/40 px-3 py-1.5 rounded-full flex items-center gap-2 border border-amber-500/20">
            <Wallet size={14} className="text-amber-400" />
            <span className="font-mono font-bold text-sm text-amber-100">{coins}</span>
          </div>
        </div>

        {/* --- MODE SELECTOR --- */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className="flex bg-black/30 p-1 rounded-full backdrop-blur-md border border-white/10">
            <button onClick={() => switchMode('FOCUS')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${mode === 'FOCUS' ? 'bg-amber-700 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>
              <Coffee size={14} /> Focus
            </button>
            <button onClick={() => switchMode('BREAK')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${mode === 'BREAK' ? 'bg-emerald-700 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>
              <span className="text-base leading-none">😌</span> Break
            </button>
          </div>
        </div>

        {/* --- VISUAL AREA --- */}
        <div className="flex-1 w-full flex items-center justify-center p-4 min-h-0 mt-8">
          <div className="relative h-[35vh] aspect-square max-h-[350px]">
            {mode === 'FOCUS' ? (
              <div className="relative w-full h-full">
                <AnimatePresence mode="wait">

                  {/* THEME 1: MUG */}
                  {currentTheme === 'mug' && (
                    <motion.svg
                      key="mug"
                      viewBox="0 -100 240 360"
                      className="w-full h-full filter drop-shadow-2xl"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4 }}
                    >
                      <defs>
                        <filter id="steamBlur">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                        </filter>

                        <clipPath id="mug-inner">
                          <path d="M 50,40 L 170,40 L 170,180 C 170,205 150,215 110,215 C 70,215 50,205 50,180 Z" />
                        </clipPath>

                        <linearGradient id="mugGrad" x1="0" x2="1">
                          <stop offset="0%" stopColor="#292524" />
                          <stop offset="50%" stopColor="#44403c" />
                          <stop offset="100%" stopColor="#1c1917" />
                        </linearGradient>
                      </defs>

                      {/* Asa da Caneca */}
                      <path d="M 170,70 C 210,70 210,160 170,170" fill="none" stroke="#57534e" strokeWidth="18" strokeLinecap="round" />

                      {/* Corpo da Caneca */}
                      <path d="M 50,40 L 170,40 L 170,180 C 170,205 150,215 110,215 C 70,215 50,205 50,180 Z" fill="url(#mugGrad)" />

                      {/* --- MENSAGEM SECRETA (AGORA EM 3 LINHAS) --- */}
                      <g clipPath="url(#mug-inner)">
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#a8a29e" // Um cinzento/bege claro para parecer cerâmica
                          fontWeight="bold"
                          fontFamily="monospace, sans-serif"
                          transform="rotate(-5, 110, 180)" // Ligeira rotação no bloco todo
                          style={{ filter: 'drop-shadow(0px 1px 0px rgba(0,0,0,0.5))' }}
                        >
                          {/* Linha 1: Aparece primeiro */}
                          <tspan x="110" y="155" fontSize="12">Manda</tspan>

                          {/* Linha 2: Aparece depois (Maior) */}
                          <tspan x="110" y="175" fontSize="16">NUDES</tspan>

                          {/* Linha 3: Aparece no fim */}
                          <tspan x="110" y="195" fontSize="12">sff</tspan>
                        </text>
                      </g>

                      {/* Líquido (Café) */}
                      <g clipPath="url(#mug-inner)">
                        <motion.rect
                          x="0"
                          width="240"
                          fill="#291305"
                          initial={{ y: 0 }}
                          animate={{ y: 220 - (180 * fillPercentageDecimal), height: 240 }}
                          transition={{ duration: 1, ease: "linear" }}
                        />
                        <motion.ellipse
                          cx="110"
                          rx="60"
                          ry="10"
                          fill="#4a2511"
                          opacity="0.9"
                          initial={{ cy: 40 }}
                          animate={{ cy: 220 - (180 * fillPercentageDecimal) }}
                        />
                      </g>

                      {/* Borda da Caneca */}
                      <path d="M 50,40 L 170,40 L 170,180 C 170,205 150,215 110,215 C 70,215 50,205 50,180 Z" fill="none" stroke="#78716c" strokeWidth="4" />

                      {/* Fumo Realista */}
                      {isActive && fillPercentageDecimal > 0 && (
                        <g filter="url(#steamBlur)" opacity="0.5">
                          <motion.path
                            fill="white"
                            d="M 100,40 C 90,30 90,10 110,10 C 130,10 130,30 120,40 Z"
                            animate={{
                              y: [-10, -80],
                              x: [0, 5, -5, 0],
                              opacity: [0, 0.7, 0],
                              scale: [0.8, 1.8],
                              rotate: [0, 10, -10, 0]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          />
                          <motion.path
                            fill="white"
                            d="M 105,45 C 95,35 85,15 105,15 C 125,15 115,35 115,45 Z"
                            animate={{
                              y: [-5, -75],
                              x: [-5, 0, 5, -5],
                              opacity: [0, 0.5, 0],
                              scale: [0.9, 1.5]
                            }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                          />
                          <motion.path
                            fill="white"
                            d="M 110,42 C 100,32 100,12 120,12 C 140,12 130,32 120,42 Z"
                            animate={{
                              y: [-15, -90],
                              opacity: [0, 0.4, 0],
                              scale: [0.5, 2.0]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1.5 }}
                          />
                        </g>
                      )}
                    </motion.svg>
                  )}
                  {/* THEME 2: CANDLE */}
                  {currentTheme === 'candle' && (
                    <motion.svg key="candle" viewBox="0 0 200 260" className="w-full h-full filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4 }}>
                      <defs>
                        <linearGradient id="waxBody" x1="0" x2="1"><stop offset="0%" stopColor="#e6e6e6" /><stop offset="50%" stopColor="#ffffff" /><stop offset="100%" stopColor="#a1a1aa" /></linearGradient>
                        <radialGradient id="molten" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#fffbeb" /><stop offset="40%" stopColor="#fcd34d" /><stop offset="100%" stopColor="#a1a1aa" /></radialGradient>
                        <radialGradient id="flame" cx="0.5" cy="0.7" r="0.5"><stop offset="0%" stopColor="#fff" /><stop offset="30%" stopColor="#fef08a" /><stop offset="70%" stopColor="#f97316" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></radialGradient>
                        <filter id="fBlur"><feGaussianBlur in="SourceGraphic" stdDeviation="2" /></filter>
                      </defs>
                      <ellipse cx="100" cy="230" rx="65" ry="12" fill="#000" opacity="0.3" filter="url(#fBlur)" />
                      <motion.rect x="45" width="110" rx="4" fill="url(#waxBody)" stroke="#a1a1aa" strokeWidth="1" animate={{ y: 50 + (180 * (1 - fillPercentageDecimal)), height: 180 * fillPercentageDecimal }} transition={{ duration: 1, ease: "linear" }} />
                      <motion.g animate={{ y: 180 * (1 - fillPercentageDecimal) }} transition={{ duration: 1, ease: "linear" }}>
                        <ellipse cx="100" cy="50" rx="55" ry="14" fill="url(#molten)" stroke="#d4d4d8" strokeWidth="1.5" />
                        <path d="M100,50 C98,45 102,40 100,32" stroke="#44403c" strokeWidth="3" fill="none" />
                        <circle cx="100" cy="32" r="1.5" fill="#ef4444" />
                        {isActive && fillPercentageDecimal > 0 && (
                          <motion.g style={{ originX: "100px", originY: "32px" }} animate={{ rotate: [-2, 2, -1, 1, 0], scale: [1, 1.05, 0.95, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                            <ellipse cx="100" cy="28" rx="22" ry="32" fill="#fb923c" opacity="0.2" filter="url(#fBlur)" />
                            <path d="M100,34 Q92,34 92,20 Q100,-10 108,20 Q108,34 100,34 Z" fill="url(#flame)" filter="url(#fBlur)" />
                          </motion.g>
                        )}
                      </motion.g>
                    </motion.svg>
                  )}
                  {/* THEME 3: GOLDEN HORIZON */}
                  {currentTheme === 'horizon' && (
                    <motion.svg key="horizon" viewBox="0 0 240 260" className="w-full h-full filter drop-shadow-2xl" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4 }}>
                      <defs>
                        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={lerpColor('#0284c7', '#1e1b4b', progressDecimal)} />
                          <stop offset="60%" stopColor={lerpColor('#f97316', '#701a75', progressDecimal)} />
                          <stop offset="100%" stopColor={lerpColor('#7c2d12', '#0f172a', progressDecimal)} />
                        </linearGradient>
                        <radialGradient id="sunGrad" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#fef08a" /><stop offset="70%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
                      </defs>
                      <rect x="20" y="20" width="200" height="220" rx="10" fill="url(#skyGrad)" />
                      <motion.circle cx="120" r="30" fill="url(#sunGrad)" initial={{ cy: 60 }} animate={{ cy: 200 - (140 * fillPercentageDecimal) }} transition={{ duration: 1, ease: "linear" }} />
                      <rect x="20" y="180" width="200" height="60" rx="0" fill={lerpColor('#1e3a8a', '#172554', progressDecimal)} />
                      <rect x="20" y="230" width="200" height="10" rx="10" fill={lerpColor('#172554', '#0f172a', progressDecimal)} />
                      <path d="M 20,20 L 220,20 L 220,240 L 20,240 Z M 35,35 L 205,35 L 205,225 L 35,225 Z" fill="#262626" fillRule="evenodd" filter="drop-shadow(2px 4px 6px black)" />
                    </motion.svg>
                  )}
                  {/* THEME 4: ZEN BONSAI (FINAL FIXED VERSION) */}
                  {currentTheme === 'bonsai' && (
                    <motion.svg
                      key="bonsai"
                      viewBox="0 0 240 260"
                      className="w-full h-full filter drop-shadow-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <defs>
                        <linearGradient id="potGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#78350f" /><stop offset="50%" stopColor="#92400e" /><stop offset="100%" stopColor="#451a03" /></linearGradient>
                        <radialGradient id="leafGrad" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#4ade80" /><stop offset="70%" stopColor="#16a34a" /><stop offset="100%" stopColor="#14532d" /></radialGradient>
                        {/* Gradiente das Pétalas (Rosa) */}
                        <radialGradient id="petalGrad" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#fbcfe8" /><stop offset="80%" stopColor="#f472b6" /><stop offset="100%" stopColor="#db2777" /></radialGradient>

                        {/* DEFINIÇÃO DA FLOR (Desenhada uma vez para reutilizar) */}
                        <g id="sakuraFlower">
                          <ellipse cx="0" cy="-4" rx="3" ry="5" fill="url(#petalGrad)" />
                          <ellipse cx="0" cy="-4" rx="3" ry="5" fill="url(#petalGrad)" transform="rotate(72)" />
                          <ellipse cx="0" cy="-4" rx="3" ry="5" fill="url(#petalGrad)" transform="rotate(144)" />
                          <ellipse cx="0" cy="-4" rx="3" ry="5" fill="url(#petalGrad)" transform="rotate(216)" />
                          <ellipse cx="0" cy="-4" rx="3" ry="5" fill="url(#petalGrad)" transform="rotate(288)" />
                          <circle cx="0" cy="0" r="1.5" fill="#fcd34d" />
                        </g>
                      </defs>

                      {/* Vaso (Fixo) */}
                      <path d="M 70,210 L 170,210 L 160,250 L 80,250 Z" fill="url(#potGrad)" />
                      <ellipse cx="120" cy="210" rx="50" ry="5" fill="#44403c" />

                      {/* GRUPO DA ÁRVORE (Base em 0,0 na terra) */}
                      <g transform="translate(120, 210)">

                        {/* Tronco */}
                        <path d="M 0,0 C 0,-40 -5,-70 0,-100 C 5,-130 0,-150 0,-170" stroke="#573625" strokeWidth="12" fill="none" strokeLinecap="round" />

                        {/* Folhas Verdes (Base) */}
                        <circle cx="0" cy="-170" r="35" fill="url(#leafGrad)" /> {/* Topo */}
                        <circle cx="15" cy="-130" r="30" fill="url(#leafGrad)" /> {/* Dir */}
                        <circle cx="-15" cy="-115" r="32" fill="url(#leafGrad)" /> {/* Esq */}
                        <circle cx="0" cy="-80" r="38" fill="url(#leafGrad)" />  {/* Baixo */}

                        {/* --- AS FLORES (Agora usam coordenadas SVG puras, impossível falhar) --- */}

                        {/* Flor 1 - Topo (Posição fixa: x=-10, y=-180) */}
                        <g transform="translate(-10, -180)">
                          <motion.use href="#sakuraFlower" initial={{ scale: 0 }} animate={{ scale: progressDecimal > 0.1 ? 1 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />
                        </g>

                        {/* Flor 2 - Direita (Posição fixa: x=25, y=-135) */}
                        <g transform="translate(25, -135)">
                          <motion.use href="#sakuraFlower" initial={{ scale: 0 }} animate={{ scale: progressDecimal > 0.2 ? 0.9 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />
                        </g>

                        {/* Flor 3 - Esquerda (Posição fixa: x=-25, y=-120) */}
                        <g transform="translate(-25, -120)">
                          <motion.use href="#sakuraFlower" initial={{ scale: 0 }} animate={{ scale: progressDecimal > 0.35 ? 1 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />
                        </g>

                        {/* Flor 4 - Baixo Centro (Posição fixa: x=5, y=-85) */}
                        <g transform="translate(5, -85)">
                          <motion.use href="#sakuraFlower" initial={{ scale: 0 }} animate={{ scale: progressDecimal > 0.5 ? 0.8 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />
                        </g>

                        {/* Flor 5 - Topo Direita (Posição fixa: x=15, y=-160) */}
                        <g transform="translate(15, -160)">
                          <motion.use href="#sakuraFlower" initial={{ scale: 0 }} animate={{ scale: progressDecimal > 0.65 ? 0.8 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />
                        </g>

                        {/* Flor 6 - Meio Esquerda (Posição fixa: x=-10, y=-145) */}
                        <g transform="translate(-10, -145)">
                          <motion.use href="#sakuraFlower" initial={{ scale: 0 }} animate={{ scale: progressDecimal > 0.8 ? 0.9 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />
                        </g>

                        {/* Flor 7 - Topo Esquerda (Posição fixa: x=-20, y=-155) */}
                        <g transform="translate(-20, -155)">
                          <motion.use href="#sakuraFlower" initial={{ scale: 0 }} animate={{ scale: progressDecimal > 0.9 ? 0.8 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />
                        </g>

                      </g>
                    </motion.svg>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center text-center h-full">
                <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }} transition={{ duration: 5, repeat: Infinity }} className="text-9xl mb-4 filter drop-shadow-2xl">😌</motion.div>
                <div className="text-emerald-100 font-bold text-3xl">Enjoy your break</div>
              </motion.div>
            )}
          </div>
        </div>

        {/* --- BOTTOM --- */}
        <div className="flex flex-col items-center w-full z-10 pb-6 px-4">
          {/* Timer */}
          <div className="text-8xl md:text-9xl font-mono font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 drop-shadow-2xl leading-none mb-6">
            {formatTime(timeLeft)}
          </div>

          {/* Sliders */}
          {!isActive && (
            <div className="w-64 flex flex-col items-center gap-2 mb-2">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/40"><span>Duration (min)</span></div>
              <input type="number" min="1" max={mode === 'FOCUS' ? FOCUS_MAX_TIME : BREAK_MAX_TIME} value={mode === 'FOCUS' ? focusDuration : breakDuration} onChange={(e) => handleTimeChange(e.target.value)} className="bg-white/10 border-b-2 border-white/20 text-center w-16 text-xl font-bold rounded-t-md focus:outline-none focus:border-white transition-colors appearance-none font-mono" />
              <input type="range" min="1" max={mode === 'FOCUS' ? FOCUS_MAX_TIME : BREAK_MAX_TIME} value={mode === 'FOCUS' ? focusDuration : breakDuration} onChange={(e) => handleTimeChange(e.target.value)} className={`w-full h-1.5 rounded-full appearance-none cursor-pointer mt-2 ${mode === 'FOCUS' ? 'bg-amber-900/50 accent-amber-500' : 'bg-white/20 accent-emerald-300'}`} />
            </div>
          )}

          {/* Controls */}
          <div className={`flex gap-4 items-center ${!isActive ? 'mt-0' : 'mt-8'}`}>
            <button onClick={() => { setIsActive(false); setTimeLeft((mode === 'FOCUS' ? focusDuration : breakDuration) * 60); }} className="w-14 h-14 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-95 border border-white/10 backdrop-blur-md"><RotateCcw size={20} /></button>
            <button onClick={() => setIsActive(!isActive)} className={`h-16 px-10 rounded-full font-bold flex items-center gap-3 text-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all backdrop-blur-md border ${mode === 'FOCUS' ? (isActive ? 'bg-amber-500/20 text-amber-100 border-amber-500/50' : 'bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400/20') : (isActive ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/50' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-400/20')}`}>
              {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />}
              {isActive ? "PAUSE" : "START"}
            </button>
          </div>
        </div>

        <button 
        onClick={() => setCoins(c => c + 1000)} 
        className="fixed bottom-6 right-6 z-50 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-full font-bold shadow-lg text-xs border border-amber-400 transition-all active:scale-95 flex items-center gap-2"
      >
        <Wallet size={14} />
        Free Coins to Test Store
      </button>

        <button onClick={() => setIsMusicOpen(!isMusicOpen)} className="absolute bottom-6 left-6 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-green-400 transition-all z-50">
          <Music size={20} />
        </button>

        <button onClick={() => { setCoins(c => c + 50); setTimeLeft(3); }} className="fixed bottom-2 right-2 text-[10px] opacity-20 hover:opacity-100 font-mono z-50 bg-black/50 px-2 py-1 rounded-md backdrop-blur-md">DEV SKIP</button>

        {/* --- HIDDEN ELEMENTS FOR PIP --- */}
        <canvas ref={pipCanvasRef} width={512} height={512} hidden />
        <video
          ref={pipVideoRef}
          width={512}
          height={512}
          autoPlay
          playsInline
          muted
          hidden
        />

      </div>
    </>
  );
}