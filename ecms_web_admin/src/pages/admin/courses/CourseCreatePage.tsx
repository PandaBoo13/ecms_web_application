// src/pages/admin/CourseCreatePage.tsx
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import CourseCreateForm from '@/components/course/CourseCreateForm';

const CourseCreatePage = () => (
  <PageContainer>
    <PageHeader
      title="Tạo khóa học mới"
      subtitle="Khởi tạo thông tin cơ bản, cấu hình lớp học và học phí trong hệ thống đào tạo"
      backButton
      backTo="/admin/courses"
    />
    <CourseCreateForm mode="admin" />
  </PageContainer>
);

export default CourseCreatePage;