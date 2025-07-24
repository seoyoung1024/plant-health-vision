import React, { useState, useEffect, useRef } from 'react';
import '../styles/PlantGrowthTracker.css';
import Header from "./Header";

const PlantGrowthTracker = () => {
  const [plantId, setPlantId] = useState('');
  const [imageGallery, setImageGallery] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [growthData, setGrowthData] = useState(null); // ✅ 분석 결과 상태 추가

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (imageBlob) => {
    if (!plantId) {
      alert('식물 ID를 입력해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', imageBlob, 'uploaded.jpg');
    formData.append('notes', '');

    await fetch(`/api/plants/${plantId}/upload`, {
      method: 'POST',
      body: formData,
    });

    loadImages();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await handleUpload(file);
    e.target.value = '';
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
    if (!plantId) return;
    try {
      const res = await fetch(`/api/plants/${plantId}/images`);
      const data = await res.json();
      setImageGallery(data.images || []);
    } catch (err) {
      console.error("이미지 불러오기 실패:", err);
    }
  };

  const analyzeGrowth = async () => {
    if (!plantId) {
      alert("식물 ID를 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(`/api/growth-analysis/${plantId}`);
      if (!res.ok) throw new Error("분석 요청 실패");
      const data = await res.json();
      setGrowthData(data.growth);
    } catch (err) {
      console.error("성장 분석 실패:", err);
      alert("성장 분석 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (plantId) {
      loadImages();
    }
    return () => stopCamera();
  }, [plantId]);

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
              <input
                type="text"
                className="form-control"
                id="plantId"
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                required
              />
            </div>

            <div className="mb-3 d-flex gap-2">
              <button className="btn btn-outline-primary" onClick={startCamera}>📷 카메라 열기</button>
              <button className="btn btn-outline-secondary" onClick={() => fileInputRef.current.click()}>🖼️ 사진 업로드</button>
              <button className="btn btn-outline-success" onClick={analyzeGrowth}>📊 성장 분석</button>
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

        {imageGallery.length > 0 && (
          <div className="card">
            <div className="card-header">📸 업로드된 이미지</div>
            <div className="card-body d-flex flex-wrap gap-3">
              {imageGallery.map((img, idx) => (
                <div key={idx} className="text-center">
                  <img
                    src={`/static/${img.filename}`}
                    alt="plant"
                    style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px' }}
                  />
                  <div style={{ fontSize: '0.8em' }}>{img.created_at}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {growthData && (
          <div className="card mt-4">
            <div className="card-header">📈 성장 분석 결과</div>
            <div className="card-body">
              <p><strong>{growthData.summary}</strong></p>
              <ul>
                {growthData.growth_rates_percent.map((rate, idx) => (
                  <li key={idx}>
                    📌 {idx + 1} → {idx + 2} 이미지 성장률: <strong>{rate}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantGrowthTracker;
