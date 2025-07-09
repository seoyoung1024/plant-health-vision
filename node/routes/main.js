const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');

// 환경 변수에서 API 기본 URL 가져오기 (기본값: http://localhost:8000)
const API_BASE_URL = process.env.API_BASE_URL || 'http://15.168.150.125:8000';

// 메인 페이지 라우트
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 이미지 업로드 처리 (프록시 역할)
router.post('/api/upload', async (req, res) => {
    try {
        const { plantId } = req.body;
        // 실제로는 multer 같은 미들웨어로 파일 업로드 처리 필요
        // 여기서는 단순히 FastAPI로 포워딩
        const response = await axios.post(
            `${API_BASE_URL}/api/plants/${plantId}/upload`,
            req.body
        );
        res.json(response.data);
    } catch (error) {
        console.error('업로드 오류:', error);
        res.status(500).json({ 
            error: '이미지 업로드 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

// 이미지 목록 조회 (프록시 역할)
router.get('/api/plants/:plantId/images', async (req, res) => {
    try {
        const { plantId } = req.params;
        const response = await axios.get(
            `${API_BASE_URL}/api/plants/${plantId}/images`
        );
        res.json(response.data);
    } catch (error) {
        console.error('이미지 목록 조회 오류:', error);
        res.status(500).json({ 
            error: '이미지 목록을 불러오는 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

// 이미지 분석 요청 (프록시 역할)
router.get('/api/analyze/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        const response = await axios.get(
            `${API_BASE_URL}/api/analyze/${imageId}`
        );
        res.json(response.data);
    } catch (error) {
        console.error('이미지 분석 오류:', error);
        res.status(500).json({ 
            error: '이미지 분석 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

// 타임랩스 생성 요청 (프록시 역할)
router.post('/api/timelapse', async (req, res) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/timelapse/create`,
            req.body
        );
        res.json(response.data);
    } catch (error) {
        console.error('타임랩스 생성 오류:', error);
        res.status(500).json({ 
            error: '타임랩스 생성 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

// SNS 공유 (프록시 역할)
router.post('/api/share', async (req, res) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/share/sns`,
            req.body
        );
        res.json(response.data);
    } catch (error) {
        console.error('SNS 공유 오류:', error);
        res.status(500).json({ 
            error: 'SNS 공유 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

// 정적 파일 제공
router.use(express.static(path.join(__dirname, '../public')));

// 404 처리
router.use((req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

module.exports = router;