import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Tag, Typography, Card } from 'antd';
import {
  ThunderboltOutlined,
  UserOutlined,
  PhoneOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { leadApi } from '@/services/api/leads';
import type { FastClaimLeadPayload } from '@/services/types/lead';

const { Text, Title } = Typography;

interface Props {
  onClaimSuccess?: (leadId: number) => void;
  workStatus?: string;
  onWorkStatusChange?: (newStatus: string) => void;
}

export const FastClaimModal = ({ onClaimSuccess, workStatus, onWorkStatusChange }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [claimLead, setClaimLead] = useState<FastClaimLeadPayload | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [currentWorkStatus, setCurrentWorkStatus] = useState<string>(workStatus || 'AVAILABLE');

  // Cho phép TVV, Quản lý tư vấn và Admin đều có thể nhận và tương tác với sự kiện Fast-Claim
  const isConsultant =
    user?.roleCode === 'LEAD' ||
    user?.roleCode === 'CONSULTANT';

  const canReceiveFastClaim =
    isConsultant ||
    user?.roleCode === 'ADMIN' ||
    (user?.roleCode as string) === 'CONSULTANT_MANAGER';

  // Đồng bộ prop workStatus
  useEffect(() => {
    if (workStatus) {
      setCurrentWorkStatus(workStatus);
    }
  }, [workStatus]);

  // Lấy trạng thái ca trực từ backend nếu là TVV
  useEffect(() => {
    if (user?.accountId && isConsultant && !workStatus) {
      leadApi
        .getWorkStatus()
        .then((res: { workStatus: string }) => {
          if (res?.workStatus) {
            setCurrentWorkStatus(res.workStatus);
          }
        })
        .catch(() => {});
    }
  }, [user?.accountId, isConsultant, workStatus]);

  useEffect(() => {
    if (!canReceiveFastClaim) return;

    // Lắng nghe topic Fast-Claim
    const unsub = subscribe('/topic/leads/fast-claim', (payload: FastClaimLeadPayload) => {
      if (!payload) return;

      if (payload.type === 'FAST_CLAIM_NEW_LEAD') {
        // Nếu là TVV: bỏ qua nếu đang ở trạng thái BUSY, SICK_LEAVE, ON_LEAVE, RESIGNED...
        if (isConsultant) {
          const statusUpper = (currentWorkStatus || 'AVAILABLE').toUpperCase();
          const isExcluded =
            statusUpper === 'BUSY' ||
            statusUpper === 'SICK_LEAVE' ||
            statusUpper === 'ON_LEAVE' ||
            statusUpper === 'RESIGNED' ||
            statusUpper === 'NGHỈ BỆNH' ||
            statusUpper === 'NGHỈ PHÉP' ||
            statusUpper === 'NGHỈ VIỆC' ||
            statusUpper === 'ĐANG TƯ VẤN';

          if (isExcluded) {
            return;
          }
        }

        window.dispatchEvent(new CustomEvent('LEAD_REFRESH'));
        setClaimLead(payload);
      } else if (payload.type === 'LEAD_CLAIMED') {
        window.dispatchEvent(new CustomEvent('LEAD_REFRESH'));
        // Nếu Lead đang hiển thị đã có người khác nhận -> đóng popup
        setClaimLead((current: FastClaimLeadPayload | null) => {
          if (current && current.leadId === payload.leadId) {
            if (payload.claimedById !== user?.accountId) {
              toast(`Khách hàng #${payload.leadId} đã được ${payload.claimedBy || 'TVV khác'} tiếp nhận`, {
                icon: 'ℹ️',
              });
            }
            return null;
          }
          return current;
        });
      }
    });

    return () => {
      unsub();
    };
  }, [subscribe, canReceiveFastClaim, isConsultant, currentWorkStatus, user?.accountId]);

  const handleClaim = async () => {
    if (!claimLead) return;
    setClaiming(true);
    try {
      await leadApi.claim(claimLead.leadId);
      toast.success('🎉 Nhận khách hàng thành công!');
      const claimedId = claimLead.leadId;
      setClaimLead(null);
      setCurrentWorkStatus('BUSY');
      onWorkStatusChange?.('BUSY');
      window.dispatchEvent(new CustomEvent('LEAD_REFRESH'));

      if (onClaimSuccess) {
        onClaimSuccess(claimedId);
      } else {
        navigate(`/admin/leads?leadId=${claimedId}`);
      }
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Khách hàng này đã được một tư vấn viên khác tiếp nhận!');
      setClaimLead(null);
    } finally {
      setClaiming(false);
    }
  };

  const handleDismiss = () => {
    setClaimLead(null);
  };

  if (!canReceiveFastClaim || !claimLead) return null;

  const isBuyNow = claimLead.demandType === 'BUY_NOW_PENDING';

  return (
    <Modal
      open={!!claimLead}
      onCancel={handleDismiss}
      footer={null}
      closable={false}
      centered
      width={480}
      styles={{
        body: {
          padding: 8,
        },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: isBuyNow ? '#fff7ed' : '#eff6ff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            border: isBuyNow ? '2px solid #fdba74' : '2px solid #93c5fd',
          }}
        >
          <ThunderboltOutlined
            style={{
              fontSize: 28,
              color: isBuyNow ? '#ea580c' : '#2563eb',
            }}
          />
        </div>
        <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
          {isBuyNow ? '⚡ ĐƠN MUA NGAY CẦN HỖ TRỢ!' : '📞 CÓ KHÁCH HÀNG MỚI ĐĂNG KÝ!'}
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {isBuyNow
            ? 'Khách đặt mua khóa học nhưng chưa hoàn tất thanh toán. Hãy nhận ngay để hỗ trợ!'
            : 'Khách hàng vừa để lại thông tin quan tâm tư vấn. TVV nhanh tay bấm nhận!'}
        </Text>
      </div>

      <Card
        size="small"
        bordered={false}
        style={{
          background: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserOutlined /> Khách hàng:
            </span>
            <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
              {claimLead.fullName}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PhoneOutlined /> Số điện thoại:
            </span>
            <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
              {claimLead.phone || 'Chưa cung cấp'}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOutlined /> Khóa quan tâm:
            </span>
            <Text strong style={{ fontSize: 13, color: '#2563eb', maxWidth: 240 }} ellipsis>
              {claimLead.courseTitle}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClockCircleOutlined /> Loại yêu cầu:
            </span>
            <Tag color={isBuyNow ? 'warning' : 'blue'} style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
              {isBuyNow ? '⚠️ Mua ngay · Chờ thanh toán' : '📞 Đăng ký tư vấn'}
            </Tag>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button
          style={{ flex: 1, height: 42, borderRadius: 10, fontWeight: 500 }}
          onClick={handleDismiss}
          disabled={claiming}
        >
          Bỏ qua
        </Button>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={claiming}
          style={{
            flex: 2,
            height: 42,
            borderRadius: 10,
            fontWeight: 700,
            background: isBuyNow
              ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
          onClick={handleClaim}
        >
          ⚡ NHẬN TƯ VẤN NGAY
        </Button>
      </div>
    </Modal>
  );
};

export default FastClaimModal;
