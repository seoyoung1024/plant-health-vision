from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
import os
import uuid
import shutil
import subprocess
import numpy as np
from PIL import Image
import io
import base64
import requests
import imageio.v3 as iio
import tempfile
from pathlib import Path
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import mysql.connector
from datetime import datetime, timedelta, timezone
import boto3
import random
import urllib.parse
from dotenv import load_dotenv
from botocore.exceptions import ClientError
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from fastapi.openapi.utils import get_openapi
from growth_analysis import router as growth_router
from db import db


# 앱 생성
app = FastAPI()
load_dotenv()

app.include_router(growth_router)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def verify_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="유효하지 않은 인증 정보입니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email  # 필요하면 사용자 조회해서 반환 가능
    except JWTError:
        raise credentials_exception

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Plant Growth Tracker API",
        version="1.0.0",
        description="식물 성장 추적 및 인증 API",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    for path in openapi_schema["paths"].values():
        for operation in path.values():
            operation["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi


# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 한국 시간대 (KST)
KST = timezone(timedelta(hours=9))
def get_kst_now():
    return datetime.now(KST)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
ALGORITHM = "HS256"


AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_FOLDER = os.getenv("S3_FOLDER")



s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

@app.get("/api/plant-images/{plant_name}")
def get_plant_images(plant_name: str, sample_count: int = 10):
    """
    Presigned URL을 사용해 s3에서 식물 이름에 해당하는 이미지 반환
    """
    try:
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=S3_FOLDER)

        if "Contents" not in response:
            return {"images": []}

        matched_keys = [
            obj["Key"] for obj in response["Contents"]
            if plant_name in obj["Key"] and obj["Key"].lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        random.shuffle(matched_keys)
        sampled_keys = matched_keys[:sample_count]

        image_urls = []

        for key in sampled_keys:
            try:
                presigned_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": S3_BUCKET_NAME, "Key": key},
                    ExpiresIn=3600  # 1시간 유효
                )
                image_urls.append(presigned_url)
            except ClientError as e:
                print(f"Error generating URL for {key}: {e}")
                continue

        return {"images": image_urls}

    except Exception as e:
        print(f"🔥 서버 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# DB 연결 함수
def get_db():
    return mysql.connector.connect(
        host="15.168.150.125",
        port=3306,
        user="root",
        password="1234",
        database="plant_data"
    )

# JWT 생성 함수
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 모델 정의
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str


# ✅ 회원가입
@app.post("/api/register")
async def register_user(user: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")
    hashed_pw = pwd_context.hash(user.password)
    cursor.execute(
        "INSERT INTO users (email, hashed_password, created_at) VALUES (%s, %s, %s)",
        (user.email, hashed_pw, get_kst_now())
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"success": True, "message": "회원가입이 완료되었습니다."}

# ✅ 로그인 (토큰 발급)
@app.post("/api/login", response_model=Token)
async def login(request: LoginRequest):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (request.email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not pwd_context.verify(request.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="잘못된 이메일 또는 비밀번호입니다.")

    access_token = create_access_token({"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


# ✅ 로그인
@app.get("/api/login")
async def get_profile(current_user_email: str = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (current_user_email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    
    return {
        "email": user["email"],
        "created_at": user["created_at"]
    }


# 디렉토리 설정
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
ANNOTATED_DIR = UPLOAD_DIR / "annotated"  # ✅ 추가
UPLOAD_DIR.mkdir(exist_ok=True)
ANNOTATED_DIR.mkdir(exist_ok=True)  # ✅ 이 부분도 추가

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory=str(UPLOAD_DIR)), name="static")
app.mount("/static/annotated", StaticFiles(directory=str(ANNOTATED_DIR)), name="annotated")

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


# 유틸리티 함수
def save_upload_file(upload_file: UploadFile, destination: Path, plant_id: str) -> str:
    """업로드된 파일을 날짜+식물ID로 저장하고 경로를 반환합니다."""
    file_extension = Path(upload_file.filename).suffix
    now_str = get_kst_now().strftime("%Y%m%d_%H%M%S")
    safe_plant_id = plant_id.replace(" ", "_")  # 공백 등 제거
    filename = f"{now_str}_{safe_plant_id}{file_extension}"
    file_path = destination / filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return filename


def analyze_plant_health(image_path: Path) -> dict:
    """식물 이미지를 분석하여 건강 상태를 반환하고 시각화 이미지를 저장합니다."""

    # ✅ 1. 이미지 열기
    image = Image.open(image_path).convert("RGB")
    annotated = image.copy()

    # ✅ 2. 시각화 처리 예시 (빨간 사각형 추가)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(annotated)
    draw.rectangle([(50, 50), (150, 150)], outline="red", width=5)  # 예시 박스

    # ✅ 3. 저장 경로 구성
    annotated_filename = f"annotated_{image_path.name}"
    annotated_path = ANNOTATED_DIR / annotated_filename

    # ✅ 4. 이미지 저장
    annotated.save(annotated_path)

    # ✅ 5. 분석 결과 리턴 (시각화 이미지 경로 포함 가능)
    return {
        "health_score": 85,
        "growth_stage": "성장기",
        "issues": ["수분 부족 의심"],
        "recommendations": ["물 주기를 줄여보세요."],
        "annotated_url": f"/static/annotated/{annotated_filename}"  # 👈 프론트엔드에서 띄우기 쉬움
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
    try:
        # 1. 디렉토리 확인
        if not UPLOAD_DIR.exists():
            print("📁 업로드 디렉토리 생성")
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # 2. 파일 저장
        file_extension = Path(file.filename).suffix
        if file_extension.lower() not in ['.jpg', '.jpeg', '.png', '.bmp']:
            raise HTTPException(status_code=400, detail="이미지 파일만 허용됩니다.")

        filename = save_upload_file(file, UPLOAD_DIR, plant_id)
        file_path = UPLOAD_DIR / filename


        print("✅ 파일 저장 완료")

        # 3. 이미지 분석
        analysis = analyze_plant_health(file_path)
        print("🧪 분석 완료:", analysis)

        # 4. 메타데이터 구성
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

        # 5. DB 구조 확인 및 저장
        if "images" not in db:
            db["images"] = []

        db["images"].append(image_data)

        if "plants" not in db:
            db["plants"] = {}

        if plant_id not in db["plants"]:
            db["plants"][plant_id] = {
                "id": plant_id,
                "created_at": datetime.utcnow(),
                "images": []
            }

        db["plants"][plant_id]["images"].append(image_id)

        print("💾 DB 저장 완료")
        return {
            "success": True,
            "image_id": image_id,
            "analysis": analysis
        }

    except Exception as e:
        print("❌ 서버 오류:", str(e))
        raise HTTPException(status_code=500, detail=f"서버 오류 발생: {str(e)}")

@app.get("/api/plants/{plant_id}/images")
async def get_plant_images(plant_id: str):
    """특정 식물의 모든 이미지 목록을 반환합니다."""
    if plant_id not in db["plants"]:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    images = [img for img in db["images"] if img["plant_id"] == plant_id]
    return {"success": True, "images": images}

# @app.post("/api/timelapse/create")
# async def create_plant_timelapse(request: TimelapseRequest):
#     """식물의 타임랩스 비디오를 생성합니다."""
#     try:
#         # 식물 이미지 필터링
#         images = [img for img in db["images"] if img["plant_id"] == request.plant_id]
        
#         # 날짜 필터 적용
#         if request.start_date:
#             images = [img for img in images if img["created_at"] >= request.start_date]
#         if request.end_date:
#             images = [img for img in images if img["created_at"] <= request.end_date]
        
#         # 생성일 기준 정렬
#         images.sort(key=lambda x: x["created_at"])
        
#         if not images:
#             raise HTTPException(status_code=400, detail="No images found for the specified criteria")
        
#         # 타임랩스 생성
#         timelapse_id = f"timelapse_{request.plant_id}_{uuid.uuid4()}.mp4"
#         output_path = TIMELAPSE_DIR / timelapse_id
        
#         image_paths = [Path(img["path"]) for img in images]
#         create_timelapse(image_paths, output_path)
        
#         # 타임랩스 정보 저장
#         db["timelapses"][timelapse_id] = {
#             "id": timelapse_id,
#             "plant_id": request.plant_id,
#             "path": str(output_path),
#             "created_at": datetime.utcnow(),
#             "image_count": len(images)
#         }
        
#         return {
#             "success": True,
#             "timelapse_id": timelapse_id,
#             "url": f"/static/timelapses/{timelapse_id}"
#         }
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/api/analyze/{image_id}")
# async def analyze_image(image_id: str):
#     """특정 이미지에 대한 분석 결과를 반환합니다."""
#     image = next((img for img in db["images"] if img["id"] == image_id), None)
    
#     if not image:
#         raise HTTPException(status_code=404, detail="Image not found")
    
#     return {"success": True, "analysis": image.get("analysis", {})}

# @app.post("/api/share/sns")
# async def share_to_sns(
#     image_id: Optional[str] = None,
#     timelapse_id: Optional[str] = None,
#     platform: str = "instagram"
# ):
#     """이미지나 타임랩스를 SNS에 공유합니다."""
#     try:
#         # 실제 SNS API 연동이 필요한 부분 (예시로 가상의 응답 반환)
#         if image_id:
#             image = next((img for img in db["images"] if img["id"] == image_id), None)
#             if not image:
#                 raise HTTPException(status_code=404, detail="Image not found")
            
#             # 여기에 실제 SNS 공유 로직 구현
#             return {
#                 "success": True,
#                 "message": f"Image shared to {platform}",
#                 "url": f"/static/{image['filename']}"
#             }
        
#         elif timelapse_id:
#             timelapse = db["timelapses"].get(timelapse_id)
#             if not timelapse:
#                 raise HTTPException(status_code=404, detail="Timelapse not found")
            
#             # 여기에 실제 SNS 공유 로직 구현
#             return {
#                 "success": True,
#                 "message": f"Timelapse shared to {platform}",
#                 "url": f"/static/timelapses/{timelapse_id}"
#             }
        
#         else:
#             raise HTTPException(status_code=400, detail="Either image_id or timelapse_id must be provided")
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

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
