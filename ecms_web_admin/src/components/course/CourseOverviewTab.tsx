import { Divider } from 'antd';
import CourseGeneralInfoTab from './CourseGeneralInfoTab';
import CourseProgressStats from './CourseProgressStats';
import CourseProgressCharts from './CourseProgressCharts';
import type { CourseDetailResponse } from '@/services/types/course';

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
}

/**
 * Tab "Tổng quan" — dùng chung admin + instructor.
 * Gộp: Form thông tin + Thống kê học viên + Biểu đồ phân bố thực tế.
 */
const CourseOverviewTab = ({ course, onRefresh }: Props) => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Form thông tin chi tiết khóa học */}
      <CourseGeneralInfoTab course={course} onRefresh={onRefresh} />

      <Divider className="!my-0 border-slate-200" />

      {/* 2. Thẻ thống kê chỉ số tiến độ */}
      <CourseProgressStats courseId={course.id} />

      {/* 3. Biểu đồ tiến độ Line & Doughnut */}
      <CourseProgressCharts courseId={course.id} />
    </div>
  );
};

export default CourseOverviewTab;