import os

model_path = r'runs/detect/omr_yolov8_model14/weights/best.pt'
input_dir = 'images_test'
output_dir = 'output'
conf_threshold = 0.3

os.makedirs(output_dir, exist_ok=True)