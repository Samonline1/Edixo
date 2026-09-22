import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import YouTube from 'react-youtube';
import { Search, Plus, Play, Tag as TagIcon, X, Info, Trash2, FastForward, Rewind, Pause, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { VideoItem, Tag } from '../types';
import { extractVideoData } from '../utils';
import '../App.css';

function VideoManager() {
  // State
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    const saved = localStorage.getItem('yt_manager_videos');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [tags, setTags] = useState<Tag[]>(() => {
    const saved = localStorage.getItem('yt_manager_tags');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // UI State
  const [inputUrl, setInputUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  
  // Modals
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [activeVideoForTags, setActiveVideoForTags] = useState<string | null>(null);
  
  const [infoModalVideo, setInfoModalVideo] = useState<VideoItem | null>(null);
  
  // Player State
  const playerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerState, setPlayerState] = useState(-1); // -1: unstarted, 1: playing, 2: paused

  // Keyboard controls & Progress Polling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA'
        ) return;
        
        e.preventDefault();
        
        if (playerRef.current) {
          const state = playerRef.current.getPlayerState();
          if (state === 1) playerRef.current.pauseVideo();
          else playerRef.current.playVideo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Progress Polling
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getPlayerState() === 1) {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        setDuration(playerRef.current.getDuration() || 0);
      }
    }, 500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  // Persistence
  useEffect(() => localStorage.setItem('yt_manager_videos', JSON.stringify(videos)), [videos]);
  useEffect(() => localStorage.setItem('yt_manager_tags', JSON.stringify(tags)), [tags]);

  // Handlers
  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const { id: ytId, startTime } = extractVideoData(inputUrl);
    
    if (!ytId) return alert("Invalid YouTube URL");
    if (videos.some(v => v.youtubeId === ytId)) {
      alert("Video already added!");
      setInputUrl('');
      return;
    }

    const newVideo: VideoItem = {
      id: uuidv4(),
      youtubeId: ytId,
      url: inputUrl,
      tags: [],
      addedAt: Date.now(),
      startTime: startTime
    };

    setVideos(prev => [newVideo, ...prev]);
    setInputUrl('');
    if (!currentVideo) {
      setCurrentVideo(newVideo);
      setIsVideoPlaying(false);
    }
  };

  const handlePlayVideo = (video: VideoItem) => {
    if (currentVideo?.id === video.id) return;
    setCurrentVideo(video);
    setIsVideoPlaying(false);
    setCurrentTime(0);
  };

  const handleRemoveVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    if (currentVideo?.id === id) {
      setCurrentVideo(null);
      setIsVideoPlaying(false);
    }
    setInfoModalVideo(null);
  };

  // Tag Handlers
  const [newTagName, setNewTagName] = useState('');
  const handleCreateAndAssignTag = () => {
    if (!newTagName.trim() || !activeVideoForTags) return;
    let tag = tags.find(t => t.name.toLowerCase() === newTagName.toLowerCase());
    if (!tag) {
      tag = { id: uuidv4(), name: newTagName.trim() };
      setTags([...tags, tag]);
    }
    setVideos(prev => prev.map(v => {
      if (v.id === activeVideoForTags && !v.tags.includes(tag!.id)) {
        return { ...v, tags: [...v.tags, tag!.id] };
      }
      return v;
    }));
    setNewTagName('');
  };

  const handleToggleTagOnVideo = (tagId: string) => {
    if (!activeVideoForTags) return;
    setVideos(prev => prev.map(v => {
      if (v.id === activeVideoForTags) {
        if (v.tags.includes(tagId)) return { ...v, tags: v.tags.filter(id => id !== tagId) };
        else return { ...v, tags: [...v.tags, tagId] };
      }
      return v;
    }));
  };

  // Player Controls from Sidebar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
    }
  };
  
  const skipTime = (amount: number) => {
    if (playerRef.current) {
      const newTime = currentTime + amount;
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    }
  };
  
  const togglePlay = () => {
    if (playerRef.current) {
      const state = playerRef.current.getPlayerState();
      if (state === 1) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
    }
  };

  // Derived State
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesSearch = v.url.toLowerCase().includes(searchQuery.toLowerCase()) || v.youtubeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = filterTagId ? v.tags.includes(filterTagId) : true;
      return matchesSearch && matchesTag;
    });
  }, [videos, searchQuery, filterTagId]);

  const opts: any = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0, 
      modestbranding: 1,
      rel: 0,
      disablekb: 1,
      iv_load_policy: 3,
      cc_load_policy: 0,
      start: currentVideo?.startTime || 0,
    },
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-[#121212] text-white overflow-hidden font-sans">
      
      {/* VIDEO CANVAS (Top on mobile, Left on desktop) */}
      <div className="w-full flex-none aspect-video md:aspect-auto md:w-3/4 md:h-full relative bg-black flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.5)] md:shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-10">
        {currentVideo ? (
          <div className="w-full h-full relative overflow-hidden">
            <YouTube
              videoId={currentVideo.youtubeId}
              opts={opts}
              onReady={(e) => { 
                playerRef.current = e.target;
                setDuration(e.target.getDuration());
              }}
              onStateChange={(e) => {
                setPlayerState(e.data);
                if (e.data === 1) setIsVideoPlaying(true);
                if (e.data === 1 || e.data === 2) {
                  setDuration(e.target.getDuration());
                }
              }}
              className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-1000 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`} 
              iframeClassName="w-full h-full"
            />
          </div>
        ) : (
          <div className="text-neutral-500 flex flex-col items-center gap-4 p-4 text-center">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-neutral-900 flex items-center justify-center">
              <Play size={32} className="ml-1 md:ml-2" />
            </div>
            <p className="text-base md:text-lg tracking-wide font-light">Select a video to play</p>
          </div>
        )}
      </div>

      {/* MANAGER PANEL (Bottom on mobile, Right on desktop) */}
      <div className="flex-1 w-full md:w-1/4 md:h-full bg-[#181818] flex flex-col z-20 min-h-0">
        
        {/* Top Controls */}
        <div className="p-5 border-b border-white/5 space-y-4">
          <Link to="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition w-max mb-2">
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Home</span>
          </Link>
          
          <form onSubmit={handleAddVideo} className="flex gap-2 relative group">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube Link..."
              className="flex-1 bg-[#242424] text-sm rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-yt-red transition-all shadow-inner"
            />
            <button type="submit" className="bg-yt-red p-3 rounded-lg hover:bg-red-600 transition shadow-lg shadow-yt-red/20 active:scale-95">
              <Plus size={20} />
            </button>
          </form>

          <div className="flex gap-2 relative">
             <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-[#242424] text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-neutral-500 transition-all"
                />
             </div>
             
             <select 
               value={filterTagId || ''} 
               onChange={(e) => setFilterTagId(e.target.value || null)}
               className="bg-[#242424] text-sm rounded-lg px-3 py-2 outline-none cursor-pointer hover:bg-[#2a2a2a] transition-all"
             >
               <option value="">All Tags</option>
               {tags.map(tag => (
                 <option key={tag.id} value={tag.id}>{tag.name}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredVideos.map(video => {
            const isActive = currentVideo?.id === video.id;
            return (
              <div 
                key={video.id}
                onClick={() => handlePlayVideo(video)}
                className={`p-3 rounded-xl cursor-pointer group transition-all duration-300 ${
                  isActive 
                    ? 'bg-[#2a2a2a] shadow-lg ring-1 ring-yt-red/50' 
                    : 'bg-[#202020] hover:bg-[#2a2a2a] hover:shadow-md'
                }`}
              >
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-3">
                  <img 
                    src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                    alt="Thumbnail"
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-50' : 'opacity-80 group-hover:opacity-100'}`}
                  />
                  {isActive && isVideoPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-yt-red/90 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                        <Play size={20} fill="white" className="ml-1" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Custom active player controls inside the grid item */}
                {isActive && (
                  <div className="mb-3 p-3 bg-black/30 rounded-lg border border-white/5 cursor-default" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={togglePlay} className="text-white hover:text-yt-red transition">
                        {playerState === 1 ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                      </button>
                      <div className="flex gap-3">
                         <button onClick={() => skipTime(-10)} className="text-neutral-400 hover:text-white transition"><Rewind size={16} /></button>
                         <button onClick={() => skipTime(10)} className="text-neutral-400 hover:text-white transition"><FastForward size={16} /></button>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                    
                    <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
                      value={currentTime} 
                      onChange={handleSeek}
                      className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-yt-red"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center px-1">
                  <div className="flex flex-wrap gap-1">
                    {video.tags.length > 0 ? (
                      video.tags.map(tid => {
                        const t = tags.find(tag => tag.id === tid);
                        return t ? <span key={tid} className="text-[10px] bg-yt-red/20 text-red-200 px-2 py-0.5 rounded-full">{t.name}</span> : null;
                      })
                    ) : (
                      <span className="text-[10px] text-neutral-500">Untagged</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVideoForTags(video.id);
                        setIsTagModalOpen(true);
                      }}
                      className="text-neutral-500 hover:text-white transition p-1 rounded-full hover:bg-white/10"
                      title="Manage Tags"
                    >
                      <TagIcon size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoModalVideo(video);
                      }}
                      className="text-neutral-500 hover:text-white transition p-1 rounded-full hover:bg-white/10"
                      title="Video Info"
                    >
                      <Info size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredVideos.length === 0 && (
            <div className="text-center text-sm text-neutral-500 mt-10">
              No videos found.
            </div>
          )}
        </div>
      </div>

      {/* INFO MODAL (Blurred & Centered) */}
      {infoModalVideo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] p-8 rounded-2xl w-[500px] max-w-[90%] shadow-2xl border border-white/10 relative">
            <button onClick={() => setInfoModalVideo(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white transition">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 text-white">Video Details</h2>
            
            <div className="space-y-4 text-sm text-neutral-300">
              <div>
                <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Source URL</p>
                <a href={infoModalVideo.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
                  {infoModalVideo.url}
                </a>
              </div>
              <div>
                <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Added On</p>
                <p>{new Date(infoModalVideo.addedAt).toLocaleString()}</p>
              </div>
              {infoModalVideo.startTime && (
                 <div>
                  <p className="text-neutral-500 mb-1 text-xs uppercase tracking-wider">Start Time</p>
                  <p>{formatTime(infoModalVideo.startTime)}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
               <button 
                 onClick={() => handleRemoveVideo(infoModalVideo.id)}
                 className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
               >
                 <Trash2 size={16} />
                 Remove Video
               </button>
            </div>
          </div>
        </div>
      )}

      {/* TAG MODAL */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl w-96 max-w-[90%] shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Manage Tags</h3>
              <button onClick={() => { setIsTagModalOpen(false); setActiveVideoForTags(null); }} className="text-neutral-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="flex-1 bg-[#2a2a2a] text-sm rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-yt-red transition"
                onKeyDown={(e) => { if(e.key === 'Enter') handleCreateAndAssignTag(); }}
              />
              <button onClick={handleCreateAndAssignTag} className="bg-yt-red px-4 font-medium rounded-lg hover:bg-red-600 transition shadow-lg shadow-red-500/20 text-sm">
                Add
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {tags.map(tag => {
                const isAssigned = videos.find(v => v.id === activeVideoForTags)?.tags.includes(tag.id);
                return (
                  <label key={tag.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${isAssigned ? 'bg-yt-red/10 border-yt-red/30' : 'bg-[#2a2a2a] border-transparent hover:bg-[#333]'}`}>
                    <input 
                      type="checkbox" 
                      checked={isAssigned || false}
                      onChange={() => handleToggleTagOnVideo(tag.id)}
                      className="accent-yt-red w-4 h-4 rounded-full"
                    />
                    <span className="text-sm font-medium">{tag.name}</span>
                  </label>
                )
              })}
              {tags.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">No tags exist yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoManager;
