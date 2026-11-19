import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Tabs,
  Card,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Button,
  Modal,
  Divider,
} from 'antd';
import {
  RocketOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
  BookOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageLoading from '@/components/feedback/PageLoading';
import ErrorState from '@/components/feedback/ErrorState';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import MoneyDisplay from '@/components/common/MoneyDisplay';

import CourseDetailActions from '@/components/course/CourseDetailActions';
import CourseOverviewTab from '@/components/course/CourseOverviewTab';
import ResourceManager from '@/components/course/ResourceManager';
import CourseSessionList from '@/components/course/CourseSessionList';
import CourseAttendanceMatrix from '@/components/course/CourseAttendanceMatrix';
import CourseQuestionList from '@/components/course/CourseQuestionList';
import QuizListCard from '@/components/course/QuizListCard';
import CourseEnrollmentList from '@/components/course/CourseEnrollmentList';

import { courseApi } from '@/services/api/course';
import type { CourseDetailResponse } from '@/services/types/course';
import { resolveMaxFinalScore } from '@/utils/courseScore';

const { Text } = Typography;

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchCourse = useCallback(
    async (isSilent = false) => {
      if (!courseId || isNaN(courseId)) {
        setError('ID khóa học không hợp lệ');
        setLoading(false);
        return;
      }

      if (!isSilent) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await courseApi.getById(courseId);
        setCourse(data);
      } catch (err) {
        setError(
          (err as { message?: string })?.message || 'Không tải được khóa học',
        );
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [courseId],
  );

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleSilentRefresh = useCallback(() => {
    fetchCourse(true);
  }, [fetchCourse]);

  // ══════════════════════════════════════════════════════════════
  // XUẤT BẢN KHÓA HỌC (PUBLISHED)
  // ══════════════════════════════════════════════════════════════
  const handlePublishCourse = () => {
    if (!course) return;

    const isPlannedOffline = course.status === 'PLANNED';
    const isPendingOnline =
      course.status === 'PENDING_REVIEW' && course.courseType === 'ONLINE';

    if (!isPlannedOffline && !isPendingOnline) return;

    Modal.confirm({
      title: 'Xuất bản khóa học',
      width: 460,
      content: (
        <div style={{ lineHeight: 1.6 }}>
          <p style={{ marginBottom: 8 }}>
            Xác nhận xuất bản khóa học <b>{course.title}</b>?
          </p>
          <p style={{ color: '#64748b', marginBottom: 0 }}>
            {isPlannedOffline
              ? 'Lịch học sẽ được khóa cố định và mở cổng đăng ký/đóng học phí cho học viên.'
              : 'Khóa học ONLINE sẽ chuyển sang trạng thái PUBLISHED và mở tuyển sinh ngay.'}
          </p>
        </div>
      ),
      okText: 'Xuất bản',
      okButtonProps: { icon: <RocketOutlined /> },
      cancelText: 'Hủy',
      onOk: async () => {
        setIsPublishing(true);
        try {
          if (isPlannedOffline) {
            await courseApi.finalizeSchedule(course.id);
          } else {
            await courseApi.review(course.id, true);
          }
          toast.success('Đã xuất bản khóa học thành công');
          handleSilentRefresh();
        } catch (err) {
          toast.error(
            (err as { message?: string })?.message ||
              'Không thể xuất bản khóa học',
          );
        } finally {
          setIsPublishing(false);
        }
      },
    });
  };

  // ══════════════════════════════════════════════════════════════
  // DUYỆT NỘI DUNG KHÓA OFFLINE (PENDING_REVIEW -> PLANNED)
  // ══════════════════════════════════════════════════════════════
  const handleApproveOfflineContent = () => {
    if (!course) return;

    Modal.confirm({
      title: 'Duyệt nội dung giáo trình',
      width: 460,
      content: (
        <div style={{ lineHeight: 1.6 }}>
          <p style={{ marginBottom: 8 }}>
            Xác nhận duyệt nội dung cho khóa học OFFLINE <b>{course.title}</b>?
          </p>
          <p style={{ color: '#64748b', marginBottom: 0 }}>
            Khóa học sẽ chuyển sang trạng thái <b>PLANNED</b> để xếp lịch buổi
            học, phòng học và giảng viên trước khi xuất bản.
          </p>
        </div>
      ),
      okText: 'Duyệt nội dung',
      okButtonProps: { icon: <CheckCircleOutlined /> },
      cancelText: 'Hủy',
      onOk: async () => {
        setIsPublishing(true);
        try {
          await courseApi.review(course.id, true);
          toast.success('Đã duyệt nội dung, khóa học chuyển sang chờ xếp lịch');
          handleSilentRefresh();
        } catch (err) {
          toast.error(
            (err as { message?: string })?.message ||
              'Không thể duyệt nội dung khóa học',
          );
        } finally {
          setIsPublishing(false);
        }
      },
    });
  };

  if (loading) return <PageLoading tip="Đang tải khóa học..." />;
  if (error)
    return (
      <ErrorState
        title="Lỗi"
        description={error}
        onRetry={() => fetchCourse()}
      />
    );
  if (!course) return <ErrorState description="Không tìm thấy khóa học" />;

  const isOffline = course.courseType === 'OFFLINE';
  const isLocked = ['ONGOING', 'FINISHED', 'CANCELLED'].includes(course.status);

  const canPublish =
    course.status === 'PLANNED' ||
    (course.status === 'PENDING_REVIEW' && !isOffline);
  const canApproveOfflineContent =
    course.status === 'PENDING_REVIEW' && isOffline;

  const totalSessionsExpected = course.totalSessionsExpected;
  const currentSessionsCount = course.sessions?.length || 0;

  const statItems = [
    {
      key: 'students',
      label: 'Học viên',
      icon: <TeamOutlined />,
      color: '#2563eb',
      bg: '#eff6ff',
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
      color: '#059669',
      bg: '#ecfdf5',
      value: <MoneyDisplay value={Number(course.price)} />,
    },
    {
      key: 'resources',
      label: 'Học liệu',
      icon: <BookOutlined />,
      color: '#7c3aed',
      bg: '#f5f3ff',
      value: <span>{course.resources?.length || 0}</span>,
    },
    {
      key: 'sessions',
      label: 'Buổi học',
      icon: <CalendarOutlined />,
      color: '#d97706',
      bg: '#fffbeb',
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

  const tabItems = [
    {
      key: 'info',
      label: 'Tổng quan',
      children: (
        <CourseOverviewTab course={course} onRefresh={handleSilentRefresh} />
      ),
    },
    {
      key: 'resources',
      label: `Nội dung (${course.resources?.length || 0})`,
      children: isLocked ? (
        <Alert
          message="Nội dung đã khóa chỉnh sửa"
          description={`Khóa học đang ở trạng thái ${course.status}, học liệu được cố định để đảm bảo tính toàn vẹn dữ liệu.`}
          type="info"
          showIcon
        />
      ) : (
        <ResourceManager
          courseId={courseId}
          resources={course.resources || []}
          onRefresh={handleSilentRefresh}
        />
      ),
    },
    {
      key: 'questions',
      label: 'Câu hỏi',
      children: <CourseQuestionList courseId={courseId} />,
    },
    {
      key: 'quizzes',
      label: 'Quiz',
      children: <QuizListCard courseId={courseId} />,
    },
    {
      key: 'enrollments',
      label:
        course.courseType === 'ONLINE'
          ? 'Người đã mua khóa'
          : 'Danh sách học viên',
      children: (
        <CourseEnrollmentList
          courseId={courseId}
          courseType={course.courseType}
          courseStatus={course.status}
          maxScore={resolveMaxFinalScore(course)}
        />
      ),
    },
  ];

  if (isOffline) {
    tabItems.splice(2, 0, {
      key: 'sessions',
      label:
        totalSessionsExpected != null
          ? `Buổi học (${currentSessionsCount}/${totalSessionsExpected})`
          : `Buổi học (${currentSessionsCount})`,
      children: (
        <CourseSessionList
          courseId={courseId}
          sessions={course.sessions || []}
          onRefresh={handleSilentRefresh}
          course={course}
        />
      ),
    });
    tabItems.splice(3, 0, {
      key: 'attendance',
      label: 'Điểm danh',
      children: <CourseAttendanceMatrix courseId={courseId} />,
    });
  }

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        subtitle={
          <Space size={8} wrap>
            <Text code style={{ margin: 0, fontSize: 12.5 }}>
              {course.code}
            </Text>
            <StatusTag status={course.status} />
            <StatusTag status={course.courseType} />
          </Space>
        }
        backButton
        backTo="/admin/courses"
        extra={
          <Space size={8} wrap>
            {canApproveOfflineContent && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={isPublishing}
                onClick={handleApproveOfflineContent}
              >
                Duyệt nội dung
              </Button>
            )}

            {canPublish && (
              <Button
                type="primary"
                icon={<RocketOutlined />}
                loading={isPublishing}
                onClick={handlePublishCourse}
              >
                Xuất bản khóa học
              </Button>
            )}

            {(canApproveOfflineContent || canPublish) && (
              <Divider type="vertical" style={{ height: 22, marginInline: 2 }} />
            )}

            <CourseDetailActions
              course={course}
              onRefresh={handleSilentRefresh}
            />
          </Space>
        }
      />

      {/* Thông báo ngữ cảnh trạng thái (không lặp nút CTA) */}
      {canPublish && (
        <Alert
          type="info"
          showIcon
          icon={<RocketOutlined />}
          style={{
            marginBottom: 16,
            borderRadius: 8,
            border: '1px solid #bae0ff',
          }}
          message="Khóa học đã sẵn sàng xuất bản"
          description={
            course.status === 'PLANNED'
              ? 'Vui lòng rà soát danh sách buổi học, phòng học và giảng viên ở các tab bên dưới trước khi bấm "Xuất bản khóa học" ở góc trên.'
              : 'Giáo trình khóa ONLINE đã hoàn tất. Sử dụng nút "Xuất bản khóa học" ở góc trên để mở cổng đăng ký.'
          }
        />
      )}

      {canApproveOfflineContent && (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{
            marginBottom: 16,
            borderRadius: 8,
            border: '1px solid #ffe58f',
          }}
          message="Khóa học OFFLINE đang chờ duyệt nội dung"
          description='Kiểm tra học liệu tại tab "Nội dung", sau đó bấm "Duyệt nội dung" ở góc trên để chuyển sang bước xếp lịch buổi học (PLANNED).'
        />
      )}

      {/* Hàng thẻ thống kê chỉ số */}
      <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
        {statItems.map((item) => (
          <Col xs={12} sm={6} key={item.key}>
            <Card
              styles={{ body: { padding: '14px 16px' } }}
              style={{
                height: '100%',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {item.label}
                </span>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    backgroundColor: item.bg,
                    color: item.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
              </div>

              <div className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                {item.value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Khối nội dung chi tiết dạng Tabs */}
      <Card
        styles={{ body: { padding: '4px 20px 20px' } }}
        style={{
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
        }}
      >
        <Tabs
          defaultActiveKey={
            searchParams.get('tab') === 'enrollments' ? 'enrollments' : 'info'
          }
          items={tabItems}
          moreIcon={null}
          tabBarStyle={{
            marginBottom: 18,
            flexWrap: 'nowrap',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="[&::-webkit-scrollbar]:hidden"
        />
      </Card>
    </PageContainer>
  );
};

export default CourseDetailPage;