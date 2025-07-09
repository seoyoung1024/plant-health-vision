document.addEventListener('DOMContentLoaded', function() {
    // 캐러셀 요소 선택
    const carouselTrack = document.querySelector('.carousel-track');
    const slides = document.querySelectorAll('.carousel-slide');
    const dotsContainer = document.querySelector('.carousel-dots');
    
    // 현재 슬라이드 인덱스
    let currentIndex = 0;
    const slideCount = slides.length;
    const slideWidth = 300; // 각 슬라이드의 너비 (CSS에서 설정한 값)
    const slideMargin = 30; // 슬라이드 간 여백 (CSS에서 설정한 margin 값)
    const totalSlideWidth = slideWidth + slideMargin;
    
    // 자동 슬라이드 간격 (밀리초)
    const slideInterval = 3000;
    let slideTimer;
    
    // 도트 생성
    function createDots() {
        for (let i = 0; i < slideCount; i++) {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.setAttribute('aria-label', `${i + 1}번 슬라이드로 이동`);
            dot.addEventListener('click', () => {
                goToSlide(i);
            });
            dotsContainer.appendChild(dot);
        }
    }
    
    // 슬라이드 이동 함수
    function goToSlide(index) {
        currentIndex = index;
        updateCarousel();
        resetTimer();
    }
    
    // 캐러셀 위치 업데이트
    function updateCarousel() {
        const offset = -currentIndex * totalSlideWidth;
        carouselTrack.style.transform = `translateX(${offset}px)`;
        
        // 도트 업데이트
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
    
    // 다음 슬라이드로 이동
    function nextSlide() {
        currentIndex = (currentIndex + 1) % slideCount;
        updateCarousel();
    }
    
    // 이전 슬라이드로 이동
    function prevSlide() {
        currentIndex = (currentIndex - 1 + slideCount) % slideCount;
        updateCarousel();
    }
    
    // 자동 슬라이드 시작
    function startAutoSlide() {
        slideTimer = setInterval(nextSlide, slideInterval);
    }
    
    // 자동 슬라이드 리셋
    function resetTimer() {
        stopAutoSlide();
        startAutoSlide();
    }
    
    // 자동 슬라이드 정지
    function stopAutoSlide() {
        clearInterval(slideTimer);
    }
    
    // 초기화
    function init() {
        createDots();
        updateCarousel();
        startAutoSlide();
        
        // 이벤트 리스너 추가
        document.querySelector('.carousel-control.prev').addEventListener('click', () => {
            prevSlide();
            resetTimer();
        });
        
        document.querySelector('.carousel-control.next').addEventListener('click', () => {
            nextSlide();
            resetTimer();
        });
        
        // 마우스 오버 시 자동 슬라이드 일시 정지
        const carouselContainer = document.querySelector('.carousel-container');
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);
        
        // 터치 이벤트
        let touchStartX = 0;
        let touchEndX = 0;
        
        carouselTrack.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            stopAutoSlide();
        }, { passive: true });
        
        carouselTrack.addEventListener('touchmove', (e) => {
            touchEndX = e.touches[0].clientX;
        }, { passive: true });
        
        carouselTrack.addEventListener('touchend', () => {
            const diff = touchStartX - touchEndX;
            const threshold = 50; // 스와이프 감도
            
            if (diff > threshold) {
                // 왼쪽으로 스와이프 (다음 슬라이드)
                nextSlide();
            } else if (diff < -threshold) {
                // 오른쪽으로 스와이프 (이전 슬라이드)
                prevSlide();
            }
            
            resetTimer();
        }, { passive: true });
    }
    
    // 초기화 실행
    init();
    
    // 창 크기 변경 시 캐러셀 위치 조정
    window.addEventListener('resize', updateCarousel);
});