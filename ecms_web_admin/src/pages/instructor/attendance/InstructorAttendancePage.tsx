import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Input, Row, Space, Spin, Tabs, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import CourseAttendanceMatrix from '@/components/course/CourseAttendanceMatrix';
import { enrollmentApi } from '@/services/api/enrollment';
import type { InstructorAttendanceCourse } from '@/services/types/enrollment';

const { Text } = Typography;

export default function InstructorAttendancePage() {
  const [courses, setCourses] = useState<InstructorAttendanceCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<InstructorAttendanceCourse | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'teaching' | 'finished' | 'all'>('teaching');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      setCourses(await enrollmentApi.instructorAttendanceCourses());
    } catch {
      toast.error('Không tải được danh sách khóa OFFLINE được phân công');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCourses(); }, [loadCourses]);

  const ongoingCourses = useMemo(() => {
    return courses.filter((c) => !c.isFinished && c.courseStatus !== 'FINISHED');
  }, [courses]);

  const finishedCourses = useMemo(() => {
    return courses.filter((c) => c.isFinished || c.courseStatus === 'FINISHED');
  }, [courses]);

  const visibleCourses = useMemo(() => {
    let list = courses;
    if (activeTab === 'teaching') {
      list = ongoingCourses;
    } else if (activeTab === 'finished') {
      list = finishedCourses;
    }
    const query = search.trim().toLocaleLowerCase();
    if (!query) return list;
    return list.filter((course) =>
      `${course.courseCode} ${course.courseTitle}`.toLocaleLowerCase().includes(query)
    );
  }, [courses, activeTab, ongoingCourses, finishedCourses, search]);

  return (
    <PageContainer>
      <PageHeader
        title={selectedCourse ? 'Điểm danh khóa học' : 'Điểm danh'}
        subtitle={selectedCourse
          ? `${selectedCourse.courseCode} · ${selectedCourse.courseTitle}`
          : 'Chọn khóa OFFLINE được phân công để mở ma trận điểm danh.'}
      />

      {selectedCourse ? (
        <>
          <Space className="mb-4" wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedCourse(null)}>
              Danh sách khóa học
            </Button>
            <Tag color={selectedCourse.isFinished || selectedCourse.courseStatus === 'FINISHED' ? 'default' : 'green'}>
              {selectedCourse.isFinished || selectedCourse.courseStatus === 'FINISHED' ? 'Đã kết thúc' : 'Đang dạy'}
            </Tag>
            <Tag color="blue">Được phân công {selectedCourse.assignedSessionCount} buổi</Tag>
          </Space>
          <CourseAttendanceMatrix key={selectedCourse.courseId} courseId={selectedCourse.courseId} mode="instructor" />
        </>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'teaching' | 'finished' | 'all')}
              className="!mb-0"
              items={[
                {
                  key: 'teaching',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <ClockCircleOutlined /> Đang dạy ({ongoingCourses.length})
                    </span>
                  ),
                },
                {
                  key: 'finished',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <CheckCircleOutlined /> Đã dạy / Đã kết thúc ({finishedCourses.length})
                    </span>
                  ),
                },
                {
                  key: 'all',
                  label: (
                    <span>Tất cả ({courses.length})</span>
                  ),
                },
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadCourses()}>
              Làm mới
            </Button>
          </div>

          <div className="mb-4">
            <Input.Search
              allowClear
              className="w-full max-w-md"
              placeholder="Tìm theo mã hoặc tên khóa học"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading && courses.length === 0 ? (
            <div className="py-12 text-center"><Spin /></div>
          ) : !loading && visibleCourses.length === 0 ? (
            <Empty
              description={
                search.trim()
                  ? 'Không tìm thấy khóa học phù hợp với từ khóa tìm kiếm.'
                  : activeTab === 'teaching'
                  ? 'Hiện tại không có khóa học nào đang dạy cần điểm danh.'
                  : activeTab === 'finished'
                  ? 'Chưa có khóa học nào đã kết thúc.'
                  : 'Bạn chưa được phân công khóa OFFLINE nào để điểm danh.'
              }
            />
          ) : (
            <Row gutter={[16, 16]}>
              {visibleCourses.map((course) => {
                const isCourseDone = course.isFinished || course.courseStatus === 'FINISHED';
                return (
                  <Col key={course.courseId} xs={24} sm={12} xl={8}>
                    <Card
                      hoverable
                      onClick={() => setSelectedCourse(course)}
                      title={
                        <Space>
                          <UnorderedListOutlined />
                          <span>{course.courseCode}</span>
                        </Space>
                      }
                      extra={
                        <Space size={4}>
                          <Tag color={isCourseDone ? 'default' : 'green'}>
                            {isCourseDone ? 'Đã kết thúc' : 'Đang dạy'}
                          </Tag>
                          <Tag color="blue">OFFLINE</Tag>
                        </Space>
                      }
                    >
                      <Text className="mb-2 block min-h-12 text-base text-slate-800" strong>
                        {course.courseTitle}
                      </Text>
                      {(course.startDate || course.endDate) && (
                        <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
                          <CalendarOutlined />
                          <span>
                            {course.startDate ? dayjs(course.startDate).format('DD/MM/YYYY') : '—'} - {course.endDate ? dayjs(course.endDate).format('DD/MM/YYYY') : '—'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <Text type="secondary" className="text-xs">
                          {course.assignedSessionCount} buổi phân công
                        </Text>
                        <Button
                          type={isCourseDone ? 'default' : 'primary'}
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedCourse(course);
                          }}
                        >
                          {isCourseDone ? 'Xem điểm danh' : 'Mở điểm danh'}
                        </Button>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </>
      )}
    </PageContainer>
  );
}
