from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import cv2
import numpy as np
import requests
import tempfile
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from openai import OpenAI
from db import get_db

load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_FOLDER = "plantimage/user_images"
ANNOTATED_FOLDER = "plantimage/user_images/annotated"

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

    if image_key:
        annotated_filename = f"annotated_{os.path.basename(image_key)}"
        annotated_path = os.path.join(tempfile.gettempdir(), annotated_filename)
        cv2.imwrite(annotated_path, annotated)
        s3_annotated_key = f"{ANNOTATED_FOLDER}/{annotated_filename}"
        s3_client.upload_file(annotated_path, S3_BUCKET_NAME, s3_annotated_key)
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
def analyze_growth(plant_id: str):
    image_urls, image_keys = get_presigned_urls_for_plant(plant_id)
    if len(image_urls) < 2:
        raise HTTPException(status_code=400, detail="성장 분석을 위해 최소 2장의 이미지가 필요합니다.")

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

    report = generate_growth_report(plant_id, {
        "ratios": ratios,
        "growth_diffs": growth_diffs,
        "growth_rates_percent": growth_rates,
        "summary": summary
    })

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_plant_growth_reports 
        (user_plant_id, green_area, growth_rate_percent, summary, annotated_image_url, first_image_url, last_image_url, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        1,  # TODO: 실제 user_plant_id로 교체
        0,  # green_area placeholder
        growth_rate_percent,
        summary,
        f"{ANNOTATED_FOLDER}/annotated_{os.path.basename(image_keys[-1])}",
        s3_client.generate_presigned_url("get_object", Params={"Bucket": S3_BUCKET_NAME, "Key": image_keys[0]}, ExpiresIn=3600),
        s3_client.generate_presigned_url("get_object", Params={"Bucket": S3_BUCKET_NAME, "Key": image_keys[-1]}, ExpiresIn=3600),
        datetime.now()
    ))
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "plant_id": plant_id,
        "growth": {
            "ratios": ratios,
            "growth_diffs": growth_diffs,
            "growth_rates_percent": growth_rates,
            "summary": summary,
            "report": report
        }
    }
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

@router.get("/api/growth-report/{plant_id}")
def get_latest_growth_report(plant_id: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM user_plant_growth_reports
        WHERE user_plant_id = %s
        ORDER BY created_at DESC
        LIMIT 1
    """, (1,))  # TODO: 실제 사용자 식물 ID(user_plant_id)로 대체하세요

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="성장 리포트가 없습니다.")

    return {
        "plant_id": plant_id,
        "first_image_url": result["first_image_url"],
        "last_image_url": result["last_image_url"],
        "annotated_url": result["annotated_image_url"],
        "summary": result["summary"],
        "report": result["report"],
        "created_at": result["created_at"]
    }
@router.get("/api/growth-report/all/{plant_id}")
def get_all_growth_reports(plant_id: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM user_plant_growth_reports
        WHERE user_plant_id = %s
        ORDER BY created_at DESC
    """, (1,))  # TODO: 실제 사용자 식물 ID(user_plant_id)로 교체

    results = cursor.fetchall()
    cursor.close()
    conn.close()

    if not results:
        raise HTTPException(status_code=404, detail="리포트가 존재하지 않습니다.")

    return {
        "plant_id": plant_id,
        "reports": [
            {
                "report_id": row["report_id"],
                "summary": row["summary"],
                "report": row.get("report", ""),  # report 컬럼 비어있을 수도 있어서 안전하게 처리
                "first_image_url": row["first_image_url"],
                "last_image_url": row["last_image_url"],
                "annotated_url": row["annotated_image_url"],
                "created_at": row["created_at"],
                "growth_rate_percent": row["growth_rate_percent"]
            } for row in results
        ]
    }
