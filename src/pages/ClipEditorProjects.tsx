import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Plus, ArrowLeft, Folder, Trash2 } from 'lucide-react';
import type { ClipProject, ClipItem } from '../types';

export default function ClipEditorProjects() {
  const [projects, setProjects] = useState<ClipProject[]>(() => {
    const saved = localStorage.getItem('clip_projects');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [clips, setClips] = useState<ClipItem[]>(() => {
    const saved = localStorage.getItem('clip_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [newProjectName, setNewProjectName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('clip_projects', JSON.stringify(projects));
  }, [projects]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const newProject: ClipProject = {
      id: uuidv4(),
      name: newProjectName.trim(),
      createdAt: Date.now()
    };
    
    setProjects([newProject, ...projects]);
    setNewProjectName('');
    navigate(`/clip-editor/${newProject.id}`);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project and all its clips?")) {
      setProjects(projects.filter(p => p.id !== id));
      const remainingClips = clips.filter(c => c.projectId !== id);
      setClips(remainingClips);
      localStorage.setItem('clip_items', JSON.stringify(remainingClips));
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition w-max mb-6">
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Home</span>
        </Link>
        
        <h1 className="text-3xl font-bold mb-8">Clip Projects</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {projects.map(project => {
            const projectClipsCount = clips.filter(c => c.projectId === project.id).length;
            return (
              <Link 
                key={project.id} 
                to={`/clip-editor/${project.id}`}
                className="bg-[#1e1e1e] border border-white/5 rounded-xl p-5 hover:bg-[#2a2a2a] hover:border-blue-500/30 transition-all group relative"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Folder size={20} />
                  </div>
                  <h2 className="text-lg font-semibold truncate flex-1">{project.name}</h2>
                </div>
                <p className="text-sm text-neutral-500">{projectClipsCount} clip{projectClipsCount !== 1 ? 's' : ''}</p>
                <p className="text-xs text-neutral-600 mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
                
                <button 
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  className="absolute top-4 right-4 text-neutral-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </Link>
            )
          })}
        </div>
        
        {projects.length === 0 && (
           <div className="text-center py-20 text-neutral-500 border border-dashed border-neutral-700 rounded-2xl mb-8">
             <Folder size={48} className="mx-auto mb-4 opacity-20" />
             <p>No projects yet. Create one below!</p>
           </div>
        )}

        {/* Add Project Form fixed at bottom or just below list */}
        <div className="mt-10 bg-[#1e1e1e] p-6 rounded-2xl border border-white/5 max-w-md">
          <h3 className="font-semibold mb-4">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project Name..."
              className="flex-1 bg-[#242424] text-sm rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <button type="submit" className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 transition font-medium flex items-center gap-1">
              <Plus size={16} /> Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
