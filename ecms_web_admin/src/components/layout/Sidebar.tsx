// src/components/layout/Sidebar.tsx
import { Layout, Menu, Drawer, Grid } from 'antd';
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
  DollarOutlined,
  SolutionOutlined,
  HomeOutlined, // 🆕 Import icon Phòng học
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_MENU, INSTRUCTOR_MENU } from '@/constants/routes';
import type { MenuItem } from '@/constants/routes';
import { useTranslation } from '@/hooks/useTranslation';
import { useUIStore } from '@/stores/uiStore';

const { Sider } = Layout;
const { useBreakpoint } = Grid;

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
  DollarOutlined: <DollarOutlined />,
  SolutionOutlined: <SolutionOutlined />,
  HomeOutlined: <HomeOutlined />, // 🆕 Thêm vào map
};

const MENU_KEY_TRANSLATION_MAP: Record<string, string> = {
  '/admin/dashboard': 'menu.dashboard',
  'leads': 'menu.leads',
  '/admin/leads': 'menu.leadList',
  'students': 'menu.students',
  '/admin/students': 'menu.studentList',
  'tuition': 'Tài chính',
  '/admin/tuition': 'Quản lý hóa đơn',
  '/admin/refunds': 'Hoàn tiền',
  'enrollment': 'Ghi danh',
  '/admin/enrollments': 'Danh sách ghi danh',
  '/admin/enrollments/pending': 'Chờ ghi danh',
  'courses': 'menu.courses',
  '/admin/courses': 'menu.courseList',
  '/admin/categories': 'menu.categories',
  '/admin/rooms': 'Phòng học', // 🆕 Thêm key dịch cho phòng học
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
  '/instructor/attendance': 'Điểm danh',
  '/instructor/assignments': 'menu.assignments',
  '/instructor/profile': 'common.profile',
};

interface Props {
  collapsed: boolean;
}

const Sidebar = ({ collapsed }: Props) => {
  const { user, isInstructor } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useUIStore();

  // Nhận biết kích thước màn hình
  const screens = useBreakpoint();
  const isMobile = !screens.md; // Màn hình nhỏ hơn 768px

  const userRole = user?.roleCode;

  const renderItem = (item: MenuItem): AntdMenuItem => ({
    key: item.key,
    label: MENU_KEY_TRANSLATION_MAP[item.key] ? t(MENU_KEY_TRANSLATION_MAP[item.key]) : item.label,
    icon: item.icon ? ICON_MAP[item.icon as string] : undefined,
    children: item.children?.map(renderItem),
  });

  // Lọc bỏ hoàn toàn các trang người dùng không có quyền truy cập
  const filterMenuItem = (item: MenuItem): MenuItem | null => {
    if (item.roles && userRole && !item.roles.includes(userRole)) {
      return null;
    }

    if (item.children) {
      const filteredChildren = item.children
        .map(filterMenuItem)
        .filter((child): child is MenuItem => child !== null);

      if (filteredChildren.length === 0) {
        return null;
      }

      return {
        ...item,
        children: filteredChildren,
      };
    }

    return item;
  };

  const baseMenu = isInstructor() ? INSTRUCTOR_MENU : ADMIN_MENU;
  const menu = baseMenu
    .map(filterMenuItem)
    .filter((item): item is MenuItem => item !== null);

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

  const menuContent = (
    <>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed && !isMobile ? 16 : 18,
          fontWeight: 700,
          letterSpacing: 1,
          borderBottom: '1px solid rgba(255,255,255,.1)',
        }}
      >
        {collapsed && !isMobile ? 'E' : 'ECMS'}
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
            // Tự đóng menu trượt khi chuyển trang trên Mobile
            if (isMobile) {
              toggleSidebar();
            }
          }
        }}
      />
    </>
  );

  // Trên Mobile: Hiển thị dạng Drawer trượt (không làm mất diện tích khung nhìn chính)
  if (isMobile) {
    return (
      <Drawer
        placement="left"
        open={!collapsed} // Khi collapsed = false -> Mở Drawer
        onClose={toggleSidebar}
        closable={false}
        width={240}
        styles={{ body: { padding: 0, backgroundColor: '#001529' } }}
      >
        {menuContent}
      </Drawer>
    );
  }

  // Trên Desktop: Hiển thị Sider cố định như bình thường
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
      {menuContent}
    </Sider>
  );
};

export default Sidebar;
