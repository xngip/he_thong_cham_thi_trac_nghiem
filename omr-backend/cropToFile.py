from ultralytics import YOLO
import os
import cv2

# ==== CẤU HÌNH ====
model_path = 'runs/detect/omr_yolov8_model14/weights/best.pt'
test_image_dir = 'images_test'       # Folder chứa ảnh test
output_dir = 'cropped_outputs/'       # Nơi lưu ảnh crop ra
conf_threshold = 0.3

# Danh sách tên class
class_names = ['AnswerArea', 'IDExam', 'IDStudent', 'Marker']

# Tạo thư mục cho từng class
for cls_name in class_names:
    os.makedirs(os.path.join(output_dir, cls_name), exist_ok=True)

# ==== LOAD MODEL ====
model = YOLO(model_path)

# ==== DUYỆT VÀ DỰ ĐOÁN ====
image_files = [f for f in os.listdir(test_image_dir) if f.endswith(('.jpg', '.png'))]

for img_name in image_files:
    img_path = os.path.join(test_image_dir, img_name)
    img = cv2.imread(img_path)

    # Run inference
    results = model(img_path, conf=conf_threshold)
    boxes = results[0].boxes

    for i, box in enumerate(boxes):
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])  # tọa độ bbox

        # Crop và lưu
        crop = img[y1:y2, x1:x2]
        class_dir = os.path.join(output_dir, class_names[cls_id])
        crop_name = f"{os.path.splitext(img_name)[0]}_obj{i}_conf{conf:.2f}.jpg"
        cv2.imwrite(os.path.join(class_dir, crop_name), crop)

    print(f"✅ Processed: {img_name}")

print("\n🎯 Đã hoàn tất. Ảnh crop nằm trong thư mục:", output_dir)
