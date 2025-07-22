import React, { useState, useEffect, useRef } from 'react';
import '../styles/PlantGrowthTracker.css';
import Header from "./Header";

const PlantGrowthTracker = () => {
  const [plantId, setPlantId] = useState('');
  const [timelapsePlantId, setTimelapsePlantId] = useState('');
  const [imageGallery, setImageGallery] = useState([]);
  const [modalShow, setModalShow] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const [imageAnalysis, setImageAnalysis] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (imageBlob) => {
    const formData = new FormData();
    formData.append('plantId', plantId);
    formData.append('image', imageBlob, 'uploaded.jpg');

    await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    loadImages();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await handleUpload(file);
    e.target.value = ''; // input 초기화
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch (err) {
      alert('카메라 접근에 실패했습니다.');
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        handleUpload(blob);
        stopCamera();
      }
    }, 'image/jpeg');
  };

  const loadImages = async () => {
    const res = await fetch('/api/images');
    const data = await res.json();
    setImageGallery(data);
  };

  const createTimelapse = async () => {
    const res = await fetch(`/api/timelapse/${timelapsePlantId}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setModalImage(url);
    setModalShow(true);
  };

  const openImageModal = (imgUrl, analysis) => {
    setModalImage(imgUrl);
    setImageAnalysis(analysis);
    setModalShow(true);
  };

  useEffect(() => {
    loadImages();
    return () => stopCamera();
  }, []);

  return (
    <div>
      <Header />
      <div className="container mt-4">
        <div className="card mb-4">
          <div className="card-header">
            <h5>식물 사진 촬영 또는 업로드</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="plantId" className="form-label">식물 ID</label>
              <input type="text" className="form-control" id="plantId" value={plantId} onChange={(e) => setPlantId(e.target.value)} required />
            </div>

            <div className="mb-3 d-flex gap-2">
              <button className="btn btn-outline-primary" onClick={startCamera}>📷 카메라 열기</button>
              <button className="btn btn-outline-secondary" onClick={() => fileInputRef.current.click()}>🖼️ 사진 업로드</button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>

            {showCamera && (
              <div>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '500px' }} />
                <div className="mt-2">
                  <button className="btn btn-success me-2" onClick={capturePhoto}>📸 촬영 및 업로드</button>
                  <button className="btn btn-secondary" onClick={stopCamera}>닫기</button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">식물 이미지 갤러리</h5>
            <button className="btn btn-sm btn-success" onClick={loadImages}>새로고침</button>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {imageGallery.map((img, idx) => (
                <div className="col-md-3" key={idx}>
                  <img
                    src={img.url}
                    alt="식물"
                    className="img-fluid rounded"
                    onClick={() => openImageModal(img.url, img.analysis)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header">
            <h5>타임랩스 생성</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="timelapsePlantId" className="form-label">식물 ID</label>
              <input type="text" className="form-control" id="timelapsePlantId" value={timelapsePlantId} onChange={(e) => setTimelapsePlantId(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={createTimelapse}>타임랩스 생성</button>
            <div className="mt-3">
              {modalImage && <img src={modalImage} className="img-fluid" alt="타임랩스" />}
            </div>
          </div>
        </div>
      </div>

      {modalShow && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="modal-header">
              <h5>이미지 상세 정보</h5>
              <button onClick={() => setModalShow(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <img src={modalImage} alt="상세 이미지" className="modal-image" />
              <div dangerouslySetInnerHTML={{ __html: imageAnalysis }}></div>
            </div>
            <div className="modal-footer">
              <button className="share-btn" onClick={() => alert('카카오톡 공유 로직 삽입 예정')}>공유하기</button>
              <button className="close-btn" onClick={() => setModalShow(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantGrowthTracker;
