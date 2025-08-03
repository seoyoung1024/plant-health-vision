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
        host="13.208.122.37",
        port=3306,
        user="testuser",
        password="1234",
        database="plantmate"
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
    user_id: int

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    address: Optional[str] = None  # address 필드 추가


class LoginRequest(BaseModel):
    email: str
    password: str


# ✅ 회원가입
@app.post("/api/register")
async def register_user(user: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE email = %s", (user.email,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")
    
    hashed_pw = pwd_context.hash(user.password)

    cursor.execute(
        "INSERT INTO users (email, hashed_password, address, created_at) VALUES (%s, %s, %s, %s)",
        (user.email, hashed_pw, user.address, get_kst_now())
    )
    conn.commit()
    cursor.close()
    conn.close()

    return {"success": True, "message": "회원가입이 완료되었습니다."}


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

    # JWT에는 여전히 email 또는 id를 sub로 포함 (선택)
    access_token = create_access_token({"sub": str(user["user_id"])})  # 👈 여기서 id를 sub로

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user["user_id"]  # ✅ 응답에 포함!
    }


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

    print(f"✅ 로그인된 사용자 ID: {user['user_id']}")
    
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

    # ✅ 3. 저장 경로 구성
    annotated_filename = f"annotated_{image_path.name}"
    annotated_path = ANNOTATED_DIR / annotated_filename

    # ✅ 4. 이미지 저장
    annotated.save(annotated_path)

    # ✅ 5. 분석 결과 리턴 (시각화 이미지 경로 포함 가능)


# presigned URL 생성 함수
def create_presigned_url(bucket_name, object_name, expiration=604800):  # ⏱️ 7일 = 60*60*24*7
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket_name, 'Key': object_name},
        ExpiresIn=expiration
    )

@app.post("/api/plants/{plant_id}/upload")
async def upload_plant_image(
    plant_id: str,
    file: UploadFile = File(...),
    notes: str = Form("")
    
):
    try:
        ext = Path(file.filename).suffix
        if ext.lower() not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

        timestamp = get_kst_now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{plant_id}{ext}"
        s3_key = f"plantimage/user_images/{filename}"  


        # S3 업로드
        s3_client.upload_fileobj(file.file, S3_BUCKET_NAME, s3_key)
        print("✅ S3 업로드 성공:", s3_key)

        # presigned URL 생성
        s3_url = create_presigned_url(S3_BUCKET_NAME, s3_key)
        print("🔗 presigned URL 생성됨:", s3_url)

        image_id = str(uuid.uuid4())
        image_data = {
            "id": image_id,
            "plant_id": plant_id,
            "filename": filename,
            "s3_key": s3_key,
            "s3_url": s3_url,
            "notes": notes,
            "created_at": datetime.utcnow()
        }
        return {
            "success": True,
            "image_id": image_id,
            "s3_url": s3_url
        }

    except Exception as e:
        print("❌ 업로드 실패:", str(e))
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@app.get("/api/plants/{plant_id}/images")
async def get_plant_images(plant_id: str):
    """S3에서 plant_id와 관련된 이미지 목록을 presigned URL로 반환합니다."""
    try:
        prefix = f"plantimage/user_images/"
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=prefix)

        if "Contents" not in response:
            return {"success": True, "images": []}

        images = []
        for obj in response["Contents"]:
            key = obj["Key"]
            if plant_id.lower() in key.lower() and key.lower().endswith((".jpg", ".jpeg", ".png")):
                url = create_presigned_url(S3_BUCKET_NAME, key)
                images.append({
                    "filename": key.split("/")[-1],
                    "s3_key": key,
                    "presigned_url": url,
                    "created_at": obj.get("LastModified")
                })

        if not images:
            raise HTTPException(status_code=404, detail="해당 식물의 이미지가 없습니다.")
        
        return {"success": True, "images": images}

    except Exception as e:
        print("🔥 이미지 로딩 오류:", e)
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


# 애플리케이션 실행 (개발용)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("plant_growth_tracker:app", host="0.0.0.0", port=8000, reload=True) 