import { useCallback, useEffect, useState } from 'react';
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

import { courseApi } from '@/services/api/course';
import type { CourseDetailResponse } from '@/services/types/course';

const { Text } = Typography;

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🛠️ HÀM FETCH DỮ LIỆU THÔNG MINH (Hỗ trợ Tải ngầm isSilent)
  const fetchCourse = useCallback(async (isSilent = false) => {
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
      setError((err as { message?: string })?.message || 'Không tải được khóa học');
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleSilentRefresh = useCallback(() => {
    fetchCourse(true);
  }, [fetchCourse]);

  if (loading) return <PageLoading tip="Đang tải khóa học..." />;
  if (error) return <ErrorState title="Lỗi" description={error} onRetry={() => fetchCourse()} />;
  if (!course) return <ErrorState description="Không tìm thấy khóa học" />;

  const isLocked = ['ONGOING', 'FINISHED', 'CANCELLED'].includes(course.status);

  const tabItems = [
    {
      key: 'info',
      label: 'Tổng quan',
      children: <CourseOverviewTab course={course} onRefresh={handleSilentRefresh} />,
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
        backTo="/admin/courses"
        extra={<CourseDetailActions course={course} onRefresh={handleSilentRefresh} />}
      />

      {/* 🆕 Tối ưu Responsive cho các Thẻ Thống kê (Row/Col) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" className="h-full">
            <Statistic
              title={<span className="text-xs sm:text-sm text-slate-500">Học viên</span>}
              value={course.currentStudents}
              suffix={course.maxStudents ? <span className="text-xs sm:text-sm text-slate-400">/ {course.maxStudents}</span> : ''}
              valueStyle={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="h-full">
            <Statistic
              title={<span className="text-xs sm:text-sm text-slate-500">Học phí</span>}
              value={course.price}
              // 🆕 Fix tràn viền: Dùng break-all và text size co giãn
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
              title={<span className="text-xs sm:text-sm text-slate-500">Học liệu</span>}
              value={course.resources?.length || 0} 
              valueStyle={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="h-full">
            <Statistic 
              title={<span className="text-xs sm:text-sm text-slate-500">Buổi học</span>}
              value={course.sessions?.length || 0}
              suffix={course.courseType === 'OFFLINE' && course.totalSessionsExpected ? <span className="text-xs sm:text-sm text-slate-400">/ {course.totalSessionsExpected}</span> : ''}
              valueStyle={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 🆕 Tối ưu Responsive cho Tabs: Ẩn nút ... và cho phép vuốt ngang */}
      <Tabs 
        defaultActiveKey="info" 
        items={tabItems} 
        moreIcon={null}
        tabBarStyle={{ 
          marginBottom: 16,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none', // Ẩn thanh cuộn trên Firefox
          msOverflowStyle: 'none', // Ẩn thanh cuộn trên Edge
        }}
        className="[&::-webkit-scrollbar]:hidden" // Ẩn thanh cuộn trên Chrome/Safari
      />
    </PageContainer>
  );
};

export default CourseDetailPage;