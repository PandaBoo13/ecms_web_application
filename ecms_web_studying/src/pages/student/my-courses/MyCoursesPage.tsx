import { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Progress, Row, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { progressApi } from '@/services/api/courses';
import type { ProgressResponse } from '@/services/types/course';
const { Title, Text } = Typography;
const MyCoursesPage = () => {
  const navigate = useNavigate(); const [items, setItems] = useState<ProgressResponse[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { progressApi.getMyCourses({ page: 0, size: 50 }).then((res) => setItems(res.content || [])).catch(() => toast.error('Lỗi')).finally(() => setLoading(false)); }, []);
  return (
    <PageContainer>
      <PageHeader title="Khóa học của tôi" subtitle={`Tổng ${items.length}`} />
      {loading ? <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div> : items.length === 0 ? (
        <Empty description="Chưa đăng ký"><Button type="primary" onClick={() => navigate('/courses')}>Khám phá</Button></Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {items.map((p) => (<Col xs={24} sm={12} lg={8} key={p.id}><Card hoverable onClick={() => navigate(`/student/courses/${p.courseId}/learn`)}><Title level={5} ellipsis={{ rows: 2 }}>{p.courseTitle || `Khóa #${p.courseId}`}</Title><Progress percent={Math.round(p.progressPercentage || 0)} /><Text type="secondary" style={{ fontSize: 12 }}>{p.status}</Text></Card></Col>))}
        </Row>
      )}
    </PageContainer>
  );
};
export default MyCoursesPage;