import { Dropdown, Avatar, Space } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { ROLE_LABEL } from '@/constants/roles';

const UserDropdown = () => {
  // Bổ sung thêm isInstructor và isStudent để phân route chuẩn xác
  const { user, logout, isAdmin, isInstructor, isStudent } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t('common.logout'));
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed');
    }
  };

  const profilePath = isAdmin()
    ? '/admin/profile'
    : isInstructor()
      ? '/instructor/profile'
      : isStudent()
        ? '/student/profile'
        : '/profile';

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('common.profile'),
      onClick: () => navigate(profilePath),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
      <Space style={{ cursor: 'pointer' }} align="center">
        <Avatar
          size={32}
          src={user?.avatarUrl || undefined}
          icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
          style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
        />
        
        {/* 🆕 Ẩn thông tin chữ trên Mobile (<768px), chỉ hiện từ màn hình md trở lên */}
        <div 
          className="hidden md:flex flex-col justify-center" 
          style={{ lineHeight: 1.2, whiteSpace: 'nowrap', maxWidth: 140 }}
        >
          <div 
            style={{ 
              fontSize: 13, 
              fontWeight: 500, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}
          >
            {user?.fullName || 'User'}
          </div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            {user?.roleCode ? ROLE_LABEL[user.roleCode] : ''}
          </div>
        </div>
      </Space>
    </Dropdown>
  );
};

export default UserDropdown;