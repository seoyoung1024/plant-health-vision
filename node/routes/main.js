const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const upload = multer(); // 메모리 저장

// 🌐 FastAPI 주소
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
      detail: error.response?.data || error.message,
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
      detail: error.response?.data || error.message,
    });
  }
});

// ✅ 식물 이미지 가져오기 (S3)
router.get('/plant-images/:plantName', async (req, res) => {
  try {
    const { plantName } = req.params;
    const { sample_count } = req.query;

    const response = await axios.get(
      `${API_BASE_URL}/api/plant-images/${encodeURIComponent(plantName)}?sample_count=${sample_count || 5}`
    );
    res.json(response.data);
  } catch (error) {
    console.error('식물 이미지 프록시 실패:', error.response?.data || error.message);
    res.status(500).json({
      error: '식물 이미지 가져오기 실패',
      detail: error.response?.data || error.message,
    });
  }
});

// ✅ 이미지 업로드 (multipart/form-data)
router.post('/plants/:plantId/upload', upload.single('file'), async (req, res) => {
  try {
    const plantId = req.params.plantId;
    const { notes } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '파일이 첨부되지 않았습니다.' });
    }

    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);
    formData.append('notes', notes || '');

    const response = await axios.post(
      `${API_BASE_URL}/api/plants/${encodeURIComponent(plantId)}/upload`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ 이미지 업로드 프록시 실패:', error.response?.data || error.message);
    res.status(500).json({
      error: '이미지 업로드 실패',
      detail: error.response?.data || error.message,
    });
  }
});

// ✅ 식물 이미지 목록
router.get('/plants/:plantId/images', async (req, res) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/plants/${encodeURIComponent(req.params.plantId)}/images`
    );
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

// ✅ 성장 분석
router.get('/growth-analysis/:plantId', async (req, res) => {
  try {
    const headers = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/growth-analysis/${encodeURIComponent(req.params.plantId)}`,
      { headers }
    );
    res.json(response.data);
  } catch (error) {
    console.error('성장 분석 실패:', error.response?.data || error.message);
    res.status(500).json({ error: '성장 분석 실패', details: error.message });
  }
});

// ✅ 전체 리포트 조회
router.get('/growth-report/all', async (req, res) => {
  try {
    const headers = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const response = await axios.get(`${API_BASE_URL}/api/growth-report/all`, { headers });
    res.json(response.data);
  } catch (error) {
    console.error('전체 리포트 프록시 실패:', error.response?.data || error.message);
    res.status(500).json({
      error: '전체 리포트 불러오기 실패',
      detail: error.response?.data || error.message,
    });
  }
});

// ✅ 특정 식물 리포트 조회
router.get('/growth-report/:plantId', async (req, res) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/growth-report/${encodeURIComponent(req.params.plantId)}`
    );
    res.json(response.data);
  } catch (error) {
    console.error('개별 리포트 프록시 실패:', error.response?.data || error.message);
    res.status(500).json({
      error: '식물 리포트 불러오기 실패',
      detail: error.response?.data || error.message,
    });
  }
});

module.exports = router;
