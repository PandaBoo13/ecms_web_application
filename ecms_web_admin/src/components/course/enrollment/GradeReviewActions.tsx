import { Button, Popconfirm, Space, Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { CourseStatus } from '@/services/types/course/enums';
import type { GradeReviewStatusResponse } from '@/services/types/enrollment';

interface Props {
  courseStatus: CourseStatus;
  gradeReviewStatus: GradeReviewStatusResponse | null;
  canManageScores: boolean;
  submitting: boolean;
  recalling: boolean;
  onSubmit: () => void;
  onRecall: () => void;
}

export default function GradeReviewActions({
  courseStatus,
  gradeReviewStatus,
  canManageScores,
  submitting,
  recalling,
  onSubmit,
  onRecall,
}: Props) {
  if (gradeReviewStatus?.status === 'APPROVED') {
    return (
      <Tag color="success" icon={<CheckCircleOutlined />} className="py-1 px-2.5">
        Bảng điểm: Đã duyệt &amp; Công bố
      </Tag>
    );
  }

  if (gradeReviewStatus?.status === 'PENDING_APPROVAL') {
    return (
      <Space size={6}>
        <Tag color="warning" icon={<ClockCircleOutlined />} className="py-1 px-2.5">
          Bảng điểm: Chờ duyệt
        </Tag>
        {gradeReviewStatus.canRecall && (
          <Popconfirm
            title="Thu hồi bảng điểm đã gửi duyệt để chỉnh sửa?"
            description="Yêu cầu duyệt hiện tại sẽ bị hủy; sau khi sửa hãy gửi duyệt lại."
            onConfirm={onRecall}
            okText="Thu hồi"
            cancelText="Hủy"
          >
            <Button size="small" icon={<UndoOutlined />} loading={recalling}>
              Thu hồi
            </Button>
          </Popconfirm>
        )}
      </Space>
    );
  }

  const rejected = gradeReviewStatus?.status === 'REJECTED';
  const canSubmit = canManageScores && courseStatus === 'FINISHED';
  const submitLabel = rejected ? 'Gửi duyệt lại' : 'Gửi duyệt bảng điểm';

  return (
    <Space size={6}>
      {rejected ? (
        <Tooltip title={gradeReviewStatus.rejectReason ? `Lý do: ${gradeReviewStatus.rejectReason}` : undefined}>
          <Tag color="error" icon={<CloseCircleOutlined />} className="py-1 px-2.5 cursor-help">
            Bảng điểm: Bị từ chối
          </Tag>
        </Tooltip>
      ) : (
        <Tag color="default" className="py-1 px-2.5">
          Bảng điểm: Bản nháp
        </Tag>
      )}
      {canManageScores && (canSubmit ? (
        <Popconfirm
          title={rejected
            ? 'Gửi lại bảng điểm này để Quản trị viên duyệt?'
            : 'Gửi bảng điểm này để Quản trị viên duyệt trước khi công bố cho học viên?'}
          onConfirm={onSubmit}
          okText="Gửi duyệt"
          cancelText="Hủy"
        >
          <Button icon={<SendOutlined />} size="small" loading={submitting}>
            {submitLabel}
          </Button>
        </Popconfirm>
      ) : (
        <Tooltip title="Chỉ gửi duyệt bảng điểm sau khi khóa học kết thúc.">
          <span>
            <Button icon={<SendOutlined />} size="small" disabled>
              {submitLabel}
            </Button>
          </span>
        </Tooltip>
      ))}
    </Space>
  );
}
