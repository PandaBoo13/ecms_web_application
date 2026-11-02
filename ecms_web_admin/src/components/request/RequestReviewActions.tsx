import { useState } from 'react';
import { Button, Input, Modal, Space, Tooltip, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { requestApi } from '@/services/api/request/requestApi';
import type { RequestDetailResponse } from '@/services/types/request/request';

interface Props {
  request: RequestDetailResponse;
  hasConflict: boolean;
  onSuccess: () => void;
}

const RequestReviewActions = ({ request, hasConflict, onSuccess }: Props) => {
  const { t } = useTranslation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Nếu đã xử lý xong → không cho thao tác
  if (request.status !== 'PENDING') {
    return (
      <div
        style={{
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0',
          marginTop: 16,
        }}
      >
        <Typography.Text type="secondary">
          {t(
            'request.detail.alreadyResolved',
            'Yêu cầu đã được xử lý — không thể thao tác thêm.',
          )}
        </Typography.Text>
      </div>
    );
  }

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await requestApi.review(request.id, { approved: true });
      toast.success(t('request.review.approveSuccess', 'Đã duyệt yêu cầu'));
      onSuccess();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Duyệt yêu cầu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(
        t('request.review.rejectReasonRequired', 'Vui lòng nhập lý do từ chối'),
      );
      return;
    }
    setSubmitting(true);
    try {
      await requestApi.review(request.id, {
        approved: false,
        note: rejectReason.trim(),
      });
      toast.success(t('request.review.rejectSuccess', 'Đã từ chối yêu cầu'));
      setRejectOpen(false);
      setRejectReason('');
      onSuccess();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Từ chối yêu cầu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        paddingTop: 16,
        borderTop: '1px solid #f0f0f0',
        marginTop: 16,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <Space>
        <Button
          danger
          icon={<CloseOutlined />}
          onClick={() => setRejectOpen(true)}
          disabled={submitting}
        >
          {t('request.review.rejectBtn', 'Từ chối')}
        </Button>

        <Tooltip
          title={
            hasConflict
              ? t(
                  'request.review.blockedByConflict',
                  'Không thể duyệt — có xung đột lịch',
                )
              : ''
          }
        >
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleApprove}
            loading={submitting}
            disabled={hasConflict}
          >
            {t('request.review.approveBtn', 'Duyệt')}
          </Button>
        </Tooltip>
      </Space>

      <Modal
        title={t('request.review.rejectConfirmTitle', 'Từ chối yêu cầu?')}
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          setRejectReason('');
        }}
        onOk={handleReject}
        confirmLoading={submitting}
        okText={t('request.review.rejectBtn', 'Từ chối')}
        cancelText={t('common.cancel', 'Hủy')}
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <div style={{ marginTop: 12 }}>
          <Typography.Text strong>
            {t('request.review.rejectReasonLabel', 'Lý do từ chối')}
          </Typography.Text>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t(
              'request.review.rejectReasonPlaceholder',
              'Nhập lý do từ chối (bắt buộc)...',
            )}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default RequestReviewActions;