import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getInitials } from '@/utils/format';

interface Props {
  name?: string;
  avatarUrl?: string;
  size?: number | 'small' | 'default' | 'large';
  showName?: boolean;
  style?: React.CSSProperties;
}

const UserAvatar = ({
  name,
  avatarUrl,
  size = 32,
  showName = false,
  style,
}: Props) => {
  const sizeNum = typeof size === 'number' ? size : size === 'small' ? 24 : size === 'large' ? 40 : 32;

  const avatar = (
    <Avatar
      size={sizeNum}
      src={avatarUrl || undefined}
      icon={!avatarUrl && !name ? <UserOutlined /> : undefined}
      style={{
        backgroundColor: !avatarUrl && name ? '#1677ff' : undefined,
        ...style,
      }}
    >
      {!avatarUrl && name ? getInitials(name) : null}
    </Avatar>
  );

  if (!showName) return avatar;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {avatar}
      <span>{name || '—'}</span>
    </div>
  );
};

export default UserAvatar;