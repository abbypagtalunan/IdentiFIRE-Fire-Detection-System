import cv2
import numpy as np

def detect_fire_hsv_ycrcb_lab(frame):
    # Resize (faster)
    frame = cv2.resize(frame, (960, 540))

    # -------------------------
    # 1. COLOR-BASED FIRE MASK (HSV)
    # -------------------------
    blur = cv2.GaussianBlur(frame, (7, 7), 0)
    hsv = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)

    lower_fire = np.array([5, 100, 180])
    upper_fire = np.array([30, 255, 255])
    mask_hsv = cv2.inRange(hsv, lower_fire, upper_fire)

    # -------------------------
    # 2. HEAT MASK (YCrCb)
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
    # 4. COMBINE ALL MASKS
    # -------------------------
    fire_mask = cv2.bitwise_and(mask_hsv, mask_hot)
    fire_mask = cv2.bitwise_and(fire_mask, mask_bright)

    # -------------------------
    # 5. MORPHOLOGICAL CLOSING TO FILL GAPS
    # -------------------------
    kernel = np.ones((7, 7), np.uint8)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_CLOSE, kernel)

    # Show results
    cv2.imshow("Original Frame", frame)
    cv2.imshow("Gaussian Blur", blur)
    cv2.imshow("HSV Mask", mask_hsv)
    cv2.imshow("Cr Mask", mask_hot)
    cv2.imshow("L Mask", mask_bright)
    cv2.imshow("Combined HSV Cr L Mask with Morphological Closing", fire_mask)
    cv2.waitKey(1)


def detect_fire_from_path(image_path):
    frame = cv2.imread(image_path)
    if frame is None:
        raise ValueError(f"Image not found or invalid path: {image_path}")
    return detect_fire_hsv_ycrcb_lab(frame)

if __name__ == "__main__":
    while True:
        image_path = input("Paste image path (or type 'exit' to quit): ")
        if image_path.lower() == "exit":
            break
    cv2.destroyAllWindows()
