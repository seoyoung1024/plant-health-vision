import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import Register from './components/Register'; // 🔹 Register 컴포넌트 불러오기
import Login from './components/Login';
import PlantGrowthTracker from './components/PlantGrowthTracker';
// import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/register" element={<Register />} /> {/* 🔹 회원가입 경로 추가 */}
        <Route path="/login" element={<Login />} /> {/* 🔹 로그인 경로 추가 */}  
        <Route path="/plantgrowthtracker" element={<PlantGrowthTracker />} />
        {/* <BrowserRouter basename="/home">
            <App />
        </BrowserRouter> */}
      </Routes>
    </Router>
  );
}

export default App;
