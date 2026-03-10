import { Outlet, useLocation } from 'react-router-dom';
import Steps from './Steps';

// Footer 组件：包含备案号和工信部链接
function Footer() {
  return (
    <footer className="py-4 px-6 border-t border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-slate-500">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
          <p className="text-slate-500">
            © {new Date().getFullYear()} Aikaid | 智简
          </p>
        </div>
        <a
          href="https://beian.miit.gov.cn"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-blue-600 transition-colors duration-200 underline-offset-2 hover:underline"
        >
          鄂ICP备2026009648号
        </a>
      </div>
    </footer>
  );
}

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased">
      {!isHome && <Steps />}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
