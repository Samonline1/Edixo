import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Play, Plus, Trash2, X, FolderOpen } from 'lucide-react';
import type { ClipProject, ClipItem } from '../types';

export default function SequenceDashboard() {
  const [seqProjects, setSeqProjects] = useState<ClipProject[]>(() => {
    const saved = localStorage.getItem('yt_sequence_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [clipEditorProjects] = useState<ClipProject[]>(() => {
    const saved = localStorage.getItem('clip_projects');
    return saved ? JSON.parse(saved) : [];
  });

  const handleImportProject = (originalProject: ClipProject) => {
    const newSeqId = uuidv4();
    const newSeqProject: ClipProject = {
      id: newSeqId,
      name: `Sequence: ${originalProject.name}`,
      createdAt: Date.now()
    };

    // Copy clips
    const allClips: ClipItem[] = JSON.parse(localStorage.getItem('clip_items') || '[]');
    const projectClips = allClips.filter(c => c.projectId === originalProject.id);
    
    const newSeqClips = projectClips.map(c => ({
      ...c,
      id: uuidv4(),
      projectId: newSeqId
    }));

    const existingSeqClips = JSON.parse(localStorage.getItem('yt_sequence_clips') || '[]');
    localStorage.setItem('yt_sequence_clips', JSON.stringify([...newSeqClips, ...existingSeqClips]));

    const updated = [newSeqProject, ...seqProjects];
    setSeqProjects(updated);
    localStorage.setItem('yt_sequence_projects', JSON.stringify(updated));
    
    setIsImportModalOpen(false);
    navigate(`/sequence-studio/${newSeqId}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Delete this Sequence Project? (ClipEditor projects remain unaffected).")) {
      const updated = seqProjects.filter(p => p.id !== id);
      setSeqProjects(updated);
      localStorage.setItem('yt_sequence_projects', JSON.stringify(updated));
      
      const existingClips = JSON.parse(localStorage.getItem('yt_sequence_clips') || '[]');
      const updatedClips = existingClips.filter((c: any) => c.projectId !== id);
      localStorage.setItem('yt_sequence_clips', JSON.stringify(updatedClips));
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-neutral-400 hover:text-white transition">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Sequence Studio
            </h1>
          </div>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg shadow-purple-500/20"
          >
            <Plus size={20} /> New Sequence
          </button>
        </header>

        <p className="text-neutral-400 mb-8 text-lg">Select a sequence to edit, or import a new project from ClipEditor.</p>

        {seqProjects.length === 0 ? (
          <div className="text-center py-20 bg-[#181818] rounded-2xl border border-white/5 border-dashed">
            <Play size={48} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Sequences Yet</h3>
            <p className="text-neutral-500 mb-6">Create a sequence by importing clips from your ClipEditor.</p>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Import Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seqProjects.map(project => (
              <Link 
                key={project.id} 
                to={`/sequence-studio/${project.id}`}
                className="bg-[#1e1e1e] border border-white/10 rounded-xl p-6 hover:bg-[#2a2a2a] hover:border-purple-500/50 transition-all group relative block"
              >
                <button 
                  onClick={(e) => handleDelete(e, project.id)}
                  className="absolute top-4 right-4 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition z-10"
                >
                  <Trash2 size={18} />
                </button>
                <h3 className="text-xl font-bold mb-2 pr-8">{project.name}</h3>
                <p className="text-sm text-neutral-500">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-2xl shadow-2xl border border-white/10 flex flex-col h-[70vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
               <h2 className="text-xl font-bold flex items-center gap-2">
                 <FolderOpen size={24} className="text-blue-500" />
                 Import from ClipEditor
               </h2>
               <button onClick={() => setIsImportModalOpen(false)} className="text-neutral-500 hover:text-white transition">
                 <X size={24} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
               {clipEditorProjects.length === 0 ? (
                  <p className="text-neutral-500 text-center mt-10">No ClipEditor projects found. Go create one first!</p>
               ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {clipEditorProjects.map(p => (
                        <div 
                           key={p.id}
                           onClick={() => handleImportProject(p)}
                           className="bg-[#242424] border border-white/5 rounded-xl p-5 cursor-pointer hover:bg-[#2a2a2a] hover:border-blue-500/50 transition-all group"
                        >
                           <h3 className="font-bold text-lg mb-1 group-hover:text-blue-400 transition">{p.name}</h3>
                           <p className="text-xs text-neutral-500">Click to clone into Sequence Studio</p>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
