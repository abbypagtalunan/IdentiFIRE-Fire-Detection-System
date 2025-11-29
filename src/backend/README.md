# Fire Detection Backend API

This is the Python backend that runs your fire detection algorithm.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure email settings in `fire_detector_api.py`:
```python
EMAIL_CONFIG = {
    'recipient': 'recipient@example.com',
    'sender': 'your-email@gmail.com',
    'password': 'your-app-password'
}
```

**Important for Gmail:**
- Use an App Password, not your regular Gmail password
- Enable 2-Step Verification in your Google Account
- Generate an App Password at: https://myaccount.google.com/apppasswords

## Run the Server

```bash
python fire_detector_api.py
```

The API will run on `http://localhost:5000`

## API Endpoints

### POST /api/detect/image
Detect fire in a single image
- Body: `{ "image": "base64_encoded_image", "sendAlert": true }`
- Returns: Detection results with bounding boxes and confidence

### POST /api/detect/video-frame
Detect fire in a video frame (for continuous detection)
- Body: `{ "frame": "base64_encoded_frame", "sendAlert": false }`
- Returns: Detection results

### GET /api/health
Check if the API is running

### POST /api/config
Update email configuration
- Body: `{ "recipient": "email", "sender": "email", "password": "password" }`

## How It Works

1. **Image Processing**: Uses OpenCV to process images/video frames
2. **Color Detection**: Detects fire based on HSV color range (yellow-orange-red)
3. **Landmark Detection**: Identifies fire regions with anatomical and mathematical landmarks
4. **Alerts**: Sends email notifications when fire is detected
5. **REST API**: Exposes detection functionality to the React frontend

## Integration with React Frontend

Update the API URL in your React components to point to `http://localhost:5000`
