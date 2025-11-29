// src/page/New_unchecked_claims.jsx
import React, { useEffect, useState } from "react";
import "./New_unchecked_claims.css";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api"; // ✅ axios 인스턴스 (src/lib/api.js)

// ----- localStorage 유틸 -----
const HIDDEN_KEY = "hiddenClaimKeys_v1";
const POLL_INTERVAL = 10000; // 5초

function getHiddenKeys() {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
  } catch {
    return [];
  }
}

function setHiddenKeys(arr) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(new Set(arr))));
}

// 각 항목을 고유하게 식별할 키 생성 (id > ssn > 조합)
function claimKey(c) {
  return (
    c?.id ??
    c?.ssn ??
    `${c?.name ?? ""}|${c?.phone ?? ""}|${c?.company ?? ""}|${c?.type ?? ""}`
  );
}

export default function NewUncheckedClaims() {
  const [claimData, setClaimData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRow, setActiveRow] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ API 경로 (baseURL은 api.js에서 자동 설정)
  const LIST_API = `/api/claims?status=unchecked`;

  const CONFIRM_API = (idOrKey) =>
    `/api/claims/${encodeURIComponent(idOrKey)}/confirm`; 
  // 확정 버튼 클릭 시 서버에 업로드하는 경로
  const USE_SERVER_LIST = true;

  // 목록 불러오기
  const fetchClaims = async () => {
    try {
      let rows;

      if (USE_SERVER_LIST) {
        // 실제 서버에서 가져오기
        const res = await api.get(LIST_API);
        rows = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.claims)
            ? res.data.claims
            : [];
      } else {
        // 서버 없이 로컬 테스트용 데이터
        console.log("⚠️ 서버 연동 없이 로컬 테스트용 데이터 사용");
        rows = [
          {
            id: 1,
            name: "홍길동",
            ssn: "123456-7890123",
            phone: "010-5787-2222",
            company: "라이나 생명",
            type: "치아보험",
          },
          {
            id: 2,
            name: "김철수",
            ssn: "981010-1234567",
            phone: "010-3333-4444",
            company: "삼성화재",
            type: "실손보험",
          },
          {
            id: 3,
            name: "이영희",
            ssn: "010101-3456789",
            phone: "010-1111-2222",
            company: "DB손해보험",
            type: "암보험",
          },
          {
            id: 4,
            name: "박민수",
            ssn: "900101-1234567",
            phone: "010-9999-8888",
            company: "현대해상",
            type: "실손보험",
          },
        ];
      }

      // 숨김 필터 적용
      const hidden = getHiddenKeys();
      rows = rows.filter((c) => !hidden.includes(claimKey(c)));

      setClaimData(rows);
    } catch (err) {
      console.warn("목록 로딩 실패:", err?.response?.data || err.message);
      setClaimData([]);
    } finally {
      setLoading(false);
    }
  };

  

  useEffect(() => {
    fetchClaims(); // 최초 1회 로딩

    if (!USE_SERVER_LIST) return;  // 서버 연동 안 하면 폴링 X

    const id = setInterval(() => {
      fetchClaims();   // 10초마다 목록 다시 받아옴
    }, POLL_INTERVAL);

    return () => clearInterval(id); // 언마운트 시 정리
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OCR 수정화면에서 돌아올 때 데이터 반영
  useEffect(() => {
    if (location.state?.updatedClaim) {
      const { updatedClaim } = location.state;
      setClaimData((prev) =>
        prev.map((c) =>
          claimKey(c) === claimKey(updatedClaim)
            ? { ...c, ...updatedClaim }
            : c
        )
      );
    }
  }, [location.state]);

  // ✅ 확정 버튼 처리 (POST 요청 + 낙관적 업데이트)
  const handleConfirm = async (idx, item) => {
    const key = claimKey(item);
    const idOrKey = item.id ?? key;

    // 1️⃣ 낙관적 제거 (화면에서 즉시 삭제)
    setClaimData((prev) => prev.filter((_, i) => i !== idx));
    if (activeRow === idx) setActiveRow(null);

    try {
      // 2️⃣ FastAPI에 확정 요청
      const res = await api.post(CONFIRM_API(idOrKey), {
        status: "confirmed",
        key,
        claim: item,
      });

      if (res.status === 200 && res.data?.ok) {
        // 3️⃣ 성공 시 숨김키 저장 (새로고침에도 유지)
        const hidden = getHiddenKeys();
        hidden.push(key);
        setHiddenKeys(hidden);
        console.log("✅ 확정 성공:", res.data);
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err) {
      console.error("❌ 확정 실패:", err?.response?.data || err.message);
      alert("확정 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");

      // 4️⃣ 실패 시 롤백 (복구)
      setClaimData((prev) => {
        const copy = [...prev];
        copy.splice(idx, 0, item);
        return copy;
      });
    }
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div className="page">
      <h3 className="page-title">미확인 신규 청구건</h3>

      <div className="table-container" onMouseLeave={() => setActiveRow(null)}>
        <table className="claim-table">
          <thead>
            <tr>
              <th>피보험자 이름</th>
              <th>주민번호</th>
              <th>연락처</th>
              <th>보험사</th>
              <th>청구유형</th>
            </tr>
          </thead>
          <tbody>
            {claimData.map((item, index) => (
              <tr
                key={claimKey(item)}
                onMouseEnter={() => setActiveRow(index)}
              >
                <td>{item.name}</td>
                <td>{item.ssn}</td>
                <td>{item.phone}</td>
                <td>{item.company}</td>
                <td>{item.type}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 오른쪽 버튼 컬럼 (hover 시 부드럽게 표시) */}
        <div
          className="button-column"
          style={{ gridTemplateRows: `repeat(${claimData.length + 1}, auto)` }}
        >
          <div className="button-header"></div>
          {claimData.map((item, index) => (
            <div
              key={claimKey(item)}
              className="button-pair"
              onMouseEnter={() => setActiveRow(index)}
            >
              <button
                className="edit-btn"
                style={{
                  opacity: activeRow === index ? 1 : 0,
                  pointerEvents: activeRow === index ? "auto" : "none",
                  transition: "opacity 0.25s ease",
                }}
                onClick={() =>
                  navigate("/ocr_compare", { state: { claim: item, id: item.id } })
                }
              >
                수정
              </button>
              <button
                className="confirm-btn"
                style={{
                  opacity: activeRow === index ? 1 : 0,
                  pointerEvents: activeRow === index ? "auto" : "none",
                  transition: "opacity 0.25s ease",
                }}
                onClick={() => handleConfirm(index, item)}
              >
                확정
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* (테스트용) 숨김 초기화 버튼 */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => {
            localStorage.removeItem(HIDDEN_KEY);
            fetchClaims();
          }}
        >
          숨긴 항목 초기화
        </button>
      </div>
    </div>
  );
}
