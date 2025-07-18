import React, { useState } from 'react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://15.168.150.125:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert('회원가입 성공!');
      } else {
        alert(data.detail || '회원가입 실패');
      }
    } catch (error) {
      alert('에러 발생: ' + error.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
              {/* 헤더 영역 */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></link>
      <header className="app-header">
        <div className="logo">
          <i className="fas fa-leaf"></i>
          <span>PlantMate</span>
        </div>
        <nav className="main-nav">
          <a href="#" className="nav-link active">홈</a>
          <a href="/plant-tracker" className="nav-link">식물 관리</a>
          <a href="#" className="nav-link">기능 소개</a>
          <a href="#" className="nav-link">문의하기</a>
        </nav>
        <div className="auth-buttons">
          <a href="Register" className="btn btn-outline">로그인</a>
          <a href="#" className="btn btn-primary">회원가입</a>
        </div>
      </header>
      <h2>회원가입</h2>
      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br /><br />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br /><br />
        <button type="submit">가입하기</button>
      </form>
    </div>
  );
};

export default Register;
