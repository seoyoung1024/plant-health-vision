const express = require('express');
const router = express.Router();
const axios = require('axios');

// 🌐 FastAPI 서버 주소
const API_BASE_URL = process.env.API_BASE_URL || 'http://15.168.150.125:8000';

// ✅ 회원가입
router.post('/register', async (req, res) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/register`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('회원가입 오류:', error.response?.data || error.message);
    res.status(500).json({
      error: '회원가입 실패',
      detail: error.response?.data || error.message
    });
  }
});

// ✅ 로그인
router.post('/login', async (req, res) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/login`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('로그인 오류:', error.response?.data || error.message);
    res.status(500).json({
      error: '로그인 실패',
      detail: error.response?.data || error.message
    });
  }
});

// ✅ S3에서 식물 이미지 가져오기 (FastAPI 프록시)
router.get('/plant-images/:plantName', async (req, res) => {
  try {
    const { plantName } = req.params;
    const { sample_count } = req.query;

    const response = await axios.get(`${API_BASE_URL}/api/plant-images/${encodeURIComponent(plantName)}?sample_count=${sample_count || 5}`);
    res.json(response.data);
  } catch (error) {
    console.error('식물 이미지 프록시 실패:', error.response?.data || error.message);
    res.status(500).json({
      error: '식물 이미지 가져오기 실패',
      detail: error.response?.data || error.message
    });
  }
});


// ✅ 이미지 업로드
router.post('/upload', async (req, res) => {
  try {
    const { plantId } = req.body;
    const response = await axios.post(`${API_BASE_URL}/api/plants/${plantId}/upload`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: '이미지 업로드 실패', details: error.message });
  }
});

// ✅ 이미지 목록
router.get('/plants/:plantId/images', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/plants/${req.params.plantId}/images`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: '이미지 목록 실패', details: error.message });
  }
});

// ✅ 이미지 분석
router.get('/analyze/:imageId', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/analyze/${req.params.imageId}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: '분석 실패', details: error.message });
  }
});

// ✅ 타임랩스
router.post('/timelapse', async (req, res) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/timelapse/create`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: '타임랩스 실패', details: error.message });
  }
});

// ✅ SNS 공유
router.post('/share', async (req, res) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/share/sns`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: '공유 실패', details: error.message });
  }
});

module.exports = router;
