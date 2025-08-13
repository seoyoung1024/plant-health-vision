import React, { useState, useEffect, useRef } from 'react';
import '../styles/PlantGrowthTracker.css';
import Header from "./Header";

const PlantGrowthTracker = () => {
  const [plantId, setPlantId] = useState('');
  const [imageGallery, setImageGallery] = useState([]);
  const [growthData, setGrowthData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reports, setReports] = useState([]);

  const fileInputRef = useRef(null);

  // 단일 파일 업로드 (서버 → S3 저장)
  const handleUpload = async (imageBlob) => {
    if (!plantId) {
      alert('식물 ID를 입력해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', imageBlob, imageBlob.name || 'uploaded.jpg');
    formData.append('notes', '');

    await fetch(`/api/plants/${plantId}/upload`, {
      method: 'POST',
      body: formData,
    });

    await loadImages();
  };

  // 다중 파일 업로드 지원
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      await handleUpload(file);
    }
    e.target.value = '';
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

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/growth-analysis/${plantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ 분석 실패 응답:", errText);
        throw new Error("분석 요청 실패");
      }

      const data = await res.json();
      setGrowthData(data.growth);

      setReportData({
        first_image_url: data.growth.first_image_url || '',
        last_image_url: data.growth.last_image_url || '',
        growth_rate_percent: data.growth.growth_rate_percent,
        report: data.growth.report,
      });

      fetchAllReports();
    } catch (err) {
      console.error("성장 분석 실패:", err);
      alert("성장 분석 중 오류가 발생했습니다.");
    }
  };

  const loadGrowthReport = async () => {
    try {
      const res = await fetch(`/api/growth-report/${plantId}`);
      if (!res.ok) return;
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error("리포트 불러오기 실패:", err);
    }
  };

  const fetchAllReports = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("❗토큰이 없습니다. 로그인 필요");
      return;
    }

    try {
      const response = await fetch('/api/growth-report/all', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn("리포트 불러오기 실패:", error);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setReports(data);
      } else if (Array.isArray(data.reports)) {
        setReports(data.reports);
      } else if (data.plant_id) {
        setReports([data]);
      } else {
        console.warn("리포트 형식 이상:", data);
        setReports([]);
      }
    } catch (error) {
      console.error("리포트 불러오기 오류:", error);
    }
  };

  useEffect(() => {
    if (plantId) {
      loadImages();
      loadGrowthReport();
    }
  }, [plantId]);

  useEffect(() => {
    fetchAllReports();
  }, []);

  return (
    <div>
      <Header />
      <title>PlantGrowthTracker</title>
      <div className="container mt-4">
        {/* 업로드 & 분석 */}
        <div className="card mb-4">
          <div className="card-header">
            <h5>식물 성장 분석하기</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="plantId" className="form-label">식물 이름</label>
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
              <button
                className="btn btn-outline-secondary"
                onClick={() => fileInputRef.current.click()}
              >
                사진 업로드
              </button>
              <button className="btn btn-outline-success" onClick={analyzeGrowth}>
                성장 분석
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                multiple
              />
            </div>
          </div>
        </div>

        {/* 이미지 갤러리 */}
       <div className="gallery-grid">
  {imageGallery.map((img, idx) => {
    const url =
      (typeof img === 'string' && img) ||
      img?.image_url || img?.url || img?.signed_url || img?.presigned_url || img?.Location || '';

    return (
      <div key={idx} className="gallery-card">
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={`plant-${idx}`}
            className="gallery-thumb"
            onError={(e) => {
              // 로드 실패면 URL 텍스트로 이유 확인
              e.currentTarget.style.display = 'none';
              const text = e.currentTarget.nextSibling;
              if (text) text.style.display = 'block';
            }}
          />
        </a>
        <div style={{display:'none', wordBreak:'break-all', fontSize:12, color:'#666'}}>
          이미지 로드 실패 • {url || '(빈 값)'}
        </div>
      </div>
    );
  })}
</div>

        {/* 최근 분석 결과 */}
        {reportData && (
          <div className="card mt-4 p-3 shadow">
            <div className="card-header">
              <h5>식물 성장 리포트</h5>
            </div>
            <div className="card-body">
              <div className="horizontal-report-images">
                <div className="report-image-block">
                  <img
                    src={reportData.first_image_url}
                    alt="처음 사진"
                    className="img-thumbnail"
                    style={{ maxWidth: '180px', borderRadius: '10px' }}
                  />
                  <div className="mt-2 text-muted" style={{ fontSize: "0.85em" }}>
                    최초 업로드
                  </div>
                </div>

                <div className="fs-2 arrow-icon">→</div>

                <div className="report-image-block">
                  <img
                    src={reportData.last_image_url}
                    alt="최신 사진"
                    className="img-thumbnail"
                    style={{ maxWidth: '180px', borderRadius: '10px' }}
                  />
                  <div className="mt-2 text-muted" style={{ fontSize: "0.85em" }}>
                    최근 업로드
                  </div>
                </div>
              </div>

              <div className="mb-3 fs-5">
                <strong>총 성장률:</strong> {reportData.growth_rate_percent}%
              </div>

              {reportData.report && (
                <div className="bg-light p-3 rounded border">
                  <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{reportData.report}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 전체 리포트 카드 */}
        {reports.length > 0 && (
          <div className="report-container">
            <div className="report-grid">
              {reports.map((report, index) => (
                <div key={index} className="report-card">
                  <div className="image-row">
                    <img src={report.first_image_url} alt="처음 이미지" />
                    <img src={report.last_image_url} alt="마지막 이미지" />
                  </div>
                  <div className="report-info">
                    <p><strong>식물 이름:</strong> {report.plant_name ?? '알 수 없음'}</p>
                    <p><strong>날짜:</strong> {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}</p>
                    <p><strong>성장률:</strong> {report.growth_rate_percent != null ? `${report.growth_rate_percent}%` : '측정 불가'}</p>
                    <p><strong>요약:</strong> {report.summary ?? '없음'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantGrowthTracker;
