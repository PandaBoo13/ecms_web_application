import { useEffect, useState } from 'react';
// 🆕 Phải import Button từ 'antd'
import { Card, Col, Row, Spin, Statistic, Typography, Button } from 'antd';
import { 
  BookOutlined, 
  ProfileOutlined, 
  CheckCircleOutlined, 
  RiseOutlined,
  RocketOutlined
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { progressApi } from '@/services/api/course';

const { Text } = Typography;

const StudentDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    total: 0, 
    inProgress: 0, 
    completed: 0, 
    avgProgress: 0 
  });

  useEffect(() => {
    progressApi
      .getMyCourses({ page: 0, size: 100 })
      .then((res) => {
        const list = res.content || [];
        
        const inProgressCount = list.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED').length;
        const completedCount = list.filter((p) => p.status === 'COMPLETED' || p.status === 'PASSED').length;
        
        const totalProgress = list.reduce((sum, p) => sum + (p.progressPercentage || 0), 0);
        const avgProgress = list.length > 0 ? Math.round(totalProgress / list.length) : 0;

        setStats({
          total: res.totalElements || list.length,
          inProgress: inProgressCount,
          completed: completedCount,
          avgProgress: avgProgress,
        });
      })
      .catch((err) => {
        toast.error((err as { message?: string })?.message || 'Không thể tải dữ liệu tổng quan');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <PageContainer>
      <PageHeader 
        title={`Xin chào, ${user?.fullName || 'Học viên'} 👋`} 
        subtitle="Chúc bạn có một ngày học tập hiệu quả!"
        extra={
          <Button 
            type="primary" 
            icon={<RocketOutlined />} 
            onClick={() => navigate('/student/courses')}
          >
            Vào học ngay
          </Button>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          {/* 🆕 Đổi tip thành description */}
          <Spin size="large" description="Đang tải dữ liệu..." />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic 
                title={<Text type="secondary">Khóa học đã đăng ký</Text>}
                value={stats.total} 
                prefix={<BookOutlined className="text-blue-500 mr-2" />} 
                valueStyle={{ color: '#1677ff', fontWeight: 700 }} 
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic 
                title={<Text type="secondary">Khóa học đang học</Text>}
                value={stats.inProgress} 
                prefix={<ProfileOutlined className="text-amber-500 mr-2" />} 
                valueStyle={{ color: '#faad14', fontWeight: 700 }} 
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic 
                title={<Text type="secondary">Đã hoàn thành</Text>}
                value={stats.completed} 
                prefix={<CheckCircleOutlined className="text-green-500 mr-2" />} 
                valueStyle={{ color: '#52c41a', fontWeight: 700 }} 
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic 
                title={<Text type="secondary">Tiến độ trung bình</Text>}
                value={stats.avgProgress} 
                suffix="%"
                prefix={<RiseOutlined className="text-pink-500 mr-2" />} 
                valueStyle={{ color: '#eb2f96', fontWeight: 700 }} 
              />
            </Card>
          </Col>
        </Row>
      )}
    </PageContainer>
  );
};

export default StudentDashboardPage;