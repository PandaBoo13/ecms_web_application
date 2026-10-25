import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Card, Space, Typography, Alert, Statistic, Row, Col } from 'antd';

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

import { courseApi } from '@/services/api/courses';
import type { CourseDetailResponse } from '@/services/types/course';

const { Text } = Typography;

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = async () => {
    if (!courseId || isNaN(courseId)) {
      setError('ID khóa học không hợp lệ');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await courseApi.getById(courseId);
      setCourse(data);
    } catch (err) {
      setError((err as { message?: string })?.message || 'Không tải được khóa học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading) return <PageLoading tip="Đang tải khóa học..." />;
  if (error) return <ErrorState title="Lỗi" description={error} onRetry={fetchCourse} />;
  if (!course) return <ErrorState description="Không tìm thấy khóa học" />;

  const isOngoing = course.status === 'ONGOING';

  const tabItems = [
    {
      key: 'info',
      label: 'Tổng quan',
      children: <CourseOverviewTab course={course} onRefresh={fetchCourse} />,
    },
    {
      key: 'resources',
      label: `Nội dung (${course.resources?.length || 0})`,
      children: isOngoing ? (
        <Alert message="Không thể sửa nội dung khi khóa đang diễn ra" type="info" showIcon />
      ) : (
        <ResourceManager
          courseId={courseId}
          resources={course.resources || []}
          onRefresh={fetchCourse}
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

  if (course.courseType === 'OFFLINE') {
    tabItems.splice(2, 0, {
      key: 'sessions',
      label: `Buổi học (${course.sessions?.length || 0})`,
      children: (
        <CourseSessionList
          courseId={courseId}
          sessions={course.sessions || []}
          onRefresh={fetchCourse}
        />
      ),
    });
  }

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        subtitle={
          <Space size={8}>
            <Text type="secondary">{course.code}</Text>
            <StatusTag status={course.status} />
            <StatusTag status={course.courseType} />
          </Space>
        }
        backButton
        backTo="/admin/courses"
        extra={<CourseDetailActions course={course} onRefresh={fetchCourse} />}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Học viên"
              value={course.currentStudents}
              suffix={course.maxStudents ? `/ ${course.maxStudents}` : ''}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Học phí"
              value={course.price}
              formatter={(v) => <MoneyDisplay value={Number(v)} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Bài học" value={course.resources?.length || 0} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Buổi học" value={course.sessions?.length || 0} />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="info" items={tabItems} />
    </PageContainer>
  );
};

export default CourseDetailPage;