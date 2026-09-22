import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import YouTube from 'react-youtube';
import { Plus, ArrowLeft, Play, Pause, Trash2, Repeat, Scissors, Info, X, Image as ImageIcon, Video } from 'lucide-react';
import type { ClipProject, ClipItem } from '../types';
import { extractVideoData } from '../utils';

export default function ClipEditorWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [project, setProject] = useState<ClipProject | null>(null);
  const [clips, setClips] = useState<ClipItem[]>(() => {
    const saved = localStorage.getItem('clip_items');
    return saved ? JSON.parse(saved) : [];
  });

  // Load project details
  useEffect(() => {
    const savedProjects = localStorage.getItem('clip_projects');
    if (savedProjects && projectId) {
      const proj = JSON.parse(savedProjects).find((p: ClipProject) => p.id === projectId);
      setProject(proj || null);
    }
  }, [projectId]);

  // Persist clips
  useEffect(() => {
    localStorage.setItem('clip_items', JSON.stringify(clips));
  }, [clips]);

  const projectClips = clips.filter(c => c.projectId === projectId);
  
  // Editor State
  const [inputMode, setInputMode] = useState<'video'|'image'>('video');
  const [inputUrl, setInputUrl] = useState('');
  const [imageTimer, setImageTimer] = useState(10); // Default 10s zoom animation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [infoModalClip, setInfoModalClip] = useState<ClipItem | null>(null);
  const [tempVideoId, setTempVideoId] = useState<string | null>(null);
  const [clipTitle, setClipTitle] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [startTimeStr, setStartTimeStr] = useState("0:00");
  const [endTimeStr, setEndTimeStr] = useState("0:10");
  const [isLooping, setIsLooping] = useState(true);
  const [modalDuration, setModalDuration] = useState(100);
  const modalPlayerRef = useRef<any>(null);

  const formatTimeInput = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (str: string) => {
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  };

  useEffect(() => setStartTimeStr(formatTimeInput(startTime)), [startTime]);
  useEffect(() => setEndTimeStr(formatTimeInput(endTime)), [endTime]);

  // Main Player State
  const [currentClip, setCurrentClip] = useState<ClipItem | null>(null);
  const mainPlayerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isModalPlaying, setIsModalPlaying] = useState(false);

  // Loop & End Check for Main Player
  useEffect(() => {
    const interval = setInterval(() => {
      if (mainPlayerRef.current && currentClip && isPlaying) {
        const time = mainPlayerRef.current.getCurrentTime();
        if (time >= currentClip.endTime) {
          if (currentClip.loop) {
             mainPlayerRef.current.seekTo(currentClip.startTime, true);
          } else {
             mainPlayerRef.current.pauseVideo();
             setIsPlaying(false);
          }
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [currentClip, isPlaying]);

  // Loop & End Check for Modal Player
  useEffect(() => {
    if (!isModalOpen) return;
    const interval = setInterval(() => {
      if (modalPlayerRef.current && isModalPlaying) {
        const time = modalPlayerRef.current.getCurrentTime();
        if (time >= endTime) {
          if (isLooping) {
             modalPlayerRef.current.seekTo(startTime, true);
          } else {
             modalPlayerRef.current.pauseVideo();
             setIsModalPlaying(false);
          }
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isModalOpen, isModalPlaying, startTime, endTime, isLooping]);

  const handleOpenModal = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMode === 'image') {
       if (!inputUrl.trim()) return alert("Please enter an image URL");
       
       const newClip: ClipItem = {
         id: uuidv4(),
         projectId: projectId!,
         youtubeId: '',
         url: inputUrl,
         startTime: 0,
         endTime: imageTimer,
         loop: true,
         addedAt: Date.now(),
         title: "Image Clip",
         type: 'image',
         zoomDuration: imageTimer
       };
       setClips(prev => [newClip, ...prev]);
       setInputUrl('');
       if (!currentClip) setCurrentClip(newClip);
       return;
    }

    const { id: ytId } = extractVideoData(inputUrl);
    if (!ytId) return alert("Invalid YouTube URL");
    
    setTempVideoId(ytId);
    setClipTitle('');
    setStartTime(0);
    setEndTime(10);
    setIsLooping(true);
    setIsModalOpen(true);
  };

  const handleSaveClip = () => {
    if (!tempVideoId || !projectId) return;
    
    const newClip: ClipItem = {
      id: uuidv4(),
      projectId,
      youtubeId: tempVideoId,
      url: inputUrl,
      startTime: startTime,
      endTime: endTime,
      loop: isLooping,
      addedAt: Date.now(),
      title: clipTitle.trim() || `Clip - ${tempVideoId}`
    };

    setClips(prev => [newClip, ...prev]);
    setIsModalOpen(false);
    setInputUrl('');
    if (!currentClip) {
      setCurrentClip(newClip);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!project) return <div className="p-10 text-white bg-[#121212] min-h-screen">Project not found.</div>;

  const mainOpts: any = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0, 
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      cc_load_policy: 0,
      iv_load_policy: 3,
      start: currentClip?.startTime || 0,
    },
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-[#121212] text-white overflow-hidden font-sans">
      
      {/* VIDEO CANVAS */}
      <div className="w-full flex-none aspect-video md:aspect-auto md:w-3/4 md:h-full relative bg-black flex flex-col items-center justify-center z-10">
        {currentClip ? (
          <div className="w-full h-full relative overflow-hidden">
            {currentClip.type === 'image' ? (
              <div className="w-full h-full bg-[#181818] overflow-hidden flex items-center justify-center relative">
                 <img 
                   src={currentClip.url} 
                   alt={currentClip.title}
                   className="absolute inset-0 w-full h-full object-cover animate-zoom-in-out"
                   style={{ animationDuration: `${currentClip.zoomDuration || 10}s` }}
                 />
              </div>
            ) : (
              <YouTube
                videoId={currentClip.youtubeId}
                opts={mainOpts}
                onReady={(e) => { mainPlayerRef.current = e.target; }}
                onStateChange={(e) => {
                  if (e.data === 1) setIsPlaying(true);
                  else setIsPlaying(false);
                }}
                className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                iframeClassName="w-full h-full"
              />
            )}
          </div>
        ) : (
          <div className="text-neutral-500 flex flex-col items-center gap-4 p-4 text-center">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-neutral-900 flex items-center justify-center">
              <Scissors size={32} className="text-neutral-600" />
            </div>
            <p className="text-base md:text-lg tracking-wide font-light">Select a clip to play</p>
          </div>
        )}
      </div>

      {/* MANAGER PANEL */}
      <div className="flex-1 w-full md:w-1/4 md:h-full bg-[#181818] flex flex-col z-20 min-h-0 border-l border-white/5">
        
        {/* Top */}
        <div className="p-5 border-b border-white/5 space-y-4">
          <Link to="/clip-editor" className="flex items-center gap-2 text-neutral-400 hover:text-white transition w-max mb-2">
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">{project.name}</span>
          </Link>
          
          <form onSubmit={handleOpenModal} className="flex gap-2 relative">
            <button 
              type="button"
              onClick={() => setInputMode(prev => prev === 'video' ? 'image' : 'video')}
              className="bg-[#242424] p-3 rounded-lg hover:bg-[#2a2a2a] text-neutral-400 hover:text-white transition flex-shrink-0"
              title={inputMode === 'video' ? "Switch to Image Mode" : "Switch to Video Mode"}
            >
              {inputMode === 'video' ? <ImageIcon size={20} /> : <Video size={20} />}
            </button>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder={inputMode === 'video' ? "Paste YouTube Link..." : "Paste Image URL..."}
              className="flex-1 bg-[#242424] text-sm rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500 transition-all min-w-0"
            />
            {inputMode === 'image' && (
              <input
                type="number"
                value={imageTimer}
                onChange={(e) => setImageTimer(Number(e.target.value))}
                title="Zoom Animation Duration (seconds)"
                className="w-16 bg-[#242424] text-sm text-center rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                min="1"
              />
            )}
            <button type="submit" className="bg-blue-600 p-3 rounded-lg hover:bg-blue-500 transition flex-shrink-0">
              <Plus size={20} />
            </button>
          </form>
        </div>

        {/* Clip List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {projectClips.map(clip => {
            const isActive = currentClip?.id === clip.id;
            return (
              <div 
                key={clip.id}
                onClick={() => setCurrentClip(clip)}
                className={`p-3 rounded-xl cursor-pointer group transition-all duration-300 ${
                  isActive ? 'bg-[#2a2a2a] ring-1 ring-blue-500/50' : 'bg-[#202020] hover:bg-[#2a2a2a]'
                }`}
              >
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-3">
                  <img 
                    src={clip.type === 'image' ? clip.url : `https://img.youtube.com/vi/${clip.youtubeId}/mqdefault.jpg`} 
                    alt="Thumbnail"
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-50' : 'opacity-80 group-hover:opacity-100'}`}
                  />
                  {isActive && isPlaying && clip.type !== 'image' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500/90 flex items-center justify-center animate-pulse">
                        <Play size={16} fill="white" className="ml-1" />
                      </div>
                    </div>
                  )}
                  {clip.type !== 'image' && (
                    <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10">
                       {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-start px-1">
                   <div>
                     <h3 className="font-semibold text-sm truncate w-40">{clip.title}</h3>
                     {clip.loop && <span className="text-[10px] text-blue-400 flex items-center gap-1 mt-1"><Repeat size={10}/> Looping</span>}
                   </div>
                   
                   <div className="flex gap-1">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setInfoModalClip(clip);
                       }}
                       className="text-neutral-500 hover:text-white transition p-1"
                       title="Info"
                     >
                       <Info size={16} />
                     </button>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setClips(clips.filter(c => c.id !== clip.id));
                         if(currentClip?.id === clip.id) setCurrentClip(null);
                       }}
                       className="text-neutral-500 hover:text-red-500 transition p-1"
                       title="Delete"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                </div>
              </div>
            );
          })}
          {projectClips.length === 0 && (
            <div className="text-center text-sm text-neutral-500 mt-10">
              No clips added yet.
            </div>
          )}
        </div>
      </div>

      {/* CLIPPING MODAL */}
      {isModalOpen && tempVideoId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">Create Clip</h2>
            
            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 relative shrink-0">
               <YouTube
                 videoId={tempVideoId}
                 opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, start: startTime } }}
                 onReady={(e) => {
                    modalPlayerRef.current = e.target;
                    setModalDuration(e.target.getDuration() || 100);
                 }}
                 onStateChange={(e) => {
                    if (e.data === 1) setIsModalPlaying(true);
                    else setIsModalPlaying(false);
                 }}
                 className="w-full h-full"
               />
            </div>

            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
               <div>
                 <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Clip Title</label>
                 <input 
                   type="text" 
                   value={clipTitle}
                   onChange={e => setClipTitle(e.target.value)}
                   className="w-full bg-[#242424] px-4 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                   placeholder="E.g., Funny moment"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Start Time</label>
                    <input 
                      type="text" 
                      value={startTimeStr}
                      onChange={e => setStartTimeStr(e.target.value)}
                      onBlur={() => {
                         let val = parseTimeInput(startTimeStr);
                         if (val > endTime - 1) val = endTime - 1;
                         if (val < 0) val = 0;
                         setStartTime(val);
                         setStartTimeStr(formatTimeInput(val));
                         modalPlayerRef.current?.seekTo(val, true);
                      }}
                      className="w-full bg-[#242424] px-4 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">End Time</label>
                    <input 
                      type="text"
                      value={endTimeStr}
                      onChange={e => setEndTimeStr(e.target.value)}
                      onBlur={() => {
                         let val = parseTimeInput(endTimeStr);
                         if (val < startTime + 1) val = startTime + 1;
                         if (val > modalDuration) val = modalDuration;
                         setEndTime(val);
                         setEndTimeStr(formatTimeInput(val));
                      }}
                      className="w-full bg-[#242424] px-4 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
               </div>

               {/* Dual Range Slider approximation using two standard inputs for MVP */}
               <div className="pt-2">
                 <p className="text-xs text-neutral-400 mb-2">Adjust Timeline</p>
                 <div className="flex gap-2">
                   <input 
                     type="range" 
                     min="0" max={modalDuration} 
                     value={startTime} 
                     onChange={e => {
                        const v = Number(e.target.value);
                        if (v < endTime) {
                           setStartTime(v);
                           modalPlayerRef.current?.seekTo(v, true);
                        }
                     }}
                     className="w-full accent-blue-500"
                   />
                   <input 
                     type="range" 
                     min="0" max={modalDuration} 
                     value={endTime} 
                     onChange={e => {
                        const v = Number(e.target.value);
                        if (v > startTime) setEndTime(v);
                     }}
                     className="w-full accent-blue-500"
                   />
                 </div>
               </div>

               <label className="flex items-center gap-3 p-3 bg-[#242424] rounded-xl cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={isLooping} 
                   onChange={e => setIsLooping(e.target.checked)}
                   className="accent-blue-500 w-4 h-4"
                 />
                 <span className="text-sm font-medium">Loop this clip continuously</span>
               </label>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm transition">Cancel</button>
               <button onClick={handleSaveClip} className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-medium text-sm transition shadow-lg shadow-blue-500/20">Add Clip</button>
            </div>
          </div>
        </div>
      )}

      {/* INFO MODAL */}
      {infoModalClip && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] p-8 rounded-2xl w-[500px] max-w-[90%] shadow-2xl border border-white/10 relative">
            <button onClick={() => setInfoModalClip(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white transition">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 text-white">Clip Details</h2>
            
            <div className="space-y-4 text-sm text-neutral-300">
              <div>
                <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Type</p>
                <p className="capitalize">{infoModalClip.type || 'video'}</p>
              </div>
              <div>
                <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Source URL</p>
                <a href={infoModalClip.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
                  {infoModalClip.url}
                </a>
              </div>
              <div>
                <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Added On</p>
                <p>{new Date(infoModalClip.addedAt).toLocaleString()}</p>
              </div>
              {infoModalClip.type !== 'image' && (
                <>
                  <div>
                    <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Clip Timeline</p>
                    <p className="font-mono text-white">
                      {formatTime(infoModalClip.startTime)} to {formatTime(infoModalClip.endTime)} 
                      <span className="text-neutral-500 ml-2">({(infoModalClip.endTime - infoModalClip.startTime).toFixed(1)}s total)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Loop Mode</p>
                    <p>{infoModalClip.loop ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </>
              )}
              {infoModalClip.type === 'image' && (
                  <div>
                    <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Zoom Timer</p>
                    <p>{infoModalClip.zoomDuration || 10} seconds</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
