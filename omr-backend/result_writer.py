import os
import cv2
import pandas as pd

def save_result_image(filename, image_draw, score, correct, total, output_dir):
    out_path = os.path.join(output_dir, f"{os.path.splitext(filename)[0]}_full.jpg")
    cv2.putText(image_draw, f"DIEM: {score} ({correct}/{total})", (50, 160),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 128, 255), 3)
    cv2.imwrite(out_path, image_draw)
    print(f"✅ Đã lưu: {out_path}")

def export_grade_excel(grade_records, grade_output_path):
    grade_df = pd.DataFrame(grade_records)
    grade_df.to_excel(grade_output_path, index=False)
    print(f"\n📄 Đã lưu bảng điểm tại: {grade_output_path}")