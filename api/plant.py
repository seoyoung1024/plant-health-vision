import os
import cv2
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import json
from pathlib import Path

class PlantGrowthAnalyzer:
    def __init__(self, reference_length_mm: float = 50.0):
        """
        식물 성장 분석기 초기화
        
        Args:
            reference_length_mm: 참조 물체의 실제 길이(mm)
        """
        self.reference_length_mm = reference_length_mm
        self.growth_data = {}
        
    def load_image(self, image_path: str) -> np.ndarray:
        """이미지 로드"""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"이미지를 찾을 수 없습니다: {image_path}")
        return cv2.imread(image_path)
    
    def preprocess_image(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        이미지 전처리
        
        Returns:
            tuple: (전처리된 이미지, 마스크)
        """
        # 그레이스케일 변환
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 가우시안 블러 적용
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Otsu의 이진화
        _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # 모폴로지 연산으로 노이즈 제거
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        return image, mask
    
    def segment_plant(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        색상 기반으로 식물 영역 분할
        
        Returns:
            tuple: (원본 이미지, 마스크)
        """
        # HSV 색공간으로 변환
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # 초록색 범위 정의 (식물 잎 색상)
        lower_green = np.array([25, 40, 40])
        upper_green = np.array([85, 255, 255])
        
        # 마스크 생성
        mask = cv2.inRange(hsv, lower_green, upper_green)
        
        # 모폴로지 연산으로 노이즈 제거
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        return image, mask
    
    def analyze_plant(self, image_path: str, timestamp: Optional[str] = None) -> Dict:
        """
        식물 이미지 분석
        
        Args:
            image_path: 분석할 이미지 경로
            timestamp: 이미지 촬영 시각 (없을 경우 현재 시각 사용)
            
        Returns:
            dict: 분석 결과
        """
        # 이미지 로드
        image = self.load_image(image_path)
        
        # 이미지 전처리
        processed_img, mask = self.preprocess_image(image)
        
        # 식물 영역 분할
        _, plant_mask = self.segment_plant(processed_img)
        
        # 윤곽선 찾기
        contours, _ = cv2.findContours(plant_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            raise ValueError("식물 영역을 찾을 수 없습니다.")
            
        # 가장 큰 영역 선택
        largest_contour = max(contours, key=cv2.contourArea)
        
        # 면적 계산
        area_px = cv2.contourArea(largest_contour)
        
        # 경계 상자
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # 색상 분석
        plant_area = cv2.bitwise_and(image, image, mask=plant_mask)
        hsv_plant = cv2.cvtColor(plant_area, cv2.COLOR_BGR2HSV)
        hue = hsv_plant[:,:,0]
        sat = hsv_plant[:,:,1]
        val = hsv_plant[:,:,2]
        
        # 유효한 픽셀만 선택 (마스크가 0보다 큰 영역)
        mask_indices = np.where(plant_mask > 0)
        if len(mask_indices[0]) > 0:
            avg_hue = np.mean(hue[mask_indices])
            avg_sat = np.mean(sat[mask_indices])
            avg_val = np.mean(val[mask_indices])
        else:
            avg_hue = avg_sat = avg_val = 0
        
        # 결과 생성
        timestamp = timestamp or datetime.now().isoformat()
        result = {
            'timestamp': timestamp,
            'area_px': float(area_px),
            'width_px': float(w),
            'height_px': float(h),
            'aspect_ratio': float(w) / h if h > 0 else 0,
            'color': {
                'hue': float(avg_hue),
                'saturation': float(avg_sat),
                'value': float(avg_val)
            },
            'contour': largest_contour.tolist()  # 나중에 시각화를 위해 저장
        }
        
        # 성장 데이터에 추가
        if timestamp not in self.growth_data:
            self.growth_data[timestamp] = result
            self.save_growth_data()
            
        return result
    
    def analyze_growth(self, image_paths: List[str]) -> List[Dict]:
        """
        여러 이미지를 분석하여 성장 추이 분석
        
        Args:
            image_paths: 분석할 이미지 경로 리스트
            
        Returns:
            list: 각 이미지의 분석 결과 리스트
        """
        results = []
        for img_path in image_paths:
            try:
                result = self.analyze_plant(img_path)
                results.append(result)
            except Exception as e:
                print(f"이미지 분석 중 오류 발생 ({img_path}): {str(e)}")
        
        return results
    
    def save_growth_data(self, file_path: str = "growth_data.json"):
        """성장 데이터를 JSON 파일로 저장"""
        with open(file_path, 'w') as f:
            json.dump(self.growth_data, f, indent=2)
    
    @classmethod
    def load_growth_data(cls, file_path: str = "growth_data.json") -> 'PlantGrowthAnalyzer':
        """저장된 성장 데이터 로드"""
        analyzer = cls()
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                analyzer.growth_data = json.load(f)
        return analyzer
    
    def visualize_analysis(self, image_path: str, output_path: Optional[str] = None) -> np.ndarray:
        """
        분석 결과 시각화
        
        Args:
            image_path: 시각화할 이미지 경로
            output_path: 저장할 경로 (None이면 표시만 함)
            
        Returns:
            np.ndarray: 시각화된 이미지
        """
        # 이미지 로드 및 분석
        image = self.load_image(image_path)
        result = self.analyze_plant(image_path)
        
        # 이미지 복사
        vis = image.copy()
        
        # 윤곽선 그리기
        contour = np.array(result['contour'], dtype=np.int32)
        cv2.drawContours(vis, [contour], -1, (0, 255, 0), 2)
        
        # 경계 상자 그리기
        x, y = int(result['x']), int(result['y'])
        w, h = int(result['width_px']), int(result['height_px'])
        cv2.rectangle(vis, (x, y), (x + w, y + h), (255, 0, 0), 2)
        
        # 정보 텍스트
        text = f"Area: {result['area_px']:.1f} px²"
        cv2.putText(vis, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # 저장 또는 표시
        if output_path:
            cv2.imwrite(output_path, vis)
        else:
            cv2.imshow('Analysis Result', vis)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
            
        return vis

# 사용 예시
if __name__ == "__main__":
    # 분석기 생성
    analyzer = PlantGrowthAnalyzer(reference_length_mm=50.0)
    
    # 단일 이미지 분석
    result = analyzer.analyze_plant("path/to/plant_image.jpg")
    print("분석 결과:", json.dumps(result, indent=2))
    
    # 여러 이미지 일괄 분석
    # image_paths = ["image1.jpg", "image2.jpg", "image3.jpg"]
    # results = analyzer.analyze_growth(image_paths)
    
    # 결과 시각화
    # analyzer.visualize_analysis("path/to/plant_image.jpg", "output.jpg")
    
    # 성장 데이터 저장
    analyzer.save_growth_data("plant_growth_data.json")
    
    # 저장된 데이터 로드
    # loaded_analyzer = PlantGrowthAnalyzer.load_growth_data("plant_growth_data.json")