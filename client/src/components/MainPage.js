import React, { useEffect, useState } from "react";
import "../styles/MainPage.css";
import Carousel from "./Carousel";
import Header from "./Header";
import ReactFullpage from "@fullpage/react-fullpage";

// 이미지 에셋
import plantRecommendationImage from "../chatgptplant.png";
import monsteraImg from "../monstera.png";
import sansevieriaPng from "../sansevieria.png";
import monsteraCardPng from "../monstera2.png";
import pothosPng from "../pothos.png";
import rose from "../1003.png";
import dandelion from "../1004.png";
import flower from "../1002.png";
import gardenBg from "../garden-bg.png"; // <- 방금 이미지 저장한 경로

const MainPage = () => {
  const plantNames = ["감나무", "개망초", "튤립", "네잎클로바", "안개꽃", "개나리"];
  const [mixedPlantImages, setMixedPlantImages] = useState([]);

  const features = [
    {
      title: "식물 식별",
      description: "사진 한 장으로 정확한 식물 이름과 정보를 확인하세요.",
      background: "#D9E4E4",
      image: plantRecommendationImage,
      buttonText: "식별하기",
      buttonUrl: "http://15.168.150.125:3005/",
    },
    {
      title: "식물 추천",
      description: "당신의 공간과 취향에 맞는 식물을 AI가 추천합니다.",
      background: "#D9E4E4",
      buttonText: "내게 맞는 식물 찾기",
      buttonUrl: "/plantrecommend",
    },
    {
      title: "성장 가이드",
      description: "물 주기, 햇빛, 온도 등 최적의 환경 가이드를 제공해요.",
      background: "#D9E4E4",
      buttonText: "추천받기",
      buttonUrl: "/plantrecommend/#/care",
    },
    {
      title: "성장 리포트",
      description: "AI가 분석한 Before/After 리포트를 받아보세요.",
      background: "#D9E4E4",
      buttonText: "성장 리포트 받기",
      buttonUrl: "/plantgrowthtracker",
    },
    {
      title: "정원 꾸미기",
      description: "Unity 기반 가상 정원에서 나만의 정원을 가꿔보세요.",
      background: "#D9E4E4",
      buttonText: "정원 꾸미기",
      buttonUrl: "https://plantmate.site/garden",
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
      licenseKey="OPEN-SOURCE-GPLV3-LICENSE"
      autoScrolling={true}
      fitToSection={true}
      scrollBar={false}             // 브라우저 기본 스크롤 끄기
      bigSectionsDestination="top"
      navigation
      credits={{ enabled: false }}
      render={() => (
        <ReactFullpage.Wrapper>
          {/* 1) 히어로 + 캐러셀 */}
          <div className="section hero-and-carousel-section">
            <Header />
            <main className="hero-section">
              <div className="hero-content">
                <h1>식물을 더 스마트하게 관리하세요</h1>
                <p className="subtitle">
                  PlantMate와 함께라면 누구나 식물 관리의 달인이 될 수 있습니다.
                  지금 바로 시작해보세요!
                </p>
              </div>
            </main>
            <section className="plant-gallery">
              <Carousel mixedData={mixedPlantImages} />
            </section>
          </div>

          {/* 2) 기능 섹션들 */}
          {features.map((feature, idx) => (
            <div key={idx} className="section feature-section-item">
              {feature.title === "식물 식별" ? (
                /* --- 식물 식별 --- */
                <section className="feature-section-item identify-section">
                  <div className="identify-grid">
                    <div className="identify-visual">
                      {feature.image && (
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="feature-image reveal-up delay-2"
                        />
                      )}
                    </div>

                    <div className="identify-text">
                      <h1 className="feature-title reveal-down">식물 식별</h1>
                      <p className="feature-description reveal-down delay-1">
                        사진 한 장으로 정확한 식물 이름과 정보를 확인하세요.
                      </p>

                      <div className="identify-steps reveal-down delay-2">
                        <div className="step"><i className="fas fa-camera" /><span>사진 업로드</span></div>
                        <div className="step-sep">›</div>
                        <div className="step"><i className="fas fa-brain" /><span>AI 분석</span></div>
                        <div className="step-sep">›</div>
                        <div className="step"><i className="fas fa-seedling" /><span>결과 확인</span></div>
                      </div>

                      <div className="identify-card reveal-down delay-3">
                        <div className="card-icon"><i className="fas fa-leaf" /></div>
                        <div className="pcard-body">
                          <div className="card-title">알로카시아</div>
                          <div className="card-desc">실내에서도 잘 자라는 음지 식물</div>
                        </div>
                      </div>

                      <div className="reveal-down delay-4" style={{ marginTop: 40 }}>
                        <a href={feature.buttonUrl} className="button-identify">
                          {feature.buttonText}
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              ) : feature.title === "식물 추천" ? (
                /* --- 식물 추천(카드형) --- */
                <section className="recommend-section">
                  <div className="recommend-grid">
                    {/* LEFT: 텍스트 */}
                    <div className="recommend-text">
                      <h1 className="reveal-down">맞춤형 식물 추천</h1>
                      <p className="reveal-down delay-1">
                        공간 조건과 취향을 입력하면 AI가 어울리는 식물을 제안합니다.
                      </p>
                      <div className="recommend-steps reveal-down delay-2">
                        <span>환경 입력</span>
                        <span className="sep">›</span>
                        <span>AI 분석</span>
                        <span className="sep">›</span>
                        <span>추천 결과</span>
                      </div>
                      <a href={feature.buttonUrl} className="button-identify reveal-down delay-3">
                        {feature.buttonText}
                      </a>
                    </div>

                    {/* RIGHT: 추천 카드 3개 */}
                    <div className="recommend-cards-wrapper">
                      <div className="recommend-cards">
                        <div className="rec-card reveal-up delay-1">
                          <img className="rec-thumb-img" src={sansevieriaPng} alt="산세베리아" />
                          <div className="rec-name">산세베리아</div>
                          <div className="rec-desc">통풍 좋은 곳, 물 적게</div>
                        </div>
                        <div className="rec-card reveal-up delay-2">
                          <img className="rec-thumb-img" src={monsteraCardPng} alt="몬스테라" />
                          <div className="rec-name">몬스테라</div>
                          <div className="rec-desc">밝은 간접광, 지지대 추천</div>
                        </div>
                        <div className="rec-card reveal-up delay-3">
                          <img className="rec-thumb-img" src={pothosPng} alt="포토스" />
                          <div className="rec-name">포토스</div>
                          <div className="rec-desc">초보자 친화, 다양한 환경</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : feature.title === "성장 가이드" ? (
                /* --- 성장 가이드 --- */
                <section className="guide-section">
                  <div className="guide-grid">
                    <div className="guide-visual">
                      <div className="guide-plant-wrap reveal-up">
                        <div className="guide-circle" aria-hidden="true" />
                        <img src={monsteraImg} alt="몬스테라" className="guide-plant" />
                      </div>
                      <div className="guide-bubbles">
                        <div className="bubble bubble-sm reveal-down delay-1">몬스테라</div>
                        <div className="bubble bubble-lg reveal-down delay-2">밝은 간접광이 필요합니다</div>
                        <div className="bubble bubble-sm reveal-down delay-3">지지대 설치</div>
                      </div>
                    </div>

                    <div className="guide-text">
                      <h1 className="guide-title reveal-down">식물 성장 가이드</h1>
                      <p className="guide-desc reveal-down delay-1">
                        물 주기, 햇빛, 온도 등 최적의 환경 가이드를 제공해줍니다.
                      </p>
                      <a href={feature.buttonUrl} className="button-identify reveal-down delay-2">
                        가이드 받기
                      </a>
                    </div>
                  </div>
                </section>
                            ) : feature.title === "정원 꾸미기" ? (
                <section className="garden-section">
                  <div className="garden-grid">
                    {/* LEFT: 미니 배치 캔버스 */}
                    <div className="garden-visual reveal-up">
                      <div
                        className="garden-canvas"
                        style={{
                          backgroundImage: `url(${gardenBg})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      >

                        {/* 더미 식물 토큰 */}
                          {/* 더미 식물 토큰 → 예시 식물 이미지 */}
                          <div className="plant-token pt1 delay-2">
                            <img src={rose} alt="장미" />
                          </div>
                          <div className="plant-token pt2">
                            <img src={dandelion} alt="민들레" />
                          </div>
                          <div className="plant-token pt3">
                            <img src={flower} alt="꽃" />
                          </div>
                      </div>
                    </div>

                    {/* RIGHT: 카피/스텝/버튼 */}
                    <div className="garden-text">
                      <h1 className="reveal-down delay-1">가상 정원 꾸미기</h1>
                      <p className="reveal-down delay-1">
                        사용자가 찍은 식물 사진을 픽셀화하여 정원을 꾸밀 수 있습니다.
                      </p>

                      {/* 장점 3가지 */}
                      <div className="garden-perks ">
                        <div className="perk">
                          <i className="fas fa-grip delay-1"></i>
                          <div>
                            <div className="perk-title delay-1">정원 구경하기</div>
                            <div className="perk-desc">키보드 키로 자유롭게 이동하며 정원을 구경할 수 있습니다.</div>
                          </div>
                        </div>
                        <div className="perk">
                          <i className="fas fa-clone"></i>
                          <div>
                            <div className="perk-title">식물 배치</div>
                            <div className="perk-desc">사용자가 선택한 식물이 픽셀화되어 배치할 수 있습니다.</div>
                          </div>
                        </div>
                        <div className="perk">
                          <i className="fas fa-save"></i>
                          <div>
                            <div className="perk-title">저장</div>
                            <div className="perk-desc">사용자 별로 정원을 저장합니다.</div>
                          </div>
                        </div>
                      </div>
                      <a href={feature.buttonUrl} className="button-garden delay-3">
                        {feature.buttonText}
                      </a>
                    </div>
                  </div>
                </section>
              ) : (
                /* --- 기본(성장 리포트 등) --- */
                <>
                  <h1
                    className={
                      feature.title === "성장 리포트"
                        ? "growth-report-heading reveal-down delay-1"
                        : ""
                    }
                  >
                    {feature.title}
                  </h1>
                  <p
                    className={
                      feature.title === "성장 리포트"
                        ? "growth-report-p reveal-down delay-2"
                        : ""
                    }
                    style={{ fontSize: "1.3rem", maxWidth: 600 }}
                  >
                    {feature.description}
                  </p>
                  {feature.title === "성장 리포트" && (
                    <div className="growth-report-section" style={{ marginTop: 40 }}>
                      <div className="growth-report-grid">
                        <div className="growth-report-card reveal-up delay-1">
                          <div className="growth-report-icon"><i className="fas fa-camera" /></div>
                          <h3 className="growth-report-title">Before & After 비교</h3>
                          <p className="growth-report-desc">사진 비교로 변화를 한눈에 확인하세요.</p>
                        </div>

                        <div className="growth-report-card reveal-up delay-2">
                          <div className="growth-report-icon"><i className="fas fa-chart-line" /></div>
                          <h3 className="growth-report-title">성장 데이터 분석</h3>
                          <p className="growth-report-desc">키/잎 수 등 데이터를 그래프로 시각화</p>
                        </div>

                        <div className="growth-report-card reveal-up delay-3">
                          <div className="growth-report-icon"><i className="fas fa-book-open" /></div>
                          <h3 className="growth-report-title">주간/월간 리포트</h3>
                          <p className="growth-report-desc">주기적인 요약 리포트로 관리 상태 점검.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 40 }}>
                    <a href={feature.buttonUrl} className="button-identify-report">
                      {feature.buttonText}
                    </a>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* 3) 푸터 */}
          <div className="section footer-section">
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
                  <a href="#" aria-label="Facebook"><i className="fab fa-facebook" /></a>
                  <a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a>
                  <a href="#" aria-label="Twitter"><i className="fab fa-twitter" /></a>
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
