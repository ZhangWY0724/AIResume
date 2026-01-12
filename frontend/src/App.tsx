import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import ResumeUpload from '@/pages/ResumeUpload';
import AnalysisResult from '@/pages/AnalysisResult';
import ResumePolish from '@/pages/ResumePolish';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/upload" element={<ResumeUpload />} />
          <Route path="/result" element={<AnalysisResult />} />
          <Route path="/polish" element={<ResumePolish />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
