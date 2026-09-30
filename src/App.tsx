import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VideoManager from './pages/VideoManager';
import ClipEditorProjects from './pages/ClipEditorProjects';
import ClipEditorWorkspace from './pages/ClipEditorWorkspace';
import AssetManager from './pages/AssetManager';
import SequenceDashboard from './pages/SequenceDashboard';
import SequenceWorkspace from './pages/SequenceWorkspace';
import ShortsDashboard from './pages/ShortsDashboard';
import ShortsWorkspace from './pages/ShortsWorkspace';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/video-manager" element={<VideoManager />} />
        <Route path="/clip-editor" element={<ClipEditorProjects />} />
        <Route path="/clip-editor/:projectId" element={<ClipEditorWorkspace />} />
        <Route path="/asset-vault" element={<AssetManager />} />
        <Route path="/sequence-studio" element={<SequenceDashboard />} />
        <Route path="/sequence-studio/:projectId" element={<SequenceWorkspace />} />
        <Route path="/shorts-maker" element={<ShortsDashboard />} />
        <Route path="/shorts-maker/editor/:templateId" element={<ShortsWorkspace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
