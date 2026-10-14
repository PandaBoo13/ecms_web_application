import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, List, Typography, Spin, Empty, Button, Tag } from 'antd';
import {
  BookOutlined, TeamOutlined, FileTextOutlined, ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';

import { courseApi } from '@/services/api/courses';
import { useAuth } from '@/hooks/useAuth';
import type { CourseResponse } from '@/services/types/course';

const { Text, Title } = Typography;

const InstructorDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
  });

  const fetchData = async () => {
    if (!user?.accountId) return;
    setLoading(true);
    try {
      // Lấy courses của GV này
      const res = await courseApi.search({
        page: 0,
        size: 20,
        teacherId: user.accountId,
        sortBy: 'createdAt',
        sortDir: 'desc',
      });

      setCourses(res.content);

      // Tính stats
      const published = res.content.filter((c) => c.status === 'PUBLISHED').length;
      const students = res.content.reduce((sum, c) => sum + (c.currentStudents || 0), 0);
      const revenue = res.content
        .filter((c) => c.status === 'PUBLISHED')
        .reduce((sum, c) => sum + (c.isFree ? 0 : Number(c.price) * (c.currentStudents || 0)), 0);

      setStats({
        totalCourses: res.totalElements,
        publishedCourses: published,
        totalStudents: students,
        totalRevenue: revenue,
      });
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accountId]);

  return (
    <PageContainer>
      <PageHeader
        title={`Xin chào, ${user?.fullName || 'Giảng viên'} 👋`}
        subtitle="Đây là tổng quan các khóa học của bạn"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Tổng khóa học"
                  value={stats.totalCourses}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Đã xuất bản"
                  value={stats.publishedCourses}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Tổng học viên"
                  value={stats.totalStudents}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Doanh thu ước tính"
                  value={stats.totalRevenue}
                  formatter={(v) => <MoneyDisplay value={Number(v)} showFree={false} />}
                  valueStyle={{ color: '#eb2f96', fontSize: 20 }}
                />
              </Card>
            </Col>
          </Row>

          {/* ── Khóa học gần đây ── */}
          <Card
            title="Khóa học gần đây"
            style={{ marginTop: 24 }}
            extra={
              <Button
                type="link"
                onClick={() => navigate('/instructor/courses')}
                icon={<ArrowRightOutlined />}
              >
                Xem tất cả
              </Button>
            }
          >
            {courses.length === 0 ? (
              <Empty
                description="Bạn chưa có khóa học nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  onClick={() => navigate('/instructor/courses/create')}
                >
                  Tạo khóa học đầu tiên
                </Button>
              </Empty>
            ) : (
              <List
                dataSource={courses.slice(0, 5)}
                renderItem={(c) => (
                  <List.Item
                    actions={[
                      <Button
                        key="view"
                        type="link"
                        onClick={() => navigate(`/instructor/courses/${c.id}/edit`)}
                      >
                        Chi tiết
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Text
                          strong
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/instructor/courses/${c.id}/edit`)}
                        >
                          {c.title}
                        </Text>
                      }
                      description={
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {c.code} ·{' '}
                            <DateDisplay value={c.createdAt} format="relative" />
                          </Text>
                        </div>
                      }
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <StatusTag status={c.status} />
                      <Tag>{c.currentStudents} HV</Tag>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>

          {/* ── Quick actions ── */}
          <Title level={5} style={{ marginTop: 32 }}>
            Thao tác nhanh
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/instructor/courses/create')}>
                <Statistic
                  title="Tạo khóa học mới"
                  value="+ Tạo ngay"
                  valueStyle={{ fontSize: 16, color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/instructor/students')}>
                <Statistic
                  title="Quản lý học viên"
                  value="Xem danh sách"
                  valueStyle={{ fontSize: 16, color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/instructor/profile')}>
                <Statistic
                  title="Cập nhật hồ sơ"
                  value="Chỉnh sửa"
                  valueStyle={{ fontSize: 16, color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </PageContainer>
  );
};

export default InstructorDashboardPage;