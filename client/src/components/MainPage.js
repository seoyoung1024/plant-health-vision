import React, { useEffect, useState } from "react";
import '../styles/MainPage.css';
import Carousel from "./Carousel";
import Header from "./Header";
import ReactFullpage from '@fullpage/react-fullpage';
import plantRecommendationImage from '../plant.png'; // 이 경로가 정확한지 다시 한번 확인해 주세요.

const MainPage = () => {
  const plantNames = ["감나무", "개망초", "튤립", "네잎클로바", "안개꽃", "개나리"];
  const [mixedPlantImages, setMixedPlantImages] = useState([]);

  const features = [
    {
      title: '🌿 식물 식별',
      description: '사진 한 장으로 정확한 식물 이름과 정보를 확인하세요.',
      background: '#D9E4E4',
      image: plantRecommendationImage, // ✅ 이 이미지를 아래에서 사용합니다.
    },
    {
      title: '📋 식물 추천',
      description: '당신의 공간과 취향에 맞는 식물을 AI가 추천합니다.',
      background: '#D9E4E4',
    },
    {
      title: '📘 성장 가이드',
      description: '물 주기, 햇빛, 온도 등 최적의 환경 가이드를 제공해요.',
      background: '#D9E4E4',
    },
    {
      title: '📈 성장 레포트',
      description: 'AI가 분석한 Before/After 리포트를 받아보세요.',
      background: '#D9E4E4',
    },
    {
      title: '🌳 정원 꾸미기',
      description: 'Unity 기반 가상 정원에서 나만의 정원을 가꿔보세요.',
      background: '#D9E4E4',
    },
  ];

  useEffect(() => {
    const fetchAllImages = async () => {
      try {
        const responses = await Promise.all(
          plantNames.map((name) =>
            fetch(`/api/plant-images/${name}?sample_count=2`).then((res) => res.json())
          )
        );

        const combined = responses.flatMap((res, idx) =>
          res.images.map((url) => ({
            img: url,
            name: plantNames[idx],
          }))
        );

        const shuffled = combined.sort(() => Math.random() - 0.5);
        setMixedPlantImages(shuffled);
      } catch (err) {
        console.error("캐러셀 이미지 로딩 실패:", err);
      }
    };

    fetchAllImages();
  }, []);

  return (
    <ReactFullpage
      // ✅ 라이선스 키 추가 (오픈소스용. 상업용은 구매 후 키를 입력하세요)
      licenseKey={'OPEN-SOURCE-GPLV3-LICENSE'}
      scrollingSpeed={1000}
      navigation
      normalScrollElements=".hero-and-carousel-section"
      render={() => (
        <ReactFullpage.Wrapper>
          {/* 1. 히어로 및 캐러셀 섹션 (일반 스크롤) */}
          <div className="section hero-and-carousel-section">
            <Header />
            <main className="hero-section">
              <div className="hero-content">
                <h1>식물을 더 스마트하게 관리하세요</h1>
                <p className="subtitle">
                  PlantMate와 함께라면 누구나 식물 관리의 달인이 될 수 있습니다. 지금 바로 시작해보세요!
                </p>
              </div>
            </main>
            <section className="plant-gallery">
              <Carousel mixedData={mixedPlantImages} />
            </section>
          </div>
          
          {/* 2. 주요 기능 소개 섹션 (Fullpage 스크롤) */}
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="section"
              style={{
                backgroundColor: feature.background,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '2rem',
              }}
            >
              <h1 style={{ fontSize: '3rem' }}>{feature.title}</h1>
              <p style={{ fontSize: '1.3rem', maxWidth: '600px' }}>{feature.description}</p>
              
              {/* ✅ 수정된 부분: feature.image가 있을 때만 img 태그를 렌더링 */}
              {feature.image && (
                <img 
                  src={feature.image} 
                  alt={feature.title} 
                  style={{ 
                    width: '200px', 
                    height: 'auto', 
                    marginTop: '20px', 
                    borderRadius: '10px' 
                  }} 
                />
              )}
            </div>
          ))}

          {/* 3. 푸터 섹션 (Fullpage 스크롤) */}
          <div className="section">
            <footer className="app-footer">
              <div className="footer-content">
                <div className="footer-logo">
                  <i className="fas fa-leaf"></i>
                  <span>PlantVision</span>
                </div>
                <div className="footer-links">
                  <a href="#">이용약관</a>
                  <a href="#">개인정보처리방침</a>
                  <a href="#">문의하기</a>
                </div>
                <div className="social-links">
                  <a href="#" aria-label="Facebook"><i className="fab fa-facebook"></i></a>
                  <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                  <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                </div>
              </div>
              <div className="copyright">
                &copy; 2025 PlantVision. All rights reserved.
              </div>
            </footer>
          </div>
        </ReactFullpage.Wrapper>
      )}
    />
  );
};

export default MainPage;