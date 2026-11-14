// src/constants/routes.ts
import { ROLE } from './roles';

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  roles?: string[];
  children?: MenuItem[];
}

export const ADMIN_MENU: MenuItem[] = [
  {
    key: '/admin/dashboard',
    label: 'Tổng quan',
    icon: 'DashboardOutlined',
    path: '/admin/dashboard',
    roles: [ROLE.ADMIN],
  },
  {
    key: 'leads',
    label: 'Tuyển sinh (Lead)',
    icon: 'UserAddOutlined',
    roles: [ROLE.ADMIN, ROLE.LEAD, ROLE.CONSULTANT],
    children: [
      { key: '/admin/leads', label: 'Danh sách Lead', path: '/admin/leads', roles: [ROLE.ADMIN, ROLE.LEAD, ROLE.CONSULTANT] },
    ],
  },
  {
    key: 'students',
    label: 'Học viên',
    icon: 'TeamOutlined',
    roles: [ROLE.ADMIN, ROLE.LEAD, ROLE.CONSULTANT],
    children: [
      { key: '/admin/students', label: 'Danh sách học viên', path: '/admin/students', roles: [ROLE.ADMIN, ROLE.LEAD, ROLE.CONSULTANT] },
    ],
  },
  {
    key: 'tuition',
    label: 'Học phí',
    icon: 'DollarOutlined',
    roles: [ROLE.ADMIN],
    children: [
      { key: '/admin/tuition', label: 'Quản lý học phí', path: '/admin/tuition', roles: [ROLE.ADMIN] },
      { key: '/admin/refunds', label: 'Hoàn tiền', path: '/admin/refunds', roles: [ROLE.ADMIN] },
    ],
  },
  {
    key: 'enrollment',
    label: 'Ghi danh',
    icon: 'SolutionOutlined',
    roles: [ROLE.ADMIN],
    children: [
      { key: '/admin/enrollments', label: 'Quản lý ghi danh', path: '/admin/enrollments', roles: [ROLE.ADMIN] },
      { key: '/admin/enrollments/pending', label: 'Chờ ghi danh', path: '/admin/enrollments/pending', roles: [ROLE.ADMIN] },
    ],
  },
  {
    key: 'courses',
    label: 'Khóa học',
    icon: 'BookOutlined',
    roles: [ROLE.ADMIN, ROLE.LEAD, ROLE.CONSULTANT],
    children: [
      { key: '/admin/courses', label: 'Danh sách khóa học', path: '/admin/courses', roles: [ROLE.ADMIN, ROLE.LEAD, ROLE.CONSULTANT] },
      { key: '/admin/categories', label: 'Danh mục', path: '/admin/categories', roles: [ROLE.ADMIN, ROLE.LEAD, ROLE.CONSULTANT] },
      { key: '/admin/rooms', label: 'Phòng học', path: '/admin/rooms', roles: [ROLE.ADMIN] },
    ],
  },
  {
    key: 'requests',
    label: 'Yêu cầu & Kiểm duyệt',
    icon: 'SolutionOutlined',
    roles: [ROLE.ADMIN],
    children: [
      { key: '/admin/requests', label: 'Quản lý yêu cầu', path: '/admin/requests', roles: [ROLE.ADMIN] },
    ],
  },
  {
    key: 'users',
    label: 'Users',
    icon: 'TeamOutlined',
    roles: [ROLE.ADMIN],
    children: [
      { key: '/admin/users', label: 'Danh sách Users', path: '/admin/users', roles: [ROLE.ADMIN] },
    ],
  },
  {
    key: 'system',
    label: 'Hệ thống',
    icon: 'SettingOutlined',
    roles: [ROLE.ADMIN],
    children: [
      { key: '/admin/roles', label: 'Phân quyền', path: '/admin/roles', roles: [ROLE.ADMIN] },
      { key: '/admin/permissions', label: 'Quyền hạn', path: '/admin/permissions', roles: [ROLE.ADMIN] },
      { key: '/admin/audit-logs', label: 'Nhật ký', path: '/admin/audit-logs', roles: [ROLE.ADMIN] },
    ],
  },
  {
    key: 'reports',
    label: 'Báo cáo',
    icon: 'FileTextOutlined',
    roles: [ROLE.ADMIN],
    children: [
      { key: '/admin/reports', label: 'Báo cáo chung', path: '/admin/reports', roles: [ROLE.ADMIN] },
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
  // 🆕 Thêm Lịch giảng dạy ngay dưới Tổng quan
  {
    key: '/instructor/schedule',
    label: 'Lịch giảng dạy',
    icon: 'CalendarOutlined',
    path: '/instructor/schedule',
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
    key: '/instructor/attendance',
    label: 'Điểm danh',
    icon: 'ProfileOutlined',
    path: '/instructor/attendance',
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
  '/admin/tuition': 'Quản lý học phí',
  '/admin/refunds': 'Quản lý hoàn tiền',
  '/admin/enrollments': 'Danh sách ghi danh',
  '/admin/enrollments/pending': 'Chờ ghi danh',
  '/admin/users': 'Quản lý tài khoản',
  '/admin/courses': 'Quản lý khóa học',
  '/admin/categories': 'Quản lý danh mục',
  '/admin/rooms': 'Quản lý phòng học',
  '/admin/requests': 'Quản lý yêu cầu',
  '/admin/roles': 'Phân quyền',
  '/admin/permissions': 'Quản lý Quyền hạn',
  '/admin/audit-logs': 'Nhật ký hệ thống',
  '/admin/reports': 'Báo cáo',
  
  '/instructor/dashboard': 'Tổng quan',
  '/instructor/schedule': 'Lịch giảng dạy', // 🆕 Thêm title cho lịch
  '/instructor/courses': 'Khóa học của tôi',
  '/instructor/students': 'Học viên',
  '/instructor/attendance': 'Điểm danh',
  '/instructor/assignments': 'Bài tập',
  '/instructor/profile': 'Hồ sơ cá nhân',
};