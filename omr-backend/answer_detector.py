import cv2
import numpy as np
from bubble_utils import detect_all_bubbles, get_filled_bubble_by_max_fill
from cluster import split_rows_by_cluster
from utils import get_bounding_circle_radius, convert_to_original_scale

def process_answers(image_draw, answer_blocks, correct_answers, filename, resize_scale=3.0):
    all_answers = []
    correct = 0

    for block_idx, (x1, y1, x2, y2, left_crop, block_cropped, crop_w) in enumerate(answer_blocks):
        all_coords = detect_all_bubbles(block_cropped.copy())
        row_groups = split_rows_by_cluster(all_coords)
        start_q = block_idx * 5 + 1

        for row_idx, row_coords in enumerate(row_groups):
            row_coords_sorted = sorted([c[:2] for c in row_coords], key=lambda x: x[0])
            filled = get_filled_bubble_by_max_fill(block_cropped.copy(), row_coords)

            question_number = start_q + row_idx
            bubble_centers = ["A", "B", "C", "D"]
            bubble_coords = row_coords_sorted[:4]
            coord_dict = dict(zip(bubble_centers, bubble_coords))

            predicted_answer = "?"
            if filled:
                for idx, (x, y) in enumerate(bubble_coords):
                    if np.linalg.norm(np.array(filled) - np.array((x, y))) < 20:
                        predicted_answer = bubble_centers[idx] if idx < 4 else "?"
                        break

            all_answers.append(predicted_answer)

            if correct_answers and question_number <= len(correct_answers):
                true_answer = correct_answers[question_number - 1]

                # Nếu có đáp án đúng nằm trong A-D
                if true_answer in coord_dict:
                    x, y = coord_dict[true_answer]
                    contour = [c for x_, y_, c in row_coords if (x_, y_) == (x, y)]
                    if contour:
                        radius = get_bounding_circle_radius(contour[0])
                        abs_x, abs_y, radius = convert_to_original_scale(x + crop_w, y, radius, x1, y1, resize_scale)

                        if predicted_answer == true_answer:
                            # Tô xanh nếu đúng
                            cv2.circle(block_cropped, (x, y), max(1, radius), (0, 255, 0), 2)
                            cv2.circle(image_draw, (abs_x, abs_y), max(1, radius), (0, 255, 0), 2)
                            correct += 1
                        else:
                            # Tô đỏ nếu đáp án đúng bị bỏ trống
                            cv2.circle(block_cropped, (x, y), max(1, radius), (0, 0, 255), 2)
                            cv2.circle(image_draw, (abs_x, abs_y), max(1, radius), (0, 0, 255), 2)

    return all_answers, correct, len(all_answers)