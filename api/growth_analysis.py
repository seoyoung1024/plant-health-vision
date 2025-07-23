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

def extract_green_area(image_path: Path, save_annotated: bool = True) -> int:
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"이미지를 불러올 수 없습니다: {image_path}")

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # ✅ 넓은 초록+연두+노랑 범위
    lower_green = np.array([20, 40, 40])     # Hue: 20 = 노랑빛 초록
    upper_green = np.array([90, 255, 255])   # Hue: 90 = 밝은 초록

    mask = cv2.inRange(hsv, lower_green, upper_green)

    # 🔍 잡음 제거
    kernel = np.ones((5, 5), np.uint8)
    cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    area = cv2.countNonZero(cleaned)

    if save_annotated:
        # 외곽선 표시
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        annotated = img.copy()
        cv2.drawContours(annotated, contours, -1, (0, 255, 0), 2)

        # 면적 표시
        cv2.putText(
            annotated, f"Area: {area} px",
            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 0, 0), 2
        )

        # 저장
        annotated_path = ANNOTATED_DIR / f"{image_path.stem}_annotated.png"
        cv2.imwrite(str(annotated_path), annotated)

    return area


# ✅ 성장률 계산
def growth_diff_between_images(image_paths: List[Path]):
    areas = [extract_green_area(p) for p in image_paths]
    growth_diffs = [areas[i+1] - areas[i] for i in range(len(areas)-1)]
    growth_rates = [round((diff / areas[i]) * 100, 1) if areas[i] else 0 for i, diff in enumerate(growth_diffs)]

    return {
        "areas": areas,
        "growth_diffs": growth_diffs,
        "growth_rates_percent": growth_rates,
        "summary": f"총 성장률: {round(sum(growth_diffs) / areas[0] * 100, 1)}%" if areas and areas[0] else "N/A"
    }

# ✅ API 엔드포인트
@router.get("/api/growth-analysis/{plant_id}")
def analyze_growth(plant_id: str):
    images = [img for img in db["images"] if img["plant_id"] == plant_id]

    if len(images) < 2:
        raise HTTPException(status_code=400, detail="성장 분석을 위해 최소 2장의 이미지가 필요합니다.")

    # 날짜 추출
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
