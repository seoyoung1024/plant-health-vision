from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import shutil
from datetime import datetime
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image
import io
import base64
import requests
import imageio.v3 as iio
import tempfile
import shutil
from pathlib import Path

# FastAPI 앱 생성
app = FastAPI(
    title="Plant Growth Tracker API",
    description="식물 성장 추적 및 분석을 위한 API",
    version="1.0.0"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 디렉토리 설정
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
TIMELAPSE_DIR = BASE_DIR / "timelapses"
UPLOAD_DIR.mkdir(exist_ok=True)
TIMELAPSE_DIR.mkdir(exist_ok=True)

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory=str(UPLOAD_DIR)), name="static")

# 모델 정의
class PlantImage(BaseModel):
    id: str
    plant_id: str
    filename: str
    created_at: datetime
    analysis: Optional[dict] = None

class TimelapseRequest(BaseModel):
    plant_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AnalysisRequest(BaseModel):
    image_id: str

# 임시 데이터 저장 (실제로는 데이터베이스 사용 권장)
db = {
    "plants": {},
    "images": [],
    "timelapses": {}
}

# 유틸리티 함수
def save_upload_file(upload_file: UploadFile, destination: Path) -> str:
    """업로드된 파일을 저장하고 파일 경로를 반환합니다."""
    file_extension = Path(upload_file.filename).suffix
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = destination / filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    return filename

def analyze_plant_health(image_path: Path) -> dict:
    """식물 이미지를 분석하여 건강 상태를 반환합니다."""
    # 여기에 실제 AI/ML 모델을 통한 분석 로직 구현
    # 예시로 단순한 분석 결과 반환
    return {
        "health_score": 85,
        "growth_stage": "성장기",
        "issues": ["수분 부족 의심"],
        "recommendations": ["물 주기를 줄여보세요."]
    }

def create_timelapse(images: List[Path], output_path: Path, fps: int = 2):
    """이미지 목록으로부터 타임랩스 비디오를 생성합니다."""
    if not images:
        raise ValueError("No images provided for timelapse")
    
    # 임시 디렉토리 생성
    temp_dir = Path(tempfile.mkdtemp())
    try:
        # 이미지 파일을 임시 디렉토리에 복사하고 리사이즈
        temp_images = []
        for i, img_path in enumerate(images):
            if not img_path.exists():
                continue
                
            # 이미지 로드 및 리사이즈 (옵션)
            img = Image.open(img_path)
            img = img.resize((640, 480))  # 원하는 크기로 조정
            
            # 임시 파일로 저장
            temp_img_path = temp_dir / f"frame_{i:04d}.png"
            img.save(temp_img_path)
            temp_images.append(temp_img_path)
        
        if not temp_images:
            raise ValueError("No valid images found for timelapse")
        
        # imageio로 비디오 생성
        with iio.imopen(output_path, 'w', plugin='pyav', fps=fps) as video:
            for img_file in temp_images:
                frame = iio.imread(img_file)
                video.write(frame)
    
    finally:
        # 임시 디렉토리 정리
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

# API 엔드포인트
@app.post("/api/plants/{plant_id}/upload")
async def upload_plant_image(
    plant_id: str,
    file: UploadFile = File(...),
    notes: str = Form(""),
):
    """식물 이미지를 업로드하고 분석합니다."""
    try:
        # 파일 저장
        filename = save_upload_file(file, UPLOAD_DIR)
        file_path = UPLOAD_DIR / filename
        
        # 이미지 분석
        analysis = analyze_plant_health(file_path)
        
        # 메타데이터 저장
        image_id = str(uuid.uuid4())
        image_data = {
            "id": image_id,
            "plant_id": plant_id,
            "filename": filename,
            "path": str(file_path),
            "notes": notes,
            "created_at": datetime.utcnow(),
            "analysis": analysis
        }
        
        db["images"].append(image_data)
        
        if plant_id not in db["plants"]:
            db["plants"][plant_id] = {
                "id": plant_id,
                "created_at": datetime.utcnow(),
                "images": []
            }
        
        db["plants"][plant_id]["images"].append(image_id)
        
        return {"success": True, "image_id": image_id, "analysis": analysis}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/plants/{plant_id}/images")
async def get_plant_images(plant_id: str):
    """특정 식물의 모든 이미지 목록을 반환합니다."""
    if plant_id not in db["plants"]:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    images = [img for img in db["images"] if img["plant_id"] == plant_id]
    return {"success": True, "images": images}

@app.post("/api/timelapse/create")
async def create_plant_timelapse(request: TimelapseRequest):
    """식물의 타임랩스 비디오를 생성합니다."""
    try:
        # 식물 이미지 필터링
        images = [img for img in db["images"] if img["plant_id"] == request.plant_id]
        
        # 날짜 필터 적용
        if request.start_date:
            images = [img for img in images if img["created_at"] >= request.start_date]
        if request.end_date:
            images = [img for img in images if img["created_at"] <= request.end_date]
        
        # 생성일 기준 정렬
        images.sort(key=lambda x: x["created_at"])
        
        if not images:
            raise HTTPException(status_code=400, detail="No images found for the specified criteria")
        
        # 타임랩스 생성
        timelapse_id = f"timelapse_{request.plant_id}_{uuid.uuid4()}.mp4"
        output_path = TIMELAPSE_DIR / timelapse_id
        
        image_paths = [Path(img["path"]) for img in images]
        create_timelapse(image_paths, output_path)
        
        # 타임랩스 정보 저장
        db["timelapses"][timelapse_id] = {
            "id": timelapse_id,
            "plant_id": request.plant_id,
            "path": str(output_path),
            "created_at": datetime.utcnow(),
            "image_count": len(images)
        }
        
        return {
            "success": True,
            "timelapse_id": timelapse_id,
            "url": f"/static/timelapses/{timelapse_id}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyze/{image_id}")
async def analyze_image(image_id: str):
    """특정 이미지에 대한 분석 결과를 반환합니다."""
    image = next((img for img in db["images"] if img["id"] == image_id), None)
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return {"success": True, "analysis": image.get("analysis", {})}

@app.post("/api/share/sns")
async def share_to_sns(
    image_id: Optional[str] = None,
    timelapse_id: Optional[str] = None,
    platform: str = "instagram"
):
    """이미지나 타임랩스를 SNS에 공유합니다."""
    try:
        # 실제 SNS API 연동이 필요한 부분 (예시로 가상의 응답 반환)
        if image_id:
            image = next((img for img in db["images"] if img["id"] == image_id), None)
            if not image:
                raise HTTPException(status_code=404, detail="Image not found")
            
            # 여기에 실제 SNS 공유 로직 구현
            return {
                "success": True,
                "message": f"Image shared to {platform}",
                "url": f"/static/{image['filename']}"
            }
        
        elif timelapse_id:
            timelapse = db["timelapses"].get(timelapse_id)
            if not timelapse:
                raise HTTPException(status_code=404, detail="Timelapse not found")
            
            # 여기에 실제 SNS 공유 로직 구현
            return {
                "success": True,
                "message": f"Timelapse shared to {platform}",
                "url": f"/static/timelapses/{timelapse_id}"
            }
        
        else:
            raise HTTPException(status_code=400, detail="Either image_id or timelapse_id must be provided")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 정적 파일 서빙을 위한 엔드포인트
@app.get("/static/{filename}")
async def serve_static(filename: str):
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        return FileResponse(file_path)
    
    file_path = TIMELAPSE_DIR / filename
    if file_path.exists():
        return FileResponse(file_path)
    
    raise HTTPException(status_code=404, detail="File not found")

# 테스트용 루트 엔드포인트
# @app.get("/")
# async def root():
#     return {
#         "message": "Plant Growth Tracker API",
#         "version": "1.0.0",
#         "endpoints": [
#             {"path": "/api/plants/{plant_id}/upload", "method": "POST", "description": "Upload plant image"},
#             {"path": "/api/plants/{plant_id}/images", "method": "GET", "description": "Get plant images"},
#             {"path": "/api/timelapse/create", "method": "POST", "description": "Create timelapse"},
#             {"path": "/api/analyze/{image_id}", "method": "GET", "description": "Analyze plant image"},
#             {"path": "/api/share/sns", "method": "POST", "description": "Share to social media"}
#         ]
#     }

# 애플리케이션 실행 (개발용)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("plant_growth_tracker:app", host="0.0.0.0", port=8000, reload=True)
