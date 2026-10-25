import { Button, Space } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { PUBLIC_MENU } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import LanguageDropdown from './LanguageDropdown';
import NotificationDropdown from './NotificationDropdown';
import UserDropdown from './UserDropdown';

const PublicHeader = () => {
  const { isAuthenticated } = useAuth(); const navigate = useNavigate();
  return (
    <header style={{ height: 64, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
      <Link to="/" style={{ fontSize: 22, fontWeight: 800, color: '#1677ff' }}>ECMS</Link>
      <nav style={{ display: 'flex', gap: 4 }}>
        {PUBLIC_MENU.map((item) => <Link key={item.key} to={item.path || '/'} style={{ padding: '8px 14px', color: '#334155', fontWeight: 500, fontSize: 14 }}>{item.label}</Link>)}
      </nav>
      <Space size={12} align="center">
        <LanguageDropdown />
        {isAuthenticated ? (<><NotificationDropdown /><UserDropdown /></>) : (<><Button onClick={() => navigate('/login')}>Đăng nhập</Button><Button type="primary" onClick={() => navigate('/register')}>Đăng ký</Button></>)}
      </Space>
    </header>
  );
};
export default PublicHeader;