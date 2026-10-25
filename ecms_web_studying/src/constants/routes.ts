export interface MenuItem { key: string; label: string; icon?: string; path?: string; children?: MenuItem[]; }

export const PUBLIC_MENU: MenuItem[] = [
  { key: '/', label: 'Trang chủ', icon: 'HomeOutlined', path: '/' },
  { key: '/courses', label: 'Khóa học', icon: 'BookOutlined', path: '/courses' },
  { key: '/pricing', label: 'Học phí', icon: 'DollarOutlined', path: '/pricing' },
  { key: '/blog', label: 'Tin tức', icon: 'ReadOutlined', path: '/blog' },
  { key: '/about', label: 'Giới thiệu', icon: 'InfoCircleOutlined', path: '/about' },
  { key: '/contact', label: 'Liên hệ', icon: 'PhoneOutlined', path: '/contact' },
];

export const STUDENT_MENU: MenuItem[] = [
  { key: '/student/dashboard', label: 'Tổng quan', icon: 'DashboardOutlined', path: '/student/dashboard' },
  { key: '/student/courses', label: 'Khóa học', icon: 'BookOutlined', path: '/student/courses' },
  { key: '/student/assignments', label: 'Bài tập', icon: 'ProfileOutlined', path: '/student/assignments' },
  { key: '/student/grades', label: 'Điểm số', icon: 'TrophyOutlined', path: '/student/grades' },
  { key: '/student/profile', label: 'Hồ sơ', icon: 'UserOutlined', path: '/student/profile' },
];