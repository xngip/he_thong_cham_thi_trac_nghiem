def get_digit_from_bubbles(coords, rows, cols, height=1000, width=1000):
    grid = [[[] for _ in range(cols)] for _ in range(rows)]
    for (x, y) in coords:
        row = int(y * rows / height)
        col = int(x * cols / width)
        if 0 <= row < rows and 0 <= col < cols:
            grid[row][col].append((x, y))
    digits = []
    for col in range(cols):
        found = False
        for row in range(rows):
            if grid[row][col]:
                digits.append(str(row))
                found = True
                break
        if not found:
            digits.append('?')
    return ''.join(digits)

import cv2

def get_bounding_circle_radius(contour):
    (x, y), radius = cv2.minEnclosingCircle(contour)
    return int(round(radius))

def convert_to_original_scale(x_block, y_block, radius_block, offset_x, offset_y, scale):
    x_orig = offset_x + int(x_block / scale)
    y_orig = offset_y + int(y_block / scale)
    radius_orig = int(radius_block / scale)
    return x_orig, y_orig, radius_orig
