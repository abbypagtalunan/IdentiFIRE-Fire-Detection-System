const API_URL = 'http://localhost:3800';

export interface DetectionResult {
  detected: boolean;
  confidence: number;

  // Python uses x, y, w, h 
  locations: Array<{ x: number; y: number; w: number; h: number }>;

  // Python returns mixed landmark types
  landmarks?: Array<{
    cx?: number;
    cy?: number;
    px?: number;
    py?: number;
    color?: string;
  }>;

  red_pixel_count?: number;

  // Backend may return null → must allow null
  segmented_image?: string | null;
  landmark_image?: string | null;

  // Python DOES NOT send timestamp → must be optional
  timestamp?: string;
}

/**
 * Check if the API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * Detect fire in an image
 */
export async function detectFireInImage(
  imageBase64: string,
  sendAlert: boolean = false
): Promise<DetectionResult> {
  const response = await fetch(`${API_URL}/api/detect/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageBase64,
      sendAlert,
      timestamp: new Date().toISOString(), // allowed even if backend doesn't use it
    }),
  });

  if (!response.ok) {
    throw new Error(`Image detection failed: ${response.status}`);
  }

  return await response.json();
}
/**
 * Detect fire in a video frame
 */
export async function detectFireInVideoFrame(
  frameBase64: string,
  sendAlert: boolean = false
): Promise<DetectionResult> {
  const response = await fetch(`${API_URL}/api/detect/video-frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frame: frameBase64,
      sendAlert,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Video frame detection failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Update email configuration
 */
export async function updateEmailConfig(config: {
  recipient?: string;
  sender?: string;
  password?: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('Config update failed');
  }

  return await response.json();
}
/**
 * Stop alarm sound
 */
export async function stopAlarm(): Promise<void> {
  const response = await fetch(`${API_URL}/api/stop-alarm`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error("Failed to stop alarm");
  }
}



