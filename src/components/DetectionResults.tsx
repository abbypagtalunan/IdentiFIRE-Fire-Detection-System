import { AlertTriangle, CheckCircle, Flame, RotateCcw, Clock } from 'lucide-react';
import { DetectionResult } from './api';

interface DetectionResultsProps {
  result: DetectionResult;
  onReset?: () => void;
  showResetButton?: boolean;
}

export function DetectionResults({ result, onReset, showResetButton = true }: DetectionResultsProps) {
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      <div className={`p-6 rounded-lg border-2 ${
        result.detected
          ? 'bg-red-500/10 border-red-500'
          : 'bg-green-500/10 border-green-500'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {result.detected ? (
              <AlertTriangle className="w-8 h-8 text-red-500" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-500" />
            )}
            <div>
              <h3 className={result.detected ? 'text-red-500' : 'text-green-500'}>
                {result.detected ? 'Fire Detected!' : 'No Fire Detected'}
              </h3>

              {/* timestamp safe handling */}
              <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                <Clock className="w-4 h-4" />
                <span>{formatTimestamp(result.timestamp)}</span>
              </div>
            </div>
          </div>

          {showResetButton && onReset && (
            <button
              onClick={onReset}
              className="text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        {/* confidence + areas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Confidence Level</div>
            <div className="text-white">{result.confidence}%</div>
            <div className="mt-2 bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  result.detected ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Detection Areas</div>
            <div className="text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              {result.detected ? result.locations.length : 0}{' '}
              {result.locations.length === 1 ? 'area' : 'areas'}
            </div>
          </div>
        </div>

        {/* Show Segmented + Landmark Images */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {result.segmented_image && (
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <div className="text-slate-400 text-sm mb-2">Segmented Image</div>
              <img
                src={`data:image/jpeg;base64,${result.segmented_image}`}
                alt="Segmented Fire Mask"
                className="rounded-lg border border-slate-700"
              />
            </div>
          )}

          {result.landmark_image && (
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <div className="text-slate-400 text-sm mb-2">Landmark Overlay</div>
              <img
                src={`data:image/jpeg;base64,${result.landmark_image}`}
                alt="Landmark Image"
                className="rounded-lg border border-slate-700"
              />
            </div>
          )}
        </div>

        {result.detected && (
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-red-500 mb-1">Alert Recommendation</div>
                <p className="text-slate-300 text-sm">
                  Fire or smoke has been detected. Please take immediate action and ensure safety protocols are followed.
                  Contact emergency services if necessary.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
