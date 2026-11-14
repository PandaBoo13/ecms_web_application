import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import ErrorState from '@/components/feedback/ErrorState';
import CourseOverviewCard from '@/components/course/CourseOverviewCard';
import CourseResourceTree from '@/components/course/CourseResourceTree';
import { enrollmentApi } from '@/services/api/enrollment';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { courseApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành: import { courseApi } from '@/services/api/course/courseApi';

import type { CourseDetailResponse } from '@/services/types/course';

const CourseLearnPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminated, setTerminated] = useState(false);

  useEffect(() => {
    if (!courseId || isNaN(courseId)) {
      setError('ID khóa học không hợp lệ');
      setLoading(false);
      return;
    }

    Promise.all([
      courseApi.getById(courseId),
      // Không chặn trang nếu API ghi danh lỗi (ví dụ tài khoản không phải học viên).
      enrollmentApi
        .myEnrollments({ courseId, page: 0, size: 10 })
        .catch(() => null),
    ])
      .then(([courseData, enrollments]) => {
        setCourse(courseData);
        const rows = enrollments?.content ?? [];
        // Chỉ chặn khi mọi ghi danh của khóa đều đã kết thúc (hoàn tiền toàn phần).
        setTerminated(rows.length > 0 && rows.every((row) => row.status === 'TERMINATED'));
      })
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

  if (terminated) {
    return (
      <Result
        status="warning"
        title="Ghi danh đã kết thúc"
        subTitle="Bạn không còn quyền truy cập nội dung khóa học này. Lịch sử điểm danh và hóa đơn vẫn được lưu trong mục Ghi danh."
        extra={
          <Button type="primary" onClick={() => navigate('/student/courses')}>
            Về khóa học của tôi
          </Button>
        }
      />
    );
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
