import cv2
from bubble_utils import detect_filled_bubbles_in_column

def extract_ids(image, boxes, class_names, resize_scale=3.0):
    student_id = ""
    exam_id = ""
    answer_blocks_raw = []

    for box in boxes:
        cls_id = int(box.cls[0].item())
        label = class_names[cls_id]
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        block = image[y1:y2, x1:x2]
        if block.shape[0] < 10 or block.shape[1] < 10:
            continue
        block = cv2.resize(block, None, fx=resize_scale, fy=resize_scale, interpolation=cv2.INTER_CUBIC)

        if label == "IDStudent":
            num_cols = 6
            col_width = block.shape[1] // num_cols
            for i in range(num_cols):
                col_crop = block[:, i * col_width:(i + 1) * col_width].copy()
                filled_rows = detect_filled_bubbles_in_column(col_crop)
                student_id += str(filled_rows[0][0]) if len(filled_rows) == 1 else "?"

        elif label == "IDExam":
            num_cols = 3
            col_width = block.shape[1] // num_cols
            for i in range(num_cols):
                col_crop = block[:, i * col_width:(i + 1) * col_width].copy()
                filled_rows = detect_filled_bubbles_in_column(col_crop)
                exam_id += str(filled_rows[0][0]) if len(filled_rows) == 1 else "?"

        elif label == "AnswerArea":
            crop_w = block.shape[1] // 5
            block_cropped = block[:, crop_w:]
            left_crop = block[:, :crop_w]
            answer_blocks_raw.append({
                "x1": x1,
                "y1": y1,
                "block": (x1, y1, x2, y2, left_crop, block_cropped, crop_w)
            })

    def sort_blocks_columnwise(blocks, col_gap=50):
        blocks_sorted = sorted(blocks, key=lambda b: b["x1"])
        columns = [[blocks_sorted[0]]]
        for b in blocks_sorted[1:]:
            if abs(b["x1"] - columns[-1][0]["x1"]) < col_gap:
                columns[-1].append(b)
            else:
                columns.append([b])

        for col in columns:
            col.sort(key=lambda b: b["y1"])

        sorted_blocks = []
        for col in columns:
            sorted_blocks.extend(col)

        return sorted_blocks

    sorted_answer_blocks = sort_blocks_columnwise(answer_blocks_raw)
    answer_blocks = [b["block"] for b in sorted_answer_blocks]

    return student_id, exam_id, answer_blocks