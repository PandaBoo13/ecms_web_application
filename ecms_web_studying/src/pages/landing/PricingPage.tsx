import { useState } from 'react';
import { Card, Col, Row, Typography, Button } from 'antd';
import { CheckOutlined, SendOutlined } from '@ant-design/icons';
import LeadRegistrationModal from '@/components/lead/LeadRegistrationModal';

const { Title, Paragraph } = Typography;

const plans = [
  {
    name: 'Cơ bản (Self-Study)',
    price: '2.000.000đ',
    features: [
      'Truy cập toàn bộ tài liệu & video online',
      'Kho đề thi & bài tập trắc nghiệm tự luyện',
      'Hỗ trợ hỏi đáp qua cộng đồng',
      'Kiểm tra trình độ đầu vào miễn phí',
    ],
    color: '#3b82f6',
    featured: false,
  },
  {
    name: 'Tiêu chuẩn (Blended Learning)',
    price: '4.500.000đ',
    features: [
      'Bao gồm mọi quyền lợi gói Cơ bản',
      'Lớp học trực tuyến tương tác cùng giảng viên',
      'Chấm chữa bài tập & bài viết chi tiết',
      'Cam kết chuẩn đầu ra theo lộ trình',
    ],
    color: '#10b981',
    featured: true,
  },
  {
    name: 'Chuyên sâu (Offline & 1-1 Coaching)',
    price: '8.500.000đ',
    features: [
      'Học trực tiếp tại cơ sở với trang thiết bị hiện đại',
      'Buổi kèm 1-1 giải đáp thắc mắc chuyên sâu',
      'Kế hoạch học tập cá nhân hóa 100%',
      'Hỗ trợ hồ sơ thi chứng chỉ quốc tế',
    ],
    color: '#8b5cf6',
    featured: false,
  },
];

export default function PricingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    setModalOpen(true);
  };

  return (
    <div style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          Bảng Học Phí & Lộ Trình Đào Tạo
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
          Lựa chọn gói đào tạo phù hợp với mục tiêu và thời gian biểu của bạn. Mọi học viên đều được
          đánh giá trình độ và tư vấn trước khi đăng ký.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {plans.map((p) => (
          <Col xs={24} md={8} key={p.name}>
            <Card
              hoverable
              style={{
                borderRadius: 16,
                border: p.featured ? `2px solid ${p.color}` : '1px solid #e2e8f0',
                position: 'relative',
                boxShadow: p.featured
                  ? '0 10px 25px -5px rgba(16, 185, 129, 0.2)'
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              {p.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: p.color,
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Phổ biến nhất
                </div>
              )}

              <Title level={4} style={{ color: p.color, textAlign: 'center', marginTop: 8 }}>
                {p.name}
              </Title>

              <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '16px 0' }}>
                {p.price}
                <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b' }}> / khóa</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1 }}>
                {p.features.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      padding: '8px 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      fontSize: 14,
                      color: '#334155',
                    }}
                  >
                    <CheckOutlined style={{ color: p.color, marginRight: 10, marginTop: 4 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                type={p.featured ? 'primary' : 'default'}
                block
                size="large"
                icon={<SendOutlined />}
                style={{
                  marginTop: 16,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: p.featured ? p.color : undefined,
                  borderColor: p.featured ? p.color : undefined,
                }}
                onClick={() => handleSelectPlan(p.name)}
              >
                Nhận tư vấn gói này
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      <LeadRegistrationModal
        open={modalOpen}
        initialCourseTitle={`Gói đào tạo: ${selectedPlan}`}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
