from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import cv2
import numpy as np
import requests
import tempfile
import os
import boto3
from dotenv import load_dotenv
from openai import OpenAI
from db import get_db
from utils.auth import get_current_user_id  # 🔐 유저 ID 추출 함수 필요
from utils.auth import get_current_user_id_or_none  # 없는 경우 None 반환하는 함수 추가 필요
from fastapi import Request
from zoneinfo import ZoneInfo
from fastapi import Request


load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_FOLDER = "plantimage/user_images"

s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

def find_non_white_bottom(image: np.ndarray, threshold=240) -> int:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    for y in reversed(range(h)):
        if np.mean(gray[y, :]) < threshold:
            return y
    return h - 1

def extract_plant_pot_ratio(image: np.ndarray) -> (float, np.ndarray):
    height, width = image.shape[:2]

    # ✅ 1. HSV 기반 초록색 필터링
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lower_green = np.array([35, 50, 50])
    upper_green = np.array([85, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)

    # ✅ 2. 잡음 제거 (열림 연산)
    kernel = np.ones((5, 5), np.uint8)
    clean_mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    # ✅ 3. 컨투어 찾기
    contours, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return 0.0, image

    # ✅ 4. 식물 가장 위 + 가장 아래 위치 측정
    ys = []
    for cnt in contours:
        if cv2.contourArea(cnt) < 300:  # 너무 작은 것은 무시
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        ys.append((y, y + h))

    if not ys:
        return 0.0, image

    plant_top = min(y[0] for y in ys)
    plant_bottom = max(y[1] for y in ys)
    plant_height = plant_bottom - plant_top

    # ✅ 5. 화분은 전체 하단 25%로 가정
    pot_top = int(height * 0.75)
    pot_bottom = height
    pot_height = pot_bottom - pot_top

    if pot_height <= 0:
        return 0.0, image

    # ✅ 6. 비율 계산
    ratio = round(plant_height / pot_height, 2)
    ratio = max(1.0, min(ratio, 300.0))  # 너무 낮거나 높으면 잘림 방지

    # ✅ 7. 시각화
    annotated = image.copy()
    cv2.rectangle(annotated, (0, plant_top), (width, plant_bottom), (0, 255, 0), 2)
    cv2.rectangle(annotated, (0, pot_top), (width, pot_bottom), (255, 0, 0), 2)
    cv2.putText(annotated, f"Ratio: {ratio}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

    return ratio, annotated


def analyze_image_from_url(image_url: str, image_key: str = None) -> float:
    response = requests.get(image_url, stream=True)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name
    img = cv2.imread(tmp_path)
    ratio, annotated = extract_plant_pot_ratio(img)
    return ratio

def generate_growth_report(plant_id: str, growth_data: dict) -> str:
    prompt = f"""
        식물 이름: {plant_id}
        식물의 성장률 분석 결과:
        - 각 시점별 비율: {ratios}
        - 성장 차이: {growth_diffs}
        - 성장률(%): {growth_rates_percent}
        - 요약: {summary}

        이 데이터를 바탕으로 사용자에게 친절하게 성장 리포트를 작성해주세요.
        내용에는 다음을 반드시 포함해주세요:

        1. 성장률 데이터를 기반으로 식물의 현재 성장 상태 설명
        2. 두 시점 사진에서 관찰되는 시각적인 변화
        3. 성장이 나타난 원인에 대한 간단한 추측 (예: 물, 햇빛, 온도 등)
        4. 앞으로의 관리 팁이나 권장 사항
        5. 해당 식물의 특징 (성장 속도, 최대 크기, 키우기 쉬운지 여부 등)
        6. 지금 상태 기준으로 앞으로 얼마나 더 성장할 수 있을지 예상

        → 자연스럽고 친절한 말투로, 한국어로 작성해주세요."""
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "당신은 식물 전문가이며 사용자에게 친절하게 성장 리포트를 전달합니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    return response.choices[0].message.content

def get_presigned_urls_for_plant(plant_id: str, max_count: int = 20) -> (List[str], List[str]):
    response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=S3_FOLDER)
    matched_keys = [
        obj["Key"] for obj in response.get("Contents", [])
        if plant_id.lower() in obj["Key"].lower()
        and obj["Key"].lower().endswith(('.jpg', '.jpeg', '.png'))
        and not os.path.basename(obj["Key"]).startswith("annotated_")
    ]
    matched_keys.sort()
    matched_keys = matched_keys[:max_count]
    urls = [
        s3_client.generate_presigned_url("get_object", Params={"Bucket": S3_BUCKET_NAME, "Key": key}, ExpiresIn=3600)
        for key in matched_keys
    ]
    return urls, matched_keys

@router.get("/api/growth-analysis/{plant_id}")
def analyze_growth(plant_id: str, request: Request):
    # ✅ 선택적으로 로그인 시도
    try:
        user_id = get_current_user_id(request)
        print("✅ 로그인된 사용자 ID:", user_id)
    except:
        print("❌ JWT 토큰 없음 → 비로그인")
        user_id = None

    # 이미지 가져오기
    image_urls, image_keys = get_presigned_urls_for_plant(plant_id)
    if len(image_urls) < 2:
        raise HTTPException(status_code=400, detail="성장 분석을 위해 최소 2장의 이미지가 필요합니다.")

    # 분석 수행
    ratios = [analyze_image_from_url(url, key) for url, key in zip(image_urls, image_keys)]
    growth_diffs = [round(ratios[i + 1] - ratios[i], 2) for i in range(len(ratios) - 1)]
    growth_rates = [
        round((diff / ratios[i]) * 100, 1) if ratios[i] else 0
        for i, diff in enumerate(growth_diffs)
    ]

    if ratios[0] == 0:
        growth_rate_percent = 0.0
        summary = "초기 이미지에서 식물이 감지되지 않아 성장률을 계산할 수 없습니다."
    else:
        growth_rate_percent = round((ratios[-1] - ratios[0]) / ratios[0] * 100, 1)
        summary = f"총 성장률 비율 기준: {growth_rate_percent}%"

    # 리포트 생성
    report = generate_growth_report(plant_id, {
        "ratios": ratios,
        "growth_diffs": growth_diffs,
        "growth_rates_percent": growth_rates,
        "summary": summary
    })

    # 이미지 URL 생성
    first_image_url = s3_client.generate_presigned_url(
        "get_object", Params={"Bucket": S3_BUCKET_NAME, "Key": image_keys[0]}, ExpiresIn=3600
    )
    last_image_url = s3_client.generate_presigned_url(
        "get_object", Params={"Bucket": S3_BUCKET_NAME, "Key": image_keys[-1]}, ExpiresIn=3600
    )

    # DB 저장 (로그인 사용자 한정)
    if user_id:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_plant_growth_reports 
            (user_id, plant_name, growth_rate_percent, summary, report, first_image_url, last_image_url, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            plant_id,
            growth_rate_percent,
            summary,
            report,
            first_image_url,
            last_image_url,
            datetime.now(ZoneInfo("Asia/Seoul"))
        ))
        conn.commit()
        cursor.close()
        conn.close()

    # ✅ React에 필요한 구조로 반환
    return {
        "plant_id": plant_id,
        "growth": {
            "ratios": ratios,
            "growth_diffs": growth_diffs,
            "growth_rates_percent": growth_rates,
            "summary": summary,
            "report": report,
            "growth_rate_percent": growth_rate_percent,
            "first_image_url": first_image_url,
            "last_image_url": last_image_url
        }
    }


@router.get("/api/growth-report/all")
def get_all_growth_reports(request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM user_plant_growth_reports
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    results = cursor.fetchall()
    cursor.close()
    conn.close()

    if not results:
        raise HTTPException(status_code=404, detail="리포트가 존재하지 않습니다.")

    return {
        "reports": [
            {
                "report_id": row["report_id"],
                "user_id": row["user_id"],
                "plant_name": row["plant_name"],
                "summary": row["summary"],
                "report": row.get("report", ""),
                "first_image_url": row["first_image_url"],
                "last_image_url": row["last_image_url"],
                "created_at": row["created_at"],
                "growth_rate_percent": row["growth_rate_percent"]
            } for row in results
        ]
    }
