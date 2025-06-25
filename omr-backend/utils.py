import cv2

def get_bounding_circle_radius(contour):
    (x, y), radius = cv2.minEnclosingCircle(contour)
    return int(round(radius))

def convert_to_original_scale(x_block, y_block, radius_block, offset_x, offset_y, scale):
    x_orig = offset_x + int(x_block / scale)
    y_orig = offset_y + int(y_block / scale)
    radius_orig = int(radius_block / scale)
    return x_orig, y_orig, radius_orig