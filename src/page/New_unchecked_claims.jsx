// src/page/New_unchecked_claims.jsx
import React, { useEffect, useState } from "react";
import "./New_unchecked_claims.css";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api"; // ✅ axios 인스턴스 (src/lib/api.js)

// ----- localStorage 유틸 -----
const POLL_INTERVAL = 2000; // 2초
const USE_SERVER_LIST = true; // 로컬 테스트용 false, 실제 서버 true

// ✅ 필드와 크롭 이미지 매핑 (이제 *_crop_url 사용)
const FIELD_CROP_MAP = {
  insured_name: "insured_name_crop_url",
  insured_ssn: "insured_ssn_crop_url",
  insured_contact: "insured_contact_crop_url",
  insured_carrier: "insured_carrier_crop_url",
  insured_insurance_company: "insured_insurance_company_crop_url",
};

// 각 항목을 고유하게 식별할 키 생성 (id > client_request_id > insured_ssn > 조합)
function claimKey(c) {
  return (
    c?.id ??
    c?.client_request_id ??
    c?.insured_ssn ??
    `${c?.insured_name ?? ""}|${c?.insured_contact ?? ""}|${
      c?.insured_insurance_company ?? ""
    }`
  );
}

/**
 * ✅ 백엔드 /claims 응답 item 하나를
 *    화면에서 쓰기 좋은 평탄한 객체로 변환
 *
 *  API 예시:
 *  {
 *    client_request_id: "unique_id_123",
 *    status: "SUCCESS",
 *    image_format: "image/jpeg",
 *    image_url: "http://host/...jpg?expires=...",
 *    created_at: "2026-01-02T12:00:00",
 *    details: [
 *      {
 *        field_name: "insured_name",
 *        field_text: "홍길동",
 *        confidence: 0.98,
 *        crop_image_url: "http://host/...crop1.jpg?..."
 *      },
 *      ...
 *    ]
 *  }
 */

function mapApiItemToRow(item) {
  const mapped = {
    id: item.id,
    client_request_id: item.client_request_id,
    status: item.status,
    image_url: item.image_url,
    created_at: item.created_at,
  };

  // (혹시 나중에 백엔드가 top-level 로 영문 필드 줄 수도 있으니까 일단 유지)
  mapped.insured_name = item.insured_name ?? "";
  mapped.insured_ssn = item.insured_ssn ?? "";
  mapped.insured_contact = item.insured_contact ?? "";
  mapped.insured_carrier = item.insured_carrier ?? "";
  mapped.insured_insurance_company = item.insured_insurance_company ?? "";

  // 🔥 여기부터가 핵심: details 안의 "한글 field_name" 을 우리가 쓰는 key 로 매핑
  if (Array.isArray(item.details)) {
    const FIELD_NAME_MAP = {
      "피보험자 성명": "insured_name",
      "피보험자 주민등록번호": "insured_ssn",
      "피보험자 연락처": "insured_contact",
      "피보험자 통신사": "insured_carrier",
      "피보험자 수익자청구 요청 보험사": "insured_insurance_company",

      "수익자 성명": "beneficiary_name",
      "수익자 주민등록번호": "beneficiary_ssn",
      "수익자 연락처": "beneficiary_contact",
      "수익자 통신사": "beneficiary_carrier",
      
      "보험금 지급 은행명": "payment_bank_name",
      "보험금 지급 계좌번호": "payment_account_number",
      "보험금 지급 예금주 성함": "payment_account_holder",
    };

    for (const d of item.details) {
      const key = FIELD_NAME_MAP[d.field_name];
      if (!key) continue;            // 우리가 관심없는 필드는 스킵

      // 텍스트 값
      mapped[key] = d.field_text ?? "";

      // 크롭 이미지 URL
      if (d.crop_image_url) {
        mapped[`${key}_crop_url`] = d.crop_image_url;
      }
    }
  }

  return mapped;
}


// 이미지 src 보정: 절대 URL / dataURL / 상대경로(/static/...) / base64
const toImageSrc = (val) => {
  if (!val) return null;

  if (typeof val === "string") {
    // 이미 완성된 절대 URL 또는 dataURL
    if (/^https?:\/\//.test(val) || val.startsWith("data:image/")) {
      return val;
    }

    // 백엔드 상대 경로 (/static/...)
    if (val.startsWith("/")) {
      const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
      return `${base}${val}`;
    }
  }

  // 그 외는 순수 base64 라고 가정
  return `data:image/png;base64,${val}`;
};

export default function NewUncheckedClaims() {
  const [claimData, setClaimData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRow, setActiveRow] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null); // { field, image, value }
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ API 경로 (baseURL은 api.js에서 자동 설정)
  const LIST_API = `/claims`;
  const CONFIRM_API = (client_request_id) =>
    `/claims/${encodeURIComponent(client_request_id)}/fields`;

  // 셀 클릭 시 크롭 이미지 표시
  const handleCellClick = (item, fieldName) => {
    const cropKey = FIELD_CROP_MAP[fieldName];
    const raw = item[cropKey];
    const cropImage = toImageSrc(raw);      // ✅ 여기서 보정

    if (cropImage) {
      setSelectedCrop({
        field: fieldName,
        image: cropImage, // ✅ 이제 URL
        value: item[fieldName], // 텍스트 값
      });
    }
  };

  const fetchClaims = async () => {
    try {
      let rows = [];

      if (USE_SERVER_LIST) {
        const res = await api.get(LIST_API, {
          params: {
            skip: 0,
            limit: 50,
          },
        });

        const data = res.data;
        console.log("RAW /claims =", data);    

        if (Array.isArray(data?.items)) {
          rows = data.items.map(mapApiItemToRow);
        } else if (Array.isArray(data)) {
          // 혹시 배열로 바로 내려오는 케이스 대비
          rows = data.map(mapApiItemToRow);
        } else {
          rows = [];
        }
      }
      console.log("MAPPED rows =", rows);           // ☆ 추가

      setClaimData(rows);
    } catch (err) {
      if (axios.isAxiosError && axios.isAxiosError(err)) {
        console.group("📡 [fetchClaims] Axios Error");
        console.log("➡️ URL:", err.config?.url);
        console.log("➡️ Method:", err.config?.method);
        console.log("➡️ Status:", err.response?.status);
        console.log("➡️ Response:", err.response?.data);
        console.log("➡️ Headers:", err.response?.headers);
        console.groupEnd();
      } else {
        console.error("❌ [fetchClaims] Unknown error", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims(); // 최초 1회 로딩

    if (!USE_SERVER_LIST) return; // 서버 연동 안 하면 폴링 X

    const id = setInterval(() => {
      fetchClaims(); // 2초마다 목록 다시 받아옴
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
          claimKey(c) === claimKey(updatedClaim) ? { ...c, ...updatedClaim } : c
        )
      );
    }
  }, [location.state]);

  // ✅ 확정 버튼 처리 (PATCH 요청 + 낙관적 업데이트)
  const handleConfirm = async (idx, item) => {
    const key = claimKey(item);
    const idOrKey = item.client_request_id ?? item.id ?? key;

    // 1️⃣ 낙관적 제거 (화면에서 즉시 삭제)
    setClaimData((prev) => prev.filter((_, i) => i !== idx));
    if (activeRow === idx) setActiveRow(null);

    try {
      const res = await api.patch(CONFIRM_API(idOrKey), {
        status: "confirmed",
        key,
        claim: item,
      });

      if (res.status === 200 && res.data?.ok) {
        console.log("✅ 확정 성공:", res.data);
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err) {
      console.error("❌ 확정 실패:", err?.response?.data || err.message);
      alert("확정 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");

      // 실패 시 롤백
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
              <th>통신사</th>
              <th>보험사</th>
            </tr>
          </thead>
          <tbody>
            {claimData.map((item, index) => (
              <tr
                key={claimKey(item)}
                onMouseEnter={() => setActiveRow(index)}
              >
                <td
                  onClick={() => handleCellClick(item, "insured_name")}
                  className={
                    item.insured_name_crop_url ? "clickable-cell" : ""
                  }
                >
                  {item.insured_name}
                </td>
                <td
                  onClick={() => handleCellClick(item, "insured_ssn")}
                  className={
                    item.insured_ssn_crop_url ? "clickable-cell" : ""
                  }
                >
                  {item.insured_ssn}
                </td>
                <td
                  onClick={() => handleCellClick(item, "insured_contact")}
                  className={
                    item.insured_contact_crop_url ? "clickable-cell" : ""
                  }
                >
                  {item.insured_contact}
                </td>
                <td
                  onClick={() => handleCellClick(item, "insured_carrier")}
                  className={
                    item.insured_carrier_crop_url ? "clickable-cell" : ""
                  }
                >
                  {item.insured_carrier}
                </td>
                <td
                  onClick={() =>
                    handleCellClick(item, "insured_insurance_company")
                  }
                  className={
                    item.insured_insurance_company_crop_url
                      ? "clickable-cell"
                      : ""
                  }
                >
                  {item.insured_insurance_company}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 오른쪽 버튼 컬럼 */}
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
                  navigate("/ocr_compare", {
                    state: { claim: item, id: item.id },
                  })
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

      {/* 크롭 이미지 모달 */}
      {selectedCrop && (
        <div
          className="crop-modal-overlay"
          onClick={() => setSelectedCrop(null)}
        >
          <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="crop-modal-close"
              onClick={() => setSelectedCrop(null)}
            >
              &times;
            </button>
            <h4 className="crop-modal-title">OCR 크롭 이미지</h4>
            <p className="crop-modal-value">인식 값: {selectedCrop.value}</p>
            <img
              src={selectedCrop.image}
              alt="크롭 이미지"
              className="crop-modal-image"
            />
          </div>
        </div>
      )}
    </div>
  );
}
