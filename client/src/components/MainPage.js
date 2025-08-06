// import React, { useEffect, useState } from "react";
// import '../styles/MainPage.css';
// import Carousel from "./Carousel";
// import Header from "./Header";
// import ReactFullpage from '@fullpage/react-fullpage'; // ✅ 진짜 fullpage

// const MainPage = () => {
//   const plantNames = ["감나무", "개망초", "튤립", "네잎클로바", "안개꽃", "개나리"];
//   const [mixedPlantImages, setMixedPlantImages] = useState([]);

//   const features = [
//     {
//       title: '🌿 식물 식별',
//       description: '사진 한 장으로 정확한 식물 이름과 정보를 확인하세요.',
//       background: '#e0f7fa',
//     },
//     {
//       title: '📋 식물 추천',
//       description: '당신의 공간과 취향에 맞는 식물을 AI가 추천합니다.',
//       background: '#fff3e0',
//     },
//     {
//       title: '📘 성장 가이드',
//       description: '물 주기, 햇빛, 온도 등 최적의 환경 가이드를 제공해요.',
//       background: '#ede7f6',
//     },
//     {
//       title: '📈 성장 레포트',
//       description: 'AI가 분석한 Before/After 리포트를 받아보세요.',
//       background: '#f1f8e9',
//     },
//     {
//       title: '🌳 정원 꾸미기',
//       description: 'Unity 기반 가상 정원에서 나만의 정원을 가꿔보세요.',
//       background: '#fce4ec',
//     },
//   ];

//   useEffect(() => {
//     const fetchAllImages = async () => {
//       try {
//         const responses = await Promise.all(
//           plantNames.map((name) =>
//             fetch(`/api/plant-images/${name}?sample_count=2`).then((res) => res.json())
//           )
//         );

//         const combined = responses.flatMap((res, idx) =>
//           res.images.map((url) => ({
//             img: url,
//             name: plantNames[idx],
//           }))
//         );

//         const shuffled = combined.sort(() => Math.random() - 0.5);
//         setMixedPlantImages(shuffled);
//       } catch (err) {
//         console.error("이미지 로딩 실패:", err);
//       }
//     };

//     fetchAllImages();
//   }, []);

//   return (
//     <div className="main-container">
//       <Header />

//       {/* 기본 Hero 영역 */}
//       <main className="hero-section">
//         <div className="hero-content">
//           <h1>식물을 더 스마트하게 관리하세요</h1>
//           <p className="subtitle">
//             PlantMate와 함께라면 누구나 식물 관리의 달인이 될 수 있습니다. 지금 바로 시작해보세요!
//           </p>
//         </div>
//       </main>

//       {/* 랜덤 식물 이미지 캐러셀 */}
//       <section className="plant-gallery">
//         <Carousel mixedData={mixedPlantImages} />
//       </section>

//       {/* 주요 기능 Fullpage 슬라이드 */}
//       <ReactFullpage
//         scrollingSpeed={1000}
//         navigation
//         render={() => (
//           <ReactFullpage.Wrapper>
//             {features.map((feature, idx) => (
//               <div
//                 key={idx}
//                 className="section"
//                 style={{
//                   backgroundColor: feature.background,
//                   height: '100vh',
//                   display: 'flex',
//                   flexDirection: 'column',
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   textAlign: 'center',
//                   padding: '2rem',
//                 }}
//               >
//                 <h1 style={{ fontSize: '3rem' }}>{feature.title}</h1>
//                 <p style={{ fontSize: '1.3rem', maxWidth: '600px' }}>{feature.description}</p>
//               </div>
//             ))}
//           </ReactFullpage.Wrapper>
//         )}
//       />

//       {/* 푸터 */}
//       <footer className="app-footer">
//         <div className="footer-content">
//           <div className="footer-logo">
//             <i className="fas fa-leaf"></i>
//             <span>PlantVision</span>
//           </div>
//           <div className="footer-links">
//             <a href="#">이용약관</a>
//             <a href="#">개인정보처리방침</a>
//             <a href="#">문의하기</a>
//           </div>
//           <div className="social-links">
//             <a href="#" aria-label="Facebook"><i className="fab fa-facebook"></i></a>
//             <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
//             <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
//           </div>
//         </div>
//         <div className="copyright">
//           &copy; 2025 PlantVision. All rights reserved.
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default MainPage;

import React, { useEffect, useState } from "react";
import '../styles/MainPage.css';
import Carousel from "./Carousel";
import Header from "./Header";
import ReactFullpage from '@fullpage/react-fullpage'; // ✅ fullpage 라이브러리 다시 import

const MainPage = () => {
  const plantNames = ["감나무", "개망초", "튤립", "네잎클로바", "안개꽃", "개나리"];
  const [mixedPlantImages, setMixedPlantImages] = useState([]);

  const features = [
    {
      title: '🌿 식물 식별',
      description: '사진 한 장으로 정확한 식물 이름과 정보를 확인하세요.',
      background: '#e0f7fa',
    },
    {
      title: '📋 식물 추천',
      description: '당신의 공간과 취향에 맞는 식물을 AI가 추천합니다.',
      background: '#fff3e0',
    },
    {
      title: '📘 성장 가이드',
      description: '물 주기, 햇빛, 온도 등 최적의 환경 가이드를 제공해요.',
      background: '#ede7f6',
    },
    {
      title: '📈 성장 레포트',
      description: 'AI가 분석한 Before/After 리포트를 받아보세요.',
      background: '#f1f8e9',
    },
    {
      title: '🌳 정원 꾸미기',
      description: 'Unity 기반 가상 정원에서 나만의 정원을 가꿔보세요.',
      background: '#fce4ec',
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
        console.error("이미지 로딩 실패:", err);
      }
    };

    fetchAllImages();
  }, []);

  return (
    <ReactFullpage
      scrollingSpeed={1000}
      navigation
      // 첫 번째 섹션만 일반 스크롤을 허용합니다.
      normalScrollElements=".hero-and-carousel-section" 
      render={() => (
        <ReactFullpage.Wrapper>

          {/* 1. 히어로 섹션과 캐러셀을 하나의 섹션으로 묶었습니다. */}
          {/* 이 섹션은 normalScrollElements에 지정되어 일반 스크롤이 가능합니다. */}
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
          
          {/* 2. 주요 기능 소개 섹션들 - Fullpage의 자동 스크롤 적용 */}
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="section"
              style={{
                backgroundColor: feature.background,
                height: '100vh',
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
            </div>
          ))}

          {/* 3. 푸터 섹션 - Fullpage의 자동 스크롤 적용 */}
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

// import React, { useEffect, useState } from "react";
// import '../styles/MainPage.css';
// import Carousel from "./Carousel";
// import Header from "./Header";
// import ReactFullpage from '@fullpage/react-fullpage';

// const MainPage = () => {
//   const plantNames = ["감나무", "개망초", "튤립", "네잎클로바", "안개꽃", "개나리"];
//   const [mixedPlantImages, setMixedPlantImages] = useState([]);

//   const features = [
//     {
//       title: '🌿 식물 식별',
//       description: '사진 한 장으로 정확한 식물 이름과 정보를 확인하세요.',
//       background: '#e0f7fa',
//     },
//     {
//       title: '📋 식물 추천',
//       description: '당신의 공간과 취향에 맞는 식물을 AI가 추천합니다.',
//       background: '#fff3e0',
//     },
//     {
//       title: '📘 성장 가이드',
//       description: '물 주기, 햇빛, 온도 등 최적의 환경 가이드를 제공해요.',
//       background: '#ede7f6',
//     },
//     {
//       title: '📈 성장 레포트',
//       description: 'AI가 분석한 Before/After 리포트를 받아보세요.',
//       background: '#f1f8e9',
//     },
//     {
//       title: '🌳 정원 꾸미기',
//       description: 'Unity 기반 가상 정원에서 나만의 정원을 가꿔보세요.',
//       background: '#fce4ec',
//     },
//   ];

//   useEffect(() => {
//     const fetchAllImages = async () => {
//       try {
//         const responses = await Promise.all(
//           plantNames.map((name) =>
//             fetch(`/api/plant-images/${name}?sample_count=2`).then((res) => res.json())
//           )
//         );

//         const combined = responses.flatMap((res, idx) =>
//           res.images.map((url) => ({
//             img: url,
//             name: plantNames[idx],
//           }))
//         );

//         const shuffled = combined.sort(() => Math.random() - 0.5);
//         setMixedPlantImages(shuffled);
//       } catch (err) {
//         console.error("이미지 로딩 실패:", err);
//       }
//     };

//     fetchAllImages();
//   }, []);

//   return (
//     <> {/* <div> 대신 Fragment를 사용하여 불필요한 div를 없앱니다. */}
//       <div className="main-container">
//         <Header />
//         {/* 히어로 영역 */}
//         <main className="hero-section">
//           <div className="hero-content">
//             <h1>식물을 더 스마트하게 관리하세요</h1>
//             <p className="subtitle">
//               PlantMate와 함께라면 누구나 식물 관리의 달인이 될 수 있습니다. 지금 바로 시작해보세요!
//             </p>
//           </div>
//         </main>
//         {/* 랜덤 식물 이미지 캐러셀 */}
//         <section className="plant-gallery">
//           <Carousel mixedData={mixedPlantImages} />
//         </section>
//       </div>

//       {/* 주요 기능 Fullpage 슬라이드 - 이 부분부터 fullpage를 적용합니다. */}
//       <ReactFullpage
//         scrollingSpeed={1000}
//         navigation
//         render={() => (
//           <ReactFullpage.Wrapper>
//             {features.map((feature, idx) => (
//               <div
//                 key={idx}
//                 className="section"
//                 style={{
//                   backgroundColor: feature.background,
//                   height: '100vh',
//                   display: 'flex',
//                   flexDirection: 'column',
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   textAlign: 'center',
//                   padding: '2rem',
//                 }}
//               >
//                 <h1 style={{ fontSize: '3rem' }}>{feature.title}</h1>
//                 <p style={{ fontSize: '1.3rem', maxWidth: '600px' }}>{feature.description}</p>
//               </div>
//             ))}
//           </ReactFullpage.Wrapper>
//         )}
//       />

//       {/* 푸터 */}
//       <footer className="app-footer">
//         <div className="footer-content">
//           <div className="footer-logo">
//             <i className="fas fa-leaf"></i>
//             <span>PlantVision</span>
//           </div>
//           <div className="footer-links">
//             <a href="#">이용약관</a>
//             <a href="#">개인정보처리방침</a>
//             <a href="#">문의하기</a>
//           </div>
//           <div className="social-links">
//             <a href="#" aria-label="Facebook"><i className="fab fa-facebook"></i></a>
//             <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
//             <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
//           </div>
//         </div>
//         <div className="copyright">
//           &copy; 2025 PlantVision. All rights reserved.
//         </div>
//       </footer>
//     </>
//    );
// };

// export default MainPage;