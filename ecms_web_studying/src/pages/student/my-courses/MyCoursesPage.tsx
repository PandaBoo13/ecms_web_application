import { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Progress, Row, Spin, Typography, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { progressApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành: import { progressApi } from '@/services/api/course/progressApi';

import type { ProgressResponse } from '@/services/types/course';

const { Title, Text } = Typography;

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProgressResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    progressApi
      .getMyCourses({ page: 0, size: 50 })
      .then((res) => {
        setItems(res.content || []);
      })
      .catch((err) => {
        toast.error((err as { message?: string })?.message || 'Không thể tải danh sách khóa học');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <PageContainer>
      <PageHeader 
        title="Khóa học của tôi" 
        subtitle={`Tổng cộng ${items.length} khóa học`} 
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : items.length === 0 ? (
        <Empty 
          description="Bạn chưa đăng ký khóa học nào" 
          style={{ marginTop: 64 }}
        >
          <Button type="primary" onClick={() => navigate('/courses')}>
            Khám phá khóa học
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {items.map((p) => (
            <Col xs={24} sm={12} lg={8} key={p.id}>
              <Card 
                hoverable 
                onClick={() => navigate(`/student/courses/${p.courseId}/learn`)}
                style={{ height: '100%' }}
              >
                <Title level={5} ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                  {p.courseTitle || `Khóa học #${p.courseId}`}
                </Title>
                
                <Progress 
                  percent={Math.round(p.progressPercentage || 0)} 
                  status={p.progressPercentage === 100 ? 'success' : 'active'}
                />
                
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Trạng thái:
                  </Text>
                  <Tag color={p.status === 'COMPLETED' ? 'success' : 'processing'}>
                    {p.status}
                  </Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </PageContainer>
  );
};

export default MyCoursesPage;