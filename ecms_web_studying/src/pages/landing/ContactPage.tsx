import { Card, Typography, Space, Row, Col, Tag } from 'antd';
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import LeadRegistrationForm from '@/components/lead/LeadRegistrationForm';

const { Title, Paragraph, Text } = Typography;

export default function ContactPage() {
  return (
    <div style={{ padding: '48px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Tag color="blue" style={{ padding: '4px 12px', borderRadius: 12, fontSize: 13, marginBottom: 8 }}>
          <CustomerServiceOutlined style={{ marginRight: 4 }} /> Hỗ trợ & Tiếp nhận tư vấn
        </Tag>
        <Title level={2} style={{ marginTop: 8, marginBottom: 8, color: '#0f172a' }}>
          Liên Hệ Với Trung Tâm ECMS
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 650, margin: '0 auto' }}>
          Bạn cần tư vấn chi tiết về khóa học, kiểm tra trình độ đầu vào hoặc lịch học? Hãy để lại thông
          tin hoặc liên hệ trực tiếp với chúng tôi.
        </Paragraph>
      </div>

      <Row gutter={[32, 32]}>
        {/* Cột trái: Form tiếp nhận tư vấn (Form Web - Lead Module FR_01) */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div>
                <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                  Gửi yêu cầu tư vấn & Đăng ký khóa học
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Thông tin sẽ được tiếp nhận trực tiếp vào hệ thống tư vấn viên
                </Text>
              </div>
            }
            style={{
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <LeadRegistrationForm />
          </Card>
        </Col>

        {/* Cột phải: Thông tin liên hệ trung tâm & Quy trình hỗ trợ */}
        <Col xs={24} lg={10}>
          <Space orientation="vertical" size={24} style={{ width: '100%' }}>
            <Card
              style={{
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Title level={4} style={{ marginBottom: 20, color: '#0f172a' }}>
                Thông tin đường dây nóng
              </Title>

              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#eff6ff',
                      color: '#1677ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <PhoneOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                      Hotline tư vấn (24/7)
                    </Text>
                    <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
                      1900 8888 - 028 1234 5678
                    </Text>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#f0fdf4',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <MailOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                      Email hỗ trợ học vụ
                    </Text>
                    <Text strong style={{ fontSize: 15, color: '#334155' }}>
                      contact@ecms.edu.vn
                    </Text>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#faf5ff',
                      color: '#9333ea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <EnvironmentOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                      Cơ sở chính
                    </Text>
                    <Text strong style={{ fontSize: 14, color: '#334155' }}>
                      123 Đường ABC, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
                    </Text>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#fffbeb',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <ClockCircleOutlined />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                      Thời gian làm việc
                    </Text>
                    <Text strong style={{ fontSize: 14, color: '#334155' }}>
                      Thứ 2 - Thứ 7: 8:00 - 21:00 | Chủ nhật: 8:00 - 17:30
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>

            <Card
              style={{
                borderRadius: 16,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <Title level={5} style={{ marginBottom: 12, color: '#0f172a' }}>
                <CheckCircleOutlined style={{ color: '#16a34a', marginRight: 8 }} />
                Cam kết hỗ trợ từ ECMS
              </Title>
              <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
                <li>Mọi hồ sơ đăng ký đều được bảo mật thông tin cá nhân (NFR-02).</li>
                <li>Tư vấn viên liên hệ hỗ trợ lộ trình trong vòng 24 giờ làm việc.</li>
                <li>Được xếp lịch kiểm tra trình độ đầu vào miễn phí (Placement Test).</li>
                <li>Học viên cũ đăng ký thêm khóa mới được hưởng chính sách ưu đãi riêng.</li>
              </ul>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
