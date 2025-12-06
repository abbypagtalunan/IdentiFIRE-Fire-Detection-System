from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import threading
import smtplib
import pygame

app = Flask(__name__)
CORS(app, origins="http://localhost:3000") 
pygame.mixer.init()

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
    global Alarm_Status

    try:
        pygame.mixer.music.load("alarm-sound.mp3")
        pygame.mixer.music.play(-1)   
        print("Alarm started")
    except Exception as e:
        print("Alarm load error:", e)

    Alarm_Status = True

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
# IMPROVED FIRE DETECTION LOGIC
# ===============================
previous_mask = None
fire_streak = 0

def detect_fire_in_frame(frame):
    global Alarm_Status, Email_Status, Fire_Reported

    # Resize (faster)
    frame = cv2.resize(frame, (960, 540))

    # -------------------------
    # 1. COLOR-BASED FIRE MASK
    # -------------------------
    blur = cv2.GaussianBlur(frame, (7, 7), 0)
    hsv = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)

    # Narrowed fire range
    lower_fire = np.array([5, 100, 180])
    upper_fire = np.array([30, 255, 255])
    mask_hsv = cv2.inRange(hsv, lower_fire, upper_fire)

    # -------------------------
    # 2. HEAT SIGNATURE MASK (YCrCb)
    # -------------------------
    ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
    Y, Cr, Cb = cv2.split(ycrcb)
    _, mask_hot = cv2.threshold(Cr, 160, 255, cv2.THRESH_BINARY)

    # -------------------------
    # 3. BRIGHTNESS MASK (Lab)
    # -------------------------
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(lab)
    _, mask_bright = cv2.threshold(L, 160, 255, cv2.THRESH_BINARY)


    # -------------------------
    # 4. COMBINE MASKS (FIRE ENERGY MAP)
    # -------------------------
    fire_energy = cv2.bitwise_and(mask_hsv, mask_hot)
    fire_energy = cv2.bitwise_and(fire_energy, mask_bright)

    # Morph closing to fill gaps
    kernel = np.ones((7, 7), np.uint8)
    fire_energy = cv2.morphologyEx(fire_energy, cv2.MORPH_CLOSE, kernel)

    red_pixels = cv2.countNonZero(fire_energy)

    # -------------------------
    # 5. FIRE DECISION
    # -------------------------
    contours, _ = cv2.findContours(fire_energy, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    detected_areas = []

    # Parameters (tweak if needed)
    MIN_AREA = 150                  # accept small flames
    MAX_AREA = 300000
    MAX_SOLIDITY = 0.92             # solidity > this likely non-fire (solid puppet/building)
    MIN_PERIM_AREA_RATIO = 0.18     # perimeter^2 / area (normalized) — fire is jaggy => higher
    MIN_EDGE_DENSITY = 0.02         # edges / area
    MIN_LOCAL_ENTROPY = 4.0         # local grayscale entropy
    MIN_RED_DOMINANCE = 0.08        # (R - G) / (R + 1) should be > this for fire

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < MIN_AREA or area > MAX_AREA:
            continue

        x, y, w, h = cv2.boundingRect(cnt)

        # Crop masks for analysis
        cnt_mask = np.zeros(fire_energy.shape, dtype=np.uint8)
        cv2.drawContours(cnt_mask, [cnt], -1, 255, -1)
        roi_mask = (cnt_mask[y:y+h, x:x+w] == 255).astype(np.uint8)

        # 1) Solidity (area / convex_hull_area)
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull) if len(hull) >= 3 else 0.0001
        solidity = float(area) / (hull_area + 1e-6)

        if solidity > MAX_SOLIDITY:
            # Very "solid" shape -> likely puppet or object
            continue

        # 2) Perimeter-to-area style measure (higher => more jagged)
        perim = cv2.arcLength(cnt, True)
        perim_area_ratio = (perim * perim) / (area + 1e-6)

        if perim_area_ratio < MIN_PERIM_AREA_RATIO:
            continue

        # 3) Edge density inside contour
        roi_edges = edges[y:y+h, x:x+w]
        edge_count = float(np.count_nonzero(roi_edges * roi_mask))
        edge_density = edge_count / (area + 1e-6)
        if edge_density < MIN_EDGE_DENSITY:
            continue

        # 4) Local entropy (texture/noisiness)
        roi_gray = gray[y:y+h, x:x+w]
        # compute entropy via histogram
        hist = cv2.calcHist([roi_gray], [0], roi_mask, [256], [0,256])
        hist = hist.ravel()
        prob = hist / (hist.sum() + 1e-6)
        entropy = -np.sum([p * np.log2(p) for p in prob if p > 0]) if prob.sum() > 0 else 0.0
        if entropy < MIN_LOCAL_ENTROPY:
            # Too uniform -> reject
            continue

        # 5) Red dominance check (fire tends to have higher red relative to green)
        roi = frame[y:y+h, x:x+w]
        # compute mean color only inside mask
        lap = cv2.Laplacian(roi_gray, cv2.CV_64F)
        lap_var = np.var(lap[roi_mask == 1])

        if lap_var < 220:      # threshold, tune if needed
            continue
        masked_pixels = roi[roi_mask == 1]
        if masked_pixels.size == 0:
            continue
        mean_b = float(np.mean(masked_pixels[:,0]))
        mean_g = float(np.mean(masked_pixels[:,1]))
        mean_r = float(np.mean(masked_pixels[:,2]))
        red_dom = (mean_r - mean_g) / (mean_r + 1e-6)
        if red_dom < MIN_RED_DOMINANCE:
            continue

        # PASSED ALL FILTERS -> accept as fire candidate
        detected_areas.append({"x": x, "y": y, "width": w, "height": h})
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 2)

              # 1. ANATOMICAL LANDMARKS → RED DOTS
        M = cv2.moments(cnt)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
            cv2.circle(frame, (cx, cy), 7, (0, 0, 255), -1)

        # 2. MATHEMATICAL LANDMARKS → BLACK CROSS
        hull = cv2.convexHull(cnt)
        for p in hull:
            px, py = p[0]
            cv2.drawMarker(frame, (px, py), (0, 0, 0),
                            markerType=cv2.MARKER_CROSS,
                            markerSize=20, thickness=2)

        # Extreme points (mathematical)
        left = tuple(cnt[cnt[:, :, 0].argmin()][0])
        right = tuple(cnt[cnt[:, :, 0].argmax()][0])
        top = tuple(cnt[cnt[:, :, 1].argmin()][0])
        bottom = tuple(cnt[cnt[:, :, 1].argmax()][0])

        for point in [left, right, top, bottom]:
            cv2.drawMarker(frame, point, (0, 0, 0),
                            markerType=cv2.MARKER_CROSS,
                            markerSize=25, thickness=2)

        # 3. PSEUDO-LANDMARKS = GREEN DOTS
        for i in range(5):
            px = x + int(w * (i / 4))
            py = y + int(h * (i / 4))
            cv2.circle(frame, (px, py), 6, (0, 255, 0), -1)

    # Final fire detection
    fire_detected = len(detected_areas) > 0
    confidence = min(100, (red_pixels / 8000) * 100)

    if fire_detected:
        Fire_Reported += 1

    # -------------------------
    # Trigger alarm + email
    # -------------------------
    if fire_detected and not Alarm_Status:
        threading.Thread(target=play_alarm_sound_function, daemon=True).start()

    if fire_detected and not Email_Status:
        threading.Thread(target=send_email_alert, daemon=True).start()
        Email_Status = True

    return {
        "detected": fire_detected,
        "confidence": confidence,
        "red_pixel_count": red_pixels,
        "locations": detected_areas,
        "segmented_image": encode_image_to_base64(fire_energy),
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

@app.route('/api/stop-alarm', methods=['POST'])
def stop_alarm():
    global Alarm_Status
    pygame.mixer.music.stop()
    Alarm_Status = False
    return jsonify({"success": True})

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
