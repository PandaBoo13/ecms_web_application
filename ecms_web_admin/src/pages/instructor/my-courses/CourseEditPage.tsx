// src/pages/instructor/CourseEditPage.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Tabs,
  Card,
  Space,
  Row,
  Col,
  Button,
  Modal,
  Tooltip,
  Tag,
} from 'antd';
import {
  SendOutlined,
  RollbackOutlined,
  TeamOutlined,
  DollarOutlined,
  BookOutlined,
  CalendarOutlined,
  EditOutlined,
  ClockCircleOutlined,
  LockOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageLoading from '@/components/feedback/PageLoading';
import ErrorState from '@/components/feedback/ErrorState';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import MoneyDisplay from '@/components/common/MoneyDisplay';

import CourseOverviewTab from '@/components/course/CourseOverviewTab';
import ResourceManager from '@/components/course/ResourceManager';
import CourseSessionList from '@/components/course/CourseSessionList';
import CourseAttendanceMatrix from '@/components/course/CourseAttendanceMatrix';
import CourseQuestionList from '@/components/course/CourseQuestionList';
import QuizListCard from '@/components/course/QuizListCard';
import CourseEnrollmentList from '@/components/course/CourseEnrollmentList';
import CourseProgressCharts from '@/components/course/CourseProgressCharts';

import { courseApi } from '@/services/api/course';
import { requestApi } from '@/services/api/request/requestApi';
import type { CourseDetailResponse } from '@/services/types/course';
import { resolveMaxFinalScore } from '@/utils/courseScore';

const extractErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.message || fallback;
};

const CourseEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isWithdrawingReview, setIsWithdrawingReview] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // FETCH COURSE
  // ══════════════════════════════════════════════════════════════
  const fetchCourse = useCallback(
    async (isSilent = false) => {
      if (!courseId || Number.isNaN(courseId)) {
        setError('ID khóa học không hợp lệ');
        if (!isSilent) setIsInitialLoading(false);
        return;
      }

      if (!isSilent) setIsInitialLoading(true);
      try {
        const data = await courseApi.getById(courseId);
        setCourse(data);
        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err, 'Không tải được khóa học'));
      } finally {
        if (!isSilent) setIsInitialLoading(false);
      }
    },
    [courseId],
  );

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleSilentRefresh = useCallback(
    () => fetchCourse(true),
    [fetchCourse],
  );

  // ══════════════════════════════════════════════════════════════
  // GỬI YÊU CẦU KIỂM DUYỆT
  // ══════════════════════════════════════════════════════════════
  const handleSubmitReview = () => {
    if (!course) return;

    Modal.confirm({
      title: (
        <span className="text-[16px] font-bold text-slate-900">
          Gửi yêu cầu kiểm duyệt khóa học
        </span>
      ),
      width: 480,
      content: (
        <div className="space-y-2 pt-1 text-[13.5px] leading-relaxed text-slate-600">
          <p className="m-0">
            Bạn có chắc muốn gửi khóa học{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>{' '}
            để kiểm duyệt?
          </p>
          <p className="m-0 text-slate-500">
            Sau khi gửi, khóa học sẽ{' '}
            <span className="font-semibold text-slate-700">
              tạm khóa chỉnh sửa
            </span>{' '}
            cho đến khi có kết quả duyệt từ quản trị viên.
          </p>
        </div>
      ),
      okText: 'Gửi yêu cầu',
      okButtonProps: {
        icon: <SendOutlined />,
        className: '!rounded-lg !font-medium',
      },
      cancelText: 'Hủy',
      cancelButtonProps: {
        className: '!rounded-lg',
      },
      onOk: async () => {
        setIsSubmittingReview(true);
        try {
          await requestApi.create({
            requestType: 'COURSE_REVIEW',
            title: `Kiểm duyệt khóa học: ${course.title}`,
            description: `Yêu cầu kiểm duyệt khóa học "${course.code}" trước khi xuất bản.`,
            targetEntityId: course.id,
            payload: {
              courseId: course.id,
              courseCode: course.code,
              courseTitle: course.title,
              courseType: course.courseType,
              price: course.price,
            },
          });

          toast.success('Đã gửi yêu cầu kiểm duyệt thành công');
          handleSilentRefresh();
        } catch (err) {
          toast.error(
            extractErrorMessage(err, 'Không gửi được yêu cầu kiểm duyệt'),
          );
        } finally {
          setIsSubmittingReview(false);
        }
      },
    });
  };

  // ══════════════════════════════════════════════════════════════
  // THU HỒI YÊU CẦU KIỂM DUYỆT
  // ══════════════════════════════════════════════════════════════
  const handleWithdrawReview = () => {
    if (!course) return;

    Modal.confirm({
      title: (
        <span className="text-[16px] font-bold text-slate-900">
          Thu hồi yêu cầu kiểm duyệt
        </span>
      ),
      width: 480,
      content: (
        <div className="space-y-2 pt-1 text-[13.5px] leading-relaxed text-slate-600">
          <p className="m-0">
            Bạn có chắc muốn thu hồi yêu cầu kiểm duyệt của khóa học{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>
            ?
          </p>
          <p className="m-0 text-slate-500">
            Khóa học sẽ chuyển về trạng thái{' '}
            <span className="font-semibold text-slate-700">
              Bản nháp (DRAFT)
            </span>{' '}
            để bạn tiếp tục chỉnh sửa và gửi duyệt lại sau.
          </p>
        </div>
      ),
      okText: 'Thu hồi yêu cầu',
      okButtonProps: {
        danger: true,
        icon: <RollbackOutlined />,
        className: '!rounded-lg !font-medium',
      },
      cancelText: 'Hủy',
      cancelButtonProps: {
        className: '!rounded-lg',
      },
      onOk: async () => {
        setIsWithdrawingReview(true);
        try {
          await courseApi.withdrawReview(course.id);
          toast.success('Đã thu hồi yêu cầu kiểm duyệt');
          handleSilentRefresh();
        } catch (err) {
          toast.error(
            extractErrorMessage(err, 'Không thể thu hồi yêu cầu kiểm duyệt'),
          );
        } finally {
          setIsWithdrawingReview(false);
        }
      },
    });
  };

  // ══════════════════════════════════════════════════════════════
  // DERIVED STATE
  // ══════════════════════════════════════════════════════════════
  const isOffline = course?.courseType === 'OFFLINE';
  const isLocked = course?.status !== 'DRAFT';
  const canSubmitReview = course?.status === 'DRAFT';
  const isPendingReview = course?.status === 'PENDING_REVIEW';

  const totalSessionsExpected = course?.totalSessionsExpected;
  const currentSessionsCount = useMemo(
    () =>
      (course?.sessions || []).filter((s) => s.status !== 'CANCELLED').length,
    [course?.sessions],
  );

  if (isInitialLoading) return <PageLoading tip="Đang tải khóa học..." />;
  if (error) {
    return (
      <ErrorState
        title="Không thể tải khóa học"
        description={error}
        onRetry={() => fetchCourse()}
      />
    );
  }
  if (!course) return <ErrorState description="Không tìm thấy khóa học" />;

  // Chú thích trạng thái gọn ngay trên header
  const statusHint = (() => {
    switch (course.status) {
      case 'DRAFT':
        return {
          icon: <EditOutlined className="text-blue-600" />,
          text: isOffline
            ? 'Hoàn tất nội dung & lịch buổi học trước khi gửi duyệt'
            : 'Hoàn tất nội dung & học liệu trước khi gửi duyệt',
          tooltip:
            'Khóa học đang ở chế độ chỉnh sửa. Sau khi bấm "Gửi kiểm duyệt", nội dung sẽ tạm khóa cho đến khi có phản hồi.',
          className: 'text-slate-600 bg-slate-100/90 border-slate-200/80',
        };
      case 'PENDING_REVIEW':
        return {
          icon: <ClockCircleOutlined className="text-amber-600" />,
          text: 'Đang chờ duyệt • Tạm khóa chỉnh sửa',
          tooltip:
            'Quản trị viên đang kiểm duyệt khóa học. Nếu cần cập nhật lại, hãy bấm "Thu hồi yêu cầu" ở góc phải.',
          className: 'text-amber-800 bg-amber-50/90 border-amber-200/80',
        };
      case 'PLANNED':
        return {
          icon: <LockOutlined className="text-indigo-600" />,
          text: 'Đã duyệt giáo trình • Đang xếp lịch & phòng học',
          tooltip:
            'Nội dung giáo trình đã được phê duyệt. Quản trị viên đang hoàn tất lịch và phòng học trước khi mở lớp.',
          className: 'text-indigo-700 bg-indigo-50/90 border-indigo-200/80',
        };
      default:
        return {
          icon: <LockOutlined className="text-slate-500" />,
          text: 'Chế độ chỉ xem cấu trúc & học liệu',
          tooltip:
            'Khóa học đã xuất bản nên cấu trúc bài giảng và lịch học được cố định.',
          className: 'text-slate-600 bg-slate-100/90 border-slate-200/80',
        };
    }
  })();

  // ══════════════════════════════════════════════════════════════
  // STAT ITEMS
  // ══════════════════════════════════════════════════════════════
  const statItems = [
    {
      key: 'students',
      label: 'Học viên',
      icon: <TeamOutlined />,
      iconClass: 'bg-blue-50 text-blue-600',
      value: (
        <>
          <span>{course.currentStudents}</span>
          {course.maxStudents != null && (
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {course.maxStudents}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'price',
      label: 'Học phí',
      icon: <DollarOutlined />,
      iconClass: 'bg-emerald-50 text-emerald-600',
      value: <MoneyDisplay value={Number(course.price)} />,
    },
    {
      key: 'resources',
      label: 'Học liệu',
      icon: <BookOutlined />,
      iconClass: 'bg-violet-50 text-violet-600',
      value: <span>{course.resources?.length || 0}</span>,
    },
    {
      key: 'sessions',
      label: 'Buổi học',
      icon: <CalendarOutlined />,
      iconClass: 'bg-amber-50 text-amber-600',
      value: (
        <>
          <span>{currentSessionsCount}</span>
          {isOffline && (
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {totalSessionsExpected ?? '—'}
            </span>
          )}
        </>
      ),
    },
  ];

  // ══════════════════════════════════════════════════════════════
  // TAB ITEMS
  // ══════════════════════════════════════════════════════════════
  const tabItems = [
    {
      key: 'info',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <InfoCircleOutlined />
          Tổng quan
        </span>
      ),
      children: (
        <CourseOverviewTab course={course} onRefresh={handleSilentRefresh} />
      ),
    },
    {
      key: 'resources',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BookOutlined />
          Nội dung ({course.resources?.length || 0})
        </span>
      ),
      children: (
        <ResourceManager
          courseId={courseId}
          resources={course.resources || []}
          onRefresh={handleSilentRefresh}
          readOnly={isLocked}
        />
      ),
    },
    {
      key: 'questions',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <QuestionCircleOutlined />
          Câu hỏi
        </span>
      ),
      children: <CourseQuestionList courseId={courseId} />,
    },
    {
      key: 'quizzes',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <CheckSquareOutlined />
          Quiz
        </span>
      ),
      children: <QuizListCard courseId={courseId} />,
    },
    {
      key: 'enrollments',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <TeamOutlined />
          {course.courseType === 'ONLINE'
            ? 'Người đã mua khóa'
            : 'Danh sách học viên'}
        </span>
      ),
      children: (
        <CourseEnrollmentList
          courseId={courseId}
          courseType={course.courseType}
          courseStatus={course.status}
          maxScore={resolveMaxFinalScore(course)}
        />
      ),
    },
    {
      key: 'progress',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BarChartOutlined />
          Tiến độ lớp học
        </span>
      ),
      children: (
        <div className="flex flex-col gap-6">
          <CourseProgressCharts courseId={courseId} />
        </div>
      ),
    },
  ];

  if (isOffline) {
    tabItems.splice(2, 0, {
      key: 'sessions',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <CalendarOutlined />
          {totalSessionsExpected != null
            ? `Buổi học (${currentSessionsCount}/${totalSessionsExpected})`
            : `Buổi học (${currentSessionsCount})`}
        </span>
      ),
      children: (
        <CourseSessionList
          courseId={courseId}
          course={course}
          sessions={course.sessions || []}
          onRefresh={handleSilentRefresh}
          readOnly={isLocked}
        />
      ),
    });
    tabItems.splice(3, 0, {
      key: 'attendance',
      label: <span>Điểm danh</span>,
      children: <CourseAttendanceMatrix courseId={courseId} mode="instructor" />,
    });
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        subtitle={
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <Tag className="!m-0 !font-mono !text-xs !font-medium !rounded-md !bg-slate-50 !border-slate-200 !text-slate-600">
              {course.code}
            </Tag>
            <StatusTag status={course.status} />
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
        backTo="/instructor/courses"
        extra={
          (canSubmitReview || isPendingReview) && (
            <Space size={8} wrap>
              {canSubmitReview && (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={isSubmittingReview}
                  onClick={handleSubmitReview}
                  className="!rounded-lg !font-medium"
                >
                  Gửi kiểm duyệt
                </Button>
              )}

              {isPendingReview && (
                <Button
                  danger
                  icon={<RollbackOutlined />}
                  loading={isWithdrawingReview}
                  onClick={handleWithdrawReview}
                  className="!rounded-lg !font-medium"
                >
                  Thu hồi yêu cầu
                </Button>
              )}
            </Space>
          )
        }
      />

      {/* Hàng thẻ thống kê chỉ số */}
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

      {/* Khối nội dung chi tiết dạng Tabs */}
      <Card
        styles={{ body: { padding: '6px 20px 20px' } }}
        className="!rounded-xl border-slate-200/90 shadow-none"
      >
        <Tabs
          defaultActiveKey="info"
          items={tabItems}
          moreIcon={null}
          className="[&_.ant-tabs-nav]:!mb-5 [&_.ant-tabs-nav-list]:!flex-nowrap"
        />
      </Card>
    </PageContainer>
  );
};

export default CourseEditPage;
