import { Tag, Tooltip } from 'antd';
import type { EnrollmentStatus } from '@/services/types/enrollment';
import { ENROLLMENT_STATUS_COLOR, ENROLLMENT_STATUS_LABEL } from '@/constants/enrollment';

interface EnrollmentStatusTagProps {
  status: EnrollmentStatus;
}

export default function EnrollmentStatusTag({ status }: EnrollmentStatusTagProps) {
  return (
    <Tooltip title={status}>
      <Tag color={ENROLLMENT_STATUS_COLOR[status]}>{ENROLLMENT_STATUS_LABEL[status]}</Tag>
    </Tooltip>
  );
}
