import { Tag } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';

type StatusType = 'course' | 'session' | 'question' | 'resource' | 'role' | 'custom';

interface Props {
  status: string;
  type?: StatusType;
  showIcon?: boolean;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  // Lead
  NEW: 'blue',
  CONSULTED: 'green',
  // Course
  DRAFT: 'default',
  PENDING_REVIEW: 'orange',
  PUBLISHED: 'green',
  ARCHIVED: 'purple',
  CANCELLED: 'red',
  // Class
  PLANNED: 'blue',
  OPEN: 'cyan',
  ONGOING: 'processing',
  FINISHED: 'green',
  // Session
  SCHEDULED: 'blue',
  DONE: 'green',
  RESCHEDULED: 'orange',
  // Active/Inactive
  ACTIVE: 'green',
  INACTIVE: 'default',
  HIDDEN: 'default',
  // Roles
  ADMIN: 'red',
  INSTRUCTOR: 'blue',
  STUDENT: 'green',
  // Types
  ONLINE: 'cyan',
  OFFLINE: 'gold',
};

const StatusTag = ({ status, showIcon = false }: Props) => {
  const { t } = useTranslation();
  const color = STATUS_COLOR_MAP[status] || 'default';
  const label = t(`status.${status}`, status);

  return (
    <Tag color={color} icon={showIcon ? undefined : undefined}>
      {label}
    </Tag>
  );
};

export default StatusTag;