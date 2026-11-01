import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin } from 'antd';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import ErrorState from '@/components/feedback/ErrorState';
import CourseOverviewCard from '@/components/course/CourseOverviewCard';
import CourseResourceTree from '@/components/course/CourseResourceTree';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { courseApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành: import { courseApi } from '@/services/api/course/courseApi';

import type { CourseDetailResponse } from '@/services/types/course';

const CourseLearnPage = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || isNaN(courseId)) {
      setError('ID khóa học không hợp lệ');
      setLoading(false);
      return;
    }

    courseApi
      .getById(courseId)
      .then(setCourse)
      .catch((e) => {
        setError(e?.message || 'Lỗi khi tải dữ liệu khóa học');
        toast.error('Không thể tải khóa học');
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !course) {
    return <ErrorState description={error || 'Không tìm thấy khóa học'} />;
  }

  return (
    <PageContainer>
      <PageHeader 
        title={course.title} 
        subtitle={course.code} 
        backButton 
        backTo="/student/courses" 
      />
      
      <div style={{ display: 'grid', gap: 24 }}>
        <CourseOverviewCard course={course} />
        <CourseResourceTree resources={course.resources || []} />
      </div>
    </PageContainer>
  );
};

export default CourseLearnPage;