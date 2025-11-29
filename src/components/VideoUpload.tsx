import { useState, useRef } from 'react';
import { Upload, Play, Pause, Flame, X } from 'lucide-react';
import { DetectionResult, detectFireInVideoFrame, checkApiHealth } from './api';
import { DetectionResults } from './DetectionResults';

export function VideoUpload() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedVideo(url);
      setResult(null);
      setIsAnalyzing(false);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const startAnalysis = () => {
    if (!videoRef.current) return;
    setIsAnalyzing(true);
    setResult(null);

    const interval = setInterval(async () => {
      if (!videoRef.current) return;

      // Capture current frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg');

      // Check API and send frame
      const apiAvailable = await checkApiHealth();
      if (!apiAvailable) {
        console.error('API not available');
        return;
      }

      try {
        const detectionResult = await detectFireInVideoFrame(frameBase64, false);
        setResult(detectionResult);
      } catch (error) {
        console.error('Error detecting fire in frame:', error);
      }
    }, 2000); // every 2 seconds

    return () => clearInterval(interval);
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
    setResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setSelectedVideo(url);
      setResult(null);
      setIsAnalyzing(false);
    }
  };

  const clearVideo = () => {
    setSelectedVideo(null);
    setResult(null);
    setIsPlaying(false);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white mb-2">Upload Video for Fire Detection</h2>
        <p className="text-slate-400">Upload a video to analyze for fire detection</p>
      </div>

      {!selectedVideo ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-orange-500 transition-colors cursor-pointer"
        >
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-2">Drag and drop a video here, or click to select</p>
          <p className="text-slate-500 text-sm">Supports: MP4, WebM, MOV</p>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-slate-900 rounded-lg overflow-hidden">
            <button
              onClick={clearVideo}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <video
              ref={videoRef}
              src={selectedVideo}
              className="w-full max-h-[500px] object-contain"
              onClick={togglePlayPause}
            />
            {result?.detected && result.locations.map((loc, idx) => (
              <div
                key={idx}
                className="absolute border-4 border-red-500 bg-red-500/10 animate-pulse"
                style={{
                  left: `${loc.x}px`,
                  top: `${loc.y}px`,
                  width: `${loc.w}px`,
                  height: `${loc.h}px`,
                }}
              >
                <div className="absolute -top-8 left-0 bg-red-500 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  Fire Detected
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={togglePlayPause}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isPlaying ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Play</>}
            </button>

            {!isAnalyzing ? (
              <button
                onClick={startAnalysis}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Flame className="w-5 h-5" /> Start Detection
              </button>
            ) : (
              <button
                onClick={stopAnalysis}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" /> Stop Detection
              </button>
            )}
          </div>
        </div>
      )}

      {result && isAnalyzing && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <DetectionResults result={result} showResetButton={false} />
          {result.segmented_image && (
            <img src={result.segmented_image} alt="Segmented" className="mt-4 w-full object-contain" />
          )}
          {result.landmark_image && (
            <img src={result.landmark_image} alt="Landmarks" className="mt-4 w-full object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
