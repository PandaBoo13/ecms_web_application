import { Layout, Button, Space, Badge } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined } from '@ant-design/icons';
import UserDropdown from './UserDropdown';
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

      <Space size={16}>
        <Badge count={0} size="small">
          <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
        </Badge>
        <UserDropdown />
      </Space>
    </AntHeader>
  );
};

export default Header;