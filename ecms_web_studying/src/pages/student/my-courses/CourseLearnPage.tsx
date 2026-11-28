// src/pages/student/CourseLearnPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Result,
  Row,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

import PageContainer from '@/components/common/PageContainer';
import PageLoading from '@/components/feedback/PageLoading';
import ErrorState from '@/components/feedback/ErrorState';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import CourseOverviewCard from '@/components/course/CourseOverviewCard';
import CourseResourceTree from '@/components/course/CourseResourceTree';

import { enrollmentApi } from '@/services/api/enrollment';
import { courseApi } from '@/services/api/course';
import type { CourseDetailResponse, CourseResourceResponse } from '@/services/types/course';
import type {
  AttendanceRecordResponse,
  EnrollmentResponse,
} from '@/services/types/enrollment';

const CourseLearnPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminated, setTerminated] = useState(false);

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId)) {
      setError('ID khóa học không hợp lệ');
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      courseApi.getById(courseId),
      enrollmentApi
        .myEnrollments({ courseId, page: 0, size: 10 })
        .catch(() => null),
    ])
      .then(async ([courseData, enrollments]) => {
        setCourse(courseData);
        const rows = enrollments?.content ?? [];
        const matchedEnrollment =
          rows.find((row) => row.courseId === courseId) ?? null;
        setEnrollment(matchedEnrollment);
        setTerminated(
          rows.length > 0 && rows.every((row) => row.status === 'TERMINATED'),
        );

        if (matchedEnrollment && courseData?.courseType === 'OFFLINE') {
          const att = await enrollmentApi
            .attendanceHistory(matchedEnrollment.id)
            .catch(() => []);
          setAttendance(att || []);
        }
      })
      .catch((e) => {
        setError(e?.message || 'Lỗi khi tải dữ liệu khóa học');
        toast.error('Không thể tải khóa học');
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  // 🆕 Hàm điều hướng sang trang xem tài liệu
  const handleSelectResource = (resource: CourseResourceResponse) => {
    // Nếu là Chương (CHAPTER) thì không chuyển trang
    if (resource.resourceType === 'CHAPTER') return;
    // Chuyển sang trang Viewer
    navigate(`/student/courses/${courseId}/learn/${resource.id}`);
  };

  const isOffline = course?.courseType === 'OFFLINE';

  const activeSessions = useMemo(
    () =>
      (course?.sessions || []).filter((s) => s.status !== 'CANCELLED'),
    [course?.sessions],
  );

  const lessonsCount = useMemo(
    () =>
      (course?.resources || []).filter((r) => r.resourceType === 'LESSON')
        .length,
    [course?.resources],
  );

  if (loading) return <PageLoading tip="Đang tải khóa học..." />;

  if (error || !course) {
    return (
      <ErrorState
        title="Không thể tải khóa học"
        description={error || 'Không tìm thấy khóa học'}
      />
    );
  }

  if (terminated) {
    return (
      <Result
        status="warning"
        title="Quyền học đã kết thúc"
        subTitle="Bạn không còn quyền truy cập nội dung khóa học này. Lịch sử điểm danh và hóa đơn vẫn được lưu trong mục Khóa học của tôi."
        extra={
          <Button type="primary" onClick={() => navigate('/student/courses')}>
            Về khóa học của tôi
          </Button>
        }
      />
    );
  }

  const progressPercent = Math.round(
    (enrollment as { progressPercentage?: number } | null)
      ?.progressPercentage ?? 0,
  );
  const isCompleted =
    enrollment?.status === 'COMPLETED' || progressPercent === 100;

  const statusHint = isCompleted
    ? {
        icon: <CheckCircleOutlined className="text-emerald-600" />,
        text: 'Đã hoàn thành khóa học • Có thể xem lại toàn bộ học liệu',
        tooltip: 'Bạn đã hoàn thành chương trình học của khóa này.',
        className: 'text-emerald-800 bg-emerald-50/90 border-emerald-200/80',
      }
    : enrollment?.status === 'ACTIVE'
      ? {
          icon: <PlayCircleOutlined className="text-blue-600" />,
          text: isOffline
            ? 'Đang theo học • Theo dõi học liệu & lịch buổi học bên dưới'
            : 'Đang theo học • Chọn bài giảng bên dưới để tiếp tục',
          tooltip: 'Tài khoản của bạn đã được kích hoạt đầy đủ quyền học tập.',
          className: 'text-slate-600 bg-slate-100/90 border-slate-200/80',
        }
      : {
          icon: <ClockCircleOutlined className="text-amber-600" />,
          text: 'Ghi danh đang chờ xử lý',
          tooltip: 'Trạng thái ghi danh hiện tại chưa ở mức ACTIVE.',
          className: 'text-amber-800 bg-amber-50/90 border-amber-200/80',
        };

  const statItems = [
    {
      key: 'progress',
      label: 'Tiến độ học tập',
      icon: <TrophyOutlined />,
      iconClass: 'bg-blue-50 text-blue-600',
      value: <span>{progressPercent}%</span>,
    },
    {
      key: 'lessons',
      label: 'Bài học',
      icon: <BookOutlined />,
      iconClass: 'bg-violet-50 text-violet-600',
      value: (
        <>
          <span>{lessonsCount}</span>
          <span className="text-sm font-normal text-slate-400 ml-1">
            / {course.resources?.length || 0} mục
          </span>
        </>
      ),
    },
    {
      key: 'sessions',
      label: 'Buổi học',
      icon: <CalendarOutlined />,
      iconClass: 'bg-amber-50 text-amber-600',
      value: (
        <>
          <span>{activeSessions.length}</span>
          {isOffline && course.totalSessionsExpected != null && (
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {course.totalSessionsExpected}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      icon: <CheckCircleOutlined />,
      iconClass: 'bg-emerald-50 text-emerald-600',
      value: (
        <span className="text-base font-semibold">
          {isCompleted
            ? 'Hoàn thành'
            : enrollment?.status === 'ACTIVE'
              ? 'Đang học'
              : enrollment?.status || 'Đã ghi danh'}
        </span>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'resources',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BookOutlined />
          Nội dung ({course.resources?.length || 0})
        </span>
      ),
      // 🆕 Truyền sự kiện onSelectResource vào Tree
      children: (
        <CourseResourceTree 
          resources={course.resources || []} 
          onSelectResource={handleSelectResource} 
        />
      ),
    },
    {
      key: 'info',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <InfoCircleOutlined />
          Tổng quan
        </span>
      ),
      children: <CourseOverviewCard course={course} enrollment={enrollment} />,
    },
  ];

  if (isOffline) {
    tabItems.push({
      key: 'attendance',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <CalendarOutlined />
          Điểm danh & Buổi học ({attendance.length || activeSessions.length})
        </span>
      ),
      children: (
        <Table
          size="small"
          rowKey={(row) =>
            row.attendanceId ?? `${row.enrollmentId}-${row.sessionId}`
          }
          dataSource={attendance}
          pagination={false}
          locale={{ emptyText: 'Chưa có dữ liệu điểm danh cho khóa học này.' }}
          columns={[
            {
              title: 'Buổi học',
              render: (_, row) =>
                row.sessionTitle ||
                `Buổi #${row.sessionNumber ?? row.sessionId}`,
            },
            {
              title: 'Ngày học',
              dataIndex: 'sessionDate',
              render: (val: string | null) =>
                val ? dayjs(val).format('DD/MM/YYYY') : '—',
            },
            {
              title: 'Điểm danh',
              dataIndex: 'status',
              render: (val: string) => {
                if (val === 'PRESENT')
                  return <Tag color="success">Có mặt</Tag>;
                if (val === 'ABSENT') return <Tag color="error">Vắng</Tag>;
                if (val === 'EXCUSED')
                  return <Tag color="warning">Vắng có phép</Tag>;
                return <Tag>Chưa điểm danh</Tag>;
              },
            },
          ]}
        />
      ),
    });
  }

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        subtitle={
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <Tag className="!m-0 !font-mono !text-xs !font-medium !rounded-md !bg-slate-50 !border-slate-200 !text-slate-600">
              {course.code}
            </Tag>
            {enrollment?.status && <StatusTag status={enrollment.status} />}
            <StatusTag status={course.courseType} />

            <span className="text-slate-300 hidden sm:inline select-none">
              |
            </span>

            <Tooltip title={statusHint.tooltip} placement="bottomLeft">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium cursor-help transition-colors ${statusHint.className}`}
              >
                {statusHint.icon}
                <span>{statusHint.text}</span>
                <InfoCircleOutlined className="text-[11px] opacity-60" />
              </span>
            </Tooltip>
          </div>
        }
        backButton
        backTo="/student/courses"
      />

      <Row gutter={[14, 14]} className="mb-4">
        {statItems.map((item) => (
          <Col xs={12} sm={6} key={item.key}>
            <Card
              styles={{ body: { padding: '16px 18px' } }}
              className="h-full !rounded-xl border-slate-200/90 shadow-none"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {item.label}
                </span>
                <span
                  className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-sm shrink-0 ${item.iconClass}`}
                >
                  {item.icon}
                </span>
              </div>

              <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {item.value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        styles={{ body: { padding: '6px 20px 20px' } }}
        className="!rounded-xl border-slate-200/90 shadow-none"
      >
        <Tabs
          defaultActiveKey="resources"
          items={tabItems}
          moreIcon={null}
          className="[&_.ant-tabs-nav]:!mb-5 [&_.ant-tabs-nav-list]:!flex-nowrap"
        />
      </Card>
    </PageContainer>
  );
};

export default CourseLearnPage;