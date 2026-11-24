// src/pages/instructor/InstructorDashboardPage.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Col, Row, Empty, Button, Tag, Image, Tooltip, Space } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  UserOutlined,
  EditOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import PageLoading from '@/components/feedback/PageLoading';
import ErrorState from '@/components/feedback/ErrorState';

import { courseApi } from '@/services/api/course';
import { useAuth } from '@/hooks/useAuth';
import type { CourseResponse } from '@/services/types/course';

const THUMBNAIL_FALLBACK =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2NCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSIzMiIgeT0iMjQiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiPk5vIGltZzwvdGV4dD48L3N2Zz4=';

const ACTIVE_COURSE_STATUSES = ['PUBLISHED', 'ONGOING', 'FINISHED'];

interface DashboardStats {
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  totalRevenue: number;
}

const extractErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.message || fallback;
};

const InstructorDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);

  // ══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(
    async (silent = false) => {
      if (!user?.accountId) {
        setIsInitialLoading(false);
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const res = await courseApi.search({
          page: 0,
          size: 100,
          teacherId: user.accountId,
          sortBy: 'createdAt',
          sortDir: 'desc',
        });

        setCourses(res.content || []);
        setTotalElements(res.totalElements ?? (res.content?.length || 0));
        setError(null);
      } catch (err) {
        const msg = extractErrorMessage(err, 'Không thể tải dữ liệu tổng quan');
        if (silent) {
          toast.error(msg);
        } else {
          setError(msg);
        }
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.accountId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ══════════════════════════════════════════════════════════════
  // COMPUTED STATS
  // ══════════════════════════════════════════════════════════════
  const stats: DashboardStats = useMemo(() => {
    const published = courses.filter((c) =>
      ACTIVE_COURSE_STATUSES.includes(c.status),
    ).length;

    const students = courses.reduce(
      (sum, c) => sum + (c.currentStudents || 0),
      0,
    );

    const revenue = courses
      .filter((c) => ACTIVE_COURSE_STATUSES.includes(c.status))
      .reduce(
        (sum, c) =>
          sum + (c.isFree ? 0 : Number(c.price || 0) * (c.currentStudents || 0)),
        0,
      );

    return {
      totalCourses: totalElements,
      publishedCourses: published,
      totalStudents: students,
      totalRevenue: revenue,
    };
  }, [courses, totalElements]);

  const recentCourses = useMemo(() => courses.slice(0, 5), [courses]);

  if (isInitialLoading) {
    return <PageLoading tip="Đang tải tổng quan giảng viên..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Không thể tải dữ liệu"
        description={error}
        onRetry={() => fetchData()}
      />
    );
  }

  const statItems = [
    {
      key: 'total',
      title: 'Tổng khóa học',
      value: stats.totalCourses,
      subtext: 'Tất cả khóa học bạn phụ trách',
      icon: <BookOutlined />,
      iconClass: 'bg-blue-50 text-blue-600',
      onClick: () => navigate('/instructor/courses'),
    },
    {
      key: 'published',
      title: 'Đang hoạt động',
      value: stats.publishedCourses,
      subtext: 'Đã xuất bản, đang dạy & hoàn tất',
      icon: <CheckCircleOutlined />,
      iconClass: 'bg-emerald-50 text-emerald-600',
      onClick: () => navigate('/instructor/courses'),
    },
    {
      key: 'students',
      title: 'Tổng học viên',
      value: stats.totalStudents.toLocaleString('vi-VN'),
      subtext: 'Tổng lượt ghi danh các lớp',
      icon: <TeamOutlined />,
      iconClass: 'bg-amber-50 text-amber-600',
      onClick: () => navigate('/instructor/students'),
    },
    {
      key: 'revenue',
      title: 'Doanh thu ước tính',
      value: <MoneyDisplay value={stats.totalRevenue} showFree={false} />,
      subtext: 'Tạm tính trên các khóa đã mở',
      icon: <DollarOutlined />,
      iconClass: 'bg-violet-50 text-violet-600',
    },
  ];

  const quickActions = [
    {
      key: 'create-course',
      title: 'Tạo khóa học mới',
      description: 'Xây dựng giáo trình, học liệu và cấu hình lớp học',
      icon: <PlusOutlined />,
      iconClass: 'bg-blue-50 text-blue-600',
      path: '/instructor/courses/create',
    },
    {
      key: 'manage-students',
      title: 'Quản lý học viên',
      description: 'Theo dõi danh sách ghi danh, tiến độ và điểm số',
      icon: <TeamOutlined />,
      iconClass: 'bg-emerald-50 text-emerald-600',
      path: '/instructor/students',
    },
    {
      key: 'update-profile',
      title: 'Cập nhật hồ sơ',
      description: 'Chỉnh sửa thông tin cá nhân và giới thiệu giảng viên',
      icon: <UserOutlined />,
      iconClass: 'bg-amber-50 text-amber-600',
      path: '/instructor/profile',
    },
  ];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title={`Xin chào, ${user?.fullName || 'Giảng viên'}`}
        subtitle="Tổng quan hiệu suất giảng dạy, khóa học và tình hình học viên của bạn"
        extra={
          <Space size={8} wrap>
            <Button
              icon={<ReloadOutlined spin={isRefreshing} />}
              onClick={() => {
                fetchData(true);
                toast.success('Đã làm mới dữ liệu');
              }}
              className="!rounded-lg"
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/instructor/courses/create')}
              className="!rounded-lg !font-medium"
            >
              Tạo khóa học
            </Button>
          </Space>
        }
      />

      {/* ── Hàng thẻ chỉ số KPI ── */}
      <Row gutter={[16, 16]}>
        {statItems.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.key}>
            <Card
              onClick={item.onClick}
              styles={{ body: { padding: '18px 20px' } }}
              className={`h-full !rounded-xl border-slate-200/90 shadow-none transition-colors ${
                item.onClick
                  ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/40'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {item.title}
                </span>
                <span
                  className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-base shrink-0 ${item.iconClass}`}
                >
                  {item.icon}
                </span>
              </div>

              <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {item.value}
              </div>

              <div className="mt-1.5 text-xs text-slate-400 truncate">
                {item.subtext}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Khóa học gần đây ── */}
      <Card
        className="mt-5 !rounded-xl border-slate-200/90 shadow-none"
        styles={{ body: { padding: recentCourses.length === 0 ? 24 : 0 } }}
        title={
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Khóa học gần đây</span>
            {totalElements > 0 && (
              <Tag className="!m-0 !rounded-full !text-xs !font-medium !bg-slate-50 !border-slate-200 !text-slate-600 px-2.5">
                {totalElements} khóa
              </Tag>
            )}
          </div>
        }
        extra={
          <Button
            type="link"
            onClick={() => navigate('/instructor/courses')}
            className="!px-0 !font-medium inline-flex items-center gap-1"
          >
            Xem tất cả <ArrowRightOutlined className="text-xs" />
          </Button>
        }
      >
        {recentCourses.length === 0 ? (
          <Empty
            description={
              <span className="text-slate-500 text-[13.5px]">
                Bạn chưa tạo khóa học nào
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/instructor/courses/create')}
              className="!rounded-lg !font-medium"
            >
              Tạo khóa học đầu tiên
            </Button>
          </Empty>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentCourses.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/instructor/courses/${c.id}/edit`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/instructor/courses/${c.id}/edit`);
                  }
                }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                {/* Cột trái: Thumbnail + Tên + Mã + Ngày tạo */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-16 h-11 rounded-lg border border-slate-200/80 overflow-hidden shrink-0 bg-slate-100">
                    <Image
                      src={c.thumbnailUrl || ''}
                      alt={c.title}
                      width={64}
                      height={44}
                      className="object-cover block"
                      fallback={THUMBNAIL_FALLBACK}
                      preview={false}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                      {c.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                      <span className="font-mono text-slate-500">{c.code}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <ClockCircleOutlined className="text-[11px]" />
                        <DateDisplay value={c.createdAt} format="relative" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Loại + Trạng thái + Sĩ số + Học phí + Nút */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap shrink-0">
                  <StatusTag status={c.courseType} />
                  <StatusTag status={c.status} />

                  <Tag
                    color="blue"
                    className="!m-0 !rounded-md !text-xs !font-medium inline-flex items-center gap-1"
                  >
                    <TeamOutlined />
                    {c.currentStudents || 0}
                    {c.maxStudents != null ? `/${c.maxStudents}` : ''}
                  </Tag>

                  <div className="min-w-[88px] text-right text-[13.5px]">
                    <MoneyDisplay value={c.isFree ? 0 : c.price} strong />
                  </div>

                  <Tooltip title="Quản lý & Chỉnh sửa">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined className="text-blue-600" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/instructor/courses/${c.id}/edit`);
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Thao tác nhanh ── */}
      <div className="mt-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Thao tác nhanh
        </div>

        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col xs={24} md={8} key={action.key}>
              <Card
                onClick={() => navigate(action.path)}
                styles={{ body: { padding: '16px 18px' } }}
                className="h-full !rounded-xl border-slate-200/90 shadow-none hover:border-blue-300 hover:bg-slate-50/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`w-10 h-10 rounded-xl inline-flex items-center justify-center text-lg shrink-0 ${action.iconClass}`}
                  >
                    {action.icon}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {action.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {action.description}
                    </div>
                  </div>

                  <ArrowRightOutlined className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </PageContainer>
  );
};

export default InstructorDashboardPage;