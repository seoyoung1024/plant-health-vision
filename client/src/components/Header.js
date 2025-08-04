import React, { useEffect, useState } from "react";
import "../styles/MainPage.css";
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // 로그아웃 함수
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/"); // 홈으로 이동
  };

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <title>PlantMate</title>
      <header className="app-header">
        <Link
          to="/"
          className="logo"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="logo">
            <i className="fas fa-leaf"></i>
            <span>PlantMate</span>
          </div>
        </Link>

        <nav className="main-nav">
          <a href="/" className="nav-link active">
            홈
          </a>
          <Link to="/plantgrowthtracker" className="nav-link">
            식물 성장
          </Link>
        <button
          className="nav-link"
          onClick={(e) => {
            console.log("클릭됨");
            e.preventDefault();

            const token = localStorage.getItem("token");

            if (!token) {
              alert("로그인이 필요합니다.");
              return;
            }

            // Unity 페이지 새 창 열기
            const unityWindow = window.open("/garden", "_blank");
            console.log("🪟 unityWindow 객체:", unityWindow);  // ← 이거 꼭 추가
                // 🔍 확인용 로그 추가
            console.log("🔊 window.open 실행됨");
            console.log("📦 보내는 token:", token);
            // 로딩 후 메시지 전달
            setTimeout(() => {
              if (!unityWindow) {
            console.warn("❌ unityWindow가 null입니다. 팝업 차단 또는 CORS 문제");
            return;
          }
              console.log("🚀 postMessage 실행");
              unityWindow.postMessage(
                {
                  type: "LOGIN_INFO",
                  token: token,
                },
                "https://plantmate.site"
              );
            }, 2000);
          }}
        >
          정원 꾸미기
        </button>

          <a href="http://15.168.150.125:3001/" className="nav-link">
            식물 추천
          </a>
        </nav>

        <div className="auth-buttons">
          {isLoggedIn ? (
            <button className="btn btn-outline" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">
                로그인
              </Link>
              <Link to="/register" className="btn btn-primary">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>
    </div>
  );
};

export default Header;
