import gradio as gr
import cv2
import numpy as np
import os
import tempfile
import pandas as pd
from config import conf_threshold, output_dir
from detech_model import detect_blocks
from id_extractor import extract_ids
from answer_detector import process_answers
from result_writer import save_result_image

def process_image(input_image):
    image = cv2.cvtColor(input_image, cv2.COLOR_RGB2BGR)
    image_draw = image.copy()

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
        temp_path = tmp_file.name
        cv2.imwrite(temp_path, image)

    filename = os.path.basename(temp_path)
    boxes, class_names = detect_blocks(temp_path, conf_threshold)
    student_id, exam_id, answer_blocks = extract_ids(image, boxes, class_names)

    cv2.putText(image_draw, f"MA SINH VIEN: {student_id}", (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
    cv2.putText(image_draw, f"MA DE: {exam_id}", (50, 110), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

    correct_answers = []
    answer_key_path = os.path.join("result", f"result{exam_id}.xlsx")
    if os.path.exists(answer_key_path):
        answer_key_df = pd.read_excel(answer_key_path)
        if "Answer" in answer_key_df.columns:
            correct_answers = answer_key_df["Answer"].tolist()

    all_answers, correct, total = process_answers(image_draw, answer_blocks, correct_answers, filename)
    score = round(correct / total * 10, 2) if total > 0 else 0

    cv2.putText(image_draw, f"DIEM: {score} ({correct}/{total})", (50, 160),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 128, 255), 3)

    result_rgb = cv2.cvtColor(image_draw, cv2.COLOR_BGR2RGB)
    if result_rgb is None or result_rgb.size == 0:
        raise ValueError("Ảnh kết quả rỗng hoặc lỗi khi xử lý.")

    return result_rgb

with gr.Blocks() as app:
    with gr.Row():
        with gr.Column():
            gr.Markdown("## Tải ảnh phiếu trắc nghiệm")
            input_img = gr.Image(type="numpy", label="Ảnh gốc")
            run_btn = gr.Button("Chấm điểm")
        with gr.Column():
            gr.Markdown("## Kết quả đã chấm")
            output_img = gr.Image(type="numpy", label="Ảnh kết quả")

    run_btn.click(fn=process_image, inputs=input_img, outputs=output_img)

if __name__ == "__main__":
    app.launch()
