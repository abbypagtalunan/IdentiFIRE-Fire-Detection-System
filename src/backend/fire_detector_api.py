from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import threading
import smtplib
# import playsound

app = Flask(__name__)
CORS(app, origins="http://localhost:3000")  # Allow your React frontend

# ===============================
# GLOBAL ALERT STATES
# ===============================
Alarm_Status = False
Email_Status = False
Fire_Reported = 0

# ===============================
# EMAIL CONFIG
# ===============================
EMAIL_CONFIG = {
    'recipient': 'Enter_Recipient_Email',
    'sender': 'Enter_Your_Email',
    'password': 'Enter_Your_Email_Password'
}

# ===============================
# ALERT FUNCTIONS
# ===============================
def play_alarm_sound_function():
    print("Alarm triggered (sound disabled)")
    # playsound.playsound('alarm_sound.mp3')

def send_email_alert():
    """Send email notification when fire is detected"""
    global Email_Status
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_CONFIG['sender'], EMAIL_CONFIG['password'])
        server.sendmail(
            EMAIL_CONFIG['sender'],
            EMAIL_CONFIG['recipient'],
            "Warning: A Fire Incident Has Been Detected!"
        )
        print(f"Email sent to {EMAIL_CONFIG['recipient']}")
        server.quit()
        Email_Status = True
    except Exception as e:
        print(f"Email error: {e}")

# ===============================
# HELPER FUNCTION TO ENCODE IMAGE
# ===============================
def encode_image_to_base64(image):
    _, buffer = cv2.imencode('.jpg', image)
    return base64.b64encode(buffer).decode('utf-8')

# ===============================
# FIRE DETECTION LOGIC
# ===============================
def detect_fire_in_frame(frame):
    global Alarm_Status, Email_Status, Fire_Reported

    # Resize and preprocess
    frame = cv2.resize(frame, (960, 540))
    blur = cv2.GaussianBlur(frame, (21, 21), 0)
    hsv = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)

    # Fire color range
    lower = np.array([10, 150, 150]) #Tighten the HSV range for FIRE
    upper = np.array([35, 255, 255]) #Tighten the HSV range for FIRE
    lower = np.array(lower, dtype="uint8")
    upper = np.array(upper, dtype="uint8")

    # Mask and segmented output
    mask = cv2.inRange(hsv, lower, upper)
    output = cv2.bitwise_and(frame, frame, mask=mask)
    red_pixels = int(cv2.countNonZero(mask))

    # Contour detection
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    locations = []
    landmarks = []

    # Threshold per contour for visual fire highlighting
    FIRE_AREA_THRESHOLD = 500  # area in pixels
    FIRE_PIXEL_THRESHOLD = 300  # red pixels per contour

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < FIRE_AREA_THRESHOLD:
            continue

        # Bounding rectangle
        x, y, w, h = cv2.boundingRect(cnt)
        locations.append({"x": x, "y": y, "width": w, "height": h})

        # Count red pixels in this contour
        contour_mask = np.zeros_like(mask)
        cv2.drawContours(contour_mask, [cnt], -1, 255, -1)
        red_in_contour = cv2.countNonZero(cv2.bitwise_and(mask, mask, mask=contour_mask))

        # Only draw rectangles / crosses if fire intensity is high
        if red_in_contour >= FIRE_PIXEL_THRESHOLD:
            # Black rectangle around detected fire
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 0), 3)

            # 1. Red dot landmark (center)
            M = cv2.moments(cnt)
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                cv2.circle(frame, (cx, cy), 7, (0, 0, 255), -1)
                landmarks.append({"x": cx, "y": cy, "color": "red"})

            # 2. Mathematical landmarks → Black crosses
            hull = cv2.convexHull(cnt)
            for p in hull:
                px, py = p[0]
                cv2.drawMarker(frame, (px, py), (0, 0, 0),
                               markerType=cv2.MARKER_CROSS,
                               markerSize=20, thickness=2)

            # Extreme points
            left = tuple(cnt[cnt[:, :, 0].argmin()][0])
            right = tuple(cnt[cnt[:, :, 0].argmax()][0])
            top = tuple(cnt[cnt[:, :, 1].argmin()][0])
            bottom = tuple(cnt[cnt[:, :, 1].argmax()][0])
            for point in [left, right, top, bottom]:
                cv2.drawMarker(frame, point, (0, 0, 0),
                               markerType=cv2.MARKER_CROSS,
                               markerSize=25, thickness=2)

            # 3. Pseudo-landmarks → Green dots
            for i in range(5):
                px = x + int(w * (i / 4))
                py = y + int(h * (i / 4))
                cv2.circle(frame, (px, py), 6, (0, 255, 0), -1)

    # Fire detection threshold
    if red_pixels > 15000:
        Fire_Reported += 1

    if Fire_Reported >= 1:
        if not Alarm_Status:
            threading.Thread(target=play_alarm_sound_function, daemon=True).start()
            Alarm_Status = True
        if not Email_Status:
            threading.Thread(target=send_email_alert, daemon=True).start()
            Email_Status = True

    fire_detected = Fire_Reported >= 1
    confidence = min(100, (red_pixels / 15000) * 100)

    return {
        "detected": fire_detected,
        "confidence": confidence,
        "red_pixel_count": red_pixels,
        "locations": locations,
        "landmarks": landmarks,
        "segmented_image": encode_image_to_base64(output),
        "landmark_image": encode_image_to_base64(frame),
        "timestamp": str(np.datetime64('now'))
    }


# ===============================
# API ENDPOINTS
# ===============================
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

@app.route('/api/detect/image', methods=['POST'])
def detect_image():
    try:
        data = request.get_json()
        image_data = data.get('image', '')
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        frame = cv2.imdecode(np.frombuffer(base64.b64decode(image_data), np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Invalid image"}), 400

        result = detect_fire_in_frame(frame)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/detect/video-frame', methods=['POST'])
def detect_video_frame():
    return detect_image()

@app.route('/api/config', methods=['POST'])
def update_config():
    data = request.get_json()
    EMAIL_CONFIG.update(data)
    return jsonify({"success": True})

# ===============================
# RUN SERVER
# ===============================
if __name__ == '__main__':
    print("Fire Detection API Running on port 3800…")
    app.run(host='0.0.0.0', port=3800, debug=True)
