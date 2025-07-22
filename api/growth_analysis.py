from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import cv2
import numpy as np
import os

from database import db  # ✅ 추가

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent / "uploads"

# 요청 데이터 모델
class GrowthAnalysisRequest(BaseModel):
    plant_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# 이미지 전처리 및 영역 추출 함수
def extract_plant_area(image_path: Path) -> int:
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"이미지를 불러올 수 없습니다: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((5, 5), np.uint8)
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    area = cv2.countNonZero(cleaned)
    return area

def growth_diff_between_images(image_paths: List[Path]):
    areas = []
    for path in image_paths:
        area = extract_plant_area(path)
        areas.append(area)

    growth_diffs = [areas[i+1] - areas[i] for i in range(len(areas)-1)]
    growth_rates = [round((diff / areas[i]) * 100, 1) if areas[i] != 0 else 0 for i, diff in enumerate(growth_diffs)]

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
