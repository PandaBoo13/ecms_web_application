import { Layout, Button, Space, Grid } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import UserDropdown from './UserDropdown';
import LanguageDropdown from './LanguageDropdown';
import NotificationDropdown from './NotificationDropdown';
import ChatWidget from '@/components/chat/ChatWidget';
import AIAgentWidget from '@/components/ai/AIAgentWidget';
import { useUIStore } from '@/stores/uiStore';

const { Header: AntHeader } = Layout;
const { useBreakpoint } = Grid;

const Header = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // < 768px

  return (
    <AntHeader
      style={{
        width: '100%',
        padding: isMobile ? '0 12px' : '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: 64,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Button
          type="text"
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleSidebar}
          style={{ fontSize: 16, width: 40, height: 40 }}
        />
      </div>

      {/* flexShrink: 0 để cụm bên phải không bị ép nhỏ lại */}
      <Space size={isMobile ? 4 : 12} align="center" style={{ flexShrink: 0 }}>
        <LanguageDropdown />
        <NotificationDropdown />
        <ChatWidget />
        <AIAgentWidget />
        <UserDropdown />
      </Space>
    </AntHeader>
  );
};

export default Header;