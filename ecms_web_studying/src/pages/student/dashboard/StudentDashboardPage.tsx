import { useEffect, useState } from 'react';
import { Card, Col, Row, Spin, Statistic } from 'antd';
import { BookOutlined, ProfileOutlined, CheckCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { progressApi } from '@/services/api/courses';
const StudentDashboardPage = () => {
  const { user } = useAuth(); const [loading, setLoading] = useState(true); const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 });
  useEffect(() => { progressApi.getMyCourses({ page: 0, size: 100 }).then((res) => { const list = res.content || []; setStats({ total: list.length, inProgress: list.filter(p => p.status === 'IN_PROGRESS').length, completed: list.filter(p => p.status === 'COMPLETED').length }); }).catch(() => toast.error('Lỗi tải dữ liệu')).finally(() => setLoading(false)); }, []);
  return (
    <PageContainer>
      <PageHeader title={`Xin chào, ${user?.fullName || 'Học viên'} 👋`} subtitle="Tổng quan việc học" />
      {loading ? <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div> : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Đã đăng ký" value={stats.total} prefix={<BookOutlined />} valueStyle={{ color: '#1677ff' }} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Đang học" value={stats.inProgress} prefix={<ProfileOutlined />} valueStyle={{ color: '#faad14' }} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Hoàn thành" value={stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Điểm TB" value="—" prefix={<TrophyOutlined />} valueStyle={{ color: '#eb2f96' }} /></Card></Col>
        </Row>
      )}
    </PageContainer>
  );
};
export default StudentDashboardPage;