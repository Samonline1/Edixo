import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VideoManager from './pages/VideoManager';
import ClipEditorProjects from './pages/ClipEditorProjects';
import ClipEditorWorkspace from './pages/ClipEditorWorkspace';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/video-manager" element={<VideoManager />} />
        <Route path="/clip-editor" element={<ClipEditorProjects />} />
        <Route path="/clip-editor/:projectId" element={<ClipEditorWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
