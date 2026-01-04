// src/page/Ocr_compare.jsx
import React, { useState } from "react";
import "./Ocr_compare.css";
import { useNavigate, useLocation } from "react-router-dom";
import FieldBlock from "../component/FieldBlock";
import { api } from "../lib/api";

/* ==================== 공통 유틸 함수 ==================== */

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

// 숫자 + '-' + 공백만 허용
const onlyAllowed = (s) => /^[\d\-\s]*$/.test(s || "");
const digitLen = (s) => (s?.match(/\d/g) || []).length;

const LIMITS = {
  phone: 11,
  id: 13,
};

// 자리수/문자 검증 메시지 생성
const makeDigitMessage = (field, value) => {
  const INVALID_CHAR_MSG = "숫자와 '-'만 입력";
  const key = field.toLowerCase();
  const digits = digitLen(value);
  const isPhone = key.includes("phone");
  const isId = key.includes("id");

  if (!onlyAllowed(value)) return INVALID_CHAR_MSG;

  if (isPhone) {
    if (digits > LIMITS.phone) return "자리수 이상";
    if (digits < LIMITS.phone) return "자리수 부족";
    return "";
  }
  if (isId) {
    if (digits > LIMITS.id) return "자리수 이상";
    if (digits < LIMITS.id) return "자리수 부족";
    return "";
  }
  return "";
};

const formatPhone = (v) => {
  const d = (v?.match(/\d/g) || []).join("").slice(0, LIMITS.phone);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

const formatSSN = (v) => {
  const d = (v?.match(/\d/g) || []).join("").slice(0, LIMITS.id);
  if (d.length <= 6) return d;
  return `${d.slice(0, 6)}-${d.slice(6)}`;
};

/* ==================== 필드 매핑 설정 ==================== */

/**
 * form 필드명 → claim 객체의 key(snake_case)
 * form 상태는 camelCase, 서버/claim 데이터는 snake_case 로 들고감
 */
const FORM_TO_CLAIM_KEY = {
  insuredName: "insured_name",
  insuredPhone: "insured_contact",
  insuredId: "insured_ssn",
  insuredCarrier: "insured_carrier",
  insuredCompany: "insured_insurance_company",

  beneficiaryName: "beneficiary_name",
  beneficiaryPhone: "beneficiary_contact",
  beneficiaryId: "beneficiary_ssn",
  beneficiaryCarrier: "beneficiary_carrier",

  accountBank: "payment_bank_name",
  accountNumber: "payment_account_number",
  accountHolder: "payment_account_holder",
};

/**
 * 서버로 보낼 field_name (한글)
 *  - key: claim 객체의 key (snake_case)
 *  - value: DB에 저장된 field_name (한글)
 */
const API_FIELD_NAME_MAP = {
  insured_name: "피보험자 성명",
  insured_contact: "피보험자 연락처",
  insured_ssn: "피보험자 주민등록번호",
  insured_carrier: "피보험자 통신사",
  insured_insurance_company: "피보험자 수익자청구 요청 보험사",

  beneficiary_name: "수익자 성명",
  beneficiary_contact: "수익자 연락처",
  beneficiary_ssn: "수익자 주민등록번호",
  beneficiary_carrier: "수익자 통신사",

  payment_bank_name: "보험금 지급 은행명",
  payment_account_number: "보험금 지급 계좌번호",
  payment_account_holder: "보험금 지급 예금주 성함",
};

/* ==================== 폼 초기값/검증/패치 생성 ==================== */

// claim + 기본값으로 form 초기 상태 만들기
const createInitialForm = (claim) => ({
  insuredName: claim?.insured_name || "",
  insuredPhone: claim?.insured_contact || "",
  insuredId: claim?.insured_ssn || "",
  insuredCarrier: claim?.insured_carrier || "",
  insuredCompany: claim?.insured_insurance_company || "",

  beneficiaryName: claim?.beneficiary_name || "",
  beneficiaryPhone: claim?.beneficiary_contact || "",
  beneficiaryId: claim?.beneficiary_ssn || "",
  beneficiaryCarrier: claim?.beneficiary_carrier || "",

  accountBank: claim?.payment_bank_name || "",
  accountNumber: claim?.payment_account_number || "",
  accountHolder: claim?.payment_account_holder || "",
});

// 폼 전체 검증 (저장 버튼 눌렀을 때)
const validateFormBeforeSave = (form, errors) => {
  // 디테일 검증 에러가 남아있으면 막기
  if (Object.values(errors).some((e) => e)) {
    return "입력 형식 오류를 먼저 확인해주세요.";
  }

  if (!/^010-\d{4}-\d{4}$/.test(form.insuredPhone)) {
    return "연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)";
  }

  if (!/^\d{6}-\d{7}$/.test(form.insuredId)) {
    return "주민등록번호 형식이 올바르지 않습니다. (예: 900115-1234567)";
  }

  return ""; // 문제 없음
};

// claim + form → updatedClaim (snake_case 로 평탄화)
const buildUpdatedClaim = (claim, form) => {
  const updated = { ...(claim || {}) };

  Object.entries(FORM_TO_CLAIM_KEY).forEach(([formKey, claimKey]) => {
    updated[claimKey] = form[formKey];
  });

  return updated;
};

// claim + updatedClaim → 서버로 보낼 fields 딕셔너리
const buildFieldsPayload = (claim, updatedClaim) =>
  Object.entries(API_FIELD_NAME_MAP).reduce((acc, [claimKey, apiFieldName]) => {
    const newVal = updatedClaim[claimKey];
    const oldVal = claim?.[claimKey];

    if (newVal !== undefined && newVal !== oldVal && newVal !== "") {
      acc[apiFieldName] = newVal; // "보험금 지급 은행명": "국민" 이런 형태
    }

    return acc;
  }, {});

/* ==================== 컴포넌트 ==================== */

export default function Ocr_compare() {
  const navigate = useNavigate();
  const location = useLocation();
  const { claim, index } = location.state || {};

  /* ----- 이미지들 ----- */

  const cropImages = {
    insuredName: toImageSrc(
      claim?.insured_name_crop_url || claim?.insured_name_crop
    ),
    insuredPhone: toImageSrc(
      claim?.insured_contact_crop_url || claim?.insured_contact_crop
    ),
    insuredId: toImageSrc(
      claim?.insured_ssn_crop_url || claim?.insured_ssn_crop
    ),
    insuredCarrier: toImageSrc(
      claim?.insured_carrier_crop_url || claim?.insured_carrier_crop
    ),
    insuredCompany: toImageSrc(
      claim?.insured_insurance_company_crop_url ||
      claim?.insured_insurance_company_crop
    ),
    beneficiaryName: toImageSrc(
      claim?.beneficiary_name_crop_url || claim?.beneficiary_name_crop
    ),
    beneficiaryPhone: toImageSrc(
      claim?.beneficiary_contact_crop_url || claim?.beneficiary_contact_crop
    ),
    beneficiaryId: toImageSrc(
      claim?.beneficiary_ssn_crop_url || claim?.beneficiary_ssn_crop
    ),
    beneficiaryCarrier: toImageSrc(
      claim?.beneficiary_carrier_crop_url || claim?.beneficiary_carrier_crop
    ),
    accountBank: toImageSrc(
      claim?.payment_bank_crop_url || claim?.payment_bank_crop
    ),
    accountHolder: toImageSrc(
      claim?.payment_account_holder_crop_url ||
      claim?.payment_account_holder_crop
    ),
    accountNumber: toImageSrc(
      claim?.payment_account_number_crop_url ||
      claim?.payment_account_number_crop
    ),
  };

  const originalImage =
    toImageSrc(claim?.image_url || claim?.request_image_base64) || "/원본.png";

  /* ----- 상태 ----- */

  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const [form, setForm] = useState(() => createInitialForm(claim));
  const [history, setHistory] = useState([]); // 되돌리기용
  const [errors, setErrors] = useState({
    insuredPhone: "",
    insuredId: "",
    beneficiaryPhone: "",
    beneficiaryId: "",
  });

  /* ----- 핸들러들 ----- */

  const handleChangeAndValidate = (field, value) => {
    setHistory((prev) => [...prev, form]);
    setForm((prev) => ({ ...prev, [field]: value }));

    const key = field.toLowerCase();
    if (key.includes("phone") || key.includes("id")) {
      setErrors((prev) => ({
        ...prev,
        [field]: makeDigitMessage(field, value),
      }));
    }
  };

  const undoChange = () => {
    if (history.length === 0) {
      alert("되돌릴 변경사항이 없습니다.");
      return;
    }
    const last = history[history.length - 1];
    setForm(last);
    setHistory((prev) => prev.slice(0, -1));

    setErrors({
      insuredPhone: makeDigitMessage("insuredPhone", last.insuredPhone),
      insuredId: makeDigitMessage("insuredId", last.insuredId),
      beneficiaryPhone: makeDigitMessage(
        "beneficiaryPhone",
        last.beneficiaryPhone
      ),
      beneficiaryId: makeDigitMessage("beneficiaryId", last.beneficiaryId),
    });
  };

  const copyInsuredInfo = () => {
    setHistory((prev) => [...prev, form]);
    const next = {
      ...form,
      beneficiaryName: form.insuredName,
      beneficiaryPhone: form.insuredPhone,
      beneficiaryId: form.insuredId,
    };
    setForm(next);
    setErrors((prev) => ({
      ...prev,
      beneficiaryPhone: makeDigitMessage("beneficiaryPhone", next.beneficiaryPhone),
      beneficiaryId: makeDigitMessage("beneficiaryId", next.beneficiaryId),
    }));
  };

  const handleSave = async () => {
    const validationMsg = validateFormBeforeSave(form, errors);
    if (validationMsg) {
      alert(validationMsg);
      return;
    }

    const updatedClaim = buildUpdatedClaim(claim, form);
    const clientId = claim?.client_request_id ?? claim?.id;

    if (!clientId) {
      alert("서버에 전송할 클레임 ID(client_request_id)가 없습니다. (버그 상황)");
      console.error("Missing client_request_id / id on claim:", claim);
      return;
    }


    const fields = buildFieldsPayload(claim, updatedClaim);
    
    console.log("PATCH fields payload =", fields);
    try {
      const hasChanges = Object.keys(fields).length > 0;
      if (hasChanges) {
        await api.patch(`/claims/${encodeURIComponent(clientId)}`, { fields });
      }
      
      alert("저장 완료!");

      if (typeof index === "number") {
        navigate("/", { state: { updatedClaim, index } });
      } else {
        navigate("/", { state: { updatedClaim } });
      }
    } catch (err) {
      console.error("❌ 서버 저장 실패:", err?.response?.data || err.message);
      alert("서버에 저장하는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };


  /* ==================== 렌더 ==================== */

  return (
    <div className="app">
      <h2>접수정보 대조 및 수정</h2>

      <div className="container">
        {/* 왼쪽: 원본 이미지 */}
        <div className="original">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h3>원본 이미지</h3>
            <button className="revert" onClick={() => setZoomOpen(true)}>
              확대보기
            </button>
          </div>
          <img src={originalImage} alt="원본 이미지" />
        </div>

        {/* 오른쪽: 수정 영역 */}
        <div className="edit-area">
          {/* 피보험자 정보 */}
          <div className="section">
            <div className="edit-header">
              <h3>피보험자 정보</h3>
              <button className="revert" onClick={undoChange}>
                되돌리기
              </button>
            </div>

            <FieldBlock
              label="성명"
              img={cropImages.insuredName}
              value={form.insuredName}
              onChange={(v) => handleChangeAndValidate("insuredName", v)}
              placeholder="피보험자 이름"
            />

            <FieldBlock
              label="연락처"
              img={cropImages.insuredPhone}
              value={form.insuredPhone}
              onChange={(v) => handleChangeAndValidate("insuredPhone", v)}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  insuredPhone: formatPhone(prev.insuredPhone),
                }))
              }
              placeholder="010-1234-5678"
              error={errors.insuredPhone}
            />

            <FieldBlock
              label="주민등록번호"
              img={cropImages.insuredId}
              value={form.insuredId}
              onChange={(v) => handleChangeAndValidate("insuredId", v)}
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  insuredId: formatSSN(prev.insuredId),
                }))
              }
              placeholder="900115-1234567"
              error={errors.insuredId}
            />

            <FieldBlock
              label="통신사"
              img={cropImages.insuredCarrier}
              value={form.insuredCarrier}
              onChange={(v) => handleChangeAndValidate("insuredCarrier", v)}
              placeholder="예: SKT, KT, LG U+"
            />

            <FieldBlock
              label="보험사"
              img={cropImages.insuredCompany}
              value={form.insuredCompany}
              onChange={(v) => handleChangeAndValidate("insuredCompany", v)}
            />
          </div>

          {/* 수익자 정보 */}
          <div className="section">
            <div className="edit-header">
              <h3>수익자 정보</h3>
              <div>
                <button type="button" onClick={copyInsuredInfo}>
                  피보험자 정보 복사
                </button>
                <button
                  type="button"
                  style={{ marginLeft: 8 }}
                  onClick={undoChange}
                >
                  되돌리기
                </button>
              </div>
            </div>

            <FieldBlock
              label="성명"
              img={cropImages.beneficiaryName}
              value={form.beneficiaryName}
              onChange={(v) =>
                handleChangeAndValidate("beneficiaryName", v)
              }
              placeholder="수익자 성명"
            />

            <FieldBlock
              label="연락처"
              img={cropImages.beneficiaryPhone}
              value={form.beneficiaryPhone}
              onChange={(v) =>
                handleChangeAndValidate("beneficiaryPhone", v)
              }
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  beneficiaryPhone: formatPhone(prev.beneficiaryPhone),
                }))
              }
              placeholder="010-1234-5678"
              error={errors.beneficiaryPhone}
            />

            <FieldBlock
              label="주민등록번호"
              img={cropImages.beneficiaryId}
              value={form.beneficiaryId}
              onChange={(v) =>
                handleChangeAndValidate("beneficiaryId", v)
              }
              onBlur={() =>
                setForm((prev) => ({
                  ...prev,
                  beneficiaryId: formatSSN(prev.beneficiaryId),
                }))
              }
              placeholder="######-#######"
              error={errors.beneficiaryId}
            />

            <FieldBlock
              label="통신사"
              img={cropImages.beneficiaryCarrier}
              value={form.beneficiaryCarrier}
              onChange={(v) =>
                handleChangeAndValidate("beneficiaryCarrier", v)
              }
              placeholder="예: SKT, KT, LG U+"
            />
          </div>

          {/* 계좌 정보 */}
          <div className="section">
            <h3>계좌 정보</h3>

            <FieldBlock
              label="은행명"
              img={cropImages.accountBank}
              value={form.accountBank}
              onChange={(v) => handleChangeAndValidate("accountBank", v)}
              placeholder="예: 국민은행"
            />

            <FieldBlock
              label="예금주"
              img={cropImages.accountHolder}
              value={form.accountHolder}
              onChange={(v) => handleChangeAndValidate("accountHolder", v)}
              placeholder="예금주 성함"
            />

            <FieldBlock
              label="계좌번호"
              img={cropImages.accountNumber}
              value={form.accountNumber}
              onChange={(v) => handleChangeAndValidate("accountNumber", v)}
              placeholder="000-0000-0000"
            />
          </div>

          {/* 하단 버튼 */}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="cancel"
              style={{ marginLeft: 8 }}
              onClick={() => navigate("/")}
            >
              목록으로
            </button>
            <button
              className="save"
              style={{ marginLeft: 8 }}
              onClick={handleSave}
            >
              저장
            </button>
          </div>
        </div>
      </div>

      {/* 확대 모달 */}
      {zoomOpen && (
        <div className="lightbox" onClick={() => setZoomOpen(false)}>
          <div
            className="lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <strong>원본 확대보기</strong>
              <div>
                <button
                  className="revert"
                  onClick={() =>
                    setZoomLevel((z) => Math.max(1, +(z - 0.2).toFixed(1)))
                  }
                >
                  -
                </button>
                <span style={{ margin: "0 10px" }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  className="revert"
                  onClick={() =>
                    setZoomLevel((z) => Math.min(4, +(z + 0.2).toFixed(1)))
                  }
                >
                  +
                </button>
                <button
                  className="revert"
                  style={{ marginLeft: 8 }}
                  onClick={() => setZoomLevel(1.4)}
                >
                  Reset
                </button>
                <button
                  className="revert"
                  style={{ marginLeft: 8 }}
                  onClick={() => setZoomOpen(false)}
                >
                  닫기
                </button>
              </div>
            </div>
            <img
              src={originalImage}
              alt="원본 확대"
              className="lightbox-img"
              style={{ width: `${zoomLevel * 100}%`, cursor: "zoom-in" }}
              onDoubleClick={() =>
                setZoomLevel((prev) => (prev < 2 ? 2.5 : 1.4))
              }
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
