import React, { useState } from 'react';
import Header from "./Header";
import './Register.css'; // CSS 파일 임포트

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert('로그인 성공!');
        console.log('JWT 토큰:', data.access_token); // 토큰 저장 예시
        // 예: localStorage.setItem('token', data.access_token);
      } else {
        alert(data.detail || '로그인 실패');
      }
    } catch (error) {
      alert('에러 발생: ' + error.message);
    }
  };

  return (
    <biv>
      <Header />
       <div className="register-container">
    <form className="register-form" onSubmit={handleLogin}>
      <h2>로그인</h2>
       <div className="input-group">
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      </div>
       <div className="input-group">
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      </div>
      <button type="submit" className="register-button">로그인</button>
    </form>
    </div>
    </biv>
  );
};

export default Login;
