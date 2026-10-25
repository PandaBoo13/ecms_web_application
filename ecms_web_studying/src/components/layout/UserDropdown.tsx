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
  const { user, logout, isAdmin, isInstructor } = useAuth();
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
      : '/student/profile';

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
      <Space style={{ cursor: 'pointer' }}>
        <Avatar
          size={32}
          src={user?.avatarUrl || undefined}
          icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
          style={{ backgroundColor: '#1677ff' }}
        />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.fullName || 'User'}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            {user?.roleCode ? ROLE_LABEL[user.roleCode] : ''}
          </div>
        </div>
      </Space>
    </Dropdown>
  );
};

export default UserDropdown;