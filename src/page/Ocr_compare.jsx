// src/page/Ocr_compare.jsx
import React, { useState } from "react";
import "./Ocr_compare.css";
import { useNavigate, useLocation } from "react-router-dom";

/* ===== 국내 은행 3자리 코드 → 은행명 매핑 ===== */
const BANK_CODE_MAP = {
  "002": "산업은행",
  "003": "기업은행",
  "004": "국민은행",
  "005": "하나은행",        // (구 외환 포함)
  "007": "수협은행",
  "008": "수출입은행",
  "011": "농협은행",
  "020": "우리은행",
  "023": "SC제일은행",
  "027": "씨티은행",
  "031": "대구은행",
  "032": "부산은행",
  "034": "광주은행",
  "035": "제주은행",
  "037": "전북은행",
  "039": "경남은행",
  "045": "새마을금고",
  "048": "신협",
  "050": "저축은행",
  "064": "산림조합",
  "071": "우체국",
  "081": "하나은행",
  "088": "신한은행",
  "089": "케이뱅크",
  "090": "카카오뱅크",
  "092": "토스뱅크",
};

/* 재사용 가능한 입력 컴포넌트 */
function FieldBlock({
  label,
  img,
  value,
  onChange,
  onBlur,
  type = "text",
  options,
  placeholder,
  error,
  help,
  children,
}) {
  return (
    <div className="field-block">
      <label>{label}</label>

      <div className="pair">
        {img && <img src={img} alt={`${label} OCR`} />}

        <div className="pair-right">
          {type === "select" ? (
            <select value={value} onChange={(e) => onChange(e.target.value)}>
              {options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              className={error ? "input-error" : ""}
            />
          )}

          {/* 입력창 바로 아래: 버튼 + 도움말 + 에러 모두 포함 */}
          <div className="field-sub">
            {children && <div className="field-children">{children}</div>}

            {error ? (
              <div className="error-text">{error}</div>
            ) : help ? (
              <div className="help-text">{help}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function Ocr_compare() {
  const navigate = useNavigate();
  const location = useLocation();
  const { claim, index } = location.state || {};

  // 확대보기
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // 폼 데이터
  const [form, setForm] = useState(() => ({
    insuredName: claim?.name || "홍길동",
    insuredPhone: claim?.phone || "010-6338-0694",
    insuredId: claim?.ssn || "900115-1533112",
    insuredCompany: claim?.company || "라이나 생명",

    beneficiaryName: "",
    beneficiaryPhone: "",
    beneficiaryId: "",

    accountBank: "농협은행",
    accountNumber: "",
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

  // 계좌 앞자리로 감지한 은행 후보
  const [detectedBanks, setDetectedBanks] = useState([]);

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
    setErrors((prev) => ({ ...prev, [field]: makeDigitMessage(field, value) }));
  };

  // 계좌번호 입력 시: 앞 3자리로 은행 추정
  const handleAccountNumberChange = (value) => {
    setHistory((prev) => [...prev, form]);
    setForm((prev) => ({ ...prev, accountNumber: value }));

    const digits = (value.match(/\d/g) || []).join("");
    if (digits.length < 3) {
      setDetectedBanks([]);
      return;
    }
    const prefix = digits.slice(0, 3);
    const bankName = BANK_CODE_MAP[prefix];

    if (bankName) {
      setDetectedBanks([{ code: prefix, name: bankName }]);
    } else {
      setDetectedBanks([]);
    }
  };

  const applyDetectedBank = (bank) => {
    setHistory((prev) => [...prev, form]);
    setForm((prev) => ({
      ...prev,
      accountBank: bank.name,
    }));
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

    const digits = (last.accountNumber || "").replace(/\D/g, "");
    if (digits.length >= 3) {
      const prefix = digits.slice(0, 3);
      const bankName = BANK_CODE_MAP[prefix];
      if (bankName) setDetectedBanks([{ code: prefix, name: bankName }]);
      else setDetectedBanks([]);
    } else {
      setDetectedBanks([]);
    }
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
      name: form.insuredName,
      phone: form.insuredPhone,
      ssn: form.insuredId,
      company: form.insuredCompany,
      type: claim?.type || "치아보험",
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
          <img src="/원본.png" alt="원본 이미지" />
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
              img="/이름.png"
              value={form.insuredName}
              onChange={(v) => handleChangeAndValidate("insuredName", v)}
              placeholder="피보험자 이름"
            />

            <FieldBlock
              label="연락처"
              img="/피보험자연락처.png"
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
              img="/주민등록번호.png"
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
              label="보험사"
              img="/보험사.png"
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
              img="/피보험자연락처.png"
              value={form.beneficiaryName}
              onChange={(v) => handleChangeAndValidate("beneficiaryName", v)}
              placeholder="수익자 성명"
            />

            <FieldBlock
              label="연락처"
              img="/피보험자연락처.png"
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
              img="/피보험자연락처.png"
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
          </div>

          {/* 계좌 정보 (계좌번호 → 은행명 순서) */}
          <div className="section">
            <h3>계좌 정보</h3>

            {/* 1) 계좌번호 먼저 입력 */}
            <FieldBlock
              label="계좌번호"
              img="/피보험자연락처.png"
              value={form.accountNumber}
              onChange={handleAccountNumberChange}
              placeholder="000-0000-0000"
              help="계좌 앞 3자리로 은행을 추정합니다."
            >
              {/* ➜ 계좌번호 입력창 바로 밑에 나오는 은행 버튼 */}
              {detectedBanks.length > 0 && (
                <div className="bank-chip-row">
                  {detectedBanks.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      className="bank-chip"
                      onClick={() => applyDetectedBank(b)}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </FieldBlock>

            {/* 2) 칩 클릭 시 채워질 은행명 */}
            <FieldBlock
              label="은행명"
              img="/피보험자연락처.png"
              value={form.accountBank}
              onChange={(v) => handleChangeAndValidate("accountBank", v)}
              placeholder="예: 국민은행"
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
              src="/원본.png"
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
