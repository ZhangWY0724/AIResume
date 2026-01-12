import { Outlet, useLocation } from 'react-router-dom';
import Steps from './Steps';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased">
      {!isHome && <Steps />}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
