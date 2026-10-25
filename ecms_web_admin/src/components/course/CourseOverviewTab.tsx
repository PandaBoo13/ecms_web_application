import { Divider } from 'antd';

import CourseOverviewForm from './CourseOverviewForm';
import CourseProgressStats from './CourseProgressStats';
import CourseProgressCharts from './CourseProgressCharts';

import type { CourseDetailResponse } from '@/services/types/course';

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
}

/**
 * Tab "Tổng quan" — dùng chung admin + instructor.
 * Gộp: Form thông tin + Stats (mock) + Charts (mock).
 */
const CourseOverviewTab = ({ course, onRefresh }: Props) => {
  return (
    <div>
      <CourseOverviewForm course={course} onRefresh={onRefresh} />

      <Divider style={{ margin: '20px 0' }} />

      <CourseProgressStats courseId={course.id} />

      <div style={{ marginTop: 20 }}>
        <CourseProgressCharts courseId={course.id} />
      </div>
    </div>
  );
};

export default CourseOverviewTab;