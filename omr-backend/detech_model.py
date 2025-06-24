from ultralytics import YOLO
from config import model_path

model = YOLO(model_path)

def detect_blocks(image_path, conf):
    results = model(image_path, conf=conf)
    return results[0].boxes, model.names