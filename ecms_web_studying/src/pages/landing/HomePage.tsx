import { Button, Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BookOutlined, TeamOutlined, TrophyOutlined, RocketOutlined } from '@ant-design/icons';
const { Title, Paragraph } = Typography;
const features = [
  { icon: <BookOutlined />, title: 'Khóa học đa dạng', desc: 'Online & Offline' },
  { icon: <TeamOutlined />, title: 'Giảng viên chất lượng', desc: 'Giàu kinh nghiệm' },
  { icon: <TrophyOutlined />, title: 'Chứng chỉ uy tín', desc: 'Giá trị lâu dài' },
  { icon: <RocketOutlined />, title: 'Học mọi lúc mọi nơi', desc: 'Nền tảng hiện đại' },
];
const HomePage = () => {
  const navigate = useNavigate();
  return (
    <div>
      <section style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', padding: '96px 24px', textAlign: 'center' }}>
        <Title style={{ color: '#fff', fontSize: 48 }}>Học tiếng Anh chuẩn quốc tế</Title>
        <Paragraph style={{ color: '#e0e7ff', fontSize: 18, marginBottom: 32 }}>Lộ trình cá nhân hóa, giảng viên chất lượng.</Paragraph>
        <Button type="primary" size="large" onClick={() => navigate('/courses')}>Khám phá khóa học</Button>
      </section>
      <section style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>Tại sao chọn ECMS?</Title>
        <Row gutter={[24, 24]}>
          {features.map((f, i) => (<Col xs={24} sm={12} lg={6} key={i}><Card hoverable style={{ textAlign: 'center' }}><div style={{ fontSize: 36, color: '#1677ff' }}>{f.icon}</div><Title level={4}>{f.title}</Title><Paragraph type="secondary">{f.desc}</Paragraph></Card></Col>))}
        </Row>
      </section>
    </div>
  );
};
export default HomePage;