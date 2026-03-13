import { Outlet, useLocation } from 'react-router-dom';
import Steps from './Steps';
import SiteStats from './SiteStats';

// Footer 组件：版权信息、统计和备案号在同一行
function Footer() {
  return (
    <footer className="py-3 px-6 border-t border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
        {/* 左侧：版权 & GitHub */}
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-slate-500">
            © {new Date().getFullYear()} Aikaid | 智简
          </p>
        </div>

        {/* 中间：统计数据 */}
        <SiteStats />

        {/* 右侧：备案号 */}
        <a
          href="https://beian.miit.gov.cn"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-blue-600 transition-colors duration-200 underline-offset-2 hover:underline shrink-0"
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
  const isEditor = location.pathname.startsWith('/editor');

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased">
      {!isHome && !isEditor && <Steps />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isEditor && <Footer />}
    </div>
  );
}
