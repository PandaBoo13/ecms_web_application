import { useState } from 'react';
import { Descriptions, Drawer, Tag, Typography } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';
import { getRequestTypeLabel } from '@/services/types/request/request';
import type { RequestDetailResponse } from '@/services/types/request/request';
import DateDisplay from '@/components/common/DateDisplay';
import RequestStatusTag from '@/components/request/RequestStatusTag';
import CourseConflictAlert from '@/components/request/CourseConflictAlert';
import RequestReviewActions from '@/components/request/RequestReviewActions';

interface Props {
  open: boolean;
  request: RequestDetailResponse | null;
  onClose: () => void;
  onRefresh: () => void;
}

const RequestDetailDrawer = ({ open, request, onClose, onRefresh }: Props) => {
  const { t } = useTranslation();
  const [hasConflict, setHasConflict] = useState(false);

  if (!request) return null;

  return (
    <Drawer
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            {t('request.detail.title', 'Chi tiết yêu cầu')} —{' '}
            {request.requestCode}
          </span>
          <RequestStatusTag status={request.status} />
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
          {request.targetEntityType}
          {request.targetEntityId ? ` #${request.targetEntityId}` : ''}
        </Descriptions.Item>

        <Descriptions.Item label={t('request.detail.titleField', 'Tiêu đề')}>
          {request.title}
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