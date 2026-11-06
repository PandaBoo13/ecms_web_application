import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Tabs,
  Card,
  Space,
  Typography,
  Alert,
  Statistic,
  Row,
  Col,
  Button,
  Modal,
  Tooltip,
} from 'antd';
import { SendOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
import CourseQuestionList from '@/components/course/CourseQuestionList';
import QuizListCard from '@/components/course/QuizListCard';

import { courseApi } from '@/services/api/course';
import { requestApi } from '@/services/api/request/requestApi';
import type { CourseDetailResponse } from '@/services/types/course';

const { Text } = Typography;

const CourseEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái đang gửi kiểm duyệt
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // FETCH COURSE
  // ══════════════════════════════════════════════════════════════
  const fetchCourse = useCallback(
    async (isSilent = false) => {
      if (!courseId || isNaN(courseId)) {
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
        setError(
          (err as { message?: string })?.message || 'Không tải được khóa học',
        );
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
      title: 'Gửi yêu cầu kiểm duyệt khóa học',
      width: 480,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Bạn có chắc muốn gửi khóa học <b>{course.title}</b> để kiểm duyệt?
          </p>
          <p style={{ color: '#8c8c8c', marginBottom: 0 }}>
            Sau khi gửi, khóa học sẽ <b>tạm khóa chỉnh sửa</b> cho đến khi có
            kết quả duyệt từ admin.
          </p>
        </div>
      ),
      okText: 'Gửi yêu cầu',
      okButtonProps: { icon: <SendOutlined /> },
      cancelText: 'Hủy',
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
            (err as { message?: string })?.message ||
              'Không gửi được yêu cầu kiểm duyệt',
          );
        } finally {
          setIsSubmittingReview(false);
        }
      },
    });
  };

  if (isInitialLoading) return <PageLoading tip="Đang tải khóa học..." />;
  if (error)
    return (
      <ErrorState
        title="Lỗi"
        description={error}
        onRetry={() => fetchCourse()}
      />
    );
  if (!course) return <ErrorState description="Không tìm thấy khóa học" />;

  const isLocked = ['ONGOING', 'FINISHED', 'CANCELLED'].includes(course.status);
  
  // Chỉ cho phép gửi duyệt khi khóa học đang ở trạng thái Nháp (DRAFT)
  const canSubmitReview = course.status === 'DRAFT';
  const isPendingReview = course.status === 'PENDING_REVIEW';

  // ══════════════════════════════════════════════════════════════
  // TAB ITEMS
  // ══════════════════════════════════════════════════════════════
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
          message="Không thể sửa nội dung"
          description={`Khóa học đang ở trạng thái ${course.status}, nội dung đã bị khóa để đảm bảo tính toàn vẹn.`}
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
  ];

  // Nếu là khóa OFFLINE, chèn thêm tab Buổi học vào vị trí số 2
  if (course.courseType === 'OFFLINE') {
    tabItems.splice(2, 0, {
      key: 'sessions',
      label: `Buổi học (${course.sessions?.length || 0})`,
      children: (
        <CourseSessionList
          courseId={courseId}
          sessions={course.sessions || []}
          onRefresh={handleSilentRefresh}
        />
      ),
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
          <Space size={8} wrap>
            <Text type="secondary">{course.code}</Text>
            <StatusTag status={course.status} />
            <StatusTag status={course.courseType} />
          </Space>
        }
        backButton
        backTo="/instructor/courses"
        extra={
          <Space wrap>
            {/* Nút gửi kiểm duyệt — chỉ hiện khi DRAFT */}
            {canSubmitReview && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={isSubmittingReview}
                onClick={handleSubmitReview}
              >
                Gửi kiểm duyệt
              </Button>
            )}

            {/* Nút disabled khi đang chờ duyệt */}
            {isPendingReview && (
              <Tooltip title="Khóa học đang chờ admin kiểm duyệt">
                <Button icon={<ClockCircleOutlined />} disabled>
                  Đang chờ duyệt
                </Button>
              </Tooltip>
            )}

            <CourseDetailActions
              course={course}
              onRefresh={handleSilentRefresh}
            />
          </Space>
        }
      />

      {/* Banner hướng dẫn khi có thể gửi duyệt (Trạng thái DRAFT) */}
      {canSubmitReview && (
        <Alert
          type="info"
          showIcon
          icon={<SendOutlined />}
          style={{ marginBottom: 16 }}
          message="Khóa học chưa được gửi kiểm duyệt"
          description="Hoàn tất nội dung, học liệu và (nếu OFFLINE) buổi học rồi gửi admin kiểm duyệt trước khi xuất bản."
          action={
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={isSubmittingReview}
              onClick={handleSubmitReview}
            >
              Gửi duyệt ngay
            </Button>
          }
        />
      )}

      {/* Banner thông báo khi đang chờ duyệt */}
      {isPendingReview && (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginBottom: 16 }}
          message="Khóa học đang chờ admin kiểm duyệt"
          description="Bạn sẽ nhận được thông báo khi có kết quả. Trong thời gian này khóa học tạm khóa chỉnh sửa."
        />
      )}

      {/* Stats cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" className="h-full">
            <Statistic
              title={
                <span className="text-xs sm:text-sm text-slate-500">
                  Học viên
                </span>
              }
              value={course.currentStudents}
              suffix={
                course.maxStudents ? (
                  <span className="text-xs sm:text-sm text-slate-400">
                    / {course.maxStudents}
                  </span>
                ) : (
                  ''
                )
              }
              valueStyle={{
                fontSize: 'clamp(18px, 3vw, 24px)',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className="h-full">
            <Statistic
              title={
                <span className="text-xs sm:text-sm text-slate-500">
                  Học phí
                </span>
              }
              value={course.price}
              formatter={(v) => (
                <div className="text-[17px] sm:text-xl md:text-2xl font-bold text-slate-800 break-all mt-1">
                  <MoneyDisplay value={Number(v)} />
                </div>
              )}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className="h-full">
            <Statistic
              title={
                <span className="text-xs sm:text-sm text-slate-500">
                  Học liệu
                </span>
              }
              value={course.resources?.length || 0}
              valueStyle={{
                fontSize: 'clamp(18px, 3vw, 24px)',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className="h-full">
            <Statistic
              title={
                <span className="text-xs sm:text-sm text-slate-500">
                  Buổi học
                </span>
              }
              value={course.sessions?.length || 0}
              suffix={
                course.courseType === 'OFFLINE' &&
                course.totalSessionsExpected ? (
                  <span className="text-xs sm:text-sm text-slate-400">
                    / {course.totalSessionsExpected}
                  </span>
                ) : (
                  ''
                )
              }
              valueStyle={{
                fontSize: 'clamp(18px, 3vw, 24px)',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tab bar responsive */}
      <Tabs
        defaultActiveKey="info"
        items={tabItems}
        moreIcon={null}
        tabBarStyle={{
          marginBottom: 16,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="[&::-webkit-scrollbar]:hidden"
      />
    </PageContainer>
  );
};

export default CourseEditPage;