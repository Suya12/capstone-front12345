// src/page/Ocr_compare.jsx
import React, { useState } from "react";
import "./Ocr_compare.css";
import { useNavigate, useLocation } from "react-router-dom";
import FieldBlock from "../component/FieldBlock";

// base64 이미지를 data URL로 변환하는 헬퍼
const toDataUrl = (base64) => base64 ? `data:image/png;base64,${base64}` : null;

export default function Ocr_compare() {
  const navigate = useNavigate();
  const location = useLocation();
  const { claim, index } = location.state || {};

  // 크롭 이미지들 (claim에서 가져옴)
  const cropImages = {
    insuredName: toDataUrl(claim?.insured_name_crop),
    insuredPhone: toDataUrl(claim?.insured_contact_crop),
    insuredId: toDataUrl(claim?.insured_ssn_crop),
    insuredCarrier: toDataUrl(claim?.insured_carrier_crop),
    insuredCompany: toDataUrl(claim?.insured_insurance_company_crop),
    beneficiaryName: toDataUrl(claim?.beneficiary_name_crop),
    beneficiaryPhone: toDataUrl(claim?.beneficiary_contact_crop),
    beneficiaryId: toDataUrl(claim?.beneficiary_ssn_crop),
    beneficiaryCarrier: toDataUrl(claim?.beneficiary_carrier_crop),
    accountBank: toDataUrl(claim?.payment_bank_crop),
    accountHolder: toDataUrl(claim?.payment_account_holder_crop),
    accountNumber: toDataUrl(claim?.payment_account_number_crop),
  };

  // 원본 전체 이미지
  const originalImage = toDataUrl(claim?.request_image_base64) || "/원본.png";

  // 확대보기
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // 폼 데이터
  const [form, setForm] = useState(() => ({
    insuredName: claim?.insured_name || "홍길동",
    insuredPhone: claim?.insured_contact || "010-6338-0694",
    insuredId: claim?.insured_ssn || "900115-1533112",
    insuredCarrier: claim?.insured_carrier || "SKT",
    insuredCompany: claim?.insured_insurance_company || "라이나 생명",

    beneficiaryName: claim?.beneficiary_name || "",
    beneficiaryPhone: claim?.beneficiary_contact || "",
    beneficiaryId: claim?.beneficiary_ssn || "",
    beneficiaryCarrier: claim?.beneficiary_carrier || "",

    accountBank: claim?.payment_bank || "농협은행",
    accountNumber: claim?.payment_account_number || "",
    accountHolder: claim?.payment_account_holder || "",
  }));

  // 되돌리기용 히스토리
  const [history, setHistory] = useState([]);

  // 검증 에러 상태
  const [errors, setErrors] = useState({
    insuredPhone: "",
    insuredId: "",
    beneficiaryPhone: "",
    beneficiaryId: "",
  });


  /* ---------------- 공통 유틸 / 검증 ---------------- */

  const INVALID_CHAR_MSG = "숫자와 '-'만 입력";
  const onlyAllowed = (s) => /^[\d\-\s]*$/.test(s || "");
  const digitLen = (s) => (s?.match(/\d/g) || []).length;

  const LIMITS = {
    phone: 11,
    id: 13,
  };

  const makeDigitMessage = (field, value) => {
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

  const handleChangeAndValidate = (field, value) => {
    setHistory((prev) => [...prev, form]);
    setForm((prev) => ({ ...prev, [field]: value }));

    // phone, id 필드만 검증
    const key = field.toLowerCase();
    if (key.includes("phone") || key.includes("id")) {
      setErrors((prev) => ({ ...prev, [field]: makeDigitMessage(field, value) }));
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
      beneficiaryPhone: makeDigitMessage("beneficiaryPhone", last.beneficiaryPhone),
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

  const validateForm = () => {
    if (Object.values(errors).some((e) => e)) {
      alert("입력 형식 오류를 먼저 확인해주세요.");
      console.log("검증 오류:", errors);
      return;
    }

    if (!/^010-\d{4}-\d{4}$/.test(form.insuredPhone)) {
      alert("연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)");
      return;
    }
    if (!/^\d{6}-\d{7}$/.test(form.insuredId)) {
      alert("주민등록번호 형식이 올바르지 않습니다. (예: 900115-1234567)");
      return;
    }

    const updatedClaim = {
      ...(claim || {}),
      insured_name: form.insuredName,
      insured_contact: form.insuredPhone,
      insured_ssn: form.insuredId,
      insured_carrier: form.insuredCarrier,
      insured_insurance_company: form.insuredCompany,
      beneficiary_name: form.beneficiaryName,
      beneficiary_contact: form.beneficiaryPhone,
      beneficiary_ssn: form.beneficiaryId,
      beneficiary_carrier: form.beneficiaryCarrier,
      payment_bank: form.accountBank,
      payment_account_number: form.accountNumber,
      payment_account_holder: form.accountHolder,
    };

    alert("저장 완료!");
    if (typeof index === "number") {
      navigate("/", { state: { updatedClaim, index } });
    } else {
      navigate("/");
    }
  };

  /* ---------------- 렌더 ---------------- */

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
              onChange={(v) => handleChangeAndValidate("beneficiaryName", v)}
              placeholder="수익자 성명"
            />

            <FieldBlock
              label="연락처"
              img={cropImages.beneficiaryPhone}
              value={form.beneficiaryPhone}
              onChange={(v) => handleChangeAndValidate("beneficiaryPhone", v)}
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
              onChange={(v) => handleChangeAndValidate("beneficiaryId", v)}
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
              onChange={(v) => handleChangeAndValidate("beneficiaryCarrier", v)}
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
              onClick={validateForm}
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
