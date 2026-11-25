import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Descriptions, Drawer, Space, Tag, Typography } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useTranslation } from '@/hooks/useTranslation';
import { getRequestTypeLabel } from '@/services/types/request/request';
import type { RequestDetailResponse } from '@/services/types/request/request';
import DateDisplay from '@/components/common/DateDisplay';
import RequestStatusTag from '@/components/request/RequestStatusTag';
import CourseConflictAlert from '@/components/request/CourseConflictAlert';
import RequestReviewActions from '@/components/request/RequestReviewActions';
import GradeApprovalPanel from '@/components/request/GradeApprovalPanel';
import ReopenGradeSheetAction from '@/components/request/ReopenGradeSheetAction';

interface Props {
  open: boolean;
  request: RequestDetailResponse | null;
  onClose: () => void;
  onRefresh: () => void;
}

const resolveCourseId = (request: RequestDetailResponse): number | null => {
  if (
    request.targetEntityId &&
    (request.targetEntityType === 'COURSE' ||
      String(request.requestType).startsWith('COURSE_'))
  ) {
    return Number(request.targetEntityId);
  }

  const payload = (request as { payload?: Record<string, unknown> }).payload;
  const payloadCourseId = payload?.courseId;
  if (payloadCourseId && !Number.isNaN(Number(payloadCourseId))) {
    return Number(payloadCourseId);
  }

  return null;
};

const RequestDetailDrawer = ({ open, request, onClose, onRefresh }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hasConflict, setHasConflict] = useState(false);

  if (!request) return null;

  const courseId = resolveCourseId(request);

  const handleGoToCourseDetail = () => {
    if (!courseId) return;
    onClose();
    navigate(`/admin/courses/${courseId}`);
  };

  return (
    <Drawer
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>
            {t('request.detail.title', 'Chi tiết yêu cầu')} —{' '}
            {request.requestCode}
          </span>
          <Space size={8}>
            {courseId && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<ExportOutlined />}
                onClick={handleGoToCourseDetail}
              >
                Xem khóa học
              </Button>
            )}
            <RequestStatusTag status={request.status} />
          </Space>
        </div>
      }
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
    >
      <Descriptions
        title={t('request.detail.basicInfo', 'Thông tin cơ bản')}
        bordered
        column={1}
        size="small"
      >
        <Descriptions.Item label={t('request.detail.requestCode', 'Mã yêu cầu')}>
          <Typography.Text code>{request.requestCode}</Typography.Text>
        </Descriptions.Item>

        <Descriptions.Item label={t('request.detail.requestType', 'Loại yêu cầu')}>
          <Tag color="blue">
            {getRequestTypeLabel(request.requestType as string)}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label={t('request.detail.requester', 'Người gửi')}>
          {request.requesterName || `#${request.requesterId}`}
        </Descriptions.Item>

        <Descriptions.Item label={t('request.detail.target', 'Đối tượng áp dụng')}>
          {courseId ? (
            <Typography.Link onClick={handleGoToCourseDetail}>
              <Space size={6}>
                <span>
                  {request.targetEntityType || 'COURSE'} #{courseId}
                </span>
                <ExportOutlined style={{ fontSize: 12 }} />
              </Space>
            </Typography.Link>
          ) : (
            <>
              {request.targetEntityType}
              {request.targetEntityId ? ` #${request.targetEntityId}` : ''}
            </>
          )}
        </Descriptions.Item>

        <Descriptions.Item label={t('request.detail.titleField', 'Tiêu đề')}>
          {courseId ? (
            <Typography.Link strong onClick={handleGoToCourseDetail}>
              {request.title}
            </Typography.Link>
          ) : (
            request.title
          )}
        </Descriptions.Item>

        {request.description && (
          <Descriptions.Item label={t('request.detail.description', 'Mô tả')}>
            {request.description}
          </Descriptions.Item>
        )}

        <Descriptions.Item label={t('request.detail.createdAt', 'Ngày gửi')}>
          <DateDisplay value={request.createdAt} />
        </Descriptions.Item>

        {request.resolvedAt && (
          <Descriptions.Item label={t('request.detail.resolvedAt', 'Ngày duyệt')}>
            <DateDisplay value={request.resolvedAt} />
            {request.resolvedByName ? ` — ${request.resolvedByName}` : ''}
          </Descriptions.Item>
        )}

        {request.rejectReason && (
          <Descriptions.Item label={t('request.detail.rejectReason', 'Lý do từ chối')}>
            <Typography.Text type="danger">
              {request.rejectReason}
            </Typography.Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Cảnh báo conflict — chỉ hiện với COURSE_REVIEW */}
      <div style={{ marginTop: 24 }}>
        <CourseConflictAlert
          requestId={request.id}
          requestType={request.requestType as string}
          onConflictChange={setHasConflict}
        />
      </div>

      {/* Bảng điểm chi tiết — chỉ hiện với COURSE_GRADE_APPROVAL */}
      {request.requestType === 'COURSE_GRADE_APPROVAL' && (
        <GradeApprovalPanel request={request} />
      )}

      {/* Thông tin mở lại bảng điểm (nếu đã từng được ADMIN mở khóa) */}
      {request.requestType === 'COURSE_GRADE_APPROVAL' && Boolean(request.responseData?.reopenReason) && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          message="Bảng điểm đã được mở lại để chỉnh sửa"
          description={`Lý do: ${String(request.responseData?.reopenReason ?? '')}`}
        />
      )}

      {/* ADMIN mở lại bảng điểm đã duyệt */}
      {request.requestType === 'COURSE_GRADE_APPROVAL' && request.status === 'APPROVED' && courseId && (
        <ReopenGradeSheetAction
          courseId={courseId}
          onSuccess={() => {
            onRefresh();
            onClose();
          }}
        />
      )}

      {/* Actions duyệt / từ chối — chỉ hiện khi PENDING */}
      <RequestReviewActions
        request={request}
        hasConflict={hasConflict}
        onSuccess={() => {
          onRefresh();
          onClose();
        }}
      />
    </Drawer>
  );
};

export default RequestDetailDrawer;