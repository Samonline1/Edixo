import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Folder, Upload, Plus, Trash2, X, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import YouTube from 'react-youtube';
import { v4 as uuidv4 } from 'uuid';
import { get, set } from 'idb-keyval';

interface Asset {
  id: string;
  type: 'video' | 'image' | 'article';
  url: string;
  youtubeId?: string;
  title: string;
  tagId: string;
  startTime?: number;
  endTime?: number;
}
interface AssetTag {
  id: string;
  name: string;
}

interface SeqPoint {
  id: string;
  timeStr: string;
  time: number;
  clipId: string;
}

const parseTime = (timeStr: string) => {
  const parts = timeStr.split(':');
  if (parts.length === 1) return parseFloat(parts[0]) || 0;
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  return 0;
};

const formatSecs = (s: number) => {
  if (isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
};

// Extracted outside to prevent re-mounting on every render (which was breaking playback)
const MediaSlot = React.memo(({ 
  clip, 
  isPlaying, 
  isMuted,
  onBuffering
}: { 
  clip?: Asset, 
  isPlaying: boolean, 
  isMuted: boolean,
  onBuffering: (b: boolean) => void
}) => {
  const ytRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // When clip changes, default to buffering until loaded
  useEffect(() => {
    if (clip) onBuffering(true);
    else onBuffering(false);
    
    // Ensure we release buffering state if component unmounts
    return () => onBuffering(false);
  }, [clip?.id, onBuffering]);

  // Sync play/pause and mute states seamlessly without reloading the player
  useEffect(() => {
    try {
      if (ytRef.current && typeof ytRef.current.playVideo === 'function') {
        if (isPlaying) ytRef.current.playVideo();
        else ytRef.current.pauseVideo();

        if (isMuted) ytRef.current.mute();
        else ytRef.current.unMute();
      }
    } catch (err) {
      console.warn("YouTube play error prevented crash:", err);
    }
    
    try {
      if (videoRef.current) {
        if (isPlaying) {
          const p = videoRef.current.play();
          if (p !== undefined) p.catch(() => {});
        } else {
          videoRef.current.pause();
        }
        videoRef.current.muted = isMuted;
      }
    } catch (err) {
      console.warn("HTML5 video error prevented crash:", err);
    }
  }, [isPlaying, isMuted, clip]);

  if (!clip) return <span className="text-neutral-600 font-bold uppercase tracking-widest text-xs z-10">Empty Slot</span>;

  if (clip.type === 'image') {
    return <img src={clip.url} onLoad={() => onBuffering(false)} className="w-full h-full object-cover" />;
  }
  
  if (clip.type === 'video') {
    if (clip.youtubeId) {
      return (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <YouTube
            videoId={clip.youtubeId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: { 
                controls: 0, 
                modestbranding: 1, 
                loop: 1, 
                playlist: clip.youtubeId, 
                start: clip.startTime || 0 
              } 
            }}
            onReady={e => {
              ytRef.current = e.target;
              if (isPlaying) e.target.playVideo(); else e.target.pauseVideo();
              if (isMuted) e.target.mute(); else e.target.unMute();
              onBuffering(false);
            }}
            onStateChange={e => {
              // 3 is BUFFERING state in YouTube API
              if (e.data === 3) onBuffering(true);
              else onBuffering(false);
            }}
            className="w-full h-full scale-[2.5]"
            iframeClassName="w-full h-full"
          />
        </div>
      );
    }
    return (
      <video 
        ref={videoRef}
        src={clip.url} 
        className="w-full h-full object-cover" 
        loop 
        playsInline
        onCanPlay={() => onBuffering(false)}
        onWaiting={() => onBuffering(true)}
        onPlaying={() => onBuffering(false)}
        onLoadedData={e => {
          const v = e.currentTarget;
          v.muted = isMuted;
          if (isPlaying) v.play().catch(()=>{}); else v.pause();
          onBuffering(false);
        }}
      />
    );
  }
  return <span className="text-neutral-600 font-bold uppercase tracking-widest text-xs z-10">Unsupported Format</span>;
});


export default function ShortsWorkspace() {
  // Vault Assets & Folders
  const [vaultAssets, setVaultAssets] = useState<Asset[]>([]);
  const [vaultFolders, setVaultFolders] = useState<AssetTag[]>([]);

  useEffect(() => {
    const a = localStorage.getItem('yt_assets');
    const f = localStorage.getItem('yt_asset_tags');
    if (a) setVaultAssets(JSON.parse(a));
    if (f) setVaultFolders(JSON.parse(f));
  }, []);

  // Timelines & Persistence
  const [topPoints, setTopPoints] = useState<Omit<SeqPoint, 'time'>[]>(() => {
    const saved = localStorage.getItem('shorts_top_points');
    return saved ? JSON.parse(saved) : [];
  });
  const [bottomPoints, setBottomPoints] = useState<Omit<SeqPoint, 'time'>[]>(() => {
    const saved = localStorage.getItem('shorts_bottom_points');
    return saved ? JSON.parse(saved) : [];
  });
  const [dividerColor, setDividerColor] = useState<string>(() => {
    return localStorage.getItem('shorts_divider_color') || '#ffffff';
  });

  useEffect(() => {
    localStorage.setItem('shorts_top_points', JSON.stringify(topPoints));
    localStorage.setItem('shorts_bottom_points', JSON.stringify(bottomPoints));
    localStorage.setItem('shorts_divider_color', dividerColor);
  }, [topPoints, bottomPoints, dividerColor]);

  const parsedTop = useMemo(() => topPoints.map(p => ({ ...p, time: parseTime(p.timeStr) })).sort((a,b) => a.time - b.time), [topPoints]);
  const parsedBottom = useMemo(() => bottomPoints.map(p => ({ ...p, time: parseTime(p.timeStr) })).sort((a,b) => a.time - b.time), [bottomPoints]);

  // Audio & Playback Engine
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [topBuffering, setTopBuffering] = useState(false);
  const [bottomBuffering, setBottomBuffering] = useState(false);
  const isBuffering = topBuffering || bottomBuffering;

  const maxFallbackDuration = useMemo(() => {
    const topMax = parsedTop.length > 0 ? Math.max(...parsedTop.map(p => p.time)) : 0;
    const bottomMax = parsedBottom.length > 0 ? Math.max(...parsedBottom.map(p => p.time)) : 0;
    return Math.max(topMax, bottomMax, 30) + 5;
  }, [parsedTop, parsedBottom]);

  useEffect(() => {
    if (!audioFileUrl) {
      setDuration(maxFallbackDuration);
    }
  }, [audioFileUrl, maxFallbackDuration]);

  useEffect(() => {
    get('shorts_audio_blob').then(blob => {
      if (blob) setAudioFileUrl(URL.createObjectURL(blob));
    });
  }, []);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setAudioFileUrl(url);
      await set('shorts_audio_blob', file);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current && audioFileUrl) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current && audioFileUrl && !isBuffering) audioRef.current.play().catch(()=>{});
      lastTimeRef.current = performance.now();
      setIsPlaying(true);
    }
  };

  // Pause master audio if buffering starts while playing
  useEffect(() => {
    if (!isPlaying) return;
    if (isBuffering) {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    } else {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(()=>{});
      // Reset tick so timeline doesn't jump forward based on elapsed buffered time
      lastTimeRef.current = performance.now();
    }
  }, [isBuffering, isPlaying]);

  const updateLoopRef = useRef<any>(null);
  updateLoopRef.current = (timestamp: number) => {
    if (!isBuffering) {
      if (audioFileUrl && audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      } else {
        const delta = (timestamp - lastTimeRef.current) / 1000;
        setCurrentTime(prev => {
          if (prev + delta >= maxFallbackDuration) {
            return 0; // Loop back
          }
          return prev + delta;
        });
      }
    }
    lastTimeRef.current = timestamp;
    animationRef.current = requestAnimationFrame(updateLoopRef.current);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame((t) => updateLoopRef.current(t));
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying]);

  // Determine active clips
  const activeTopClipId = useMemo(() => {
    let id = null;
    for (let i = parsedTop.length - 1; i >= 0; i--) {
      if (currentTime >= parsedTop[i].time) {
        id = parsedTop[i].clipId;
        break;
      }
    }
    return id;
  }, [currentTime, parsedTop]);

  const activeBottomClipId = useMemo(() => {
    let id = null;
    for (let i = parsedBottom.length - 1; i >= 0; i--) {
      if (currentTime >= parsedBottom[i].time) {
        id = parsedBottom[i].clipId;
        break;
      }
    }
    return id;
  }, [currentTime, parsedBottom]);

  const topClip = vaultAssets.find(a => a.id === activeTopClipId);
  const bottomClip = vaultAssets.find(a => a.id === activeBottomClipId);

  // Asset Browser Modal
  const [assetModalTarget, setAssetModalTarget] = useState<'top' | 'bottom' | null>(null);
  const [modalActiveFolder, setModalActiveFolder] = useState<string | null>(null);

  const addClipToTimeline = (clipId: string) => {
    if (assetModalTarget === 'top') {
      setTopPoints([...topPoints, { id: uuidv4(), timeStr: formatSecs(currentTime), clipId }]);
    } else if (assetModalTarget === 'bottom') {
      setBottomPoints([...bottomPoints, { id: uuidv4(), timeStr: formatSecs(currentTime), clipId }]);
    }
    setAssetModalTarget(null);
  };

  const handleTimeScrub = (i: number, e: React.PointerEvent<HTMLInputElement>, isTop: boolean) => {
    e.preventDefault();
    const input = e.currentTarget;
    const startY = e.clientY;
    const startVal = parseTime(input.value);
    
    const onMove = (me: PointerEvent) => {
      const delta = startY - me.clientY;
      const newVal = Math.max(0, startVal + delta * 0.1);
      if (isTop) {
        const newPts = [...topPoints];
        newPts[i].timeStr = newVal.toFixed(1);
        setTopPoints(newPts);
      } else {
        const newPts = [...bottomPoints];
        newPts[i].timeStr = newVal.toFixed(1);
        setBottomPoints(newPts);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const COLORS = ['#ffffff', '#4ade80', '#3b82f6', '#ef4444', '#facc15', '#ec4899'];

  const handleTopBuffering = useCallback((b: boolean) => setTopBuffering(b), []);
  const handleBottomBuffering = useCallback((b: boolean) => setBottomBuffering(b), []);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#121212] text-white font-sans overflow-hidden relative">
      <header className="h-14 bg-[#181818] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/shorts-maker" className="text-neutral-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <span className="font-bold text-sm text-pink-400">Shorts Maker: <span className="text-white font-normal">50/50 Template</span></span>
          {isBuffering && isPlaying && <span className="ml-4 text-xs font-bold text-yellow-400 animate-pulse border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded">BUFFERING...</span>}
        </div>
        
        {/* Color Picker moved to Header */}
        <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-white/10 shadow-inner mr-2">
          {COLORS.map(c => (
             <button
                key={c}
                onClick={() => setDividerColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${dividerColor === c ? 'scale-125 border-white' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-110'}`}
                style={{ backgroundColor: c, boxShadow: dividerColor === c ? `0 0 10px ${c}` : 'none' }}
             />
          ))}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        
        {/* LEFT: 30% VERTICAL PREVIEW */}
        <div className="w-[30%] min-w-[300px] bg-black relative flex items-center justify-center p-6 border-r border-white/5 shrink-0">
           
           {/* Shorts Canvas - Fills max vertical space while keeping 9:16 aspect ratio */}
           <div 
             className="h-full aspect-[9/16] bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl flex flex-col relative border-[3px]"
             style={{ borderColor: dividerColor, boxShadow: `0 0 30px ${dividerColor}30` }}
           >
              <div 
                className="flex-1 bg-[#202020] relative flex items-center justify-center overflow-hidden border-b-[3px]"
                style={{ borderColor: dividerColor }}
              >
                 <MediaSlot key={`top-${topClip?.id || 'empty'}`} clip={topClip} isPlaying={isPlaying} isMuted={isMuted} onBuffering={handleTopBuffering} />
              </div>
              <div className="flex-1 bg-[#202020] relative flex items-center justify-center overflow-hidden">
                 <MediaSlot key={`bot-${bottomClip?.id || 'empty'}`} clip={bottomClip} isPlaying={isPlaying} isMuted={isMuted} onBuffering={handleBottomBuffering} />
              </div>
              {isBuffering && isPlaying && (
                 <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center pointer-events-none">
                    <span className="text-white font-bold tracking-widest text-sm drop-shadow-md animate-pulse">LOADING STREAM...</span>
                 </div>
              )}
           </div>
        </div>

        {/* RIGHT: 70% CONTROLS */}
        <div className="flex-1 bg-[#181818] flex flex-col min-w-0">
           <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* TOP SLOT TIMELINE */}
              <div className="bg-[#202020] border border-white/5 rounded-xl overflow-hidden">
                 <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#242424]">
                    <div>
                       <h2 className="text-sm font-bold text-pink-400">TOP SLOT TIMELINE</h2>
                       <p className="text-[10px] text-neutral-400 mt-0.5">Map clips to the top half of the screen</p>
                    </div>
                    <button onClick={() => setAssetModalTarget('top')} className="px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 text-xs font-bold rounded flex items-center gap-1 transition">
                      <Plus size={14} /> Add Clip
                    </button>
                 </div>
                 <div className="p-4 space-y-2">
                    {topPoints.length === 0 && <p className="text-xs text-neutral-500 text-center py-2">No clips added.</p>}
                    {topPoints.map((pt, i) => (
                      <div key={pt.id} className="flex items-center gap-3 bg-[#141414] px-3 py-2 rounded-lg border border-white/5 group">
                         <input 
                           type="text" value={pt.timeStr} 
                           onChange={e => { const np = [...topPoints]; np[i].timeStr = e.target.value; setTopPoints(np); }}
                           onPointerDown={e => handleTimeScrub(i, e, true)}
                           className="w-12 bg-transparent text-xs font-mono text-pink-400 font-bold text-center outline-none cursor-ns-resize"
                         />
                         <div className="w-[1px] h-4 bg-white/10 shrink-0" />
                         <span className="flex-1 text-xs font-semibold text-white truncate">{vaultAssets.find(a => a.id === pt.clipId)?.title || 'Unknown'}</span>
                         <button onClick={() => setTopPoints(topPoints.filter(p => p.id !== pt.id))} className="text-neutral-500 hover:text-red-400 p-1">
                           <Trash2 size={14} />
                         </button>
                      </div>
                    ))}
                 </div>
              </div>

              {/* BOTTOM SLOT TIMELINE */}
              <div className="bg-[#202020] border border-white/5 rounded-xl overflow-hidden">
                 <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#242424]">
                    <div>
                       <h2 className="text-sm font-bold text-pink-400">BOTTOM SLOT TIMELINE</h2>
                       <p className="text-[10px] text-neutral-400 mt-0.5">Map clips to the bottom half of the screen</p>
                    </div>
                    <button onClick={() => setAssetModalTarget('bottom')} className="px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 text-xs font-bold rounded flex items-center gap-1 transition">
                      <Plus size={14} /> Add Clip
                    </button>
                 </div>
                 <div className="p-4 space-y-2">
                    {bottomPoints.length === 0 && <p className="text-xs text-neutral-500 text-center py-2">No clips added.</p>}
                    {bottomPoints.map((pt, i) => (
                      <div key={pt.id} className="flex items-center gap-3 bg-[#141414] px-3 py-2 rounded-lg border border-white/5 group">
                         <input 
                           type="text" value={pt.timeStr} 
                           onChange={e => { const np = [...bottomPoints]; np[i].timeStr = e.target.value; setBottomPoints(np); }}
                           onPointerDown={e => handleTimeScrub(i, e, false)}
                           className="w-12 bg-transparent text-xs font-mono text-pink-400 font-bold text-center outline-none cursor-ns-resize"
                         />
                         <div className="w-[1px] h-4 bg-white/10 shrink-0" />
                         <span className="flex-1 text-xs font-semibold text-white truncate">{vaultAssets.find(a => a.id === pt.clipId)?.title || 'Unknown'}</span>
                         <button onClick={() => setBottomPoints(bottomPoints.filter(p => p.id !== pt.id))} className="text-neutral-500 hover:text-red-400 p-1">
                           <Trash2 size={14} />
                         </button>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* AUDIO & PLAYBACK MASTER */}
           <div className="h-24 bg-[#141414] border-t border-white/5 flex items-center px-6 gap-6 shrink-0 shadow-lg relative z-20">
              <button 
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-pink-600 hover:bg-pink-500 flex items-center justify-center transition shrink-0"
              >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
              </button>
              
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-neutral-400 hover:text-white transition bg-[#242424] rounded-full">
                 {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="flex-1 mx-4">
                 <input 
                   type="range" min={0} max={duration || 100} step="0.1" value={currentTime}
                   onChange={e => { const t = Number(e.target.value); setCurrentTime(t); if(audioRef.current) audioRef.current.currentTime = t; }}
                   className="w-full accent-pink-500"
                 />
                 <div className="flex justify-between text-xs text-neutral-500 font-mono mt-1">
                    <span>{formatSecs(currentTime)}</span>
                    <span>{formatSecs(duration)}</span>
                 </div>
              </div>

              <label className="flex items-center gap-2 bg-[#242424] hover:bg-[#2a2a2a] px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition shrink-0">
                <Upload size={16} className="text-pink-400" />
                {audioFileUrl ? "Change Audio" : "Upload Master Audio"}
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
              </label>

              {audioFileUrl && <audio ref={audioRef} src={audioFileUrl} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onEnded={() => setIsPlaying(false)} className="hidden" />}
           </div>
        </div>

      </div>

      {/* ASSET MODAL */}
      {assetModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#202020]">
                 <h2 className="text-lg font-bold">Select Asset for {assetModalTarget.toUpperCase()} Slot</h2>
                 <button onClick={() => { setAssetModalTarget(null); setModalActiveFolder(null); }} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20}/></button>
              </div>
              <div className="flex-1 flex overflow-hidden">
                 {/* Folders */}
                 <div className="w-1/3 border-r border-white/5 overflow-y-auto p-4 space-y-2 bg-[#1a1a1a]">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Folders</h3>
                    <button 
                      onClick={() => setModalActiveFolder(null)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${!modalActiveFolder ? 'bg-pink-600/20 text-pink-400' : 'hover:bg-[#242424] text-neutral-300'}`}
                    >
                      <Folder size={18} className={!modalActiveFolder ? 'text-pink-400' : 'text-neutral-500'} /> All Assets
                    </button>
                    {vaultFolders.map(f => (
                      <button 
                        key={f.id} onClick={() => setModalActiveFolder(f.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${modalActiveFolder === f.id ? 'bg-pink-600/20 text-pink-400' : 'hover:bg-[#242424] text-neutral-300'}`}
                      >
                        <Folder size={18} className={modalActiveFolder === f.id ? 'text-pink-400' : 'text-neutral-500'} /> {f.name}
                      </button>
                    ))}
                 </div>
                 {/* Assets */}
                 <div className="w-2/3 overflow-y-auto p-4 bg-[#121212]">
                    <div className="grid grid-cols-2 gap-4">
                       {vaultAssets.filter(a => !modalActiveFolder || a.tagId === modalActiveFolder).map(asset => (
                         <div 
                           key={asset.id} onClick={() => addClipToTimeline(asset.id)}
                           className="bg-[#1e1e1e] border border-white/5 p-3 rounded-xl cursor-pointer hover:border-pink-500 hover:bg-[#242424] transition group flex gap-3"
                         >
                            <div className="w-16 h-16 bg-black rounded shrink-0 overflow-hidden">
                               {asset.type === 'video' && asset.youtubeId && <img src={`https://img.youtube.com/vi/${asset.youtubeId}/mqdefault.jpg`} className="w-full h-full object-cover"/>}
                               {asset.type === 'image' && <img src={asset.url} className="w-full h-full object-cover"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="font-semibold text-sm truncate text-white">{asset.title}</p>
                               <p className="text-xs text-neutral-500 uppercase mt-1">{asset.type}</p>
                            </div>
                         </div>
                       ))}
                       {vaultAssets.filter(a => !modalActiveFolder || a.tagId === modalActiveFolder).length === 0 && (
                          <div className="col-span-2 text-center text-neutral-500 py-10">No assets in this folder.</div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
