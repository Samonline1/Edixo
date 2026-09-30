import { LayoutTemplate, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ShortsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-pink-500 flex items-center gap-3">
              <LayoutTemplate size={32} />
              Shorts Maker
            </h1>
            <p className="text-neutral-400 mt-2">Create high-retention vertical split-screen shorts.</p>
          </div>
          <Link to="/" className="text-neutral-400 hover:text-white flex items-center gap-2 transition bg-[#1e1e1e] px-4 py-2 rounded-lg">
            <ArrowLeft size={16} /> Back to Hub
          </Link>
        </header>

        <h2 className="text-xl font-bold mb-6">Select Layout</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 50/50 Layout Card */}
          <div 
            onClick={() => navigate('/shorts-maker/editor/50-50')}
            className="bg-[#181818] border border-white/5 hover:border-pink-500/50 hover:bg-[#1a1a1a] rounded-xl p-6 cursor-pointer transition-all group flex flex-col items-center"
          >
             <div className="w-24 h-40 rounded-lg border-2 border-neutral-700 group-hover:border-pink-500 overflow-hidden flex flex-col mb-4 transition-colors">
                <div className="flex-1 bg-neutral-800 group-hover:bg-pink-500/20 flex items-center justify-center text-[10px] text-neutral-500 font-bold">50%</div>
                <div className="flex-1 bg-neutral-900 group-hover:bg-pink-500/10 flex items-center justify-center text-[10px] text-neutral-500 font-bold border-t border-neutral-700 group-hover:border-pink-500">50%</div>
             </div>
             <h3 className="font-bold text-lg text-white">50/50 Split</h3>
             <p className="text-xs text-neutral-500 mt-1 text-center">Standard split screen for reaction/gameplay shorts.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
