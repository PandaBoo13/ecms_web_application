export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
}

export const ADMIN_MENU: MenuItem[] = [
  {
    key: '/admin/dashboard',
    label: 'Tổng quan',
    icon: 'DashboardOutlined',
    path: '/admin/dashboard',
  },
  {
    key: 'leads',
    label: 'Tuyển sinh (Lead)',
    icon: 'UserAddOutlined',
    children: [
      { key: '/admin/leads', label: 'Danh sách Lead', path: '/admin/leads' },
    ],
  },
  {
    key: 'students',
    label: 'Học viên',
    icon: 'TeamOutlined',
    children: [
      { key: '/admin/students', label: 'Danh sách học viên', path: '/admin/students' },
    ],
  },
  {
    key: 'courses',
    label: 'Khóa học',
    icon: 'BookOutlined',
    children: [
      { key: '/admin/courses', label: 'Danh sách khóa học', path: '/admin/courses' },
      { key: '/admin/categories', label: 'Danh mục', path: '/admin/categories' },
    ],
  },
  {
    key: 'users',
    label: 'Người dùng',
    icon: 'TeamOutlined',
    children: [
      { key: '/admin/users', label: 'Tài khoản', path: '/admin/users' },
    ],
  },
  {
    key: 'system',
    label: 'Hệ thống',
    icon: 'SettingOutlined',
    children: [
      { key: '/admin/roles', label: 'Phân quyền', path: '/admin/roles' },
      { key: '/admin/permissions', label: 'Quyền hạn', path: '/admin/permissions' },
      { key: '/admin/audit-logs', label: 'Nhật ký', path: '/admin/audit-logs' },
    ],
  },
  {
    key: 'reports',
    label: 'Báo cáo',
    icon: 'FileTextOutlined',
    children: [
      { key: '/admin/reports', label: 'Báo cáo chung', path: '/admin/reports' },
    ],
  },
];

export const INSTRUCTOR_MENU: MenuItem[] = [
  {
    key: '/instructor/dashboard',
    label: 'Tổng quan',
    icon: 'DashboardOutlined',
    path: '/instructor/dashboard',
  },
  {
    key: '/instructor/courses',
    label: 'Khóa học của tôi',
    icon: 'BookOutlined',
    path: '/instructor/courses',
  },
  {
    key: '/instructor/students',
    label: 'Học viên',
    icon: 'TeamOutlined',
    path: '/instructor/students',
  },
  {
    key: '/instructor/assignments',
    label: 'Bài tập',
    icon: 'ProfileOutlined',
    path: '/instructor/assignments',
  },
  {
    key: '/instructor/profile',
    label: 'Hồ sơ',
    icon: 'UserOutlined',
    path: '/instructor/profile',
  },
];

export const ROUTE_TITLE: Record<string, string> = {
  '/admin/dashboard': 'Tổng quan',
  '/admin/leads': 'Quản lý Lead (Tuyển sinh)',
  '/admin/students': 'Quản lý học viên',
  '/admin/users': 'Quản lý tài khoản',
  '/admin/courses': 'Quản lý khóa học',
  '/admin/categories': 'Quản lý danh mục',
  '/admin/roles': 'Phân quyền',
  '/admin/permissions': 'Quản lý Quyền hạn',
  '/admin/audit-logs': 'Nhật ký hệ thống',
  '/admin/reports': 'Báo cáo',
  '/instructor/dashboard': 'Tổng quan',
  '/instructor/courses': 'Khóa học của tôi',
  '/instructor/students': 'Học viên',
  '/instructor/assignments': 'Bài tập',
  '/instructor/profile': 'Hồ sơ cá nhân',
};