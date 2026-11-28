// src/pages/student/assignments/AssignmentListPage.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Col,
  Row,
  Skeleton,
  Button,
  Tag,
  Empty,
  Input,
  Select,
  Segmented,
} from 'antd';
import {
  FileDoneOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  BookOutlined,
  LockOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  ArrowRightOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi } from '@/services/api/enrollment';
import { courseApi } from '@/services/api/course';
import type { EnrollmentResponse } from '@/services/types/enrollment';
import type { CourseResourceResponse } from '@/services/types/course';

interface QuizWithCourse extends CourseResourceResponse {
  courseTitle: string;
  courseCode: string;
  enrollmentStatus: EnrollmentResponse['status'];
}

const ENROLLMENT_STATUS_META: Record<
  string,
  { label: string; dotColor: string; pillClass: string }
> = {
  ACTIVE: {
    label: 'Đang học',
    dotColor: '#2563eb',
    pillClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    dotColor: '#10b981',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  PENDING: {
    label: 'Chờ thanh toán',
    dotColor: '#f59e0b',
    pillClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  RESERVED: {
    label: 'Bảo lưu',
    dotColor: '#64748b',
    pillClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
  },
  TERMINATED: {
    label: 'Đã nghỉ',
    dotColor: '#ef4444',
    pillClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
};

const renderEnrollmentPill = (status: string) => {
  const meta = ENROLLMENT_STATUS_META[status] || {
    label: status,
    dotColor: '#64748b',
    pillClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 ${meta.pillClass}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: meta.dotColor }}
      />
      {meta.label}
    </span>
  );
};

export default function AssignmentListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizWithCourse[]>([]);

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'MANDATORY' | 'OPTIONAL'>('MANDATORY');

  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);

  useEffect(() => {
    setLoading(true);

    enrollmentApi
      .myEnrollments({ page: 0, size: 100 })
      .then(async (res) => {
        const allEnrollments = res.content || [];
        setEnrollments(allEnrollments);

        const coursePromises = allEnrollments.map((e) =>
          courseApi.getById(e.courseId).catch(() => null),
        );

        const courseDetails = await Promise.all(coursePromises);

        const allQuizzes: QuizWithCourse[] = [];
        courseDetails.forEach((course, index) => {
          if (!course) return;

          const enrollmentStatus = allEnrollments[index].status;

          const quizzesInCourse = (course.resources || []).filter(
            (r) => r.resourceType === 'QUIZ' && r.status === 'PUBLISHED',
          );

          quizzesInCourse.forEach((q) => {
            allQuizzes.push({
              ...q,
              courseTitle: course.title,
              courseCode: course.code || '',
              enrollmentStatus,
            });
          });
        });

        setQuizzes(allQuizzes);
      })
      .catch((err) => {
        toast.error('Không thể tải danh sách bài tập');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const category = q.quizCategory || 'OPTIONAL';
      if (category !== activeTab) return false;

      if (selectedCourseId !== 'ALL' && q.courseId !== selectedCourseId) {
        return false;
      }

      if (searchQuery.trim()) {
        const kw = searchQuery.toLowerCase().trim();
        const matchTitle = q.title.toLowerCase().includes(kw);
        const matchCourse = q.courseTitle.toLowerCase().includes(kw);
        const matchCode = q.courseCode.toLowerCase().includes(kw);
        if (!matchTitle && !matchCourse && !matchCode) return false;
      }

      return true;
    });
  }, [quizzes, selectedCourseId, activeTab, searchQuery]);

  const mandatoryCount = useMemo(
    () =>
      quizzes.filter((q) => (q.quizCategory || 'OPTIONAL') === 'MANDATORY')
        .length,
    [quizzes],
  );
  const optionalCount = useMemo(
    () =>
      quizzes.filter((q) => (q.quizCategory || 'OPTIONAL') === 'OPTIONAL')
        .length,
    [quizzes],
  );

  const hasActiveFilter =
    searchQuery.trim().length > 0 || selectedCourseId !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCourseId('ALL');
  };

  const handleStartQuiz = (quiz: QuizWithCourse) => {
    if (quiz.enrollmentStatus === 'TERMINATED') {
      toast.error('Khóa học này đã bị đình chỉ, bạn không thể làm bài tập.');
      return;
    }
    navigate(`/student/courses/${quiz.courseId}/learn?resourceId=${quiz.id}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Bài tập & Kiểm tra"
        subtitle="Theo dõi và hoàn thành các bài trắc nghiệm từ các khóa học của bạn"
      />

      {/* ─── KPI SUMMARY STRIP ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-medium text-slate-500">
              Tổng bài kiểm tra
            </div>
            <div className="text-[20px] font-bold text-slate-900 tabular-nums mt-0.5">
              {loading ? '—' : quizzes.length}
            </div>
          </div>
          <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 inline-flex items-center justify-center text-[16px]">
            <FileDoneOutlined />
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-medium text-slate-500">
              Bài tập bắt buộc
            </div>
            <div className="text-[20px] font-bold text-purple-600 tabular-nums mt-0.5">
              {loading ? '—' : mandatoryCount}
            </div>
          </div>
          <span className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 inline-flex items-center justify-center text-[16px]">
            <CheckCircleOutlined />
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-medium text-slate-500">
              Bài tập tự chọn
            </div>
            <div className="text-[20px] font-bold text-blue-600 tabular-nums mt-0.5">
              {loading ? '—' : optionalCount}
            </div>
          </div>
          <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 inline-flex items-center justify-center text-[16px]">
            <QuestionCircleOutlined />
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-medium text-slate-500">
              Khóa học tham gia
            </div>
            <div className="text-[20px] font-bold text-emerald-600 tabular-nums mt-0.5">
              {loading ? '—' : enrollments.length}
            </div>
          </div>
          <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 inline-flex items-center justify-center text-[16px]">
            <BookOutlined />
          </span>
        </div>
      </div>

      {/* ─── UNIFIED TOOLBAR (TABS + FILTER) ─── */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Segmented
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'MANDATORY' | 'OPTIONAL')}
          options={[
            {
              value: 'MANDATORY',
              label: (
                <span className="inline-flex items-center gap-2 py-0.5 px-1 font-medium text-[13px]">
                  <span>Bắt buộc</span>
                  <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0 text-[11px] font-semibold tabular-nums">
                    {mandatoryCount}
                  </span>
                </span>
              ),
            },
            {
              value: 'OPTIONAL',
              label: (
                <span className="inline-flex items-center gap-2 py-0.5 px-1 font-medium text-[13px]">
                  <span>Tự chọn</span>
                  <span className="rounded-full bg-slate-200/80 text-slate-700 px-2 py-0 text-[11px] font-semibold tabular-nums">
                    {optionalCount}
                  </span>
                </span>
              ),
            },
          ]}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-2xl justify-end">
          <Input
            placeholder="Tìm tên bài kiểm tra, mã hoặc tên khóa học..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            className="!rounded-lg sm:w-64"
          />

          <Select
            className="sm:w-64"
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            suffixIcon={<FilterOutlined className="text-slate-400" />}
            options={[
              { value: 'ALL', label: 'Tất cả khóa học' },
              ...enrollments.map((e) => ({
                value: e.courseId,
                label: e.courseTitle || `Khóa học #${e.courseId}`,
              })),
            ]}
          />

          {hasActiveFilter && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
              className="!rounded-lg text-slate-600"
            >
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* ─── NỘI DUNG DANH SÁCH ─── */}
      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Col xs={24} md={12} xl={8} key={n}>
              <Card className="!rounded-xl border-slate-200/90 shadow-none">
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : filteredQuizzes.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredQuizzes.map((quiz) => {
            const isLocked = quiz.enrollmentStatus === 'TERMINATED';
            const passingScore = quiz.passingScore ?? 50;

            return (
              <Col xs={24} md={12} xl={8} key={quiz.id}>
                <div
                  onClick={() => handleStartQuiz(quiz)}
                  className={`group h-full rounded-xl border bg-white p-5 flex flex-col transition-all duration-150 ${
                    isLocked
                      ? 'border-slate-200/80 opacity-80 cursor-not-allowed'
                      : 'border-slate-200/90 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  {/* Top Meta: Khóa học & Trạng thái ghi danh */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="inline-flex items-center gap-1.5 min-w-0 text-[12px] font-medium text-slate-600 bg-slate-100/90 border border-slate-200/70 rounded-md px-2 py-0.5">
                      <BookOutlined className="text-blue-600 shrink-0 text-[11px]" />
                      {quiz.courseCode && (
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">
                          {quiz.courseCode}
                        </span>
                      )}
                      {quiz.courseCode && (
                        <span className="text-slate-300">•</span>
                      )}
                      <span className="truncate">{quiz.courseTitle}</span>
                    </div>

                    {renderEnrollmentPill(quiz.enrollmentStatus)}
                  </div>

                  {/* Title & Hashtag */}
                  <div className="mb-4">
                    <h3 className="text-[15.5px] font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 m-0">
                      {quiz.title}
                    </h3>
                    {quiz.hashtagFilter && (
                      <div className="mt-1.5">
                        <span className="inline-block font-mono text-[11px] text-slate-400 bg-slate-50 border border-slate-200/70 rounded px-1.5 py-0.5 truncate max-w-full">
                          #{quiz.hashtagFilter}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="mt-auto grid grid-cols-3 gap-2 rounded-lg bg-slate-50/90 border border-slate-200/60 p-2.5 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10.5px] text-slate-400 font-medium">
                        Số câu hỏi
                      </span>
                      <span className="text-[13px] font-semibold text-slate-800 tabular-nums mt-0.5 inline-flex items-center gap-1">
                        <QuestionCircleOutlined className="text-blue-500 text-[11.5px]" />
                        {quiz.totalQuestions ?? 0} câu
                      </span>
                    </div>

                    <div className="flex flex-col border-l border-slate-200/80 pl-2.5">
                      <span className="text-[10.5px] text-slate-400 font-medium">
                        Thời gian
                      </span>
                      <span className="text-[13px] font-semibold text-slate-800 tabular-nums mt-0.5 inline-flex items-center gap-1">
                        <ClockCircleOutlined className="text-amber-500 text-[11.5px]" />
                        {quiz.timeLimit ? `${quiz.timeLimit} phút` : 'Tự do'}
                      </span>
                    </div>

                    <div className="flex flex-col border-l border-slate-200/80 pl-2.5">
                      <span className="text-[10.5px] text-slate-400 font-medium">
                        Điểm đạt
                      </span>
                      <span className="text-[13px] font-bold text-emerald-600 tabular-nums mt-0.5 inline-flex items-center gap-1">
                        <TrophyOutlined className="text-emerald-500 text-[11.5px]" />
                        {passingScore}%
                      </span>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <Tag
                      color={
                        (quiz.quizCategory || 'OPTIONAL') === 'MANDATORY'
                          ? 'purple'
                          : 'default'
                      }
                      className="!m-0 !rounded-full !text-[11px] !font-medium !px-2.5"
                    >
                      {(quiz.quizCategory || 'OPTIONAL') === 'MANDATORY'
                        ? 'Bắt buộc hoàn thành'
                        : 'Luyện tập tự chọn'}
                    </Tag>

                    {isLocked ? (
                      <Button
                        size="small"
                        disabled
                        icon={<LockOutlined />}
                        className="!rounded-lg"
                      >
                        Đã khóa
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        iconPosition="end"
                        className="!rounded-lg !shadow-none font-medium"
                      >
                        Vào làm bài
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 px-4">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[14.5px] font-semibold text-slate-700">
                  Không có bài tập{' '}
                  {activeTab === 'MANDATORY' ? 'bắt buộc' : 'tự chọn'} phù hợp
                </span>
                <span className="text-[13px] text-slate-400">
                  {hasActiveFilter
                    ? 'Thử xóa bộ lọc hiện tại hoặc tìm với từ khóa khác.'
                    : 'Chuyển sang tab còn lại để xem các bài kiểm tra khác.'}
                </span>
                {hasActiveFilter && (
                  <Button
                    size="small"
                    onClick={handleResetFilters}
                    className="mt-2 !rounded-lg"
                  >
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            }
          />
        </div>
      )}
    </PageContainer>
  );
}