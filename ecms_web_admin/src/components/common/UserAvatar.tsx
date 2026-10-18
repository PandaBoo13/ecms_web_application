import React from 'react';
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

const AVATAR_PALETTE = [
  { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' }, // blue
  { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' }, // purple
  { bg: '#d1fae5', color: '#047857', border: '#a7f3d0' }, // emerald
  { bg: '#fef3c7', color: '#b45309', border: '#fde68a' }, // amber
  { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' }, // pink
  { bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' }, // teal
  { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' }, // indigo
];

function getAvatarPalette(name?: string) {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

const UserAvatar = ({
  name,
  avatarUrl,
  size = 32,
  showName = false,
  style,
}: Props) => {
  const sizeNum = typeof size === 'number' ? size : size === 'small' ? 24 : size === 'large' ? 40 : 32;
  const palette = getAvatarPalette(name);

  const avatar = (
    <Avatar
      size={sizeNum}
      src={avatarUrl || undefined}
      icon={!avatarUrl && !name ? <UserOutlined /> : undefined}
      style={{
        backgroundColor: !avatarUrl ? palette.bg : undefined,
        color: !avatarUrl ? palette.color : undefined,
        border: !avatarUrl ? `1px solid ${palette.border}` : undefined,
        fontWeight: 600,
        fontSize: sizeNum >= 36 ? 14 : 12,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        ...style,
      }}
    >
      {!avatarUrl && name ? getInitials(name) : null}
    </Avatar>
  );

  if (!showName) return avatar;

  return (
    <div className="inline-flex items-center gap-2">
      {avatar}
      <span className="font-medium text-slate-800">{name || '—'}</span>
    </div>
  );
};

export default UserAvatar;