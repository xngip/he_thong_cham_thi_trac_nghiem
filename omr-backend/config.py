import os

grade_file = 'grade/grade.xlsx'
model_path = 'runs/detect/omr_yolov8_model14/weights/best.pt'
input_dir = 'images_test'
output_dir = 'output'
cropped_row_dir = 'cropped_outputs/row'
cropped_col_dir = 'cropped_outputs/column'
conf_threshold = 0.3

os.makedirs(output_dir, exist_ok=True)
os.makedirs(cropped_row_dir, exist_ok=True)
os.makedirs(cropped_col_dir, exist_ok=True)
