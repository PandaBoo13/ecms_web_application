import { Modal, Typography, Tag, Button } from 'antd';
import { CloseOutlined, GiftOutlined } from '@ant-design/icons';
import LeadRegistrationForm from './LeadRegistrationForm';

const { Title, Paragraph } = Typography;

interface LeadRegistrationModalProps {
  open: boolean;
  initialCourseId?: number;
  initialCourseTitle?: string;
  onClose: () => void;
}

export default function LeadRegistrationModal({
  open,
  initialCourseId,
  initialCourseTitle,
  onClose,
}: LeadRegistrationModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={620}
      centered
      closeIcon={<CloseOutlined style={{ fontSize: 18, color: '#64748b' }} />}
      styles={{
        body: {
          padding: 0,
        },
      }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Top Banner Header giống PMP English */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)',
          color: '#ffffff',
          padding: '28px 28px 20px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Tag
            color="warning"
            style={{
              fontWeight: 700,
              borderRadius: 12,
              padding: '2px 10px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <GiftOutlined /> ƯU ĐÃI ĐẶC QUYỀN
          </Tag>
          <span style={{ fontSize: 12, color: '#cbd5e1' }}>Dành riêng cho khách đăng ký trực tuyến</span>
        </div>

        <Title
          level={3}
          style={{
            margin: '0 0 6px 0',
            color: '#ffffff',
            fontSize: 'clamp(20px, 3vw, 24px)',
            fontWeight: 800,
          }}
        >
          {initialCourseTitle
            ? `Tư Vấn Khóa Học: ${initialCourseTitle}`
            : 'Đăng Ký Nhận Tư Vấn & Kiểm Tra Trình Độ'}
        </Title>

        <Paragraph
          style={{
            margin: 0,
            color: '#e2e8f0',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {initialCourseTitle
            ? 'Để lại thông tin để nhận lộ trình chi tiết, học phí ưu đãi và xếp lịch test miễn phí.'
            : 'Tặng 100% lệ phí bài kiểm tra năng lực tiếng Anh (Placement Test) & tư vấn lộ trình 1-1.'}
        </Paragraph>
      </div>

      {/* Form Content */}
      <div style={{ padding: '24px 28px 20px', background: '#ffffff' }}>
        <LeadRegistrationForm
          initialCourseId={initialCourseId}
          compact
          onSuccess={() => {
            // Tự động đóng modal sau khi thành công
            setTimeout(() => {
              onClose();
            }, 1000);
          }}
        />

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button
            type="link"
            size="small"
            onClick={onClose}
            style={{ color: '#94a3b8', fontSize: 13 }}
          >
            Đóng lại và tiếp tục xem website
          </Button>
        </div>
      </div>
    </Modal>
  );
}
