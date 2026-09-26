import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import YouTube from 'react-youtube';
import { Folder, FolderOpen, ArrowLeft, Plus, Image as ImageIcon, Video, FileText, Search, X, Trash2, ExternalLink, Play } from 'lucide-react';
import type { Asset, AssetTag, AssetType } from '../types';
import { extractVideoData } from '../utils';

export default function AssetManager() {
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('yt_assets');
    return saved ? JSON.parse(saved) : [];
  });
  const [tags, setTags] = useState<AssetTag[]>(() => {
    const saved = localStorage.getItem('yt_asset_tags');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('yt_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('yt_asset_tags', JSON.stringify(tags));
  }, [tags]);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | AssetType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Asset Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<AssetType>('video');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetStartTime, setNewAssetStartTime] = useState(0);
  const [newAssetEndTime, setNewAssetEndTime] = useState(10);
  const [newAssetTagId, setNewAssetTagId] = useState('');
  const [newAssetNewTagName, setNewAssetNewTagName] = useState('');

  // Video Preview & Timeline
  const [tempVideoId, setTempVideoId] = useState<string | null>(null);
  const [modalDuration, setModalDuration] = useState(100);
  const modalPlayerRef = React.useRef<any>(null);
  const [newAssetStartTimeStr, setNewAssetStartTimeStr] = useState("0:00");
  const [newAssetEndTimeStr, setNewAssetEndTimeStr] = useState("0:10");

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

  useEffect(() => setNewAssetStartTimeStr(formatTimeInput(newAssetStartTime)), [newAssetStartTime]);
  useEffect(() => setNewAssetEndTimeStr(formatTimeInput(newAssetEndTime)), [newAssetEndTime]);

  useEffect(() => {
    if (newAssetType === 'video' && newAssetUrl) {
      const data = extractVideoData(newAssetUrl);
      if (data && data.id) {
        setTempVideoId(data.id);
        setNewAssetStartTime(data.startTime || 0);
        setNewAssetEndTime((data.startTime || 0) + 10);
      } else {
        setTempVideoId(null);
      }
    } else {
      setTempVideoId(null);
    }
  }, [newAssetUrl, newAssetType]);

  // Viewer Modal
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetUrl.trim()) return alert("Please enter a URL");
    if (!newAssetTitle.trim()) return alert("Please enter a title");

    let finalTagId = newAssetTagId;
    if (finalTagId === 'new') {
      if (!newAssetNewTagName.trim()) return alert("Please enter a folder name");
      const newTag = { id: uuidv4(), name: newAssetNewTagName.trim() };
      setTags([...tags, newTag]);
      finalTagId = newTag.id;
    }

    if (!finalTagId) return alert("Please select or create a folder");

    let youtubeId;
    if (newAssetType === 'video') {
      const data = extractVideoData(newAssetUrl);
      if (!data || !data.id) return alert("Invalid YouTube URL");
      youtubeId = data.id;
    }

    const newAsset: Asset = {
      id: uuidv4(),
      type: newAssetType,
      url: newAssetUrl.trim(),
      title: newAssetTitle.trim(),
      tagId: finalTagId,
      addedAt: Date.now(),
      youtubeId,
      startTime: newAssetType === 'video' ? newAssetStartTime : undefined,
      endTime: newAssetType === 'video' ? newAssetEndTime : undefined,
    };

    setAssets([newAsset, ...assets]);
    setIsAddModalOpen(false);
    
    // Reset form
    setNewAssetUrl('');
    setNewAssetTitle('');
    setNewAssetTagId('');
    setNewAssetNewTagName('');
  };

  const handleDeleteAsset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this asset?")) {
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const handleDeleteFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this folder and ALL assets inside it?")) {
      setTags(tags.filter(t => t.id !== id));
      setAssets(assets.filter(a => a.tagId !== id));
    }
  };

  const filteredAssets = assets.filter(a => {
    if (activeFolderId && a.tagId !== activeFolderId) return false;
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-[#181818] border-b border-white/10 p-4 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-neutral-400 hover:text-white transition">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex items-center gap-2">
            <FolderOpen className="text-green-500" size={24} />
            <h1 className="text-xl font-bold tracking-tight">Asset Vault</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#242424] text-sm rounded-full pl-10 pr-4 py-2 outline-none focus:ring-1 focus:ring-green-500 w-48 md:w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-green-500/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Asset</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
        {!activeFolderId ? (
          // FOLDER GRID VIEW
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Folder size={24} className="text-neutral-400" /> My Folders
            </h2>
            {tags.length === 0 ? (
              <div className="text-center py-20 bg-[#181818] rounded-2xl border border-white/5 border-dashed">
                <FolderOpen size={48} className="mx-auto text-neutral-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No folders yet</h3>
                <p className="text-neutral-500 mb-6">Create a folder by adding your first asset.</p>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  Add Asset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {tags.map(tag => {
                  const assetCount = assets.filter(a => a.tagId === tag.id).length;
                  return (
                    <div 
                      key={tag.id}
                      onClick={() => setActiveFolderId(tag.id)}
                      className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-[#2a2a2a] hover:border-green-500/50 hover:shadow-[0_8px_24px_rgba(34,197,94,0.1)] transition-all group relative"
                    >
                      <button 
                        onClick={(e) => handleDeleteFolder(e, tag.id)}
                        className="absolute top-4 right-4 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                      <Folder size={40} className="text-green-500 mb-4 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg font-bold truncate pr-6">{tag.name}</h3>
                      <p className="text-sm text-neutral-500">{assetCount} asset{assetCount !== 1 && 's'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // ASSET GRID VIEW (Inside a Folder)
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveFolderId(null)}
                  className="p-2 hover:bg-[#242424] rounded-lg transition text-neutral-400 hover:text-white"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FolderOpen size={24} className="text-green-500" />
                  {tags.find(t => t.id === activeFolderId)?.name}
                </h2>
              </div>
              
              <div className="flex bg-[#1e1e1e] p-1 rounded-lg border border-white/10">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filterType === 'all' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilterType('video')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition ${filterType === 'video' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Video size={14}/> Video
                </button>
                <button 
                  onClick={() => setFilterType('image')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition ${filterType === 'image' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  <ImageIcon size={14}/> Photo
                </button>
                <button 
                  onClick={() => setFilterType('article')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition ${filterType === 'article' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  <FileText size={14}/> Article
                </button>
              </div>
            </div>

            {filteredAssets.length === 0 ? (
               <div className="text-center py-20 text-neutral-500">
                 No assets found matching your criteria.
               </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAssets.map(asset => (
                  <div 
                    key={asset.id}
                    onClick={() => setViewingAsset(asset)}
                    className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/10 hover:border-white/30 cursor-pointer group hover:-translate-y-1 transition-all flex flex-col"
                  >
                    <div className="aspect-video bg-black relative">
                      {asset.type === 'image' ? (
                         <img src={asset.url} alt={asset.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                      ) : asset.type === 'video' ? (
                         <>
                           <img src={`https://img.youtube.com/vi/${asset.youtubeId}/mqdefault.jpg`} alt={asset.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                             <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                               <Play size={16} fill="white" className="ml-1" />
                             </div>
                           </div>
                           <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10">
                              {formatTime(asset.startTime || 0)} - {formatTime(asset.endTime || 0)}
                           </div>
                         </>
                      ) : (
                         <div className="w-full h-full bg-[#181818] flex flex-col items-center justify-center text-neutral-500 group-hover:text-blue-400 transition">
                            <FileText size={32} className="mb-2 opacity-50 group-hover:opacity-100 transition" />
                         </div>
                      )}
                      
                      <div className="absolute top-2 right-2 flex gap-1">
                        <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] uppercase tracking-wider text-white">
                          {asset.type}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate mb-1" title={asset.title}>{asset.title}</h3>
                        <p className="text-xs text-neutral-500 truncate" title={asset.url}>{asset.url}</p>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteAsset(e, asset.id)}
                        className="text-neutral-600 hover:text-red-500 p-1 -mr-2 transition opacity-0 group-hover:opacity-100"
                        title="Delete Asset"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ADD ASSET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <form onSubmit={handleAddAsset} className="bg-[#1e1e1e] p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New Asset</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-neutral-500 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar pr-2 space-y-5">
              {/* Type Selection */}
              <div>
                <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider">Asset Type</label>
                <div className="flex gap-2 p-1 bg-[#242424] rounded-lg border border-white/5">
                  {(['video', 'image', 'article'] as AssetType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewAssetType(t)}
                      className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-md text-sm font-medium transition capitalize ${newAssetType === t ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                    >
                      {t === 'video' && <Video size={16} />}
                      {t === 'image' && <ImageIcon size={16} />}
                      {t === 'article' && <FileText size={16} />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Source URL</label>
                <input 
                  type="url"
                  required
                  value={newAssetUrl}
                  onChange={e => setNewAssetUrl(e.target.value)}
                  className="w-full bg-[#242424] px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm"
                  placeholder={newAssetType === 'video' ? "https://youtube.com/watch?v=..." : "https://..."}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Asset Title</label>
                <input 
                  type="text"
                  required
                  value={newAssetTitle}
                  onChange={e => setNewAssetTitle(e.target.value)}
                  className="w-full bg-[#242424] px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm"
                  placeholder="Give it a descriptive name"
                />
              </div>

              {/* Video Timestamps */}
              {newAssetType === 'video' && (
                <>
                  {tempVideoId && (
                     <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
                       <YouTube
                         videoId={tempVideoId}
                         opts={{
                           width: '100%',
                           height: '100%',
                           playerVars: { autoplay: 1, start: newAssetStartTime, controls: 0 }
                         }}
                         onReady={(e) => {
                           modalPlayerRef.current = e.target;
                           setModalDuration(e.target.getDuration());
                         }}
                         className="absolute top-0 left-0 w-full h-full pointer-events-none"
                         iframeClassName="w-full h-full"
                       />
                     </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Start Time</label>
                      <input 
                        type="text"
                        value={newAssetStartTimeStr}
                        onChange={e => {
                          setNewAssetStartTimeStr(e.target.value);
                          const parsed = parseTimeInput(e.target.value);
                          setNewAssetStartTime(parsed);
                          modalPlayerRef.current?.seekTo(parsed, true);
                        }}
                        onBlur={() => setNewAssetStartTimeStr(formatTimeInput(newAssetStartTime))}
                        className="w-full bg-[#242424] px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">End Time</label>
                      <input 
                        type="text"
                        value={newAssetEndTimeStr}
                        onChange={e => {
                          setNewAssetEndTimeStr(e.target.value);
                          setNewAssetEndTime(parseTimeInput(e.target.value));
                        }}
                        onBlur={() => setNewAssetEndTimeStr(formatTimeInput(newAssetEndTime))}
                        className="w-full bg-[#242424] px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm font-mono"
                      />
                    </div>
                  </div>

                  {tempVideoId && (
                    <div className="pt-2">
                      <p className="text-xs text-neutral-400 mb-2">Adjust Timeline</p>
                      <div className="flex gap-2">
                        <input 
                          type="range" 
                          min="0" max={modalDuration || 100} 
                          value={newAssetStartTime} 
                          onChange={e => {
                             const v = Number(e.target.value);
                             if (v < newAssetEndTime) {
                                setNewAssetStartTime(v);
                                modalPlayerRef.current?.seekTo(v, true);
                             }
                          }}
                          className="w-full accent-green-500"
                        />
                        <input 
                          type="range" 
                          min="0" max={modalDuration || 100} 
                          value={newAssetEndTime} 
                          onChange={e => {
                             const v = Number(e.target.value);
                             if (v > newAssetStartTime) setNewAssetEndTime(v);
                          }}
                          className="w-full accent-green-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Folder/Tag Selection */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Folder (Tag)</label>
                <select 
                  value={newAssetTagId}
                  onChange={e => setNewAssetTagId(e.target.value)}
                  required
                  className="w-full bg-[#242424] px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm appearance-none border-r-8 border-transparent"
                >
                  <option value="" disabled>Select a folder...</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  <option value="new">+ Create New Folder...</option>
                </select>
              </div>

              {newAssetTagId === 'new' && (
                <div>
                  <input 
                    type="text"
                    required
                    value={newAssetNewTagName}
                    onChange={e => setNewAssetNewTagName(e.target.value)}
                    className="w-full bg-[#242424] border border-green-500/30 px-4 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-sm"
                    placeholder="New folder name"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0">
               <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm transition">Cancel</button>
               <button type="submit" className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-500 font-medium text-sm transition shadow-lg shadow-green-500/20">Save Asset</button>
            </div>
          </form>
        </div>
      )}

      {/* ASSET VIEWER MODAL */}
      {viewingAsset && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col z-50 animate-in fade-in">
           <header className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
             <div>
               <h2 className="text-xl font-bold">{viewingAsset.title}</h2>
               <p className="text-sm text-neutral-400">{viewingAsset.url}</p>
             </div>
             <button onClick={() => setViewingAsset(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
               <X size={24} />
             </button>
           </header>
           
           <div className="flex-1 w-full flex items-center justify-center p-4 pt-20 pb-10">
              {viewingAsset.type === 'video' && viewingAsset.youtubeId ? (
                 <div className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl">
                    <YouTube
                      videoId={viewingAsset.youtubeId}
                      opts={{
                        width: '100%',
                        height: '100%',
                        playerVars: { 
                          autoplay: 1,
                          start: viewingAsset.startTime || 0,
                          ...(viewingAsset.endTime ? { end: viewingAsset.endTime } : {})
                        }
                      }}
                      className="w-full h-full"
                      iframeClassName="w-full h-full"
                    />
                 </div>
              ) : viewingAsset.type === 'image' ? (
                 <img src={viewingAsset.url} alt={viewingAsset.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              ) : viewingAsset.type === 'article' ? (
                 <div className="w-full max-w-5xl h-full bg-white rounded-xl overflow-hidden shadow-2xl relative">
                    <iframe 
                      src={viewingAsset.url} 
                      title={viewingAsset.title} 
                      className="w-full h-full border-none"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                    <div className="absolute bottom-6 right-6 bg-black/80 text-white px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-md shadow-2xl z-50">
                      <span className="text-sm font-medium">Refusing to connect?</span>
                      <a href={viewingAsset.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm transition font-bold shadow-lg shadow-green-500/30">
                         <ExternalLink size={16} /> Open in New Tab
                      </a>
                    </div>
                 </div>
              ) : null}
           </div>
        </div>
      )}
    </div>
  );
}
