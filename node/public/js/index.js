document.addEventListener('DOMContentLoaded', function () {
    const track = document.querySelector('.carousel-track');
    const slideWidth = 200;
    const slideMargin = 50;
    const totalSlideWidth = slideWidth + slideMargin;
    const container = document.querySelector('.carousel-container');
    const nextBtn = document.querySelector('.carousel-control.next');
    const prevBtn = document.querySelector('.carousel-control.prev');
  
    let isSliding = false;
    let autoTimer = null;
  
    // 처음에 마지막 슬라이드를 앞으로 가져와서 자연스럽게 시작
    track.insertBefore(track.lastElementChild, track.firstElementChild);
    track.style.transform = `translateX(-${totalSlideWidth}px)`;
  
    function updateActiveSlide(index = 1) {
      const slides = track.querySelectorAll('.carousel-slide');
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
    }
  
    function move(direction) {
      if (isSliding) return;
      isSliding = true;
  
      const slides = track.querySelectorAll('.carousel-slide');
      const offset = direction === 'next' ? -totalSlideWidth * 2 : 0;
  
      // 미리 active 슬라이드 지정
      slides.forEach(slide => slide.classList.remove('active'));
      if (direction === 'next') {
        if (slides.length > 2) slides[2].classList.add('active');
      } else {
        slides[0].classList.add('active');
      }
  
      track.style.transition = 'transform 0.5s ease-in-out';
      track.style.transform = `translateX(${offset}px)`;
  
      track.addEventListener(
        'transitionend',
        () => {
          track.style.transition = 'none';
          if (direction === 'next') {
            track.appendChild(track.firstElementChild);
          } else {
            track.insertBefore(track.lastElementChild, track.firstElementChild);
          }
          track.style.transform = `translateX(-${totalSlideWidth}px)`;
          isSliding = false;
        },
        { once: true }
      );
    }
  
    function startAuto() {
      autoTimer = setInterval(() => move('next'), 3000);
    }
  
    function stopAuto() {
      clearInterval(autoTimer);
    }
  
    function initCarousel() {
      updateActiveSlide();
      startAuto();
  
      nextBtn?.addEventListener('click', () => move('next'));
      prevBtn?.addEventListener('click', () => move('prev'));
  
      container.addEventListener('mouseenter', stopAuto);
      container.addEventListener('mouseleave', startAuto);
  
      let startX = 0, endX = 0;
  
      track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        stopAuto();
      });
  
      track.addEventListener('touchmove', (e) => {
        endX = e.touches[0].clientX;
      });
  
      track.addEventListener('touchend', () => {
        const diff = startX - endX;
        if (diff > 40) move('next');
        else if (diff < -40) move('prev');
        startAuto();
      });
    }
  
    initCarousel();
  });
  

// document.addEventListener('DOMContentLoaded', function () {
//     const track = document.querySelector('.carousel-track');
//     const slideWidth = 200;
//     const slideMargin = 50;
//     const totalSlideWidth = slideWidth + slideMargin;
//     const container = document.querySelector('.carousel-container');
//     const nextBtn = document.querySelector('.carousel-control.next');
//     const prevBtn = document.querySelector('.carousel-control.prev');
  
//     let isSliding = false;
//     let autoTimer = null;
  
//     // 슬라이드를 3개 이상일 때 앞뒤로 복사해서 무한 캐러셀처럼 보이게 처리
//     function setupSlides() {
//       const slides = track.querySelectorAll('.carousel-slide');
//       if (slides.length < 2) return;
  
//       // 맨 뒤 슬라이드를 앞에 붙이고, 맨 앞 슬라이드를 뒤에 복사
//       track.insertBefore(slides[slides.length - 1].cloneNode(true), slides[0]);
//       track.appendChild(slides[0].cloneNode(true));
//     }
  
//     function setTrackPosition() {
//       track.style.transition = 'none';
//       track.style.transform = `translateX(-${totalSlideWidth}px)`;
//     }
  
//     function updateActiveSlide() {
//       const slides = track.querySelectorAll('.carousel-slide');
//       slides.forEach((slide, i) => {
//         slide.classList.remove('active');
//       });
  
//       // 중앙 슬라이드에 active 클래스
//       const middleIndex = 1;
//       if (slides[middleIndex]) {
//         slides[middleIndex].classList.add('active');
//       }
//     }
  
//     function move(direction) {
//       if (isSliding) return;
//       isSliding = true;
  
//       const slides = track.querySelectorAll('.carousel-slide');
  
//       let offset = direction === 'next' ? -totalSlideWidth * 2 : 0;
//       track.style.transition = 'transform 0.5s ease-in-out';
//       track.style.transform = `translateX(${offset}px)`;
  
//       track.addEventListener(
//         'transitionend',
//         () => {
//           track.style.transition = 'none';
  
//           if (direction === 'next') {
//             track.appendChild(track.firstElementChild);
//           } else {
//             track.insertBefore(track.lastElementChild, track.firstElementChild);
//           }
  
//           setTrackPosition();
//           updateActiveSlide();
//           isSliding = false;
//         },
//         { once: true }
//       );
//     }
  
//     function startAuto() {
//       autoTimer = setInterval(() => move('next'), 3000);
//     }
  
//     function stopAuto() {
//       clearInterval(autoTimer);
//     }
  
//     function initCarousel() {
//       setupSlides();
//       setTrackPosition();
//       updateActiveSlide();
//       startAuto();
  
//       nextBtn?.addEventListener('click', () => move('next'));
//       prevBtn?.addEventListener('click', () => move('prev'));
  
//       container.addEventListener('mouseenter', stopAuto);
//       container.addEventListener('mouseleave', startAuto);
  
//       let startX = 0, endX = 0;
  
//       track.addEventListener('touchstart', (e) => {
//         startX = e.touches[0].clientX;
//         stopAuto();
//       });
  
//       track.addEventListener('touchmove', (e) => {
//         endX = e.touches[0].clientX;
//       });
  
//       track.addEventListener('touchend', () => {
//         const diff = startX - endX;
//         if (diff > 40) move('next');
//         else if (diff < -40) move('prev');
//         startAuto();
//       });
//     }
  
//     initCarousel();
//   });
  