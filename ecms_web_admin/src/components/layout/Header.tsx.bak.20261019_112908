import { Layout, Button, Space } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import UserDropdown from './UserDropdown';
import LanguageDropdown from './LanguageDropdown';
import NotificationDropdown from './NotificationDropdown';
import ChatWidget from '@/components/chat/ChatWidget';
import { useUIStore } from '@/stores/uiStore';

const { Header: AntHeader } = Layout;

const Header = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <AntHeader
      style={{
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        height: 64,
      }}
    >
      <Button
        type="text"
        icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={toggleSidebar}
        style={{ fontSize: 16, width: 48, height: 48 }}
      />

      <Space size={12} align="center">
        <LanguageDropdown />
        <NotificationDropdown />
        <ChatWidget />
        <UserDropdown />
      </Space>
    </AntHeader>
  );
};

export default Header;