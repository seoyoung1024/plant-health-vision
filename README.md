# Plant Health Vision

식물 성장 모니터링 및 분석을 위한 MSA 기반 서비스

## 서비스 개요

이 프로젝트는 식물의 성장 과정을 타임랩스로 기록하고, AI를 통해 성장을 분석하여 리포트를 제공하는 서비스입니다.

### 주요 기능

1. **이미지 업로드 및 관리**
   - 물을 줄 때마다 식물 사진 업로드
   - 이미지 메타데이터 관리

2. **타임랩스 생성**
   - 누적된 이미지를 기반으로 자동 타임랩스 생성
   - 성장 과정 시각화

3. **AI 성장 분석**
   - 식물의 성장 상태 분석
   - 건강 상태 진단
   - 성장 추이 분석 리포트 생성

4. **SNS 연동**
   - 생성된 타임랩스 및 분석 결과 공유
   - 소셜 미디어 연동

## 기술 스택

- **프론트엔드**: React.js
- **백엔드**: Node.js, Express
- **데이터베이스**: MongoDB
- **캐싱**: Redis
- **AI/ML**: Python, TensorFlow
- **인프라**: Docker, Kubernetes
- **CI/CD**: GitHub Actions

## 아키텍처

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|   Frontend       |<----->|   API Gateway    |<----->|   Microservices  |
|   (React)        |       |   (Node.js)      |       |   (Node.js)      |
|                  |       |                  |       |                  |
+------------------+       +------------------+       +------------------+
                                                              |
                                                              v
                                                    +------------------+
                                                    |                  |
                                                    |   Database       |
                                                    |   (MongoDB)      |
                                                    |                  |
                                                    +------------------+
```

## 서비스 구성 요소

1. **API Gateway**
   - 모든 요청의 진입점
   - 라우팅 및 로드 밸런싱
   - 인증/인가 처리

2. **Image Service**
   - 이미지 업로드 및 저장
   - 이미지 메타데이터 관리

3. **Timelapse Service**
   - 타임랩스 비디오 생성
   - 이미지 시퀀스 관리

4. **AI Analysis Service**
   - 식물 성장 분석
   - 건강 상태 진단
   - 리포트 생성

5. **SNS Integration Service**
   - 소셜 미디어 공유 기능
   - SNS API 연동

## 시작하기

### 사전 요구사항

- Docker
- Docker Compose
- Node.js (로컬 개발용)

### 설치 및 실행

1. 저장소 클론
   ```bash
   git clone https://github.com/your-username/plant-health-vision.git
   cd plant-health-vision
   ```

2. 환경 변수 설정
   ```bash
   cp .env.example .env
   # .env 파일을 수정하여 필요한 환경 변수 설정
   ```

3. 서비스 실행
   ```bash
   docker-compose up -d
   ```

4. 접속
   - 프론트엔드: http://localhost:3000
   - API 문서: http://localhost:3000/api-docs

## API 문서

API 문서는 Swagger를 통해 제공됩니다. 서비스 실행 후 다음 주소에서 확인할 수 있습니다:

```
http://localhost:3000/api-docs
```

## 개발 가이드

### 개발 서버 실행

```bash
# 프론트엔드 개발 서버 실행
cd frontend
npm install
npm start

# 백엔드 개발 서버 실행 (각 서비스별로 실행)
cd services/image-service
npm install
npm run dev
```

### 테스트 실행

```bash
# 프론트엔드 테스트
cd frontend
npm test

# 백엔드 테스트
cd services/image-service
npm test
```

## 기여

1. 이슈를 생성하여 변경사항을 논의합니다.
2. 포크하여 기능 브랜치를 만듭니다.
3. 변경사항을 커밋하고 푸시합니다.
4. Pull Request를 생성합니다.

## 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.