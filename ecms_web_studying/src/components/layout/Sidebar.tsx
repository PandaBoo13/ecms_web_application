import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { DashboardOutlined, BookOutlined, ProfileOutlined, TrophyOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { STUDENT_MENU } from '@/constants/routes';
import type { MenuItem } from '@/constants/routes';

const { Sider } = Layout;
type AntdMenuItem = NonNullable<MenuProps['items']>[number];
const ICON_MAP: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />, BookOutlined: <BookOutlined />, ProfileOutlined: <ProfileOutlined />, TrophyOutlined: <TrophyOutlined />, UserOutlined: <UserOutlined />,
};

const Sidebar = ({ collapsed }: { collapsed: boolean }) => {
  const location = useLocation(); const navigate = useNavigate();
  const renderItem = (item: MenuItem): AntdMenuItem => ({ key: item.key, label: item.label, icon: item.icon ? ICON_MAP[item.icon] : undefined, children: item.children?.map(renderItem) });
  const getSelectedKey = () => { const path = location.pathname; for (const item of STUDENT_MENU) { if (item.path && path === item.path) return item.key; } return path; };

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} width={240} style={{ overflow: 'auto', height: '100vh', position: 'sticky', top: 0, left: 0 }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: collapsed ? 16 : 18, fontWeight: 700, letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        {collapsed ? 'E' : 'ECMS'}
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[getSelectedKey()]} items={STUDENT_MENU.map(renderItem)} onClick={({ key }) => { if (typeof key === 'string' && key.startsWith('/')) navigate(key); }} />
    </Sider>
  );
};
export default Sidebar;