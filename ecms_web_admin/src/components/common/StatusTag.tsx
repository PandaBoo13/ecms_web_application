import { Tag } from 'antd';

type StatusType = 'course' | 'session' | 'question' | 'resource' | 'role' | 'custom';

interface Props {
  status: string;
  type?: StatusType;
  showIcon?: boolean;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  // ═══ Course status ═══
  DRAFT: { color: 'default', label: 'Nháp' },
  PENDING_REVIEW: { color: 'orange', label: 'Chờ duyệt' },
  PUBLISHED: { color: 'green', label: 'Đã xuất bản' },
  ARCHIVED: { color: 'purple', label: 'Lưu trữ' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },

  // ═══ Class status ═══
  PLANNED: { color: 'blue', label: 'Kế hoạch' },
  OPEN: { color: 'cyan', label: 'Đang mở' },
  ONGOING: { color: 'processing', label: 'Đang diễn ra' },
  FINISHED: { color: 'green', label: 'Kết thúc' },

  // ═══ Session status ═══
  SCHEDULED: { color: 'blue', label: 'Đã lên lịch' },
  DONE: { color: 'green', label: 'Hoàn thành' },
  RESCHEDULED: { color: 'orange', label: 'Đổi lịch' },

  // ═══ Question / Resource status ═══
  ACTIVE: { color: 'green', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Không hoạt động' },
  HIDDEN: { color: 'default', label: 'Ẩn' },

  // ═══ Role ═══
  ADMIN: { color: 'red', label: 'Quản trị viên' },
  INSTRUCTOR: { color: 'blue', label: 'Giảng viên' },
  STUDENT: { color: 'green', label: 'Học viên' },

  // ═══ Course type ═══
  ONLINE: { color: 'cyan', label: 'Online' },
  OFFLINE: { color: 'gold', label: 'Offline' },
};

const StatusTag = ({ status, showIcon = false }: Props) => {
  const config = STATUS_MAP[status] || { color: 'default', label: status };
  return (
    <Tag color={config.color} icon={showIcon ? undefined : undefined}>
      {config.label}
    </Tag>
  );
};

export default StatusTag;