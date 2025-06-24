import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import cv2
from ultralytics import YOLO

# ==== CẤU HÌNH ====
model_path = 'runs/detect/omr_yolov8_model14/weights/best.pt'
input_dir = 'images_test'
output_dir = 'output'
cropped_col_dir = 'cropped_outputs/column'
conf_threshold = 0.3

os.makedirs(output_dir, exist_ok=True)
os.makedirs(cropped_col_dir, exist_ok=True)
model = YOLO(model_path)

# ==== Hàm phát hiện các bubble đã tô trong cột ====
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

# ==== Xử lý tất cả ảnh ====
for filename in sorted(os.listdir(input_dir)):
    if not filename.lower().endswith(('.jpg', '.png')):
        continue

    img_path = os.path.join(input_dir, filename)
    image = cv2.imread(img_path)
    if image is None:
        print(f"❌ Không thể đọc ảnh: {img_path}")
        continue

    print(f"\n🖼️ Đang xử lý: {filename}")
    results = model(img_path, conf=conf_threshold)
    boxes = results[0].boxes
    class_names = model.names

    student_id = ""
    exam_id = ""

    for box in boxes:
        cls_id = int(box.cls[0].item())
        label = class_names[cls_id]
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        block = image[y1:y2, x1:x2]
        if block.shape[0] < 10 or block.shape[1] < 10:
            continue
        block = cv2.resize(block, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)

        if label in ["IDStudent", "IDExam"]:
            num_cols = 6 if label == "IDStudent" else 3
            col_width = block.shape[1] // num_cols

            digits = ""
            for i in range(num_cols):
                col_crop = block[:, i * col_width:(i + 1) * col_width]
                col_filename = f"{os.path.splitext(filename)[0]}_{label}_col{i + 1}.jpg"
                col_path = os.path.join(cropped_col_dir, col_filename)
                cv2.imwrite(col_path, col_crop)

                filled_rows = detect_filled_bubbles_in_column(col_crop)

                if len(filled_rows) == 1:
                    digits += str(filled_rows[0][0])
                else:
                    digits += "?"

            if label == "IDStudent":
                student_id = digits
                print(f"🔹 IDStudent: {student_id}")
            else:
                exam_id = digits
                print(f"🔹 IDExam: {exam_id}")

print("\n🎯 Hoàn tất! Không vẽ gì lên ảnh, chỉ in mã ra terminal.")
