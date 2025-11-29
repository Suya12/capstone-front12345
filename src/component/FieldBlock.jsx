
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
export default FieldBlock;