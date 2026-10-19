import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs } from 'antd';

import PageContainer from '@/components/common/PageContainer';
import PageLoading from '@/components/feedback/PageLoading';
import ErrorState from '@/components/feedback/ErrorState';

import CourseDetailHeader from '@/components/course/CourseDetailHeader';
import CourseOverviewCard from '@/components/course/CourseOverviewCard';
import CourseResourceTree from '@/components/course/CourseResourceTree';
import CourseSessionList from '@/components/course/CourseSessionList';
import CourseQuestionList from '@/components/course/CourseQuestionList';
import QuizListCard from '@/components/course/QuizListCard';

import { courseApi } from '@/services/api/courses';
import type { CourseDetailResponse } from '@/services/types/course';

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

  const tabItems = [
    {
      key: 'overview',
      label: 'Tổng quan',
      children: <CourseOverviewCard course={course} />,
    },
    {
      key: 'resources',
      label: `Nội dung (${course.resources?.length || 0})`,
      children: <CourseResourceTree resources={course.resources || []} />,
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

  // Chỉ OFFLINE mới có tab Session
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
      <CourseDetailHeader course={course} onRefresh={fetchCourse} />
      <Tabs defaultActiveKey="overview" items={tabItems} />
    </PageContainer>
  );
};

export default CourseDetailPage;