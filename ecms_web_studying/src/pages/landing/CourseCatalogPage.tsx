import { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Row, Spin, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { courseApi } from '@/services/api/courses';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import type { CourseResponse } from '@/services/types/course';
const { Title, Paragraph, Text } = Typography;
const CourseCatalogPage = () => {
  const navigate = useNavigate(); const [courses, setCourses] = useState<CourseResponse[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { courseApi.search({ page: 0, size: 20, status: 'PUBLISHED' }).then((res) => setCourses(res.content)).catch(() => toast.error('Lỗi tải khóa học')).finally(() => setLoading(false)); }, []);
  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;
  return (
    <div style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>Danh mục khóa học</Title>
      <Paragraph type="secondary" style={{ marginBottom: 32 }}>Khám phá các khóa học chất lượng cao.</Paragraph>
      {courses.length === 0 ? <Empty /> : (
        <Row gutter={[24, 24]}>
          {courses.map((c) => (<Col xs={24} sm={12} lg={8} key={c.id}><Card hoverable cover={c.thumbnailUrl ? <img src={c.thumbnailUrl} style={{ height: 180, objectFit: 'cover' }} /> : undefined} onClick={() => navigate('/login')}><Tag color="cyan">{c.courseType}</Tag><Title level={5} ellipsis={{ rows: 2 }}>{c.title}</Title><Paragraph type="secondary" ellipsis={{ rows: 2 }}>{c.shortDescription}</Paragraph><Text strong style={{ color: '#1677ff' }}><MoneyDisplay value={c.isFree ? 0 : c.price} /></Text></Card></Col>))}
        </Row>
      )}
    </div>
  );
};
export default CourseCatalogPage;