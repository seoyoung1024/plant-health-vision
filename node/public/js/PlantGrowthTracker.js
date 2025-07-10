const API_BASE_URL = 'http://15.168.150.125:8000'; // FastAPI 서버 주소
let currentImageId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadGallery();
    
    // 폼 제출 이벤트 리스너
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    document.getElementById('refreshBtn').addEventListener('click', loadGallery);
    document.getElementById('analyzeBtn').addEventListener('click', analyzeImage);
    document.getElementById('shareBtn').addEventListener('click', shareImage);
});

// 갤러리 로드
async function loadGallery() {
    try {
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"></div></div>';
        
        const response = await fetch(`${API_BASE_URL}/api/plants/1/images`); // 예시로 plant_id=1 사용
        const data = await response.json();
        
        if (data.images && data.images.length > 0) {
            gallery.innerHTML = data.images.map(image => `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <img src="${API_BASE_URL}/static/${image.filename}" 
                             class="card-img-top gallery-img" 
                             alt="식물 이미지"
                             data-id="${image.id}"
                             data-filename="${image.filename}">
                        <div class="card-body">
                            <p class="card-text">
                                <small class="text-muted">
                                    ${new Date(image.uploaded_at).toLocaleString()}
                                </small>
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // 이미지 클릭 이벤트 추가
            document.querySelectorAll('.gallery-img').forEach(img => {
                img.addEventListener('click', showImageModal);
            });
        } else {
            gallery.innerHTML = '<div class="col-12 text-center">등록된 이미지가 없습니다.</div>';
        }
    } catch (error) {
        console.error('갤러리 로드 중 오류 발생:', error);
        alert('이미지를 불러오는 중 오류가 발생했습니다.');
    }
}

// 이미지 업로드 처리
async function handleUpload(e) {
    e.preventDefault();
    
    const plantId = document.getElementById('plantId').value;
    const fileInput = document.getElementById('image');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('이미지를 선택해주세요.');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('이미지가 성공적으로 업로드되었습니다!');
            document.getElementById('uploadForm').reset();
            loadGallery();
        } else {
            throw new Error(result.detail || '업로드에 실패했습니다.');
        }
    } catch (error) {
        console.error('업로드 오류:', error);
        alert(`업로드 중 오류가 발생했습니다: ${error.message}`);
    }
}

// 이미지 상세 모달 표시
function showImageModal(e) {
    const imageId = e.target.dataset.id;
    const filename = e.target.dataset.filename;
    
    currentImageId = imageId;
    document.getElementById('modalImage').src = `${API_BASE_URL}/static/${filename}`;
    document.getElementById('analysisResult').innerHTML = '';
    
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();
}

// 이미지 분석
async function analyzeImage() {
    if (!currentImageId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze/${currentImageId}`);
        const data = await response.json();
        
        if (data.analysis) {
            const analysisHTML = `
                <h6>분석 결과</h6>
                <div class="mb-2">
                    <span class="badge bg-success analysis-badge">건강 상태: ${data.analysis.health || '확인 필요'}</span>
                    <span class="badge bg-info analysis-badge">성장 단계: ${data.analysis.growth_stage || '확인 필요'}</span>
                </div>
                <p>${data.analysis.notes || '추가 분석 정보가 없습니다.'}</p>
            `;
            document.getElementById('analysisResult').innerHTML = analysisHTML;
        }
    } catch (error) {
        console.error('분석 오류:', error);
        alert('이미지 분석 중 오류가 발생했습니다.');
    }
}


// 이미지 공유
async function shareImage() {
    if (!currentImageId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/share/sns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_id: currentImageId,
                platform: 'instagram' // 또는 다른 SNS 플랫폼
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('이미지가 성공적으로 공유되었습니다!');
        } else {
            throw new Error(result.detail || '공유에 실패했습니다.');
        }
    } catch (error) {
        console.error('공유 오류:', error);
        alert(`이미지 공유 중 오류가 발생했습니다: ${error.message}`);
    }
}