import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import CourseCreateForm from '@/components/course/CourseCreateForm';

const CourseCreatePage = () => (
  <PageContainer>
    <PageHeader
      title="Tạo khóa học mới"
      subtitle="Khởi tạo khóa học mới cho giảng viên"
      backButton
      backTo="/instructor/courses"
    />
    <CourseCreateForm mode="instructor" />
  </PageContainer>
);

export default CourseCreatePage;