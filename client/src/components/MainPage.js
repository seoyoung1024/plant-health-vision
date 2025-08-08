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
      title: '식물 식별',
      description: '사진 한 장으로 정확한 식물 이름과 정보를 확인하세요.',
      background: '#D9E4E4',
      image: plantRecommendationImage, 
      buttonText: '식별하기',
      buttonUrl: '/identify',
    },
    {
      title: '식물 추천',
      description: '당신의 공간과 취향에 맞는 식물을 AI가 추천합니다.',
      background: '#D9E4E4',
      buttonText: '내게 맞는 식물 찾기',
      buttonUrl: '/recommend',
    },
    {
      title: '성장 가이드',
      description: '물 주기, 햇빛, 온도 등 최적의 환경 가이드를 제공해요.',
      background: '#D9E4E4',
      buttonText: '가이드 시작하기',
      buttonUrl: '/guide',
    },
    {
      title: '성장 레포트',
      description: 'AI가 분석한 Before/After 리포트를 받아보세요.',
      background: '#D9E4E4',
      buttonText: '샘플 리포트 보기',
      buttonUrl: '/report',
    },
    {
      title: '정원 꾸미기',
      description: 'Unity 기반 가상 정원에서 나만의 정원을 가꿔보세요.',
      background: '#D9E4E4',
      buttonText: '가상 정원 만들기',
      buttonUrl: '/garden',
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
          res.images.map((url) => ({ img: url, name: plantNames[idx] }))
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
      licenseKey={'OPEN-SOURCE-GPLV3-LICENSE'}
      scrollingSpeed={1000}
      navigation
      normalScrollElements=".hero-and-carousel-section" // 첫 섹션 내부 스크롤 허용
      render={() => (
        <ReactFullpage.Wrapper>
          {/* 1. 히어로 및 캐러셀 섹션 */}
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
          
          {/* 2. 주요 기능 소개 섹션들 */}
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="section feature-section-item"
            >
              {/* '식물 식별' 섹션일 때만 2단 레이아웃을 적용 */}
              {feature.title === '식물 식별' ? (
                <>
                  <div className="feature-content-wrapper">
                    
                    <div className="feature-image-wrapper">
                      {feature.image && (
                        <img 
                          src={feature.image} 
                          alt={feature.title} 
                          className="feature-image"
                        />
                      )}
                    </div>

                    <div className="feature-text">
                      <h1 className="feature-title">{feature.title}</h1>
                      <p className="feature-description">{feature.description}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '40px' }}>
                    <a href={feature.buttonUrl} className="btn btn-primary btn-lg">
                      {feature.buttonText}
                    </a>
                  </div>
                </>
              ) : (
                <>
                  {/* 나머지 섹션들은 중앙 정렬 레이아웃 */}
                  <h1>{feature.title}</h1>
                  <p style={{ fontSize: '1.3rem', maxWidth: '600px' }}>{feature.description}</p>
                  
                  {/* '성장 레포트'일 때만 카드 UI를 추가 */}
                  {feature.title === '성장 레포트' && (
                    <div className="features-grid" style={{ marginTop: '40px' }}>
                      <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-camera"></i></div>
                        <h3>Before & After 비교</h3>
                        <p>사진 비교를 통해 식물의 놀라운 변화를 한눈에 확인하세요.</p>
                      </div>
                      <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-chart-line"></i></div>
                        <h3>성장 데이터 분석</h3>
                        <p>키, 잎의 개수 등 성장 데이터를 그래프로 시각화하여 보여드립니다.</p>
                      </div>
                      <div className="feature-card">
                        <div className="feature-icon"><i className="fas fa-book-open"></i></div>
                        <h3>주간/월간 리포트</h3>
                        <p>주기적인 성장 요약 리포트를 통해 관리 상태를 점검하세요.</p>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '40px' }}>
                    <a href={feature.buttonUrl} className="btn btn-outline">
                      {feature.buttonText}
                    </a>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* 3. 푸터 섹션 */}
          <div className="section">
            <footer className="app-footer">
              <div className="footer-content">
                <div className="footer-logo">
                  <i className="fas fa-leaf"></i>
                  <span>PlantVision</span>
                </div>
                <div className="footer-links">
                  <a href="/terms">이용약관</a>
                  <a href="/privacy">개인정보처리방침</a>
                  <a href="/contact">문의하기</a>
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