import { Dropdown, Avatar, Space } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABEL } from '@/constants/roles';

const UserDropdown = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Đăng xuất thất bại');
    }
  };

  const profilePath = isAdmin() ? '/admin/profile' : '/instructor/profile';

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ cá nhân',
      onClick: () => navigate(profilePath),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
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