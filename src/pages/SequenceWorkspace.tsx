import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import YouTube from 'react-youtube';
import { ArrowLeft, Play, Pause, FileText, Upload, ExternalLink, Plus, Trash2, Volume2, VolumeX, X, ArrowRight, PanelRightClose, PanelRightOpen, Check, List } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { ClipProject, ClipItem } from '../types';

import { set, get } from 'idb-keyval';

export default function SequenceWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Project & Clips
  const [project, setProject] = useState<ClipProject | null>(null);
  const [projectClips, setProjectClips] = useState<ClipItem[]>([]);
  
  // Audio State
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const youtubePlayerRef = useRef<any>(null);

  interface SeqPoint {
    id: string;
    timeStr: string;
    clipIndex: number; // 0-based
  }

  interface ScriptTask {
    id: string;
    index: number;
    title: string;
    completed: boolean;
    notes: string;
  }

  const [sequencePoints, setSequencePoints] = useState<SeqPoint[]>(() => {
    // Lazy initialize to prevent overwriting with defaults
    const id = window.location.pathname.split('/').pop();
    const saved = localStorage.getItem(`yt_seq_points_${id}`);
    if (saved) return JSON.parse(saved);
    return [{ id: uuidv4(), timeStr: "0:00", clipIndex: 0 }];
  });

  const [scriptTasks, setScriptTasks] = useState<ScriptTask[]>(() => {
    const id = window.location.pathname.split('/').pop();
    const saved = localStorage.getItem(`yt_seq_scripts_${id}`);
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'sequence' | 'scripting'>('sequence');

  const [activeClipIndex, setActiveClipIndex] = useState<number | null>(null);

  useEffect(() => {
    const projects = JSON.parse(localStorage.getItem('yt_sequence_projects') || '[]');
    const p = projects.find((x: any) => x.id === projectId);
    if (p) setProject(p);

    const allClips = JSON.parse(localStorage.getItem('yt_sequence_clips') || '[]');
    setProjectClips(allClips.filter((c: any) => c.projectId === projectId));
    
    // Load audio from indexedDB
    if (projectId) {
      get(`yt_seq_audio_${projectId}`).then((blob: Blob | undefined) => {
         if (blob) {
            const url = URL.createObjectURL(blob);
            setAudioFileUrl(url);
         }
      });
    }
  }, [projectId]);

  // Save script
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`yt_seq_points_${projectId}`, JSON.stringify(sequencePoints));
    }
  }, [sequencePoints, projectId]);

  // Save scripting tasks
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`yt_seq_scripts_${projectId}`, JSON.stringify(scriptTasks));
    }
  }, [scriptTasks, projectId]);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setAudioFileUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Save to IDB
      if (projectId) {
        await set(`yt_seq_audio_${projectId}`, file);
      }
    }
  };

  const [countdown, setCountdown] = useState<number | null>(null);

  const togglePlay = () => {
    if (!audioRef.current || !audioFileUrl) return alert("Please upload an audio track first!");
    
    if (isPlaying) {
      audioRef.current.pause();
      if (youtubePlayerRef.current?.pauseVideo) {
         youtubePlayerRef.current.pauseVideo();
      }
      setIsPlaying(false);
    } else {
      // Start Countdown instead of direct play
      if (countdown !== null) return;
      setCountdown(3);
    }
  };

  const toggleVideoMute = () => {
    const nextMuted = !isVideoMuted;
    setIsVideoMuted(nextMuted);
    if (youtubePlayerRef.current) {
      if (nextMuted) youtubePlayerRef.current.mute();
      else youtubePlayerRef.current.unMute();
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else {
      // Countdown finished
      setCountdown(null);
      if (audioRef.current) {
         audioRef.current.play();
         if (youtubePlayerRef.current?.playVideo) {
            youtubePlayerRef.current.playVideo();
         }
         setIsPlaying(true);
      }
    }
  }, [countdown]);

  const parseTime = (str: string) => {
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0];
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleTimeScrub = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startStr = sequencePoints[index].timeStr;
    const startSecs = parseTime(startStr);

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const diff = Math.floor(deltaY / 4); // 4px per second
      const newSecs = Math.max(0, startSecs + diff);
      
      setSequencePoints(prev => {
        const newPoints = [...prev];
        newPoints[index].timeStr = formatSecs(newSecs);
        return newPoints;
      });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const [addCheckpointData, setAddCheckpointData] = useState<{ time: number } | null>(null);
  const [addCheckpointClipIndex, setAddCheckpointClipIndex] = useState(0);

  const handleTimelineDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / rect.width) * duration;
    
    setAddCheckpointData({ time: clickTime });
    setAddCheckpointClipIndex(0);
  };

  const checkpoints = useMemo(() => {
    const points: { time: number; clipIndex: number }[] = [];
    
    for (const pt of sequencePoints) {
      if (!pt.timeStr) continue;
      const t = parseTime(pt.timeStr);
      const idx = pt.clipIndex;
      if (!isNaN(t) && !isNaN(idx) && idx >= 0 && idx < projectClips.length) {
        points.push({ time: t, clipIndex: idx });
      }
    }
    
    return points.sort((a, b) => a.time - b.time);
  }, [sequencePoints, projectClips]);

  const updateLoop = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      
      // Determine active clip based on checkpoints
      let newActiveIndex = null;
      for (let i = checkpoints.length - 1; i >= 0; i--) {
        if (t >= checkpoints[i].time) {
          newActiveIndex = checkpoints[i].clipIndex;
          break;
        }
      }
      
      setActiveClipIndex(newActiveIndex);
    }
    animationRef.current = requestAnimationFrame(updateLoop);
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, checkpoints]);

  const activeClip = activeClipIndex !== null ? projectClips[activeClipIndex] : null;

  if (!project) return <div className="p-10 text-white bg-[#121212] min-h-screen">Loading...</div>;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#121212] text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-14 bg-[#181818] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/sequence-studio" className="text-neutral-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <span className="font-bold text-sm text-purple-400">Sequence Studio: <span className="text-white font-normal">{project.name}</span></span>
        </div>
        <div className="flex items-center h-full">
           {isRightPanelOpen && (
             <div className="flex h-full items-center mr-4 border-r border-white/5 pr-4">
               <button 
                 className={`h-full px-6 text-xs font-bold tracking-wider uppercase transition border-b-2 flex items-center ${rightPanelTab === 'sequence' ? 'text-purple-400 border-purple-500 bg-purple-500/5' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                 onClick={() => setRightPanelTab('sequence')}
               >
                 Sequence
               </button>
               <button 
                 className={`h-full px-6 text-xs font-bold tracking-wider uppercase transition border-b-2 flex items-center ${rightPanelTab === 'scripting' ? 'text-purple-400 border-purple-500 bg-purple-500/5' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                 onClick={() => setRightPanelTab('scripting')}
               >
                 Scripting
               </button>
             </div>
           )}
           <button 
             onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
             className="text-neutral-400 hover:text-white p-2 transition"
             title="Toggle Right Panel"
           >
             {isRightPanelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
           </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex flex-1 min-h-0">
        
        {/* BIG CANVAS (Left) */}
        <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-4">
          {!activeClip ? (
            <div className="text-neutral-600 flex flex-col items-center">
               <Play size={64} className="mb-4 opacity-50" />
               <p className="text-xl">Waiting for sequence trigger...</p>
            </div>
          ) : (
            <div key={activeClip.id} className="w-full h-full relative rounded-xl overflow-hidden shadow-2xl">
              {activeClip.type === 'video' ? (
                <>
                  <YouTube
                    videoId={activeClip.youtubeId}
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: {
                        autoplay: 1,
                        controls: 0,
                        disablekb: 1,
                        modestbranding: 1,
                        start: activeClip.startTime || 0,
                        ...(activeClip.endTime ? { end: activeClip.endTime } : {})
                      }
                    }}
                    onReady={(e) => {
                      youtubePlayerRef.current = e.target;
                      if (!isPlaying) e.target.pauseVideo();
                      if (isVideoMuted) e.target.mute();
                      else e.target.unMute();
                    }}
                    className="w-full h-full"
                    iframeClassName="w-full h-full pointer-events-none"
                  />
                  <button 
                    onClick={toggleVideoMute}
                    className="absolute bottom-4 left-4 z-40 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur transition shadow-lg"
                    title={isVideoMuted ? "Unmute Video" : "Mute Video"}
                  >
                    {isVideoMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </>
              ) : activeClip.type === 'image' ? (
                <img src={activeClip.url} className="w-full h-full object-contain" alt="Asset" />
              ) : activeClip.type === 'article' ? (
                <div className="w-full h-full bg-white relative">
                   <iframe src={activeClip.url} className="w-full h-full border-none" sandbox="allow-same-origin allow-scripts" />
                   <div className="absolute bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg flex items-center gap-3">
                      <span className="text-sm">Refusing to connect?</span>
                      <a href={activeClip.url} target="_blank" rel="noreferrer" className="bg-purple-600 px-3 py-1.5 rounded font-bold text-xs uppercase flex items-center gap-2">
                         <ExternalLink size={14} /> Open
                      </a>
                   </div>
                </div>
              ) : null}
            </div>
          )}

          {/* COUNTDOWN OVERLAY */}
          {countdown !== null && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <span className="text-9xl font-bold text-purple-500 animate-pulse drop-shadow-[0_0_40px_rgba(168,85,247,0.6)]">
                 {countdown > 0 ? countdown : "GO!"}
               </span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: CLIPS & SCRIPT */}
        {isRightPanelOpen && (
        <div className="w-80 bg-[#181818] border-l border-white/5 flex flex-col shrink-0">

           {rightPanelTab === 'sequence' ? (
             <>
               {/* Clips List */}
               <div className="h-1/2 flex flex-col border-b border-white/5">
                  <div className="p-3 border-b border-white/5 bg-[#202020]">
                     <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Project Assets ({projectClips.length})</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {projectClips.map((clip, idx) => (
                      <div key={clip.id} className={`p-2 rounded-lg flex items-center gap-3 ${activeClipIndex === idx ? 'bg-purple-500/20 ring-1 ring-purple-500' : 'bg-[#242424]'}`}>
                        <div className="w-6 h-6 rounded bg-black flex items-center justify-center font-mono text-xs font-bold text-neutral-400 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="w-10 h-10 rounded bg-black overflow-hidden shrink-0">
                           {clip.type === 'image' ? (
                             <img src={clip.url} className="w-full h-full object-cover opacity-70" />
                           ) : clip.type === 'video' ? (
                             <img src={`https://img.youtube.com/vi/${clip.youtubeId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-70" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center"><FileText size={16} className="text-neutral-500"/></div>
                           )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate text-white">{clip.title}</p>
                          <p className="text-[10px] text-neutral-500 truncate uppercase">{clip.type || 'video'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Sequence Timeline Area */}
               <div className="h-1/2 flex flex-col">
                  <div className="p-3 border-b border-white/5 bg-[#202020] flex items-center justify-between">
                     <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Timeline</h3>
                        <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">Map timestamps to clips</p>
                     </div>
                     <button 
                       onClick={() => setSequencePoints([...sequencePoints, { id: uuidv4(), timeStr: "0:00", clipIndex: 0 }])}
                       className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded transition"
                     >
                       <Plus size={16} />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                     {sequencePoints.map((pt, i) => (
                        <div key={pt.id} className="flex items-center gap-3 bg-[#1a1a1a] hover:bg-[#222222] px-3 py-2 rounded-lg border border-white/5 group transition-colors">
                           <input 
                             type="text" 
                             value={pt.timeStr}
                             onChange={e => {
                               const newPoints = [...sequencePoints];
                               newPoints[i].timeStr = e.target.value;
                               setSequencePoints(newPoints);
                             }}
                             onPointerDown={e => handleTimeScrub(i, e)}
                             className="w-12 bg-transparent text-xs font-mono text-purple-400 font-bold text-center outline-none cursor-ns-resize hover:text-purple-300 transition-colors"
                             placeholder="0:00"
                             title="Drag up/down to adjust time"
                           />
                           <div className="w-[1px] h-4 bg-white/10 shrink-0" />
                           <select
                             value={pt.clipIndex}
                             onChange={e => {
                               const newPoints = [...sequencePoints];
                               newPoints[i].clipIndex = parseInt(e.target.value, 10);
                               setSequencePoints(newPoints);
                             }}
                             className="flex-1 bg-transparent text-xs outline-none text-neutral-300 font-medium cursor-pointer truncate"
                           >
                             {projectClips.map((c, idx) => (
                                <option key={c.id} value={idx} className="bg-[#1e1e1e] text-white">{idx + 1}. {c.title}</option>
                             ))}
                           </select>
                           <button 
                             onClick={() => setSequencePoints(sequencePoints.filter(p => p.id !== pt.id))}
                             className="text-neutral-500 hover:text-red-400 transition p-1 opacity-0 group-hover:opacity-100 shrink-0"
                             title="Remove point"
                           >
                             <Trash2 size={14} />
                           </button>
                        </div>
                     ))}
                     {sequencePoints.length === 0 && (
                        <p className="text-xs text-neutral-500 text-center mt-4">No sequence points added.</p>
                     )}
                  </div>
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col h-full bg-[#181818] overflow-hidden relative">
               {!activeTaskId ? (
                 <div className="flex flex-col h-full">
                   <div className="p-3 border-b border-white/5 bg-[#202020]">
                     <form 
                       onSubmit={e => {
                         e.preventDefault();
                         if (!newTaskTitle.trim()) return;
                         const nextIdx = scriptTasks.length > 0 ? Math.max(...scriptTasks.map(t => t.index)) + 1 : 1;
                         setScriptTasks([...scriptTasks, { id: uuidv4(), index: nextIdx, title: newTaskTitle, completed: false, notes: '' }]);
                         setNewTaskTitle('');
                       }}
                       className="flex items-center gap-2"
                     >
                       <input 
                         type="text" 
                         value={newTaskTitle}
                         onChange={e => setNewTaskTitle(e.target.value)}
                         placeholder="New scripting task..."
                         className="flex-1 bg-[#141414] border border-white/10 px-3 py-1.5 rounded text-sm text-white outline-none focus:border-purple-500"
                       />
                       <button type="submit" className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded shrink-0">
                         <Plus size={16} />
                       </button>
                     </form>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                     {[...scriptTasks].sort((a,b) => (a.completed === b.completed ? a.index - b.index : a.completed ? 1 : -1)).map(task => (
                       <div key={task.id} className="flex items-center gap-3 p-2 bg-[#1e1e1e] hover:bg-[#242424] rounded-lg mb-1 group transition">
                         <button 
                           onClick={() => setScriptTasks(scriptTasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                           className={`w-5 h-5 flex items-center justify-center rounded border shrink-0 transition-colors ${task.completed ? 'bg-purple-600 border-purple-600 text-white' : 'border-neutral-500 text-neutral-400 hover:border-purple-400'}`}
                         >
                           {task.completed ? <Check size={12} strokeWidth={4} /> : <span className="text-[10px] font-bold">{task.index}</span>}
                         </button>
                         <span className={`flex-1 text-sm truncate transition-opacity ${task.completed ? 'text-neutral-500 line-through opacity-70' : 'text-neutral-200'}`}>
                           {task.title}
                         </span>
                         <button 
                           onClick={() => setActiveTaskId(task.id)}
                           className="text-neutral-500 hover:text-purple-400 transition p-1 opacity-0 group-hover:opacity-100 shrink-0"
                         >
                           <ArrowRight size={16} />
                         </button>
                       </div>
                     ))}
                     {scriptTasks.length === 0 && (
                        <p className="text-xs text-neutral-500 text-center mt-4">Add tasks to build your script outline.</p>
                     )}
                   </div>
                 </div>
               ) : (() => {
                 const currentTask = scriptTasks.find(t => t.id === activeTaskId);
                 if (!currentTask) return null;
                 return (
                   <div className="flex flex-col h-full bg-[#181818] absolute inset-0 z-10 animate-in slide-in-from-right-8 duration-200">
                     <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-[#202020]">
                       <button onClick={() => setActiveTaskId(null)} className="text-neutral-400 hover:text-white p-1">
                         <ArrowLeft size={16} />
                       </button>
                       <h3 className="text-sm font-bold text-white truncate flex-1">{currentTask.title}</h3>
                       <button 
                         onMouseDown={e => {
                           e.preventDefault();
                           document.execCommand('insertHTML', false, '<b>&starf;&nbsp;</b>');
                         }}
                         className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition"
                         title="Insert Bold Pointer"
                       >
                         <List size={16} />
                       </button>
                     </div>
                     <div className="flex-1 p-0 relative group">
                        <div 
                          className="w-full h-full p-4 bg-transparent text-sm text-neutral-300 outline-none overflow-y-auto custom-scrollbar"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => {
                            const newHTML = e.target.innerHTML;
                            setScriptTasks(scriptTasks.map(t => t.id === activeTaskId ? { ...t, notes: newHTML } : t));
                          }}
                          dangerouslySetInnerHTML={{ __html: currentTask.notes }}
                        />
                     </div>
                   </div>
                 );
               })()}
             </div>
           )}
        </div>
        )}
      </div>

      {/* BOTTOM AUDIO TIMELINE */}
      <div className="h-24 bg-[#141414] border-t border-white/5 flex items-center px-6 gap-6 shrink-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
         
         <button 
           onClick={togglePlay}
           disabled={!audioFileUrl}
           className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center disabled:opacity-50 transition shrink-0"
         >
           {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
         </button>

         <div className="flex-1 flex flex-col justify-center gap-1 relative h-full">
           
           {/* Markers Row */}
           <div className="relative w-full h-6">
             {checkpoints.map((pt, i) => {
               if (duration === 0) return null;
               const left = (pt.time / duration) * 100;
               return (
                 <div 
                   key={i} 
                   className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10" 
                   style={{ left: `${left}%` }} 
                 >
                   <div 
                     className="w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-[#181818] border border-purple-500/80 text-[9px] sm:text-[10px] text-purple-300 font-bold flex items-center justify-center shadow-md shadow-purple-500/20" 
                     title={`Asset ${pt.clipIndex + 1}: ${projectClips[pt.clipIndex]?.title || ''} at ${formatSecs(pt.time)}`}
                   >
                     {pt.clipIndex + 1}
                   </div>
                   {/* Small connector line */}
                   <div className="w-[1px] h-1.5 bg-purple-500/50 mt-0.5" />
                 </div>
               );
             })}
           </div>

           {/* Timeline Scrub Row */}
           <div 
             className="relative w-full h-6 flex items-center group cursor-pointer"
             onDoubleClick={handleTimelineDoubleClick}
             title="Double click to add a checkpoint"
           >
             {/* Progress Background */}
             <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 sm:h-2 bg-[#2a2a2a] rounded-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 h-full bg-purple-500" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
             </div>
             
             {/* Range Input for Dragging/Seeking */}
             <input 
               type="range"
               min={0}
               max={duration || 100}
               step="0.1"
               value={currentTime}
               onChange={e => {
                 const t = Number(e.target.value);
                 setCurrentTime(t);
                 if (audioRef.current) audioRef.current.currentTime = t;
               }}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
             />
           </div>

           <div className="flex justify-between text-[10px] sm:text-xs text-neutral-400 font-mono mt-0.5">
              <span>{formatSecs(currentTime)}</span>
              <span>{formatSecs(duration)}</span>
           </div>
         </div>

         <div className="shrink-0 flex items-center gap-4 border-l border-white/10 pl-6">
            <label className="flex items-center gap-2 bg-[#242424] hover:bg-[#2a2a2a] px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition">
              <Upload size={16} className="text-purple-400" />
              {audioFileUrl ? "Change Audio" : "Upload Audio"}
              <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
            </label>
            
            {audioFileUrl && (
              <audio 
                ref={audioRef} 
                src={audioFileUrl} 
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => setIsPlaying(false)}
                className="hidden" 
              />
            )}
         </div>

      </div>

      {/* ADD CHECKPOINT MODAL */}
      {addCheckpointData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-white/10 flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">Add Checkpoint</h2>
                <button onClick={() => setAddCheckpointData(null)} className="text-neutral-500 hover:text-white transition">
                  <X size={20} />
                </button>
             </div>
             
             <div className="space-y-4">
                <div>
                   <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1 block">Timestamp</label>
                   <div className="bg-[#141414] border border-white/10 px-3 py-2 rounded text-purple-400 font-mono">
                      {formatSecs(addCheckpointData.time)}
                   </div>
                </div>
                
                <div>
                   <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1 block">Select Asset</label>
                   <select
                     value={addCheckpointClipIndex}
                     onChange={e => setAddCheckpointClipIndex(parseInt(e.target.value, 10))}
                     className="w-full bg-[#141414] border border-white/10 px-3 py-2 rounded text-sm outline-none focus:border-purple-500 text-white cursor-pointer"
                   >
                     {projectClips.length === 0 && <option value={0}>No clips available</option>}
                     {projectClips.map((c, idx) => (
                        <option key={c.id} value={idx}>{idx + 1}. {c.title}</option>
                     ))}
                   </select>
                </div>
                
                <button 
                  onClick={() => {
                    const newPt: SeqPoint = {
                       id: uuidv4(),
                       timeStr: formatSecs(addCheckpointData.time),
                       clipIndex: addCheckpointClipIndex
                    };
                    setSequencePoints(prev => [...prev, newPt]);
                    setAddCheckpointData(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-lg transition mt-2"
                >
                  Add Checkpoint
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
