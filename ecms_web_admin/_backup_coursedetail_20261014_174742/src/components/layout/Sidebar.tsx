import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_MENU, INSTRUCTOR_MENU } from '@/constants/routes';
import type { MenuItem } from '@/constants/routes';

const { Sider } = Layout;

const ICON_MAP: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  BookOutlined: <BookOutlined />,
  TeamOutlined: <TeamOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  SettingOutlined: <SettingOutlined />,
  UserOutlined: <UserOutlined />,
  ProfileOutlined: <ProfileOutlined />,
};

const renderItem = (item: MenuItem): { key: string; label: string; icon?: React.ReactNode; children?: ReturnType<typeof renderItem>[] } => ({
  key: item.key,
  label: item.label,
  icon: item.icon ? ICON_MAP[item.icon as string] : undefined,
  children: item.children?.map(renderItem),
});

interface Props {
  collapsed: boolean;
}

const Sidebar = ({ collapsed }: Props) => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menu = isAdmin() ? ADMIN_MENU : INSTRUCTOR_MENU;
  const items = menu.map(renderItem);

  // Tìm key match với path hiện tại
  const getSelectedKey = (): string => {
    const path = location.pathname;
    for (const item of menu) {
      if (item.path && path === item.path) return item.key;
      if (item.children) {
        for (const child of item.children) {
          if (child.path && path === child.path) return child.key;
        }
      }
    }
    return path;
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 700,
          letterSpacing: 1,
          borderBottom: '1px solid rgba(255,255,255,.1)',
        }}
      >
        {collapsed ? 'E' : 'ECMS'}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        defaultOpenKeys={menu.filter((m) => m.children).map((m) => m.key)}
        items={items}
        onClick={({ key }) => {
          if (typeof key === 'string' && key.startsWith('/')) {
            navigate(key);
          }
        }}
      />
    </Sider>
  );
};

export default Sidebar;