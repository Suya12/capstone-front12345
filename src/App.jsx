// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Ocr_compare from "./page/Ocr_compare.jsx";
import New_unchecked_claims from "./page/New_unchecked_claims.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* 처음 진입하면 미확인 신규 청구건 페이지 */}
        <Route path="/" element={<New_unchecked_claims />} />

        {/* 수정 버튼에서 이동하는 OCR 비교 페이지 */}
        <Route path="/ocr_compare" element={<Ocr_compare />} />
      </Routes>
    </Router>
  );
}

export default App;
