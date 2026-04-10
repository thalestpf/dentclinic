import Sidebar from '../../components/Sidebar';
import AuthGuard from '../../components/AuthGuard';

export default function AppLayout({ children }) {
  return (
    <AuthGuard>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
