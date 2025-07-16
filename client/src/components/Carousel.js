import React, { useEffect, useRef, useState } from "react";
import "./MainPage.css";

const plantData = [
  { img: require("../assets/monstera1.png"), name: "몬스테라 관엽식물" },
  { img: require("../assets/plant1.png"), name: "산세베리아 공기정화식물" },
  { img: require("../assets/monstera1.png"), name: "행운목 관엽식물" },
  { img: require("../assets/monstera1.png"), name: "스투키 다육식물" },
  { img: require("../assets/monstera1.png"), name: "벤자민 관엽식물" }
];

const SLIDE_WIDTH = 275;
const VISIBLE_COUNT = 5;
const REPEAT_COUNT = 50; // 충분히 반복 (250개)

const Carousel = () => {
  const [index, setIndex] = useState(0);
  const trackRef = useRef(null);

  const repeatedItems = Array(REPEAT_COUNT)
    .fill(null)
    .flatMap(() => plantData);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!trackRef.current) return;

    const totalSlides = repeatedItems.length;

    if (index >= totalSlides - VISIBLE_COUNT) {
      // 애니메이션 없이 맨 앞으로 순간 이동
      trackRef.current.style.transition = "none";
      trackRef.current.style.transform = `translateX(0px)`;
      setIndex(1); // 다음 슬라이드를 위해 index를 1로
    } else {
      trackRef.current.style.transition = "transform 0.6s ease-in-out";
      trackRef.current.style.transform = `translateX(-${index * SLIDE_WIDTH}px)`;
    }
  }, [index, repeatedItems.length]);

  return (
    <div className="carousel-outer final-carousel">
      <div className="carousel-track final-carousel-track" ref={trackRef}>
        {repeatedItems.map((plant, idx) => (
          <div
            key={`${plant.name}-${idx}`}
            className={`carousel-slide ${idx === index ? "active" : "inactive"}`}
          >
            <div className="plant-card">
              <div
                className="plant-image"
                style={{ backgroundImage: `url(${plant.img})` }}
              />
              <div className="plant-info">
                <h3>{plant.name}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Carousel;
