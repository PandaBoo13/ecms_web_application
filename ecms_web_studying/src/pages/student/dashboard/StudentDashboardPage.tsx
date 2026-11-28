// src/pages/student/dashboard/StudentDashboardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Col,
  Row,
  Spin,
  Typography,
  Button,
  Progress,
  Tag,
  Space,
  Empty,
  List,
  Avatar,
} from 'antd';
import {
  BookOutlined,
  ProfileOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  RocketOutlined,
  CalendarOutlined,
  FormOutlined,
  TrophyOutlined,
  RightOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { progressApi } from '@/services/api/course';
import { enrollmentApi } from '@/services/api/enrollment';
import type { EnrollmentResponse } from '@/services/types/enrollment';

const { Text, Title } = Typography;

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // State cho thống kê tổng quan
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    avgProgress: 0,
  });

  // State cho danh sách khóa học gần đây (dùng enrollmentApi)
  const [recentEnrollments, setRecentEnrollments] = useState<EnrollmentResponse[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      // 1. Lấy dữ liệu thống kê từ Progress API
      progressApi.getMyCourses({ page: 0, size: 100 }).catch(() => null),
      // 2. Lấy 4 khóa học gần nhất từ Enrollment API
      enrollmentApi.myEnrollments({ page: 0, size: 4 }).catch(() => null),
    ])
      .then(([progressRes, enrollmentRes]) => {
        // --- Xử lý Stats ---
        const list = progressRes?.content || [];
        const inProgressCount = list.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED').length;
        const completedCount = list.filter((p) => p.status === 'COMPLETED' || p.status === 'PASSED').length;
        const totalProgress = list.reduce((sum, p) => sum + (p.progressPercentage || 0), 0);
        const avgProgress = list.length > 0 ? Math.round(totalProgress / list.length) : 0;

        setStats({
          total: progressRes?.totalElements || list.length,
          inProgress: inProgressCount,
          completed: completedCount,
          avgProgress: avgProgress,
        });

        // --- Xử lý Recent Enrollments ---
        if (enrollmentRes) {
          setRecentEnrollments(enrollmentRes.content || []);
        }
      })
      .catch((err) => {
        toast.error((err as { message?: string })?.message || 'Không thể tải dữ liệu tổng quan');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Hàm render Tag trạng thái khóa học
  const renderEnrollmentStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Tag color="processing">Đang học</Tag>;
      case 'COMPLETED': return <Tag color="success">Hoàn thành</Tag>;
      case 'PENDING': return <Tag color="warning">Chờ thanh toán</Tag>;
      case 'RESERVED': return <Tag color="default">Bảo lưu</Tag>;
      case 'TERMINATED': return <Tag color="error">Đã nghỉ</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  // Cấu hình 4 thẻ thống kê
  const statCards = [
    {
      title: 'Khóa học đã đăng ký',
      value: stats.total,
      icon: <BookOutlined />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      title: 'Đang theo học',
      value: stats.inProgress,
      icon: <ProfileOutlined />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      title: 'Đã hoàn thành',
      value: stats.completed,
      icon: <CheckCircleOutlined />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'Tiến độ trung bình',
      value: `${stats.avgProgress}%`,
      icon: <RiseOutlined />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
    },
  ];

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
            className="!rounded-lg !font-medium"
          >
            Vào học ngay
          </Button>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
          <Spin size="large" />
          <span className="mt-4 text-slate-500">Đang tải dữ liệu...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ─── HÀNG 1: THỐNG KÊ ─── */}
          <Row gutter={[16, 16]}>
            {statCards.map((card, idx) => (
              <Col xs={24} sm={12} lg={6} key={idx}>
                <Card
                  bordered={false}
                  className="hover:shadow-md transition-shadow !rounded-xl border border-slate-200/80"
                  styles={{ body: { padding: '20px' } }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-slate-500 font-medium text-[13px]">
                        {card.title}
                      </Text>
                      <div className="text-2xl font-bold text-slate-800 mt-1">
                        {card.value}
                      </div>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border ${card.bg} ${card.color} ${card.border}`}
                    >
                      {card.icon}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* ─── HÀNG 2: KHÓA HỌC GẦN ĐÂY & THAO TÁC NHANH ─── */}
          <Row gutter={[16, 16]}>
            {/* Cột trái: Khóa học của tôi */}
            <Col xs={24} lg={16}>
              <Card
                title={<span className="font-bold text-slate-800">Khóa học của tôi</span>}
                extra={
                  <Button type="link" onClick={() => navigate('/student/courses')} className="!px-0">
                    Xem tất cả <RightOutlined className="text-[10px]" />
                  </Button>
                }
                className="!rounded-xl border border-slate-200/80 shadow-none h-full"
                styles={{ body: { padding: '0 20px' } }}
              >
                {recentEnrollments.length > 0 ? (
                  <List
                    dataSource={recentEnrollments}
                    renderItem={(item) => (
                      <List.Item
                        className="!px-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/student/courses/${item.courseId}/learn`)}
                        actions={[
                          <Button type="primary" size="small" ghost className="!rounded-md">
                            Học tiếp
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              shape="square"
                              size={48}
                              icon={<BookOutlined />}
                              className="bg-blue-100 text-blue-600"
                            />
                          }
                          title={
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[14.5px] text-slate-800 hover:text-blue-600 transition-colors truncate max-w-[250px] sm:max-w-md">
                                {item.courseTitle || 'Khóa học chưa đặt tên'}
                              </span>
                              {renderEnrollmentStatus(item.status)}
                            </div>
                          }
                          description={
                            <div className="flex flex-col gap-1 mt-1">
                              <span className="text-xs text-slate-500 font-mono">
                                Mã: {item.courseCode || '—'}
                              </span>
                              {/* Nếu API enrollment không trả về progress, ta có thể ẩn hoặc mock. 
                                  Ở đây tạm thời hiển thị thanh progress dựa trên dữ liệu giả định nếu cần */}
                              <Progress
                                percent={item.status === 'COMPLETED' ? 100 : 45} // Mock data progress
                                size="small"
                                showInfo={false}
                                strokeColor={item.status === 'COMPLETED' ? '#52c41a' : '#1677ff'}
                                className="!m-0 max-w-[300px]"
                              />
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description="Bạn chưa đăng ký khóa học nào"
                    className="py-8"
                  >
                    <Button type="primary" onClick={() => navigate('/courses')}>
                      Khám phá khóa học
                    </Button>
                  </Empty>
                )}
              </Card>
            </Col>

            {/* Cột phải: Thao tác nhanh */}
            <Col xs={24} lg={8}>
              <Card
                title={<span className="font-bold text-slate-800">Thao tác nhanh</span>}
                className="!rounded-xl border border-slate-200/80 shadow-none h-full"
                styles={{ body: { padding: '16px' } }}
              >
                <div className="flex flex-col gap-3">
                  <Button
                    block
                    size="large"
                    icon={<CalendarOutlined className="text-blue-500" />}
                    onClick={() => navigate('/student/schedule')}
                    className="!justify-start !h-12 !rounded-lg border-slate-200 hover:border-blue-400 hover:text-blue-600"
                  >
                    Lịch học của tôi
                  </Button>
                  
                  <Button
                    block
                    size="large"
                    icon={<FormOutlined className="text-amber-500" />}
                    onClick={() => navigate('/student/assignments')}
                    className="!justify-start !h-12 !rounded-lg border-slate-200 hover:border-amber-400 hover:text-amber-600"
                  >
                    Bài tập & Kiểm tra
                  </Button>

                  <Button
                    block
                    size="large"
                    icon={<TrophyOutlined className="text-emerald-500" />}
                    onClick={() => navigate('/student/grades')}
                    className="!justify-start !h-12 !rounded-lg border-slate-200 hover:border-emerald-400 hover:text-emerald-600"
                  >
                    Bảng điểm
                  </Button>

                  <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-1">
                      <ClockCircleOutlined /> Mẹo nhỏ
                    </div>
                    <div className="text-xs text-indigo-600/80 leading-relaxed">
                      Học viên có tỷ lệ hoàn thành bài tập đúng hạn cao hơn 40% so với việc học dồn.
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </PageContainer>
  );
}