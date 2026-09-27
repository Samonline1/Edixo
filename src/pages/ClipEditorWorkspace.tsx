import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import YouTube from 'react-youtube';
import { Plus, ArrowLeft, Play, Trash2, Repeat, Scissors, Info, X, Image as ImageIcon, Video, FileText, ExternalLink, Volume2, VolumeX, Folder, FolderOpen, FolderPlus, Check } from 'lucide-react';
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
  const [inputMode, setInputMode] = useState<'video'|'image'|'article'>('video');
  const [inputUrl, setInputUrl] = useState('');
  const [imageTimer, setImageTimer] = useState(10); // Default 10s zoom animation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [articlePromptUrl, setArticlePromptUrl] = useState<string | null>(null);
  const [tempArticleTitle, setTempArticleTitle] = useState("Website Article");
  const [infoModalClip, setInfoModalClip] = useState<ClipItem | null>(null);
  const [tempVideoId, setTempVideoId] = useState<string | null>(null);
  const [clipTitle, setClipTitle] = useState('');
  
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultAssets, setVaultAssets] = useState<any[]>([]);
  const [vaultTags, setVaultTags] = useState<any[]>([]);
  const [activeVaultFolderId, setActiveVaultFolderId] = useState<string | null>(null);
  const [isSaveToVaultModalOpen, setIsSaveToVaultModalOpen] = useState(false);
  const [saveVaultFolderId, setSaveVaultFolderId] = useState('');
  const [saveVaultNewFolderName, setSaveVaultNewFolderName] = useState('');
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
  const [isMuted, setIsMuted] = useState(false);

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

  useEffect(() => {
    setVaultAssets(JSON.parse(localStorage.getItem('yt_assets') || '[]'));
    setVaultTags(JSON.parse(localStorage.getItem('yt_asset_tags') || '[]'));
  }, [isVaultModalOpen]);

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

    if (inputMode === 'article') {
       if (!inputUrl.trim()) return alert("Please enter an article URL");
       setArticlePromptUrl(inputUrl);
       setTempArticleTitle("Website Article");
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

  const handleSaveArticle = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!articlePromptUrl) return;
    const newClip: ClipItem = {
      id: uuidv4(),
      projectId: projectId!,
      youtubeId: '',
      url: articlePromptUrl,
      startTime: 0,
      endTime: 0,
      loop: false,
      addedAt: Date.now(),
      title: tempArticleTitle.trim() || "Website Article",
      type: 'article'
    };
    setClips(prev => [newClip, ...prev]);
    setInputUrl('');
    setArticlePromptUrl(null);
    if (!currentClip) setCurrentClip(newClip);
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
      title: clipTitle.trim() || `Clip - ${tempVideoId}`,
      type: 'video'
    };

    setClips(prev => [newClip, ...prev]);
    setIsModalOpen(false);
    setInputUrl('');
    if (!currentClip) {
      setCurrentClip(newClip);
    }
  };

  const handleImportAsset = (asset: any) => {
    const newClip: ClipItem = {
      id: uuidv4(),
      projectId: projectId!,
      youtubeId: asset.youtubeId || '',
      url: asset.url,
      startTime: asset.startTime || 0,
      endTime: asset.endTime || 10,
      loop: false,
      addedAt: Date.now(),
      title: asset.title,
      type: asset.type
    };
    setClips(prev => [newClip, ...prev]);
    if (!currentClip) setCurrentClip(newClip);
    setIsVaultModalOpen(false);
    setActiveVaultFolderId(null);
  };

  const handleSaveToVaultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoModalClip) return;
    
    let finalTagId = saveVaultFolderId;
    if (finalTagId === 'new') {
      if (!saveVaultNewFolderName.trim()) return alert("Please enter a folder name");
      const newTag = { id: uuidv4(), name: saveVaultNewFolderName.trim() };
      const updatedTags = [...vaultTags, newTag];
      setVaultTags(updatedTags);
      localStorage.setItem('yt_asset_tags', JSON.stringify(updatedTags));
      finalTagId = newTag.id;
    }
    if (!finalTagId) return alert("Please select or create a folder");

    const newAsset = {
      id: uuidv4(),
      type: infoModalClip.type || 'video',
      url: infoModalClip.url,
      title: infoModalClip.title,
      tagId: finalTagId,
      addedAt: Date.now(),
      youtubeId: infoModalClip.youtubeId,
      startTime: (!infoModalClip.type || infoModalClip.type === 'video') ? infoModalClip.startTime : undefined,
      endTime: (!infoModalClip.type || infoModalClip.type === 'video') ? infoModalClip.endTime : undefined,
    };
    
    const updatedAssets = [newAsset, ...vaultAssets];
    setVaultAssets(updatedAssets);
    localStorage.setItem('yt_assets', JSON.stringify(updatedAssets));
    setIsSaveToVaultModalOpen(false);
    setSaveVaultFolderId('');
    setSaveVaultNewFolderName('');
    setInfoModalClip(null);
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
      <div className={`w-full flex-none ${currentClip?.type === 'article' ? 'h-[60vh]' : 'aspect-video'} md:h-full md:aspect-auto md:w-3/4 relative bg-black flex flex-col items-center justify-center z-10 transition-all duration-300`}>
        {currentClip ? (
          <div className="w-full h-full relative overflow-hidden">
            {currentClip.type === 'article' ? (
              <div className="w-full h-full bg-white relative">
                 <iframe 
                   src={currentClip.url}
                   title={currentClip.title}
                   className="w-full h-full border-none"
                   sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                 />
                 <div className="absolute bottom-4 right-4 bg-black/80 text-white p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-3 backdrop-blur-md shadow-2xl z-50 border border-white/10">
                    <span className="text-xs text-neutral-300 hidden md:inline">Refusing to connect?</span>
                    <a href={currentClip.url} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 w-8 h-8 md:w-auto md:h-auto md:px-2.5 md:py-1 rounded md:text-[10px] uppercase tracking-wider transition font-bold" title="Open in New Tab">
                       <ExternalLink size={16} className="md:w-3 md:h-3" />
                       <span className="hidden md:inline ml-1.5">Open Tab</span>
                    </a>
                 </div>
              </div>
            ) : currentClip.type === 'image' ? (
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
            
            {currentClip.type !== 'image' && currentClip.type !== 'article' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (mainPlayerRef.current) {
                    const muted = mainPlayerRef.current.isMuted();
                    if (muted) {
                      mainPlayerRef.current.unMute();
                      setIsMuted(false);
                    } else {
                      mainPlayerRef.current.mute();
                      setIsMuted(true);
                    }
                  }
                }}
                className="absolute bottom-4 left-4 bg-black/80 text-white p-2 md:p-3 rounded-lg hover:bg-black transition border border-white/10 z-50 backdrop-blur-md cursor-pointer flex items-center justify-center"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
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
          <div className="flex justify-between items-center mb-2">
            <Link to="/clip-editor" className="flex items-center gap-2 text-neutral-400 hover:text-white transition w-max">
              <ArrowLeft size={16} />
              <span className="text-sm font-medium">{project.name}</span>
            </Link>
            <button
              onClick={() => setIsVaultModalOpen(true)}
              className="text-xs flex items-center gap-1.5 bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition font-medium"
            >
              <FolderOpen size={14} /> Vault
            </button>
          </div>
          
          <form onSubmit={handleOpenModal} className="flex gap-2 relative">
            <button 
              type="button"
              onClick={() => {
                 if (inputMode === 'video') setInputMode('image');
                 else if (inputMode === 'image') setInputMode('article');
                 else setInputMode('video');
              }}
              className="bg-[#242424] p-3 rounded-lg hover:bg-[#2a2a2a] text-neutral-400 hover:text-white transition flex-shrink-0 w-11 flex justify-center"
              title={`Switch Mode (Current: ${inputMode})`}
            >
              {inputMode === 'video' && <Video size={20} />}
              {inputMode === 'image' && <ImageIcon size={20} />}
              {inputMode === 'article' && <FileText size={20} />}
            </button>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder={inputMode === 'video' ? "Paste YouTube Link..." : inputMode === 'image' ? "Paste Image URL..." : "Paste Article URL..."}
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
            const isInVault = vaultAssets.some(va => {
               if (!clip.type || clip.type === 'video') {
                  return va.youtubeId === clip.youtubeId && va.youtubeId && va.startTime === clip.startTime && va.endTime === clip.endTime;
               }
               return va.url === clip.url;
            });

            if (clip.type === 'article') {
               return (
                  <div 
                    key={clip.id}
                    onClick={() => setCurrentClip(clip)}
                    className={`p-3 rounded-xl cursor-pointer group transition-all duration-300 flex items-center gap-3 ${
                      isActive ? 'bg-[#2a2a2a] ring-1 ring-blue-500/50' : 'bg-[#202020] hover:bg-[#2a2a2a]'
                    }`}
                  >
                     <div className="w-10 h-10 rounded-lg bg-[#181818] flex items-center justify-center text-neutral-500 border border-white/5 shrink-0 relative">
                        {isInVault && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1e1e1e]" title="Saved in Vault" />}
                        <FileText size={18} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{clip.title}</h3>
                        <p className="text-[10px] text-neutral-500 truncate">{clip.url}</p>
                     </div>
                     <div className="flex gap-1 shrink-0">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setInfoModalClip(clip); }}
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
               );
            }

            return (
              <div 
                key={clip.id}
                onClick={() => setCurrentClip(clip)}
                className={`p-3 rounded-xl cursor-pointer group transition-all duration-300 ${
                  isActive ? 'bg-[#2a2a2a] ring-1 ring-blue-500/50' : 'bg-[#202020] hover:bg-[#2a2a2a]'
                }`}
              >
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-3">
                  {isInVault && <div className="absolute top-2 left-2 z-20 w-2.5 h-2.5 bg-green-500 rounded-full border border-black shadow-lg" title="Saved in Vault" />}
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

      {/* ARTICLE TITLE MODAL */}
      {articlePromptUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveArticle} className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col">
            <h2 className="text-xl font-bold mb-4">Name your Article</h2>
            <div className="mb-6">
              <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider">Article Title</label>
              <input 
                type="text" 
                autoFocus
                value={tempArticleTitle}
                onChange={e => setTempArticleTitle(e.target.value)}
                className="w-full bg-[#242424] px-4 py-3 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                placeholder="E.g., Forbes Interview"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0">
               <button type="button" onClick={() => setArticlePromptUrl(null)} className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm transition">Cancel</button>
               <button type="submit" className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-medium text-sm transition shadow-lg shadow-blue-500/20">Save Article</button>
            </div>
          </form>
        </div>
      )}

      {/* INFO MODAL */}
      {infoModalClip && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] p-8 rounded-2xl w-[500px] max-w-[90%] shadow-2xl border border-white/10 relative">
            <button onClick={() => setInfoModalClip(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white transition">
              <X size={20} />
            </button>
            <div className="flex justify-between items-center mb-6 pr-8">
               <h2 className="text-xl font-bold text-white">Clip Details</h2>
               {(() => {
                 const isInfoClipInVault = vaultAssets.some(va => {
                   if (!infoModalClip.type || infoModalClip.type === 'video') {
                     return va.youtubeId === infoModalClip.youtubeId && va.youtubeId && va.startTime === infoModalClip.startTime && va.endTime === infoModalClip.endTime;
                   }
                   return va.url === infoModalClip.url;
                 });
                 
                 return isInfoClipInVault ? (
                   <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border border-green-500/30">
                      <Check size={14} /> In Vault
                   </div>
                 ) : (
                   <button 
                      onClick={() => setIsSaveToVaultModalOpen(true)}
                      className="flex items-center gap-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition border border-green-500/20"
                   >
                      <Plus size={14} /> Vault
                   </button>
                 );
               })()}
            </div>
            
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
              {(!infoModalClip.type || infoModalClip.type === 'video') && (
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

      {/* VAULT MODAL */}
      {isVaultModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-5xl shadow-2xl border border-white/10 flex flex-col h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                {activeVaultFolderId && (
                   <button onClick={() => setActiveVaultFolderId(null)} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition text-neutral-400">
                     <ArrowLeft size={20} />
                   </button>
                )}
                <h2 className="text-2xl font-bold flex items-center gap-2">
                   {activeVaultFolderId ? (
                     <>
                        <FolderOpen size={24} className="text-green-500" />
                        {vaultTags.find((t: any) => t.id === activeVaultFolderId)?.name}
                     </>
                   ) : (
                     <>
                        <Folder size={24} className="text-green-500" />
                        Import from Asset Vault
                     </>
                   )}
                </h2>
              </div>
              <button onClick={() => { setIsVaultModalOpen(false); setActiveVaultFolderId(null); }} className="text-neutral-500 hover:text-white transition">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {!activeVaultFolderId ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   {vaultTags.length === 0 ? (
                      <p className="text-neutral-500 col-span-full">No folders found in your Vault.</p>
                   ) : (
                      vaultTags.map((tag: any) => {
                         const count = vaultAssets.filter((a: any) => a.tagId === tag.id).length;
                         return (
                            <div 
                              key={tag.id}
                              onClick={() => setActiveVaultFolderId(tag.id)}
                              className="bg-[#242424] border border-white/5 rounded-xl p-5 cursor-pointer hover:bg-[#2a2a2a] hover:border-green-500/50 transition-all group"
                            >
                               <Folder size={32} className="text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                               <h3 className="font-bold text-lg truncate">{tag.name}</h3>
                               <p className="text-xs text-neutral-500">{count} asset{count !== 1 && 's'}</p>
                            </div>
                         )
                      })
                   )}
                 </div>
              ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {vaultAssets.filter((a: any) => a.tagId === activeVaultFolderId).length === 0 ? (
                      <p className="text-neutral-500 col-span-full">This folder is empty.</p>
                   ) : (
                      vaultAssets.filter((a: any) => a.tagId === activeVaultFolderId).map((asset: any) => (
                         <div 
                           key={asset.id}
                           onClick={() => handleImportAsset(asset)}
                           className="bg-[#242424] rounded-xl overflow-hidden border border-white/5 hover:border-green-500/50 cursor-pointer group transition-all"
                         >
                            <div className="aspect-video bg-black relative">
                              {asset.type === 'image' ? (
                                 <img src={asset.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" />
                              ) : asset.type === 'video' ? (
                                 <img src={`https://img.youtube.com/vi/${asset.youtubeId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-neutral-500 group-hover:text-green-400 transition bg-[#181818]"><FileText size={32} /></div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-green-900/40 backdrop-blur-[2px] transition">
                                 <div className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl">Import to Project</div>
                              </div>
                            </div>
                            <div className="p-4">
                               <h3 className="font-semibold text-sm truncate">{asset.title}</h3>
                               <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">{asset.type}</p>
                            </div>
                         </div>
                      ))
                   )}
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SAVE TO VAULT MODAL */}
      {isSaveToVaultModalOpen && infoModalClip && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <form onSubmit={handleSaveToVaultSubmit} className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-green-500/30 flex flex-col relative">
            <button type="button" onClick={() => setIsSaveToVaultModalOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white transition">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
               <FolderPlus size={24} className="text-green-500" />
               <h2 className="text-xl font-bold">Save to Vault</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Asset Title</label>
                <input 
                  type="text" 
                  readOnly 
                  value={infoModalClip.title} 
                  className="w-full bg-[#242424] px-4 py-2.5 rounded-lg outline-none text-sm text-neutral-400 cursor-not-allowed border border-white/5"
                />
              </div>
              
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Select Vault Folder</label>
                <select 
                  required
                  value={saveVaultFolderId}
                  onChange={e => setSaveVaultFolderId(e.target.value)}
                  className="w-full bg-[#242424] px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm border border-white/5 appearance-none border-r-8 border-transparent"
                >
                  <option value="" disabled>Choose a folder...</option>
                  {vaultTags.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  <option value="new">+ Create New Folder...</option>
                </select>
              </div>

              {saveVaultFolderId === 'new' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">New Folder Name</label>
                  <input 
                    type="text"
                    required
                    autoFocus
                    value={saveVaultNewFolderName}
                    onChange={e => setSaveVaultNewFolderName(e.target.value)}
                    className="w-full bg-[#242424] border border-green-500/50 px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm"
                    placeholder="E.g. Background Music"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
               <button type="button" onClick={() => setIsSaveToVaultModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm transition">Cancel</button>
               <button type="submit" className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-500 font-bold text-sm transition shadow-lg shadow-green-500/20">Save Asset</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
