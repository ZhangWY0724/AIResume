import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import SelectIndustry from '@/pages/SelectIndustry';
import ResumeUpload from '@/pages/ResumeUpload';
import AnalysisResult from '@/pages/AnalysisResult';
import ResumePolish from '@/pages/ResumePolish';
import { ToastContainer } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/select-industry" element={<SelectIndustry />} />
            <Route path="/upload" element={<ResumeUpload />} />
            <Route path="/result" element={<AnalysisResult />} />
            <Route path="/polish" element={<ResumePolish />} />
          </Route>
        </Routes>
        <ToastContainer />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
