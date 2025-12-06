import { useState, useRef } from 'react';
import { Upload, Flame, X } from 'lucide-react';
import { DetectionResults } from './DetectionResults';
import { detectFireInImage, DetectionResult } from './api';

export function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [segmented, setSegmented] = useState<string | null>(null);
  const [landmark, setLandmark] = useState<string | null>(null);
  const [showImage, setShowImage] = useState<'landmark' | 'segmented'>('landmark'); // default: landmark
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setResult(null);
      setSegmented(null);
      setLandmark(null);
      setShowImage('landmark');
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setResult(null);
    setSegmented(null);
    setLandmark(null);

    try {
      const detectionResult = await detectFireInImage(selectedImage, true);
      setResult(detectionResult);
      setSegmented(detectionResult.segmented_image || null);
      setLandmark(detectionResult.landmark_image || null);
      setShowImage('landmark'); 
    } catch (error) {
      console.error('Detection error:', error);
      alert(
        'Error detecting fire. Please make sure the backend API is running and CORS is configured correctly.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResult(null);
    setSegmented(null);
    setLandmark(null);
    setShowImage('landmark'); 
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white mb-2">Upload Image for Fire Detection</h2>
        <p className="text-slate-400">Upload an image to analyze for fire detection</p>
      </div>

      {/* Upload Area */}
      {!selectedImage && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith('image/'))
              handleFileSelect({ target: { files: [file] } } as any);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-orange-500 transition-colors cursor-pointer"
        >
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-2">Drag and drop an image here, or click to select</p>
          <p className="text-slate-500 text-sm">Supports: JPG, PNG, GIF</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Analysis & Results */}
      {selectedImage && (
        <div className="space-y-4">
          {/* Minimized original image */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden max-h-[150px]">
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 z-10 p-1 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Selected"
              className="w-full object-contain max-h-[150px]"
            />
          </div>

          {/* Analyze button: hide if results exist */}
          {!result && (
            <button
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-400 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5" />
                  Analyze Image
                </>
              )}
            </button>
          )}

          {/* Detection details */}
          {result && <DetectionResults result={result} onReset={() => setResult(null)} />}

          {/* Toggle and display segmented / landmark */}
          {(segmented || landmark) && (
            <div className="mt-4">
              {/* Toggle Buttons */}
              <div className="flex gap-4 mb-4 justify-center">
                {segmented && (
                  <button
                    className={`px-4 py-2 rounded-lg ${
                      showImage === 'segmented'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                    onClick={() => setShowImage('segmented')}
                  >
                    Segmented
                  </button>
                )}
                {landmark && (
                  <button
                    className={`px-4 py-2 rounded-lg ${
                      showImage === 'landmark'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                    onClick={() => setShowImage('landmark')}
                  >
                    Landmark
                  </button>
                )}
              </div>

              {/* Show Image */}
              <div className="flex justify-center">
                {showImage === 'segmented' && segmented && (
                  <img
                    src={`data:image/jpeg;base64,${segmented}`}
                    alt="Segmented"
                    className="w-full max-w-[800px] rounded-lg shadow-lg"
                  />
                )}
                {showImage === 'landmark' && landmark && (
                  <img
                    src={`data:image/jpeg;base64,${landmark}`}
                    alt="Landmarks"
                    className="w-full max-w-[800px] rounded-lg shadow-lg"
                  />
                )}
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
