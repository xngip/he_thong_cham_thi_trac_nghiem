import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import os
import cv2
import random
from glob import glob
from tqdm import tqdm
import albumentations as A

# ========== CONFIG ==========
input_dir = 'dataset/train'
output_dir = 'dataset/augmented_dataset'
augment_per_image = 10
split_ratio = (0.8, 0.2)  # train, val

# ========== CLIP YOLO BBOX ==========
def clip_bbox_yolo(box):
    x, y, w, h = box
    x = min(max(x, 0.0), 1.0)
    y = min(max(y, 0.0), 1.0)
    w = min(max(w, 0.0), 1.0)
    h = min(max(h, 0.0), 1.0)
    return [x, y, w, h]

# ========== AUGMENTATION ==========
transform = A.Compose([
    A.Rotate(limit=3, p=0.7),
    A.RandomBrightnessContrast(p=0.5),
    A.MotionBlur(blur_limit=3, p=0.3),
    A.GaussNoise(p=0.3),
    A.Perspective(scale=(0.01, 0.03), p=0.5)
], bbox_params=A.BboxParams(
    format='yolo',
    label_fields=['class_labels']
))

# ========== STEP 1: AUGMENT ==========
augmented_data = []
img_paths = glob(os.path.join(input_dir, 'images', '*.jpg'))

for img_path in tqdm(img_paths, desc="🔄 Augmenting"):
    fname = os.path.splitext(os.path.basename(img_path))[0]
    label_path = os.path.join(input_dir, 'labels', f'{fname}.txt')

    if not os.path.exists(label_path):
        print(f"⚠️ Không tìm thấy nhãn cho {fname}, bỏ qua.")
        continue

    image = cv2.imread(img_path)
    if image is None:
        print(f"⚠️ Không đọc được ảnh {fname}, bỏ qua.")
        continue

    # Đọc file label
    with open(label_path, 'r') as f:
        lines = f.read().splitlines()

    bboxes = []
    class_labels = []
    for line in lines:
        parts = line.strip().split()
        if len(parts) != 5:
            continue
        cls, x, y, bw, bh = map(float, parts)

        # Bỏ box sai định dạng YOLO
        if not (0 <= x <= 1 and 0 <= y <= 1 and 0 < bw <= 1 and 0 < bh <= 1):
            continue

        bboxes.append([x, y, bw, bh])
        class_labels.append(int(cls))

    for i in range(augment_per_image):
        augmented = transform(image=image, bboxes=bboxes, class_labels=class_labels)
        aug_img = augmented['image']
        aug_bboxes = [clip_bbox_yolo(b) for b in augmented['bboxes']]
        aug_labels = augmented['class_labels']

        # Bỏ ảnh nếu không còn box hợp lệ
        aug_bboxes = [b for b in aug_bboxes if b[2] > 0 and b[3] > 0]
        if len(aug_bboxes) == 0:
            continue

        save_name = f'{fname}_aug_{i}'
        augmented_data.append((save_name, aug_img, aug_bboxes, aug_labels))

# ========== STEP 2: SHUFFLE & SPLIT ==========
random.shuffle(augmented_data)
total = len(augmented_data)
train_end = int(total * split_ratio[0])

splits = {
    'train': augmented_data[:train_end],
    'val': augmented_data[train_end:]
}

# ========== STEP 3: SAVE ==========
for split in splits:
    img_dir = os.path.join(output_dir, split, 'images')
    label_dir = os.path.join(output_dir, split, 'labels')
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(label_dir, exist_ok=True)

    for name, img, boxes, labels in splits[split]:
        cv2.imwrite(os.path.join(img_dir, f'{name}.jpg'), img)
        with open(os.path.join(label_dir, f'{name}.txt'), 'w') as f:
            for i, box in enumerate(boxes):
                f.write(f"{labels[i]} {' '.join(str(round(b, 6)) for b in box)}\n")

print("\n✅ Hoàn tất: đã tăng cường và chia tập train/val thành công!")
