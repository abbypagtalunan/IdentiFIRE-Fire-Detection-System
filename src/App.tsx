import { useState } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { VideoUpload } from './components/VideoUpload';
import { CameraView } from './components/CameraView';
import { Flame, Image, Video, Camera } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'camera'>('image');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 sticky top-0 z-10">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white">IdentiFIRE</h1>
              <p className="text-slate-400 text-sm">Fire Detection System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === 'image'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Image className="w-5 h-5" />
            <span>Image Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === 'video'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Video className="w-5 h-5" />
            <span>Video Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === 'camera'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Live Camera</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 backdrop-blur-sm">
          {activeTab === 'image' && <ImageUpload />}
          {activeTab === 'video' && <VideoUpload />}
          {activeTab === 'camera' && <CameraView />}
        </div>
      </main>
    </div>
  );
}
