import React, { useEffect, useRef, useState } from "react";
import "./MainPage.css";

const Header = () => {
    return (
    <div>
        {/* 헤더 영역 */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></link>
      <title>PlantMate</title>
      <header className="app-header">
        <div className="logo">
          <i className="fas fa-leaf"></i>
          <span>PlantMate</span>
        </div>
        <nav className="main-nav">
          <a href="#" className="nav-link active">홈</a>
          <a href="#" className="nav-link">식물 관리</a>
          <a href="#" className="nav-link">기능 소개</a>
          <a href="#" className="nav-link">문의하기</a>
        </nav>
        <div className="auth-buttons">
          <a href="#" className="btn btn-outline">로그인</a>
          <a href="Register" className="btn btn-primary">회원가입</a>
        </div>
      </header>
    </div>
    )
}

export default Header;