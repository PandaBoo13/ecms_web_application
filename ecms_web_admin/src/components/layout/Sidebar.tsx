import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  ProfileOutlined,
  UserAddOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_MENU, INSTRUCTOR_MENU } from '@/constants/routes';
import type { MenuItem } from '@/constants/routes';
import { useTranslation } from '@/hooks/useTranslation';

const { Sider } = Layout;

type AntdMenuItem = NonNullable<MenuProps['items']>[number];

const ICON_MAP: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  BookOutlined: <BookOutlined />,
  TeamOutlined: <TeamOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  SettingOutlined: <SettingOutlined />,
  UserOutlined: <UserOutlined />,
  ProfileOutlined: <ProfileOutlined />,
  UserAddOutlined: <UserAddOutlined />,
  FolderOutlined: <FolderOutlined />,
};

const MENU_KEY_TRANSLATION_MAP: Record<string, string> = {
  '/admin/dashboard': 'menu.dashboard',
  'leads': 'menu.leads',
  '/admin/leads': 'menu.leadList',
  'students': 'menu.students',
  '/admin/students': 'menu.studentList',
  'courses': 'menu.courses',
  '/admin/courses': 'menu.courseList',
  '/admin/categories': 'menu.categories',
  'users': 'menu.users',
  '/admin/users': 'menu.userList',
  'system': 'menu.system',
  '/admin/roles': 'menu.roles',
  '/admin/audit-logs': 'menu.auditLogs',
  'reports': 'menu.reports',
  '/admin/reports': 'menu.generalReports',
  '/instructor/dashboard': 'menu.dashboard',
  '/instructor/courses': 'menu.myCourses',
  '/instructor/students': 'menu.students',
  '/instructor/assignments': 'menu.assignments',
  '/instructor/profile': 'common.profile',
};

interface Props {
  collapsed: boolean;
}

const Sidebar = ({ collapsed }: Props) => {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const renderItem = (item: MenuItem): AntdMenuItem => ({
    key: item.key,
    label: MENU_KEY_TRANSLATION_MAP[item.key] ? t(MENU_KEY_TRANSLATION_MAP[item.key]) : item.label,
    icon: item.icon ? ICON_MAP[item.icon as string] : undefined,
    children: item.children?.map(renderItem),
  });

  const menu = isAdmin() ? ADMIN_MENU : INSTRUCTOR_MENU;
  const items = menu.map(renderItem);

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