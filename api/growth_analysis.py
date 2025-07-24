from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import cv2
import numpy as np
import os
from db import db  # 내부 메모리 DB 또는 실제 DB 연동

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent / "uploads"
ANNOTATED_DIR = UPLOAD_DIR / "annotated"
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)

class GrowthAnalysisRequest(BaseModel):
    plant_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

def extract_plant_area(image_path: Path, save_annotated: bool = True) -> int:
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"이미지를 불러올 수 없습니다: {image_path}")

    mask = np.zeros(img.shape[:2], np.uint8)
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)

    h, w = img.shape[:2]
    rect = (int(w * 0.25), int(h * 0.2), int(w * 0.5), int(h * 0.6))
    cv2.grabCut(img, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)

    plant_mask = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
    result = img * plant_mask[:, :, np.newaxis]

    area = np.count_nonzero(plant_mask)

    if save_annotated:
        contours, _ = cv2.findContours(plant_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        annotated = img.copy()
        cv2.drawContours(annotated, contours, -1, (0, 255, 0), 2)
        cv2.putText(
            annotated, f"Area: {area} px",
            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2
        )
        annotated_path = ANNOTATED_DIR / f"{image_path.stem}_plant_only.png"
        cv2.imwrite(str(annotated_path), annotated)

    return area

def growth_diff_between_images(image_paths: List[Path]):
    areas = [extract_plant_area(p) for p in image_paths]
    growth_diffs = [areas[i + 1] - areas[i] for i in range(len(areas) - 1)]
    growth_rates = [round((diff / areas[i]) * 100, 1) if areas[i] else 0 for i, diff in enumerate(growth_diffs)]

    return {
        "areas": areas,
        "growth_diffs": growth_diffs,
        "growth_rates_percent": growth_rates,
        "summary": f"총 성장률: {round(sum(growth_diffs) / areas[0] * 100, 1)}%" if areas and areas[0] else "N/A"
    }

@router.get("/api/growth-analysis/{plant_id}")
def analyze_growth(plant_id: str):
    images = [img for img in db["images"] if img["plant_id"] == plant_id]

    if len(images) < 2:
        raise HTTPException(status_code=400, detail="성장 분석을 위해 최소 2장의 이미지가 필요합니다.")

    def extract_datetime_from_filename(filename):
        try:
            date_str, time_str = filename.split("_")[0], filename.split("_")[1]
            return datetime.strptime(date_str + time_str, "%Y%m%d%H%M%S")
        except:
            return datetime.min

    images.sort(key=lambda x: extract_datetime_from_filename(x["filename"]))
    paths = [UPLOAD_DIR / img["filename"] for img in images]

    result = growth_diff_between_images(paths)

    return {
        "plant_id": plant_id,
        "growth": result
    }
