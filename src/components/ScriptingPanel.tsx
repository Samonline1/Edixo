import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Check, ArrowRight, ArrowLeft, List, FileText } from 'lucide-react';

export interface ScriptTask {
  id: string;
  index: number;
  title: string;
  completed: boolean;
  notes: string;
}

interface ScriptingPanelProps {
  identifier: string; // Used as the localstorage prefix suffix
  accentColor?: string; // e.g. 'purple', 'pink', 'blue' - defaults to purple
}

export default function ScriptingPanel({ identifier, accentColor = 'purple' }: ScriptingPanelProps) {
  const [scriptTasks, setScriptTasks] = useState<ScriptTask[]>(() => {
    const saved = localStorage.getItem(`yt_seq_scripts_${identifier}`);
    if (saved) return JSON.parse(saved);
    return [];
  });
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Save scripting tasks
  useEffect(() => {
    if (identifier) {
      localStorage.setItem(`yt_seq_scripts_${identifier}`, JSON.stringify(scriptTasks));
    }
  }, [scriptTasks, identifier]);

  const handleImportScript = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    const newTasks: ScriptTask[] = [];
    let currentTask: ScriptTask | null = null;
    let nextIdx = scriptTasks.length > 0 ? Math.max(...scriptTasks.map(t => t.index)) + 1 : 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.startsWith('*')) {
        if (currentTask) {
          newTasks.push(currentTask);
        }
        currentTask = {
          id: uuidv4(),
          index: nextIdx++,
          title: line.substring(1).trim(),
          completed: false,
          notes: ''
        };
      } else {
        if (currentTask) {
          currentTask.notes += `<p>${line}</p>`;
        }
      }
    }
    if (currentTask) {
      newTasks.push(currentTask);
    }

    setScriptTasks([...scriptTasks, ...newTasks]);
    setIsImportModalOpen(false);
    setImportText('');
  };

  // Color classes mapping
  const colors = {
    purple: {
      text: 'text-purple-400',
      bgHover: 'hover:bg-purple-500',
      bgBase: 'bg-purple-600',
      border: 'focus:border-purple-500',
      borderHover: 'hover:border-purple-400'
    },
    pink: {
      text: 'text-pink-400',
      bgHover: 'hover:bg-pink-500',
      bgBase: 'bg-pink-600',
      border: 'focus:border-pink-500',
      borderHover: 'hover:border-pink-400'
    },
    blue: {
      text: 'text-blue-400',
      bgHover: 'hover:bg-blue-500',
      bgBase: 'bg-blue-600',
      border: 'focus:border-blue-500',
      borderHover: 'hover:border-blue-400'
    }
  };

  const theme = colors[accentColor as keyof typeof colors] || colors.purple;

  return (
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
                className={`flex-1 bg-[#141414] border border-white/10 px-3 py-1.5 rounded text-sm text-white outline-none ${theme.border}`}
              />
              <button type="submit" className={`p-2 ${theme.bgBase} ${theme.bgHover} text-white rounded shrink-0`}>
                <Plus size={16} />
              </button>
              <button 
                type="button" 
                onClick={() => setIsImportModalOpen(true)}
                className="p-2 bg-[#2a2a2a] hover:bg-[#333] text-neutral-400 hover:text-white rounded shrink-0 transition"
                title="Import Script"
              >
                <FileText size={16} />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {[...scriptTasks].sort((a,b) => (a.completed === b.completed ? a.index - b.index : a.completed ? 1 : -1)).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2 bg-[#1e1e1e] hover:bg-[#242424] rounded-lg mb-1 group transition">
                <button 
                  onClick={() => setScriptTasks(scriptTasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                  className={`w-5 h-5 flex items-center justify-center rounded border shrink-0 transition-colors ${task.completed ? `${theme.bgBase} border-transparent text-white` : `border-neutral-500 text-neutral-400 ${theme.borderHover}`}`}
                >
                  {task.completed ? <Check size={12} strokeWidth={4} /> : <span className="text-[10px] font-bold">{task.index}</span>}
                </button>
                <span className={`flex-1 text-sm truncate transition-opacity ${task.completed ? 'text-neutral-500 line-through opacity-70' : 'text-neutral-200'}`}>
                  {task.title}
                </span>
                <button 
                  onClick={() => setActiveTaskId(task.id)}
                  className={`text-neutral-500 ${theme.text} transition p-1 opacity-0 group-hover:opacity-100 shrink-0`}
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
                   const newHTML = e.currentTarget.innerHTML;
                   setScriptTasks(scriptTasks.map(t => t.id === activeTaskId ? { ...t, notes: newHTML } : t));
                 }}
                 dangerouslySetInnerHTML={{ __html: currentTask.notes }}
               />
            </div>
          </div>
        );
      })()}

      {/* IMPORT SCRIPT MODAL */}
      {isImportModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col h-[80%]">
            <h2 className="text-xl font-bold mb-2">Import Script</h2>
            <p className="text-xs text-neutral-400 mb-4">
              Paste your script. Lines starting with <code>*</code> become Tasks. Everything below them becomes Notes.
            </p>
            
            <textarea 
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={"* Hook\n- Say something catchy\n\n* Main Body\n- Point 1\n- Point 2"}
              className="flex-1 bg-[#141414] border border-white/10 rounded-lg p-3 text-sm text-neutral-300 outline-none focus:border-blue-500 custom-scrollbar resize-none"
            />
            
            <div className="mt-4 flex justify-end gap-3 shrink-0">
               <button 
                 onClick={() => setIsImportModalOpen(false)} 
                 className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm transition"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleImportScript} 
                 className={`px-6 py-2 ${theme.bgBase} ${theme.bgHover} rounded-lg font-medium text-sm transition`}
               >
                 Done
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
