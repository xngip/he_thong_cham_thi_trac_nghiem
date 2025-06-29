import os
import cv2
import pandas as pd
from config import input_dir, output_dir, conf_threshold
from detech_model import detect_blocks
from id_extractor import extract_ids
from answer_detector import process_answers
from result_writer import save_result_image, export_grade_excel

def main():
    grade_records = []
    answer_key_dir = "result"
    grade_output_path = os.path.join("grade", "grade.xlsx")
    os.makedirs("grade", exist_ok=True)

    for filename in sorted(os.listdir(input_dir)):
        if not filename.lower().endswith((".jpg", ".png")):
            continue

        img_path = os.path.join(input_dir, filename)
        image = cv2.imread(img_path)
        if image is None:
            print(f"Không thể đọc ảnh: {img_path}")
            continue

        print(f"\n Đang xử lý: {filename}")
        image_draw = image.copy()
        boxes, class_names = detect_blocks(img_path, conf_threshold)

        student_id, exam_id, answer_blocks = extract_ids(image, boxes, class_names)
        cv2.putText(image_draw, f"MA SINH VIEN: {student_id}", (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
        cv2.putText(image_draw, f"MA DE: {exam_id}", (50, 110), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

        correct_answers = []
        answer_key_path = os.path.join(answer_key_dir, f"result{exam_id}.xlsx")
 
        if os.path.exists(answer_key_path):
            answer_key_df = pd.read_excel(answer_key_path)
            answer_key_df.columns = [col.strip().lower() for col in answer_key_df.columns] 
            if "answer" in answer_key_df.columns:
                correct_answers = answer_key_df["answer"].tolist()
        else:
            print("Không tồn tại file đáp án hoặc sai tên cột")

        total = len(correct_answers)
        all_answers, correct = process_answers(image_draw, answer_blocks, correct_answers, filename)
        score = round(correct / total * 10, 2) if total > 0 else 0

        save_result_image(filename, image_draw, score, correct, total, output_dir)

        grade_records.append({
            "MA SINH VIEN": student_id,
            "MA DE": exam_id,
            "DIEM": score,
            "SO CAU DUNG": correct,
            "TONG CAU": total    # 👈 Thêm dòng này
        })


    export_grade_excel(grade_records, grade_output_path)
    print("Hoàn tất!")

if __name__ == "__main__":
    main()
 