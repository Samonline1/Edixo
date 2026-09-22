import React from 'react';
import { Link } from 'react-router-dom';
import { PlaySquare, Edit3, Settings } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#121212] text-white p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Creator Tools</h1>
        <p className="text-neutral-400 mb-10">Select a tool to get started.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* App 1: Video Manager */}
          <Link to="/video-manager" className="block group">
            <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-[#2a2a2a] hover:border-yt-red/50 hover:shadow-[0_0_20px_rgba(255,0,0,0.1)] h-full flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-yt-red/10 text-yt-red flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PlaySquare size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">StreamCraft</h2>
              <p className="text-sm text-neutral-400 flex-grow">
                Manage, tag, and instantly preview YouTube videos in a sleek split-screen interface without leaving the app.
              </p>
            </div>
          </Link>

          {/* App 2: Clip Editor */}
          <Link to="/clip-editor" className="block group">
            <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-[#2a2a2a] hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] h-full flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Edit3 size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">ClipEditor</h2>
              <p className="text-sm text-neutral-400 flex-grow">
                Create and manage precise video clips and loops from YouTube URLs, organized into projects.
              </p>
            </div>
          </Link>

          {/* Placeholder App 3 */}
          <div className="bg-[#1e1e1e]/50 border border-white/5 rounded-2xl p-6 opacity-60 cursor-not-allowed h-full flex flex-col">
             <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6">
                <Settings size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">ThumbnailGen (Coming Soon)</h2>
              <p className="text-sm text-neutral-400 flex-grow">
                Generate engaging YouTube thumbnails automatically from your video tags and titles.
              </p>
          </div>
        </div>
      </div>
    </div>
  );
}
