import { Tag } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  status: string;
  showIcon?: boolean;
}

/**
 * StatusTag riêng cho module Request — không dùng StatusTag gốc vì:
 *  - Request có status PENDING/APPROVED/REJECTED/CANCELLED
 *  - Khác với course PENDING_REVIEW, session SCHEDULED, v.v...
 *  - Không muốn đụng vào STATUS_COLOR_MAP của StatusTag gốc
 */
const REQUEST_STATUS_COLOR_MAP: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'default',
};

const RequestStatusTag = ({ status }: Props) => {
  const { t } = useTranslation();
  const color = REQUEST_STATUS_COLOR_MAP[status] || 'default';
  const label = t(`status.${status}`, status);

  return <Tag color={color}>{label}</Tag>;
};

export default RequestStatusTag;