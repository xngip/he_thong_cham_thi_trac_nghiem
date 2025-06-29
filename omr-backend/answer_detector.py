import cv2
import numpy as np
from bubble_utils import detect_all_bubbles, get_filled_bubble_by_max_fill
from utils import get_bounding_circle_radius, convert_to_original_scale

def process_answers(image_draw, answer_blocks, correct_answers, filename, resize_scale=3.0):
    all_answers = []
    correct = 0
    bubble_labels = ['A', 'B', 'C', 'D']

    for block_idx, (x1, y1, x2, y2, left_crop, block_cropped, crop_w) in enumerate(answer_blocks):
        all_coords = detect_all_bubbles(block_cropped.copy())
        if len(all_coords) < 20:
            continue

        all_coords = sorted(all_coords, key=lambda b: b[1])
        bubble_grid = []

        num_rows = 5
        bubbles_per_row = 4
        total_bubble_needed = num_rows * bubbles_per_row

        if len(all_coords) < total_bubble_needed:
            continue

        approx_row_height = (max([y for _, y, _ in all_coords]) - min([y for _, y, _ in all_coords])) // num_rows

        for i in range(num_rows):
            y_start = min([y for _, y, _ in all_coords]) + i * approx_row_height
            y_end = y_start + approx_row_height + 5
            row = [b for b in all_coords if y_start <= b[1] <= y_end]
            row = sorted(row, key=lambda b: b[0])
            if len(row) < bubbles_per_row:
                exit(1)
            bubble_grid.append(row[:bubbles_per_row])

        start_q = block_idx * 5 + 1

        for row_idx, row_coords in enumerate(bubble_grid):
            question_number = start_q + row_idx
            predicted_answer = "?"

            filled = get_filled_bubble_by_max_fill(block_cropped.copy(), row_coords)
            coord_dict = {bubble_labels[i]: (x, y) for i, (x, y, _) in enumerate(row_coords)}

            if filled:
                for i, (x, y, _) in enumerate(row_coords):
                    if np.linalg.norm(np.array(filled) - np.array((x, y))) < 20:
                        predicted_answer = bubble_labels[i]
                        break

            all_answers.append(predicted_answer)

            if correct_answers and question_number <= len(correct_answers):
                true_answer = correct_answers[question_number - 1]
                if true_answer in coord_dict:
                    x, y = coord_dict[true_answer]
                    contour = [c for x_, y_, c in row_coords if (x_, y_) == (x, y)]
                    if contour:
                        radius = get_bounding_circle_radius(contour[0])
                        abs_x, abs_y, radius = convert_to_original_scale(x + crop_w, y, radius, x1, y1, resize_scale)

                        if predicted_answer == true_answer:
                            cv2.circle(block_cropped, (x, y), max(1, radius), (0, 255, 0), 2)
                            cv2.circle(image_draw, (abs_x, abs_y), max(1, radius), (0, 255, 0), 2)
                            correct += 1
                        else:
                            cv2.circle(block_cropped, (x, y), max(1, radius), (0, 0, 255), 2)
                            cv2.circle(image_draw, (abs_x, abs_y), max(1, radius), (0, 0, 255), 2)

    return all_answers, correct
