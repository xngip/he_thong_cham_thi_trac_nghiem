import cv2
import numpy as np
import imutils

def detect_all_bubbles(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 180, 255, cv2.THRESH_BINARY_INV)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    coords = []
    for c in cnts:
        area = cv2.contourArea(c)
        (x, y, w, h) = cv2.boundingRect(c)
        ar = w / float(h)
        fill_ratio = area / (w * h + 1e-6)
        if 100 < area < 3000 and 0.7 <= ar <= 1.3 and fill_ratio > 0.4:
            (cx, cy), _ = cv2.minEnclosingCircle(c)
            coords.append((int(cx), int(cy), c))
    coords = sorted(coords, key=lambda x: x[1])
    return coords

def detect_filled_bubbles_in_column(col_img, num_rows=10, threshold_black=60, min_black_pixels=50):
    h = col_img.shape[0] // num_rows
    gray = cv2.cvtColor(col_img, cv2.COLOR_BGR2GRAY)
    filled_rows = []
    for i in range(num_rows):
        y1 = i * h
        y2 = (i + 1) * h
        row_crop = gray[y1:y2, :]
        black_pixel_count = cv2.countNonZero(cv2.inRange(row_crop, 0, threshold_black))
        if black_pixel_count > min_black_pixels:
            filled_rows.append((i, black_pixel_count))
    return filled_rows

def get_filled_bubble_by_max_fill(image_row, all_coords):
    hsv = cv2.cvtColor(image_row, cv2.COLOR_BGR2HSV)
    lower = np.array([0, 0, 0])
    upper = np.array([180, 255, 90])
    mask = cv2.inRange(hsv, lower, upper)
    mask = cv2.medianBlur(mask, 5)

    max_fill = 0
    chosen_bubble = None

    for (x, y, contour) in all_coords:
        mask_circle = np.zeros(mask.shape, dtype="uint8")
        cv2.drawContours(mask_circle, [contour], -1, 255, -1)
        masked_area = cv2.bitwise_and(mask, mask, mask=mask_circle)
        fill = cv2.countNonZero(masked_area)
        if fill > max_fill:
            max_fill = fill
            chosen_bubble = (x, y)

    return chosen_bubble