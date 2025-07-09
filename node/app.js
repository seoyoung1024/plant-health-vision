const express = require('express');
const app = express();
const path = require('path');

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/PlantGrowthTracker.html'));
});

// API 라우트 (필요한 경우 여기에 직접 라우트를 추가하거나, routes/main.js를 사용)
const apiRoutes = require('./routes/main'); // main.js를 임포트
app.use('/api', apiRoutes); // /api 접두사로 라우트 사용

// 404 처리
app.use((req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});


// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
    console.log(`http://15.168.150.125:${PORT} 에서 접속 가능합니다.`);
});