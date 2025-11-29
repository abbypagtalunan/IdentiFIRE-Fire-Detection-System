import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Flame, Play, Square } from 'lucide-react';
import { DetectionResults } from './DetectionResults';
import { detectFireInVideoFrame, checkApiHealth, DetectionResult } from './api';

export function CameraView() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [segmented, setSegmented] = useState<string | null>(null);
  const [landmark, setLandmark] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Assign stream to video when it changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Unable to access camera. Please enable permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsCameraActive(false);
    setIsAnalyzing(false);
    setResult(null);
    setSegmented(null);
    setLandmark(null);
  };

  const startAnalysis = () => setIsAnalyzing(true);
  const stopAnalysis = () => setIsAnalyzing(false);

  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isCameraActive && isAnalyzing) {
      interval = setInterval(async () => {
        const frame = captureFrame();
        if (!frame) return;

        try {
          const apiOK = await checkApiHealth();
          if (!apiOK) return;

          const detection = await detectFireInVideoFrame(frame, false);
          setResult(detection);
          setSegmented(detection.segmented_image || null);
          setLandmark(detection.landmark_image || null);
        } catch (err) {
          console.error('Frame processing failed:', err);
        }
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [isAnalyzing, isCameraActive]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white mb-2">Live Camera Fire Detection</h2>
          <p className="text-slate-400">Use your camera to detect fire in real-time</p>
        </div>
      </div>

      {/* CAMERA VIEW */}
      <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video">
        {!isCameraActive ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
            <CameraOff className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-6">Camera is not active</p>
            <button
              onClick={startCamera}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Start Camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {isAnalyzing && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm">Detection Active</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* CONTROLS */}
      {isCameraActive && (
        <div className="flex gap-3">
          <button
            onClick={stopCamera}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <CameraOff className="w-5 h-5" /> Stop Camera
          </button>

          {!isAnalyzing ? (
            <button
              onClick={startAnalysis}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" /> Start Detection
            </button>
          ) : (
            <button
              onClick={stopAnalysis}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" /> Stop Detection
            </button>
          )}
        </div>
      )}

      {/* RESULTS */}
      {result && (segmented || landmark) && (
        <div className="flex gap-4 mt-2 flex-wrap">
          {segmented && (
            <div>
              <h3 className="text-white mb-2">Segmented Mask</h3>
              <img src={`data:image/jpeg;base64,${segmented}`} className="max-w-[300px] rounded" />
            </div>
          )}
          {landmark && (
            <div>
              <h3 className="text-white mb-2">Landmarks</h3>
              <img src={`data:image/jpeg;base64,${landmark}`} className="max-w-[300px] rounded" />
            </div>
          )}
        </div>
      )}

      {result && isAnalyzing && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <DetectionResults result={result} showResetButton={false} />
        </div>
      )}
    </div>
  );
}
