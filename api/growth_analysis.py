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
    g_channel = image[:, :, 1]
    plant_mask = cv2.inRange(g_channel, 120, 255)
    contours, _ = cv2.findContours(plant_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return 0.0, image

    bottom_area = image[int(height * 0.75):, :]
    gray = cv2.cvtColor(bottom_area, cv2.COLOR_BGR2GRAY)
    _, pot_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    pot_contours, _ = cv2.findContours(pot_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    has_valid_pot = False
    center_x = width // 2

    if pot_contours:
        filtered_pots = []
        for cnt in pot_contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if 0.5 < w / h < 2.0 and h > 10:
                distance_to_center = abs((x + w // 2) - center_x)
                filtered_pots.append((cnt, distance_to_center))
        if filtered_pots:
            pot_cnt, _ = min(filtered_pots, key=lambda item: item[1])
            px, py, pw, ph = cv2.boundingRect(pot_cnt)
            pot_top = int(height * 0.75) + py
            pot_bottom = pot_top + ph
            pot_height = pot_bottom - pot_top
            has_valid_pot = True

    if not has_valid_pot:
        pot_bottom = find_non_white_bottom(image)
        pot_top = pot_bottom - int(height * 0.1)
        pot_height = pot_bottom - pot_top
        px, pw = 0, width

    plant_tops = []
    plant_bottoms = []
    for cnt in contours:
        if cv2.contourArea(cnt) < 100:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        if y + h < pot_bottom:
            plant_tops.append(y)
            plant_bottoms.append(y + h)

    if not plant_tops:
        return 0.0, image

    plant_top = min(plant_tops)
    plant_bottom = max(plant_bottoms)
    plant_height = plant_bottom - plant_top

    ratio = round(plant_height / pot_height, 2)
    ratio = max(1.0, min(ratio, 300.0))

    annotated = image.copy()
    cv2.rectangle(annotated, (0, plant_top), (width, plant_bottom), (0, 255, 0), 2)
    cv2.rectangle(annotated, (px, pot_top), (px + pw, pot_bottom), (255, 0, 0), 2)
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
- 각 시점별 비율: {growth_data['ratios']}
- 성장 차이: {growth_data['growth_diffs']}
- 성장률(%): {growth_data['growth_rates_percent']}
- 요약: {growth_data['summary']}

이 데이터를 바탕으로 식물의 성장 과정을 사용자에게 설명해주는 짧은 리포트를 작성해주세요. 사용자 친화적이고 자연스러운 말투로, 한국어로 작성해주세요.
"""
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
