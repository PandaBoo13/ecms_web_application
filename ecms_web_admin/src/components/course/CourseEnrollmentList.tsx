import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Descriptions, Divider, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Space, Table, Tag, Tooltip, Typography, Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FileExcelOutlined, FormOutlined, HistoryOutlined, LockOutlined, UndoOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { enrollmentApi } from '@/services/api/enrollment';
import EnrollmentStatusTag from '@/components/enrollment/EnrollmentStatusTag';
import { ENROLLMENT_STATUS_FILTER_OPTIONS, ENROLLMENT_STATUS_LABEL } from '@/constants/enrollment';
import type { EnrollmentStatusFilter } from '@/constants/enrollment';
import { showError } from '@/utils/errorHelper';
import { requestApi } from '@/services/api/request/requestApi';
import { useAuth } from '@/hooks/useAuth';
import type { CourseStatus, CourseType } from '@/services/types/course/enums';
import type { EnrollmentResponse, EnrollmentStatusLogResponse, GradeReviewStatusResponse } from '@/services/types/enrollment';
import {
  DEFAULT_MAX_ABSENCE_PERCENT,
  classifyCompletionStudents,
  resolveMaxAbsencePercent,
} from '@/components/course/completion/autoCompletionClassification';
import type { ClassifiedStudent } from '@/components/course/completion/autoCompletionClassification';
import AutoCompletionModal from '@/components/course/enrollment/AutoCompletionModal';
import GradeReviewActions from '@/components/course/enrollment/GradeReviewActions';
import ReopenCompletionModal from '@/components/course/enrollment/ReopenCompletionModal';

const { Text } = Typography;
const enrollmentStatuses: EnrollmentStatusFilter[] = ['PENDING', 'ACTIVE', 'RESERVED', 'TERMINATED', 'COMPLETED', 'COMPLETED_PASSED', 'COMPLETED_FAILED'];

interface CourseEnrollmentListProps {
  courseId: number;
  courseType: CourseType;
  courseStatus: CourseStatus;
  maxScore?: number;
}

/** Tab học viên trong khóa học; thao tác vòng đời được thực hiện trong ngữ cảnh khóa này. */
export default function CourseEnrollmentList({ courseId, courseType, courseStatus, maxScore = 100 }: CourseEnrollmentListProps) {
  const isOnline = courseType === 'ONLINE';
  const { isAdmin, isInstructor } = useAuth();
  // ADMIN: full quyền. INSTRUCTOR: chỉ xem + thao tác trên khóa OFFLINE mình dạy.
  // Khóa ONLINE với INSTRUCTOR là read-only hoàn toàn.
  const canEditEnrollment = isAdmin();
  const canManageScores = isInstructor() && !isOnline;
  const canComplete = isInstructor() && !isOnline;
  // Khớp guard BE requireScoreEntryAllowed: chỉ nhập điểm khi khóa đang diễn ra hoặc đã kết thúc.
  const scoreEntryAllowed = courseStatus === 'ONGOING' || courseStatus === 'FINISHED';
  const scoreEntryBlockedReason =
    courseStatus === 'CANCELLED'
      ? 'Khóa học đã bị hủy nên không thể nhập điểm cuối khóa.'
      : courseStatus === 'ARCHIVED'
        ? 'Khóa học đã được lưu trữ nên không thể nhập điểm cuối khóa.'
        : 'Chỉ nhập điểm cuối khóa khi khóa học đang diễn ra hoặc đã kết thúc.';
  const canExportRoster = (isAdmin() || isInstructor()) && !isOnline;
  const showActions = canEditEnrollment || (isInstructor() && !isOnline);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const highlightId = highlightParam ? Number(highlightParam) : undefined;

  const requestedStatus = searchParams.get('status') as EnrollmentStatusFilter | null;

  const [rows, setRows] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingRoster, setExportingRoster] = useState(false);
  const [activeStatus, setActiveStatus] = useState<EnrollmentStatusFilter | undefined>(
    requestedStatus && enrollmentStatuses.includes(requestedStatus) ? requestedStatus : undefined,
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentResponse | null>(null);
  const [history, setHistory] = useState<EnrollmentStatusLogResponse[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [importingScores, setImportingScores] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [importResult, setImportResult] = useState<Awaited<ReturnType<typeof enrollmentApi.importFinalScores>> | null>(null);
  // Auto-completion state
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [analyzingCompletion, setAnalyzingCompletion] = useState(false);
  const [minPassScore, setMinPassScore] = useState<number>(50);
  const [maxAbsencePercent, setMaxAbsencePercent] = useState(DEFAULT_MAX_ABSENCE_PERCENT);
  const [classifiedStudents, setClassifiedStudents] = useState<ClassifiedStudent[]>([]);
  const [selectedPassIds, setSelectedPassIds] = useState<number[]>([]);
  const [selectedFailIds, setSelectedFailIds] = useState<number[]>([]);
  // Grade review approval state
  const [gradeReviewStatus, setGradeReviewStatus] = useState<GradeReviewStatusResponse | null>(null);
  const [submittingGradeReview, setSubmittingGradeReview] = useState(false);
  const [recallingGradeReview, setRecallingGradeReview] = useState(false);
  const [selectedCompleteIds, setSelectedCompleteIds] = useState<number[]>([]);
  const [completing, setCompleting] = useState(false);
  const [form] = Form.useForm();
  const [scoreForm] = Form.useForm();
  const editAction = Form.useWatch('editAction', form);





  const loadGradeReviewStatus = useCallback(async () => {
    if (isOnline) return;
    try {
      const status = await enrollmentApi.getGradeReviewStatus(courseId);
      setGradeReviewStatus(status);
    } catch {
      // fallback
    }
  }, [courseId, isOnline]);

  const handleSubmitGradeReview = async () => {
    setSubmittingGradeReview(true);
    try {
      const res = await enrollmentApi.submitGradeReview(courseId);
      setGradeReviewStatus(res);
      toast.success('Đã gửi yêu cầu phê duyệt bảng điểm tới Quản trị viên');
    } catch (err) {
      showError(err, 'Không thể gửi duyệt bảng điểm');
    } finally {
      setSubmittingGradeReview(false);
    }
  };

  const handleRecallGradeReview = async () => {
    if (!gradeReviewStatus?.requestId) return;
    setRecallingGradeReview(true);
    try {
      await requestApi.cancel(gradeReviewStatus.requestId);
      toast.success('Đã thu hồi bảng điểm; có thể chỉnh sửa và gửi duyệt lại');
      await loadGradeReviewStatus();
      await loadEnrollments();
    } catch (err) {
      showError(err, 'Không thể thu hồi bảng điểm');
    } finally {
      setRecallingGradeReview(false);
    }
  };

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const page = await enrollmentApi.search({
        courseId, page: pageNumber, size: pageSize,
        status: activeStatus === 'COMPLETED_PASSED' || activeStatus === 'COMPLETED_FAILED' ? 'COMPLETED' : activeStatus,
        completionResult: activeStatus === 'COMPLETED_PASSED' ? 'PASSED'
          : activeStatus === 'COMPLETED_FAILED' ? 'FAILED' : undefined,
        search: search || undefined,


        includeCompletionEligibility: !isOnline,
      });
      setRows(page.content ?? []);
      setTotal(page.totalElements ?? 0);
    } catch (err) {
      showError(err, 'Không tải được danh sách học viên ghi danh');
    } finally {
      setLoading(false);
    }
  }, [activeStatus, courseId, courseStatus, isOnline, pageNumber, pageSize, search]);

  useEffect(() => {
    void loadEnrollments();
    void loadGradeReviewStatus();
  }, [loadEnrollments, loadGradeReviewStatus]);

  useEffect(() => {
    setSelectedCompleteIds([]);
  }, [courseId, courseStatus]);

  useEffect(() => {
    if (!highlightId || rows.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-row-key="${highlightId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId, rows]);

  useEffect(() => {
    if (requestedStatus && enrollmentStatuses.includes(requestedStatus)) {
      setActiveStatus(requestedStatus);
      setPageNumber(0);
    } else if (!requestedStatus) {
      setActiveStatus(undefined);
      setPageNumber(0);
    }
  }, [requestedStatus]);

  const openDetails = (enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment);
    setHistory([]);
    setDetailOpen(true);
  };

  const submitSearch = (value: string) => {
    setSearch(value.trim());
    setPageNumber(0);
    setSelectedCompleteIds([]);
  };

  const openHistory = async () => {
    if (!selectedEnrollment) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      setHistory(await enrollmentApi.statusHistory(selectedEnrollment.enrollmentId));
    } catch (err) {
      showError(err, 'Không tải được lịch sử trạng thái');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEdit = (enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment);
    setEditOpen(true);
    form.resetFields();
    form.setFieldsValue({
      editAction: enrollment.status === 'RESERVED'
        ? 'resume'
        : enrollment.status === 'ACTIVE' && !isOnline ? 'reserve' : 'terminate',
      startDate: dayjs(),
      endDate: dayjs().add(1, 'month'),
    });
  };

  const openScoreEditor = (enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment);
    setScoreOpen(true);
    scoreForm.setFieldsValue({ finalScore: enrollment.finalScore ?? undefined });
  };

  const saveEdit = async (values: Record<string, unknown>) => {
    if (!selectedEnrollment) return;
    const selectedAction = values.editAction as string;
    setSaving(true);
    try {
      if (selectedAction === 'reserve') {
        await enrollmentApi.reserve(selectedEnrollment.enrollmentId, {
          reason: String(values.reason ?? '').trim(),
          startDate: dayjs(values.startDate as dayjs.ConfigType).format('YYYY-MM-DD'),
          endDate: dayjs(values.endDate as dayjs.ConfigType).format('YYYY-MM-DD'),
        });
      } else if (selectedAction === 'resume') {
        await enrollmentApi.resume(selectedEnrollment.enrollmentId);
      } else {
        await enrollmentApi.terminate(selectedEnrollment.enrollmentId, { reason: String(values.reason ?? '').trim() });
      }
      toast.success('Đã cập nhật ghi danh');
      setEditOpen(false);
      setSelectedEnrollment(null);
      form.resetFields();
      await loadEnrollments();
    } catch (err) {
      showError(err, 'Không thể cập nhật học viên');
    } finally {
      setSaving(false);
    }
  };

  const saveScore = async (values: { finalScore: number }) => {
    if (!selectedEnrollment) return;
    setScoreSaving(true);
    try {
      await enrollmentApi.recordFinalScore(selectedEnrollment.enrollmentId, { finalScore: Number(values.finalScore) });
      toast.success('Đã cập nhật điểm cuối khóa');
      setScoreOpen(false);
      setSelectedEnrollment(null);
      await loadEnrollments();
    } catch (err) {
      showError(err, 'Không thể cập nhật điểm cuối khóa');
    } finally {
      setScoreSaving(false);
    }
  };

  const openReopenCompletion = (enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment);
    setReopenOpen(true);
  };

  const saveReopenCompletion = async (reason: string): Promise<boolean> => {
    if (!selectedEnrollment) return false;
    setReopening(true);
    try {
      await enrollmentApi.reopenCompletion(selectedEnrollment.enrollmentId, { reason });
      toast.success('Đã hoàn tác xét hoàn thành; học viên trở về Đang học');
      setReopenOpen(false);
      setSelectedEnrollment(null);
      await loadEnrollments();
      return true;
    } catch (err) {
      showError(err, 'Không thể hoàn tác xét hoàn thành');
      return false;
    } finally {
      setReopening(false);
    }
  };

  const exportRoster = async () => {
    setExportingRoster(true);
    try {
      const blob = await enrollmentApi.exportCourseRoster(courseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `course-${courseId}-roster.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã tải danh sách Excel');
    } catch (err) {
      showError(err, 'Không thể xuất danh sách Excel');
    } finally {
      setExportingRoster(false);
    }
  };

  const importScores = async (file: File) => {
    setImportingScores(true);
    try {
      const result = await enrollmentApi.importFinalScores(courseId, file);
      setImportResult(result);
      await loadEnrollments();
      if (result.issues.length === 0) toast.success(`Đã nhập điểm cho ${result.updated} học viên`);
    } catch (err) {
      showError(err, 'Không thể nhập bảng điểm');
    } finally {
      setImportingScores(false);
    }
  };

  const openCompletionModal = async () => {
    setCompletionModalOpen(true);
    setAnalyzingCompletion(true);
    try {
      const res = await enrollmentApi.search({
        courseId,
        status: 'ACTIVE',
        size: 100,
        includeCompletionEligibility: !isOnline,
      });
      let activeStudents = res.content ?? [];
      if (selectedCompleteIds.length > 0) {
        activeStudents = activeStudents.filter((s) => selectedCompleteIds.includes(s.enrollmentId));
      }

      let matrix: Awaited<ReturnType<typeof enrollmentApi.courseAttendanceMatrix>> | null = null;
      if (!isOnline) {
        try {
          matrix = await enrollmentApi.courseAttendanceMatrix(courseId);
        } catch {
          matrix = null;
        }
        if (!matrix) {
          setCompletionModalOpen(false);
          toast.error('Không tải được dữ liệu điểm danh — chưa thể phân loại xét hoàn thành');
          return;
        }
      }

      const maxAbsencePct = resolveMaxAbsencePercent(matrix);
      setMaxAbsencePercent(maxAbsencePct);

      // Điểm chuẩn đã chốt trong bảng điểm Quản trị viên duyệt (50% thang điểm khóa).
      const publishedPassScore = gradeReviewStatus?.passScore ?? Math.round(maxScore / 2);
      setMinPassScore(Number(publishedPassScore));

      const classified = classifyCompletionStudents({
        students: activeStudents,
        matrix,
        isOnline,
        defaultPassScore: Number(publishedPassScore),
        maxAbsencePercent: maxAbsencePct,
      });

      setClassifiedStudents(classified);
      setSelectedPassIds(classified.filter((c) => c.eligible && c.suggestedResult === 'PASSED').map((c) => c.enrollmentId));
      setSelectedFailIds(classified.filter((c) => c.eligible && c.suggestedResult === 'FAILED').map((c) => c.enrollmentId));
    } catch (err) {
      showError(err, 'Không thể phân tích dữ liệu hoàn thành khóa học');
    } finally {
      setAnalyzingCompletion(false);
    }
  };

  const handleConfirmAutoCompletion = async () => {
    const totalToComplete = selectedPassIds.length + selectedFailIds.length;
    if (totalToComplete === 0) {
      toast.error('Vui lòng chọn ít nhất 1 học viên để hoàn thành');
      return;
    }
    setCompleting(true);
    try {
      let passedCount = 0;
      let failedCount = 0;
      const issues: string[] = [];

      if (selectedPassIds.length > 0) {
        const res = await enrollmentApi.completeBatch(courseId, selectedPassIds, 'PASSED');
        passedCount = res.completed;
        if (res.failed > 0) {
          res.results.filter((r) => !r.success).forEach((r) => issues.push(r.message));
        }
      }

      if (selectedFailIds.length > 0) {
        const res = await enrollmentApi.completeBatch(courseId, selectedFailIds, 'FAILED');
        failedCount = res.completed;
        if (res.failed > 0) {
          res.results.filter((r) => !r.success).forEach((r) => issues.push(r.message));
        }
      }

      if (passedCount > 0 || failedCount > 0) {
        toast.success(`Đã hoàn thành ${passedCount} học viên (Đạt) và ${failedCount} học viên (Không đạt)`);
      }
      if (issues.length > 0) {
        toast.error(`Một số học viên chưa hoàn thành: ${issues[0]}`);
      }

      setCompletionModalOpen(false);
      setSelectedCompleteIds([]);
      await loadEnrollments();
    } catch (err) {
      showError(err, 'Lỗi khi thực hiện hoàn thành khóa học');
    } finally {
      setCompleting(false);
    }
  };

  const columns: ColumnsType<EnrollmentResponse> = [
    { title: 'Mã ghi danh', dataIndex: 'enrollmentId', width: 110, render: (id) => <Text strong>#{id}</Text> },
    {
      title: isOnline ? 'Người mua' : 'Học viên',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {row.studentName || (row.studentId ? `Học viên #${row.studentId}` : `Tài khoản #${row.accountId}`)}
          </div>
          {row.studentCode && <Text type="secondary" style={{ fontSize: 12 }}>Mã: {row.studentCode}</Text>}
          {row.studentEmail && (
            <div style={{ fontSize: 12, color: '#64748b' }}>{row.studentEmail}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Hình thức',
      dataIndex: 'enrollmentType',
      width: 110,
      render: (t) => <Tag color={t === 'ONLINE' ? 'blue' : 'green'}>{t}</Tag>,
    },
    {
      title: isOnline ? 'Ngày mua' : 'Ngày ghi danh',
      dataIndex: 'enrolledAt',
      render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (status, row) => (
        <Space orientation="vertical" size={2}>
          {status === 'COMPLETED' && row.completionResult
            ? <Tag color="purple">Hoàn thành ({row.completionResult === 'PASSED' ? 'Đạt' : 'Không đạt'})</Tag>
            : <EnrollmentStatusTag status={status} />}
        </Space>
      ),
    },
  ];

  if (!isOnline) {
    columns.splice(4, 0, {
      title: 'Điểm cuối khóa',
      dataIndex: 'finalScore',
      width: 160,
      render: (score: number | null) => (
        <Space size={6}>
          {score !== null && score !== undefined ? (
            <span className="font-semibold text-slate-800">{score}</span>
          ) : (
            <Text type="secondary">Chưa cập nhật</Text>
          )}
          {score !== null && gradeReviewStatus?.status === 'PENDING_APPROVAL' && (
            <Tag color="orange" bordered={false} className="!mr-0 text-[10px]">
              Chờ duyệt
            </Tag>
          )}
        </Space>
      ),
    });
  }

  if (showActions) {
    columns.push({
      title: 'Thao tác',
      fixed: 'right',
      width: 125,
      render: (_, row) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button size="small" aria-label="Xem chi tiết" icon={<EyeOutlined />} onClick={() => openDetails(row)} />
          </Tooltip>
          {canManageScores && !isOnline && row.status === 'ACTIVE' && (
            gradeReviewStatus?.status === 'APPROVED' ? (
              <Tooltip title="Bảng điểm đã được duyệt & công bố, không thể sửa">
                <Button size="small" aria-label="Bảng điểm đã chốt" icon={<LockOutlined />} disabled />
              </Tooltip>
            ) : gradeReviewStatus?.status === 'PENDING_APPROVAL' ? (
              <Tooltip title="Bảng điểm đang chờ duyệt — thu hồi để chỉnh sửa">
                <Button size="small" aria-label="Bảng điểm đang chờ duyệt" icon={<FormOutlined />} disabled />
              </Tooltip>
            ) : !scoreEntryAllowed ? (
              <Tooltip title={scoreEntryBlockedReason}>
                <Button size="small" aria-label="Chưa thể nhập điểm cuối khóa" icon={<FormOutlined />} disabled />
              </Tooltip>
            ) : (
              <Tooltip title="Cập nhật điểm cuối khóa">
                <Button size="small" aria-label="Cập nhật điểm cuối khóa" icon={<FormOutlined />} onClick={() => openScoreEditor(row)} />
              </Tooltip>
            )
          )}
          {canManageScores && !isOnline && row.status === 'COMPLETED' && (
            <Tooltip title="Hoàn tác xét hoàn thành">
              <Button
                size="small"
                aria-label="Hoàn tác xét hoàn thành"
                icon={<UndoOutlined />}
                onClick={() => openReopenCompletion(row)}
              />
            </Tooltip>
          )}
          {canEditEnrollment && !isOnline && !['TERMINATED', 'COMPLETED'].includes(row.status) && (
            <Tooltip title="Chỉnh sửa">
              <Button size="small" aria-label="Chỉnh sửa" icon={<EditOutlined />} onClick={() => openEdit(row)} />
            </Tooltip>
          )}
        </Space>
      ),
    });
  }

  return (
    <Space orientation="vertical" size="middle" className="w-full">

      {canComplete && courseStatus === 'FINISHED' && !isOnline && (
        <Alert
          type="warning"
          showIcon
          message="Khóa học đã kết thúc"
          description="Chọn các học viên đủ điều kiện trong bảng bên dưới để cập nhật hoàn thành hàng loạt. Học viên không đủ điều kiện sẽ bị khóa chọn; rê chuột lên ô chọn để xem lý do."
        />
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Input.Search
          allowClear
          placeholder="Tìm học viên, mã học viên hoặc hóa đơn"
          style={{ width: 330 }}
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            if (!event.target.value) submitSearch('');
          }}
          onSearch={submitSearch}
        />
        {!isOnline && <Select
            style={{ width: 200 }}
            value={activeStatus ?? ''}
            onChange={(key) => {
              const nextStatus = key ? key as EnrollmentStatusFilter : undefined;
              setActiveStatus(nextStatus);
              setPageNumber(0);
              setSelectedCompleteIds([]);
              const nextParams = new URLSearchParams(searchParams);
              if (nextStatus) nextParams.set('status', nextStatus);
              else nextParams.delete('status');
              // Đổi bộ lọc trạng thái = mở rộng phạm vi xem, nên bỏ luôn filter học viên.
              nextParams.delete('studentId');
              nextParams.delete('accountId');
              setSearchParams(nextParams, { replace: true });
            }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              ...ENROLLMENT_STATUS_FILTER_OPTIONS,
            ]}
        />}
        {!isOnline && (
          <div className="flex items-center gap-2">
            <GradeReviewActions
              courseStatus={courseStatus}
              gradeReviewStatus={gradeReviewStatus}
              canManageScores={canManageScores}
              submitting={submittingGradeReview}
              recalling={recallingGradeReview}
              onSubmit={() => void handleSubmitGradeReview()}
              onRecall={() => void handleRecallGradeReview()}
            />
          </div>
        )}
        {canComplete && !isOnline && (
          <Tooltip
            title={
              courseStatus !== 'FINISHED'
                ? 'Chỉ xét hoàn thành sau khi khóa học kết thúc.'
                : gradeReviewStatus?.status !== 'APPROVED'
                ? 'Cần bảng điểm được Quản trị viên phê duyệt trước khi xét hoàn thành.'
                : undefined
            }
          >
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={courseStatus !== 'FINISHED' || gradeReviewStatus?.status !== 'APPROVED'}
              onClick={() => void openCompletionModal()}
            >
              {selectedCompleteIds.length > 0 ? `Xét hoàn thành (${selectedCompleteIds.length})` : 'Xét hoàn thành khóa học'}
            </Button>
          </Tooltip>
        )}
        {canExportRoster && (
          <Button icon={<DownloadOutlined />} loading={exportingRoster} onClick={() => void exportRoster()}>
            Xuất Excel
          </Button>
        )}
        {canManageScores && !isOnline && (
          <Tooltip
            title={
              gradeReviewStatus?.status === 'APPROVED'
                ? 'Bảng điểm đã được duyệt & công bố, không thể nhập lại'
                : gradeReviewStatus?.status === 'PENDING_APPROVAL'
                  ? 'Bảng điểm đang chờ duyệt — thu hồi để chỉnh sửa'
                  : !scoreEntryAllowed
                    ? scoreEntryBlockedReason
                    : undefined
            }
          >
            <Upload
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              showUploadList={false}
              disabled={gradeReviewStatus?.status === 'APPROVED' || gradeReviewStatus?.status === 'PENDING_APPROVAL' || !scoreEntryAllowed}
              beforeUpload={(file) => { void importScores(file); return false; }}
            >
              <Button loading={importingScores} icon={<FileExcelOutlined />} disabled={gradeReviewStatus?.status === 'APPROVED' || gradeReviewStatus?.status === 'PENDING_APPROVAL' || !scoreEntryAllowed}>Nhập bảng điểm</Button>
            </Upload>
          </Tooltip>
        )}
        <Button onClick={() => void loadEnrollments()}>Tải lại</Button>
      </div>
      <Table
        rowKey="enrollmentId"
        rowClassName={(record) => (highlightId && record.enrollmentId === highlightId ? 'highlight-enrollment-row' : '')}
        columns={columns}
        dataSource={rows}
        loading={loading}
        rowSelection={canComplete && !isOnline ? {
          selectedRowKeys: selectedCompleteIds,
          preserveSelectedRowKeys: true,
          onChange: (keys) => setSelectedCompleteIds(keys as number[]),
          getCheckboxProps: (row) => ({
            disabled: !row.completionEligible || completing
              || (selectedCompleteIds.length >= 100 && !selectedCompleteIds.includes(row.enrollmentId)),
            title: row.completionBlockedReason || undefined,
          }),
        } : undefined}
        locale={{
          emptyText: (
            <Text type="secondary">
              {isOnline ? 'Chưa có người mua khóa học này' : 'Khóa học chưa có học viên ghi danh'}
            </Text>
          ),
        }}
        pagination={{
          current: pageNumber + 1,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (page, size) => {
            setPageNumber(page - 1);
            setPageSize(size);
          },
        }}
        scroll={{ x: isOnline ? 1000 : 1150 }}
      />

      <Modal
        title="Thông tin học viên"
        open={detailOpen}
        width={640}
        footer={<Button onClick={() => setDetailOpen(false)}>Đóng</Button>}
        onCancel={() => setDetailOpen(false)}
      >
        {selectedEnrollment && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã ghi danh">#{selectedEnrollment.enrollmentId}</Descriptions.Item>
              <Descriptions.Item label="Hình thức">
                <Tag color={selectedEnrollment.enrollmentType === 'ONLINE' ? 'blue' : 'green'}>
                  {selectedEnrollment.enrollmentType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={isOnline ? 'Người mua' : 'Học viên'} span={2}>
                {selectedEnrollment.studentName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Mã học viên">{selectedEnrollment.studentCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{selectedEnrollment.studentPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>{selectedEnrollment.studentEmail || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khóa học" span={2}>
                {selectedEnrollment.courseTitle || `#${selectedEnrollment.courseId}`}
              </Descriptions.Item>
              <Descriptions.Item label={isOnline ? 'Ngày mua' : 'Ngày ghi danh'}>
                {selectedEnrollment.enrolledAt ? dayjs(selectedEnrollment.enrolledAt).format('DD/MM/YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {selectedEnrollment.status === 'COMPLETED' && selectedEnrollment.completionResult
                  ? <Tag color="purple">Hoàn thành ({selectedEnrollment.completionResult === 'PASSED' ? 'Đạt' : 'Không đạt'})</Tag>
                  : <EnrollmentStatusTag status={selectedEnrollment.status} />}
              </Descriptions.Item>
              {!isOnline && (
                <Descriptions.Item label="Điểm cuối khóa">
                  {selectedEnrollment.finalScore ?? 'Chưa cập nhật'}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Hóa đơn" span={2}>
                {selectedEnrollment.invoiceCode || (selectedEnrollment.invoiceId ? `#${selectedEnrollment.invoiceId}` : '—')}
              </Descriptions.Item>
              {selectedEnrollment.status === 'RESERVED' && (
                <Descriptions.Item label="Thời gian bảo lưu" span={2}>
                  {selectedEnrollment.holdStartDate ? dayjs(selectedEnrollment.holdStartDate).format('DD/MM/YYYY') : '—'}
                  {' → '}
                  {selectedEnrollment.holdEndDate ? dayjs(selectedEnrollment.holdEndDate).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
              )}
              {selectedEnrollment.holdReason && (
                <Descriptions.Item label="Lý do bảo lưu" span={2}>{selectedEnrollment.holdReason}</Descriptions.Item>
              )}
              {selectedEnrollment.terminationReason && (
                <Descriptions.Item label="Lý do kết thúc" span={2}>{selectedEnrollment.terminationReason}</Descriptions.Item>
              )}
            </Descriptions>
            <Divider />
            <Button icon={<HistoryOutlined />} loading={historyLoading} onClick={() => void openHistory()}>
              Lịch sử thay đổi ghi danh
            </Button>
          </>
        )}
      </Modal>

      <Modal
        title="Lịch sử thay đổi ghi danh"
        open={historyOpen}
        loading={historyLoading}
        footer={<Button onClick={() => setHistoryOpen(false)}>Đóng</Button>}
        onCancel={() => setHistoryOpen(false)}
      >
        {history.length ? history.map((item) => (
          <div key={item.id} className="border-b py-2">
            <Tag>{item.oldStatus ? ENROLLMENT_STATUS_LABEL[item.oldStatus] : 'Mới'}</Tag>
            {' → '}
            <EnrollmentStatusTag status={item.newStatus} />
            {item.reason && <div>{item.reason}</div>}
            <Text type="secondary">{dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}</Text>
          </div>
        )) : <Text type="secondary">Chưa có lịch sử thay đổi ghi danh</Text>}
      </Modal>

      <Modal
        title="Chỉnh sửa ghi danh"
        open={editOpen}
        confirmLoading={saving}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        onCancel={() => { setEditOpen(false); setSelectedEnrollment(null); form.resetFields(); }}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        {selectedEnrollment && (
          <Descriptions className="mb-4" bordered size="small" column={2}>
            <Descriptions.Item label="Học viên">{selectedEnrollment.studentName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Mã học viên">{selectedEnrollment.studentCode || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedEnrollment.studentEmail || '—'}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{selectedEnrollment.studentPhone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái hiện tại">
              {selectedEnrollment.status === 'COMPLETED' && selectedEnrollment.completionResult
                ? <Tag color="purple">Hoàn thành ({selectedEnrollment.completionResult === 'PASSED' ? 'Đạt' : 'Không đạt'})</Tag>
                : <EnrollmentStatusTag status={selectedEnrollment.status} />}
            </Descriptions.Item>
          </Descriptions>
        )}
        <Form form={form} layout="vertical" onFinish={(values) => void saveEdit(values)}>
          <Form.Item name="editAction" label="Cập nhật trạng thái" rules={[{ required: true }]}>
            <Select options={[
              { value: 'reserve', label: 'Bảo lưu học viên', disabled: selectedEnrollment?.status !== 'ACTIVE' },
              { value: 'resume', label: 'Cho học viên quay lại học', disabled: selectedEnrollment?.status !== 'RESERVED' },
              { value: 'terminate', label: 'Chấm dứt ghi danh' },
            ]} onChange={() => form.setFieldValue('reason', undefined)} />
          </Form.Item>
          {editAction === 'reserve' && <>
            <Form.Item name="startDate" label="Bảo lưu từ ngày" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label="Bảo lưu đến ngày" rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          </>}
          {(editAction === 'reserve' || editAction === 'terminate') && (
            <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do' }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
          {editAction === 'resume' && <Alert type="info" showIcon message="Học viên sẽ chuyển từ Bảo lưu sang Đang học." />}
          {editAction === 'terminate' && <Alert type="warning" showIcon message="Ghi danh sẽ chuyển sang Bỏ học và không thể tiếp tục học." />}
          {selectedEnrollment?.status === 'PENDING' && <Alert className="mt-3" type="info" showIcon message="PENDING tự chuyển sang Đang học vào ngày khai giảng." />}
        </Form>
      </Modal>

      <Modal
        title="Cập nhật điểm cuối khóa"
        open={scoreOpen}
        confirmLoading={scoreSaving}
        okText="Lưu điểm"
        cancelText="Hủy"
        onCancel={() => { setScoreOpen(false); setSelectedEnrollment(null); scoreForm.resetFields(); }}
        onOk={() => scoreForm.submit()}
        destroyOnHidden
      >
        {selectedEnrollment && <Alert
          className="mb-4"
          type="info"
          showIcon
          message={selectedEnrollment.studentName || `Ghi danh #${selectedEnrollment.enrollmentId}`}
          description={`Điểm từ 0 đến ${maxScore}, tối đa 2 chữ số thập phân.`}
        />}
        <Form form={scoreForm} layout="vertical" onFinish={(values: { finalScore: number }) => void saveScore(values)}>
          <Form.Item
            name="finalScore"
            label="Điểm cuối khóa"
            rules={[{ required: true, message: 'Nhập điểm cuối khóa' }]}
          >
            <InputNumber min={0} max={maxScore} step={0.1} precision={2} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      <ReopenCompletionModal
        open={reopenOpen}
        studentName={selectedEnrollment?.studentName || (selectedEnrollment ? `Ghi danh #${selectedEnrollment.enrollmentId}` : undefined)}
        loading={reopening}
        onCancel={() => { setReopenOpen(false); setSelectedEnrollment(null); }}
        onSubmit={saveReopenCompletion}
      />

      <Modal
        title="Kết quả nhập bảng điểm"
        open={Boolean(importResult)}
        footer={<Button type="primary" onClick={() => setImportResult(null)}>Đóng</Button>}
        onCancel={() => setImportResult(null)}
        width={720}
      >
        {importResult && <>
          <Alert
            type={importResult.issues.length ? 'warning' : 'success'}
            showIcon
            message={`Đã cập nhật ${importResult.updated} học viên; bỏ qua ${importResult.skipped} dòng trống.`}
            description={importResult.issues.length ? `${importResult.issues.length} dòng cần kiểm tra bên dưới.` : 'Không phát hiện dòng lỗi.'}
            className="mb-4"
          />
          {importResult.issues.length > 0 && <Table
            size="small"
            rowKey={(issue: { row: number; enrollmentId: number | null }) => `${issue.row}-${issue.enrollmentId ?? 'unknown'}`}
            pagination={{ pageSize: 8 }}
            dataSource={importResult.issues}
            columns={[
              { title: 'Dòng Excel', dataIndex: 'row', width: 100, render: (row: number) => row === 0 ? 'Thiếu dòng' : row },
              { title: 'Mã ghi danh', dataIndex: 'enrollmentId', width: 130, render: (id) => id ?? '—' },
              { title: 'Cảnh báo', dataIndex: 'message' },
            ]}
          />}
        </>}
      </Modal>
      <AutoCompletionModal
        open={completionModalOpen}
        analyzing={analyzingCompletion}
        completing={completing}
        minPassScore={minPassScore}
        maxAbsencePercent={maxAbsencePercent}
        students={classifiedStudents}
        selectedPassIds={selectedPassIds}
        selectedFailIds={selectedFailIds}
        onCancel={() => setCompletionModalOpen(false)}
        onConfirm={() => void handleConfirmAutoCompletion()}
        onSelectedPassIdsChange={setSelectedPassIds}
        onSelectedFailIdsChange={setSelectedFailIds}
      />
    </Space>
  );
}
