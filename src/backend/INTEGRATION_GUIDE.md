# Fire Detection Integration Guide

## Overview

Your Python fire detection script has been integrated into the React web application through a Flask REST API. Here's how everything connects:

## Architecture

```
┌─────────────────┐      HTTP/REST API      ┌──────────────────┐
│  React Frontend │ ◄─────────────────────► │  Flask Backend   │
│   (Port 3000)   │      (JSON Data)        │   (Port 5000)    │
└─────────────────┘                         └──────────────────┘
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │  fire_detector   │
                                            │  (Your Python    │
                                            │   OpenCV Logic)  │
                                            └──────────────────┘
```

## Your Fire Detection Algorithm

Your original script (`fire-detector.py`) has been adapted into the Flask API:

### Key Components Integrated:

1. **Color-based Fire Detection (HSV)**
   - Lower bound: [18, 50, 50]
   - Upper bound: [35, 255, 255]
   - Detects yellow-orange-red flames

2. **Landmark Detection**
   - ✅ Anatomical landmarks (centroids) - Red dots
   - ✅ Mathematical landmarks (extreme points) - Black crosses
   - ✅ Pseudo-landmarks (grid points) - Green dots

3. **Contour Detection**
   - Minimum area: 500 pixels
   - Bounding box generation
   - Fire region identification

4. **Alert System**
   - Email notifications via SMTP
   - Threshold: 15,000 red pixels
   - Configurable email settings

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd src/backend
brew install python@3.11
python3.11 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt

python3 fire_detector_api.py
python3 -m pip install Flask
python3 -m pip install flask_cors
```

### 2. Configure Email Alerts

Edit `fire_detector_api.py`:

```python
EMAIL_CONFIG = {
    'recipient': 'alert-recipient@example.com',
    'sender': 'your-gmail@gmail.com',
    'password': 'your-app-password'  # Use Gmail App Password
}
```

**Gmail App Password Setup:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate a new app password for "Mail"
5. Use this password in the config

### 3. Start the Backend Server

```bash
python fire_detector_api.py
```

The API will start on `http://localhost:5000`

### 4. Start the React Frontend

In a new terminal:

```bash
# (in the root directory)
npm start
```

## How the Integration Works

### Image Upload Flow

1. User uploads an image through the React UI
2. Image is converted to base64 format
3. React sends POST request to `/api/detect/image`
4. Backend decodes the image
5. **Your fire detection algorithm processes the image**:
   - Applies Gaussian blur
   - Converts to HSV color space
   - Creates mask for fire colors
   - Detects contours and landmarks
   - Calculates fire probability
6. Results sent back to React as JSON
7. UI displays bounding boxes and landmarks

### Video/Camera Flow

1. User starts video upload or live camera
2. React captures frames every 2 seconds
3. Each frame sent to `/api/detect/video-frame`
4. **Your algorithm processes each frame**
5. Real-time results displayed on video overlay
6. Email alert triggered if fire detected

### API Endpoints

**POST** `/api/detect/image`
```json
{
  "image": "data:image/jpeg;base64,...",
  "sendAlert": true,
  "timestamp": "2025-11-29T..."
}
```

**POST** `/api/detect/video-frame`
```json
{
  "frame": "data:image/jpeg;base64,...",
  "sendAlert": false,
  "timestamp": "2025-11-29T..."
}
```

**Response Format:**
```json
{
  "detected": true,
  "confidence": 87,
  "locations": [
    {"x": 120, "y": 80, "width": 150, "height": 120}
  ],
  "landmarks": [
    {"type": "centroid", "x": 195, "y": 140},
    {"type": "extreme", "name": "left", "x": 120, "y": 150}
  ],
  "red_pixel_count": 18500,
  "timestamp": "2025-11-29T..."
}
```

## Features from Your Original Script

### ✅ Implemented
- HSV color-based fire detection
- Gaussian blur preprocessing
- Contour detection with minimum area threshold
- Bounding box generation
- Landmark detection (anatomical, mathematical, pseudo)
- Email alert system
- Real-time processing

### 🔧 Adapted for Web
- Changed from video file/webcam to API endpoints
- Frame-by-frame processing instead of continuous loop
- JSON response format for web compatibility
- CORS enabled for React integration

### 📝 Additional Features
- REST API architecture
- Health check endpoint
- Configurable email settings via API
- Mock detection fallback (when API is unavailable)
- Toggle between real API and mock mode

## Testing

### Test Backend Only

```bash
# Test health check
curl http://localhost:5000/api/health

# Test with a sample image (requires base64 encoded image)
curl -X POST http://localhost:5000/api/detect/image \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,...", "sendAlert": false}'
```

### Test Full Integration

1. Start both backend and frontend servers
2. Go to http://localhost:3000
3. Enable "Use Python API" checkbox
4. Upload an image with fire/flames
5. Click "Analyze Image"
6. Check if bounding boxes appear

## Troubleshooting

### "API not available, using mock detection"
- Make sure Flask backend is running on port 5000
- Check browser console for CORS errors
- Verify `API_URL` in `/components/api.js`

### Email not sending
- Use Gmail App Password, not regular password
- Enable 2-Step Verification first
- Check spam folder
- Verify SMTP settings

### Detection not working
- Check image format (JPG, PNG supported)
- Verify HSV color thresholds match your fire images
- Adjust `no_red > 15000` threshold if needed
- Check Flask console for error messages

## Customization

### Adjust Fire Detection Sensitivity

Edit `backend/fire_detector_api.py`:

```python
# Change color range
lower = np.array([18, 50, 50], dtype="uint8")  # Adjust these
upper = np.array([35, 255, 255], dtype="uint8") # values

# Change detection threshold
fire_detected = int(no_red) > 15000  # Lower = more sensitive
```

### Change Processing Interval

Edit `/components/CameraView.jsx`:

```javascript
// Process frames every 2 seconds
interval = setInterval(processFrame, 2000); // Change 2000ms
```

## Next Steps

- Add sound alerts (install playsound library)
- Store detection history in database
- Add user authentication
- Deploy to production server
- Add SMS alerts (Twilio integration)
