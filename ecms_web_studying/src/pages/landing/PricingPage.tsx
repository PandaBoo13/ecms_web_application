import { Card, Col, Row, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
const { Title, Paragraph } = Typography;
const plans = [
  { name: 'Cơ bản', price: '2.000.000đ', features: ['Truy cập online', 'Tài liệu PDF', 'Hỗ trợ chat'], color: '#3b82f6', featured: false },
  { name: 'Tiêu chuẩn', price: '4.000.000đ', features: ['Tất cả Cơ bản', 'Lớp trực tuyến', 'Chấm bài'], color: '#10b981', featured: true },
  { name: 'Cao cấp', price: '8.000.000đ', features: ['Tất cả Tiêu chuẩn', 'Lớp offline', '1-1 với GV'], color: '#8b5cf6', featured: false },
];
const PricingPage = () => (
  <div style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>
    <Title level={2} style={{ textAlign: 'center' }}>Học phí</Title>
    <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
      {plans.map((p) => (<Col xs={24} md={8} key={p.name}><Card style={{ border: p.featured ? `2px solid ${p.color}` : undefined }}><Title level={3} style={{ color: p.color, textAlign: 'center' }}>{p.name}</Title><div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700 }}>{p.price}</div><ul style={{ listStyle: 'none', padding: 0, marginTop: 24 }}>{p.features.map((f, i) => <li key={i} style={{ padding: '8px 0' }}><CheckOutlined style={{ color: p.color, marginRight: 8 }} /> {f}</li>)}</ul></Card></Col>))}
    </Row>
  </div>
);
export default PricingPage;