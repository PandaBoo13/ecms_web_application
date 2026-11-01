import { useState } from 'react';
import { Button, Space } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { SendOutlined } from '@ant-design/icons';
import { PUBLIC_MENU } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import LanguageDropdown from './LanguageDropdown';
import NotificationDropdown from './NotificationDropdown';
import UserDropdown from './UserDropdown';
import LeadRegistrationModal from '@/components/lead/LeadRegistrationModal';

const PublicHeader = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [consultModalOpen, setConsultModalOpen] = useState(false);

  return (
    <>
      <header
        style={{
          height: 68,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#1677ff',
            letterSpacing: '-0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>ECMS</span>
        </Link>

        <nav style={{ display: 'flex', gap: 4 }}>
          {PUBLIC_MENU.map((item) => (
            <Link
              key={item.key}
              to={item.path || '/'}
              style={{
                padding: '8px 14px',
                color: '#334155',
                fontWeight: 500,
                fontSize: 14,
                borderRadius: 6,
                transition: 'all 0.2s',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Space size={12} align="center">
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setConsultModalOpen(true)}
            style={{
              background: '#1677ff',
              fontWeight: 600,
              borderRadius: 6,
            }}
          >
            Nhận tư vấn
          </Button>

          <LanguageDropdown />

          {isAuthenticated ? (
            <>
              <NotificationDropdown />
              <UserDropdown />
            </>
          ) : (
            <>
              <Button onClick={() => navigate('/login')}>Đăng nhập</Button>
              <Button
                type="dashed"
                onClick={() => navigate('/register')}
                style={{ borderColor: '#cbd5e1' }}
              >
                Đăng ký
              </Button>
            </>
          )}
        </Space>
      </header>

      {/* Quick Consultation Modal */}
      <LeadRegistrationModal
        open={consultModalOpen}
        onClose={() => setConsultModalOpen(false)}
      />
    </>
  );
};

export default PublicHeader;
