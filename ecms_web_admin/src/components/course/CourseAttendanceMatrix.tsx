import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Badge, Button, Drawer, Empty, Input, Modal, Progress, Radio,
  Segmented, Select, Space, Table, Tag, Tooltip, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  TableOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { enrollmentApi } from '@/services/api/enrollment';
import { requestApi } from '@/services/api/request/requestApi';
import { showError } from '@/utils/errorHelper';
import type {
  AttendanceMatrixResponse,
  AttendanceMatrixSession,
  AttendanceMatrixStudent,
  AttendanceStatus,
} from '@/services/types/enrollment';
import SessionAttendanceEditor, { ATTENDANCE_STATUS_COLOR, ATTENDANCE_STATUS_LABEL } from './SessionAttendanceEditor';

const { Text } = Typography;

const SHORT_LABEL: Record<AttendanceStatus, string> = {
  NOT_MARKED: '—',
  PRESENT: 'Có',
  ABSENT: 'Vắng',
  EXCUSED: 'Phép',
};

const statusOptions = Object.entries(ATTENDANCE_STATUS_LABEL)
  .map(([value, label]) => ({ value: value as AttendanceStatus, label }));

const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  CANCELLED: 'Đã hủy',
};

const LEAVE_STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'default',
};

interface CourseAttendanceMatrixProps {
  courseId: number;
  mode?: 'admin' | 'instructor';
}

interface ActiveCell {
  session: AttendanceMatrixSession;
  student: AttendanceMatrixStudent;
  status: AttendanceStatus;
  note: string;
  leaveRequestId?: number | null;
  leaveRequestStatus?: string | null;
  leaveRequestReason?: string | null;
}

/** Ma trận học viên × buổi học với 2 chế độ xem: Theo học viên (tiện theo dõi) & Ma trận tổng thể */
export default function CourseAttendanceMatrix({ courseId, mode = 'admin' }: CourseAttendanceMatrixProps) {
  const [matrix, setMatrix] = useState<AttendanceMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingCell, setSavingCell] = useState(false);
  const [search, setSearch] = useState('');
  const [editorSession, setEditorSession] = useState<AttendanceMatrixSession | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [leaveActionLoading, setLeaveActionLoading] = useState<number | null>(null);
  const [rejectLeaveId, setRejectLeaveId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Chế độ xem & Drawer học viên ──
  const [viewMode, setViewMode] = useState<'students' | 'matrix'>('students');
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<AttendanceMatrixStudent | null>(null);
  const [drawerFilter, setDrawerFilter] = useState<'all' | 'absent' | 'present'>('all');

  // ── Phân cụm buổi học (Cách 1) ──
  const CHUNK_SIZE = 10;
  const totalSessions = matrix?.sessions?.length ?? 0;
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number>(0);

  const sessionChunks = useMemo(() => {
    const sessions = matrix?.sessions ?? [];
    if (sessions.length === 0) return [];

    const chunks: { label: string; startIndex: number; endIndex: number; sessions: AttendanceMatrixSession[] }[] = [];
    for (let i = 0; i < sessions.length; i += CHUNK_SIZE) {
      const slice = sessions.slice(i, i + CHUNK_SIZE);
      const startNum = slice[0].sessionNumber;
      const endNum = slice[slice.length - 1].sessionNumber;
      chunks.push({
        label: `Buổi ${startNum} - ${endNum}`,
        startIndex: i,
        endIndex: i + slice.length,
        sessions: slice,
      });
    }
    return chunks;
  }, [matrix]);

  const activeSessions = useMemo(() => {
    if (!matrix) return [];
    if (selectedChunkIndex === -1) {
      return matrix.sessions;
    }
    return sessionChunks[selectedChunkIndex]?.sessions ?? matrix.sessions.slice(0, CHUNK_SIZE);
  }, [matrix, selectedChunkIndex, sessionChunks]);

  const readOnly = mode === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMatrix(await enrollmentApi.courseAttendanceMatrix(courseId));
    } catch (err) {
      showError(err, 'Không tải được ma trận điểm danh');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  const students = useMemo(() => {
    const rows = matrix?.students ?? [];
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.studentName ?? ''} ${row.studentCode ?? ''} ${row.email ?? ''}`
        .toLocaleLowerCase().includes(query));
  }, [matrix, search]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await enrollmentApi.exportCourseAttendance(courseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diem-danh-khoa-${courseId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã tải ma trận điểm danh');
    } catch (err) {
      showError(err, 'Không xuất được file Excel điểm danh');
    } finally {
      setExporting(false);
    }
  };

  const openCell = (
    session: AttendanceMatrixSession,
    student: AttendanceMatrixStudent,
  ) => {
    const cell = student.cells[String(session.sessionId)];
    setActiveCell({
      session,
      student,
      status: cell?.status ?? 'NOT_MARKED',
      note: cell?.note ?? '',
      leaveRequestId: cell?.leaveRequestId ?? null,
      leaveRequestStatus: cell?.leaveRequestStatus ?? null,
      leaveRequestReason: cell?.leaveRequestReason ?? null,
    });
  };

  const saveCell = async () => {
    if (!activeCell) return;
    setSavingCell(true);
    try {
      await enrollmentApi.saveSessionAttendance(courseId, activeCell.session.sessionId, [{
        enrollmentId: activeCell.student.enrollmentId,
        status: activeCell.status,
        note: activeCell.note.trim() || null,
      }]);
      setActiveCell(null);
      toast.success('Đã lưu điểm danh học viên');
      await load();
    } catch (err) {
      showError(err, 'Không lưu được điểm danh học viên');
    } finally {
      setSavingCell(false);
    }
  };

  /**
   * Duyệt/từ chối đơn nghỉ ngay tại ô điểm danh của từng học viên.
   * Backend LeaveFeedbackHandler tự đổi attendance: duyệt → EXCUSED, từ chối → ABSENT.
   */
  const reviewLeave = async (requestId: number, approved: boolean, note?: string) => {
    setLeaveActionLoading(requestId);
    try {
      await requestApi.review(requestId, approved ? { approved: true } : { approved: false, note });
      setActiveCell(null);
      setRejectLeaveId(null);
      setRejectReason('');
      toast.success(approved
        ? 'Đã duyệt đơn nghỉ · Trạng thái: Vắng có phép'
        : 'Đã từ chối đơn nghỉ · Trạng thái: Vắng');
      await load();
    } catch (err) {
      showError(err, approved ? 'Không thể duyệt đơn nghỉ' : 'Không thể từ chối đơn nghỉ');
    } finally {
      setLeaveActionLoading(null);
    }
  };

  // ══════════════════════════════════════════════════════════
  // COLUMNS: Chế độ "Theo học viên" (Student-centric)
  // ══════════════════════════════════════════════════════════
  const studentViewColumns: ColumnsType<AttendanceMatrixStudent> = [
    {
      title: 'Mã HV',
      dataIndex: 'studentCode',
      width: 130,
      render: (code: string | null) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {code || '—'}
        </span>
      ),
    },
    {
      title: 'Học viên',
      dataIndex: 'studentName',
      width: 220,
      render: (name: string | null, row) => (
        <div>
          <button
            type="button"
            className="text-left font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block"
            onClick={() => setSelectedStudentForDrawer(row)}
          >
            {name || `Ghi danh #${row.enrollmentId}`}
          </button>
          {row.email && (
            <div className="text-xs text-slate-400 truncate max-w-[200px]" title={row.email}>
              {row.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thống kê buổi học',
      width: 280,
      render: (_, row) => (
        <Space size={4} wrap>
          <Tooltip title="Số buổi có mặt">
            <Tag color="green" className="!mr-1">
              Có mặt: <strong>{row.summary.present}</strong>
            </Tag>
          </Tooltip>
          <Tooltip title="Số buổi vắng không phép">
            <Tag color={row.summary.absent > 0 ? 'red' : 'default'} className="!mr-1">
              Vắng: <strong>{row.summary.absent}</strong>
            </Tag>
          </Tooltip>
          <Tooltip title="Số buổi vắng có phép">
            <Tag color={row.summary.excused > 0 ? 'blue' : 'default'} className="!mr-1">
              Phép: <strong>{row.summary.excused}</strong>
            </Tag>
          </Tooltip>
          {row.summary.notMarked > 0 && (
            <Tooltip title="Buổi đã diễn ra nhưng chưa điểm danh">
              <Tag color="orange" className="!mr-1">
                Chưa ĐD: <strong>{row.summary.notMarked}</strong>
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Tiến độ tham gia',
      width: 170,
      render: (_, row) => {
        const conducted = matrix?.conductedSessions ?? 0;
        const presentCount = row.summary.present;
        const percent = conducted > 0 ? Math.min(100, Math.round((presentCount / conducted) * 100)) : 100;
        return (
          <div className="w-full">
            <div className="flex justify-between text-xs text-slate-500 mb-0.5">
              <span>{presentCount} / {conducted} buổi đã học</span>
              <span className="font-medium text-slate-700">{percent}%</span>
            </div>
            <Progress
              percent={percent}
              size="small"
              showInfo={false}
              status={percent < 80 ? 'exception' : 'success'}
            />
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      width: 140,
      align: 'center',
      render: (_, row) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedStudentForDrawer(row)}
        >
          Lịch sử buổi
        </Button>
      ),
    },
  ];

  // ══════════════════════════════════════════════════════════
  // COLUMNS: Chế độ "Ma trận tổng thể" (Matrix Grid)
  // ══════════════════════════════════════════════════════════
  const isAllSessions = selectedChunkIndex === -1;
  const matrixColumns: ColumnsType<AttendanceMatrixStudent> = [
    {
      title: 'Mã HV', dataIndex: 'studentCode', width: 120, fixed: isAllSessions ? 'left' : undefined,
      render: (value: string | null) => <Text>{value || '—'}</Text>,
    },
    {
      title: 'Học viên', dataIndex: 'studentName', width: 200, fixed: isAllSessions ? 'left' : undefined,
      render: (name: string | null, row) => (
        <div>
          <button
            type="button"
            className="text-left font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block"
            onClick={() => setSelectedStudentForDrawer(row)}
          >
            {name || `Ghi danh #${row.enrollmentId}`}
          </button>
          {row.email && <div><Text type="secondary" className="text-xs">{row.email}</Text></div>}
        </div>
      ),
    },
    ...activeSessions.map((session) => ({
      title: (
        <div className="text-center leading-tight">
          <div>Buổi {session.sessionNumber}</div>
          <div className="text-xs font-normal">
            {session.sessionDate ? dayjs(session.sessionDate).format('DD/MM') : ''}
          </div>
          <Tooltip title="Xem điểm danh & đơn nghỉ phép của buổi">
            <Button type="link" size="small" onClick={() => setEditorSession(session)}>Chi tiết</Button>
          </Tooltip>
          {!readOnly && (
            session.editable ? (
              <Text type="secondary" className="text-xs">Chọn ô để điểm danh</Text>
            ) : (
              <Tooltip title={session.lockReason || 'Buổi học đã khóa'}>
                <Text type="secondary" className="text-xs">Đã khóa</Text>
              </Tooltip>
            )
          )}
        </div>
      ),
      key: `session-${session.sessionId}`,
      width: 95,
      align: 'center' as const,
      render: (_: unknown, row: AttendanceMatrixStudent) => {
        const cell = row.cells[String(session.sessionId)];
        if (!cell) return <Text type="secondary">–</Text>;
        const plainTag = <Tag color={ATTENDANCE_STATUS_COLOR[cell.status]}>{SHORT_LABEL[cell.status]}</Tag>;
        const hasPendingLeave = cell.leaveRequestStatus === 'PENDING';
        const tag = hasPendingLeave
          ? <Badge dot color="orange" offset={[-2, 2]}>{plainTag}</Badge>
          : plainTag;
        const tooltip = [
          hasPendingLeave ? 'Có đơn xin nghỉ chờ duyệt — bấm để xử lý' : null,
          cell.note || null,
          !readOnly
            ? (session.editable ? 'Bấm để cập nhật' : (session.lockReason || 'Buổi học đã khóa'))
            : null,
        ].filter(Boolean).join(' · ');
        if (readOnly) return <Tooltip title={tooltip || undefined}>{tag}</Tooltip>;
        return (
          <Tooltip title={tooltip}>
            <Button
              type="text"
              disabled={!session.editable}
              className="!h-auto !p-0"
              onClick={() => openCell(session, row)}
              aria-label={`Điểm danh ${row.studentName ?? row.enrollmentId}, buổi ${session.sessionNumber}`}
            >
              {tag}
            </Button>
          </Tooltip>
        );
      },
    })),
    ...(!isAllSessions ? [{
      title: '',
      key: '_filler',
      render: () => null,
    }] : []),
  ];

  // ══════════════════════════════════════════════════════════
  // DRAWER SESSIONS: Lịch sử các buổi của học viên được chọn
  // ══════════════════════════════════════════════════════════
  const studentSessions = useMemo(() => {
    if (!selectedStudentForDrawer || !matrix) return [];
    const list = matrix.sessions.map((session) => {
      const cell = selectedStudentForDrawer.cells[String(session.sessionId)];
      return {
        session,
        status: (cell?.status ?? 'NOT_MARKED') as AttendanceStatus,
        note: cell?.note || null,
      };
    });

    if (drawerFilter === 'absent') {
      return list.filter((item) => item.status === 'ABSENT' || item.status === 'EXCUSED');
    }
    if (drawerFilter === 'present') {
      return list.filter((item) => item.status === 'PRESENT');
    }
    return list;
  }, [selectedStudentForDrawer, matrix, drawerFilter]);

  if (!matrix && loading) return <Table loading columns={[]} dataSource={[]} />;
  if (matrix && matrix.sessions.length === 0) {
    return <Empty className="my-12" description="Khóa học chưa có buổi học nào để điểm danh." />;
  }

  return (
    <div>
      {/* ── Thanh công cụ & Chuyển đổi chế độ xem ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={viewMode}
          onChange={(val) => setViewMode(val as 'students' | 'matrix')}
          options={[
            {
              label: 'Theo học viên',
              value: 'students',
              icon: <UserOutlined />,
            },
            {
              label: 'Tổng thể',
              value: 'matrix',
              icon: <TableOutlined />,
            },
          ]}
        />

        <Space wrap>
          <Input.Search
            allowClear
            className="w-60"
            placeholder="Tìm tên, mã hoặc email"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Làm mới</Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={() => void exportExcel()}>
            Xuất Excel
          </Button>
        </Space>
      </div>

      {/* ── Thanh chọn nhóm buổi học (Phân cụm 10 buổi) ── */}
      {viewMode === 'matrix' && sessionChunks.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Nhóm buổi học:</span>
            <Radio.Group
              size="small"
              value={selectedChunkIndex}
              onChange={(e) => setSelectedChunkIndex(e.target.value)}
              buttonStyle="solid"
            >
              {sessionChunks.map((chunk, idx) => (
                <Radio.Button key={idx} value={idx}>
                  {chunk.label}
                </Radio.Button>
              ))}
              <Radio.Button value={-1}>
                Tất cả ({totalSessions} buổi)
              </Radio.Button>
            </Radio.Group>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="small"
              disabled={selectedChunkIndex <= 0}
              onClick={() => setSelectedChunkIndex((prev) => Math.max(0, prev - 1))}
            >
              ← Nhóm trước
            </Button>
            <Button
              size="small"
              disabled={selectedChunkIndex === -1 || selectedChunkIndex >= sessionChunks.length - 1}
              onClick={() => setSelectedChunkIndex((prev) => Math.min(sessionChunks.length - 1, prev + 1))}
            >
              Nhóm sau →
            </Button>
          </div>
        </div>
      )}

      {/* ── Bảng hiển thị theo chế độ ── */}
      {viewMode === 'students' ? (
        <Table
          rowKey="enrollmentId"
          size="middle"
          loading={loading}
          columns={studentViewColumns}
          dataSource={students}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          locale={{ emptyText: 'Không có học viên phù hợp.' }}
        />
      ) : (
        <Table
          tableLayout="fixed"
          rowKey="enrollmentId"
          size="small"
          loading={loading}
          columns={matrixColumns}
          dataSource={students}
          pagination={{ pageSize: 30, showSizeChanger: true }}
          scroll={isAllSessions ? { x: 320 + (matrix?.sessions.length ?? 0) * 105, y: 560 } : undefined}
          locale={{ emptyText: 'Không có học viên phù hợp.' }}
        />
      )}

      {/* ── Drawer: Xem lịch sử điểm danh chi tiết của 1 học viên ── */}
      <Drawer
        title={
          selectedStudentForDrawer && (
            <div>
              <div className="text-base font-bold text-slate-800">
                {selectedStudentForDrawer.studentName || `Ghi danh #${selectedStudentForDrawer.enrollmentId}`}
              </div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">
                Mã: {selectedStudentForDrawer.studentCode || '—'} {selectedStudentForDrawer.email ? `· ${selectedStudentForDrawer.email}` : ''}
              </div>
            </div>
          )
        }
        width={580}
        open={Boolean(selectedStudentForDrawer)}
        onClose={() => {
          setSelectedStudentForDrawer(null);
          setDrawerFilter('all');
        }}
      >
        {selectedStudentForDrawer && (
          <div className="space-y-4">
            {/* Thống kê chuyên cần của học viên */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs text-slate-400">Có mặt</div>
                <div className="text-lg font-bold text-emerald-600">{selectedStudentForDrawer.summary.present}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Vắng k.phép</div>
                <div className="text-lg font-bold text-red-600">{selectedStudentForDrawer.summary.absent}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Có phép</div>
                <div className="text-lg font-bold text-blue-600">{selectedStudentForDrawer.summary.excused}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Chưa điểm danh</div>
                <div className="text-lg font-bold text-amber-500">{selectedStudentForDrawer.summary.notMarked}</div>
              </div>
            </div>

            {/* Filter nhanh các buổi trong Drawer */}
            <div className="flex justify-between items-center pt-2">
              <span className="font-semibold text-slate-700">Chi tiết từng buổi học ({studentSessions.length})</span>
              <Radio.Group
                size="small"
                value={drawerFilter}
                onChange={(e) => setDrawerFilter(e.target.value)}
              >
                <Radio.Button value="all">Tất cả</Radio.Button>
                <Radio.Button value="absent">Chỉ buổi vắng</Radio.Button>
                <Radio.Button value="present">Có mặt</Radio.Button>
              </Radio.Group>
            </div>

            {/* Danh sách từng buổi */}
            <Table
              size="small"
              rowKey={(r) => r.session.sessionId}
              pagination={false}
              dataSource={studentSessions}
              columns={[
                {
                  title: 'Buổi',
                  width: 80,
                  render: (_, r) => <span className="font-semibold">Buổi {r.session.sessionNumber}</span>,
                },
                {
                  title: 'Thời gian',
                  width: 140,
                  render: (_, r) => (
                    <div>
                      <div className="text-xs font-medium text-slate-700">
                        {r.session.sessionDate ? dayjs(r.session.sessionDate).format('DD/MM/YYYY') : 'Chưa có ngày'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.session.startTime && r.session.endTime ? `${r.session.startTime} - ${r.session.endTime}` : ''}
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Trạng thái',
                  width: 120,
                  render: (_, r) => (
                    <Tag color={ATTENDANCE_STATUS_COLOR[r.status]}>
                      {ATTENDANCE_STATUS_LABEL[r.status]}
                    </Tag>
                  ),
                },
                {
                  title: 'Ghi chú',
                  render: (_, r) => (
                    <span className="text-xs text-slate-600">
                      {r.note || '—'}
                    </span>
                  ),
                },
              ]}
              locale={{ emptyText: 'Không có buổi học nào thỏa điều kiện.' }}
            />
          </div>
        )}
      </Drawer>

      <SessionAttendanceEditor
        open={Boolean(editorSession)}
        courseId={courseId}
        session={editorSession}
        readOnly={readOnly}
        onClose={() => setEditorSession(null)}
        onSaved={() => void load()}
      />

      <Modal
        open={Boolean(activeCell)}
        title={activeCell
          ? `Điểm danh · ${activeCell.student.studentName || `Ghi danh #${activeCell.student.enrollmentId}`} · Buổi ${activeCell.session.sessionNumber}`
          : 'Điểm danh học viên'}
        onCancel={() => setActiveCell(null)}
        onOk={() => void saveCell()}
        okText="Lưu điểm danh"
        cancelText="Hủy"
        confirmLoading={savingCell}
        destroyOnHidden
      >
        {activeCell && <Space direction="vertical" className="w-full" size="middle">
          <Text type="secondary">
            {activeCell.session.title} · {activeCell.session.sessionDate
              ? dayjs(activeCell.session.sessionDate).format('DD/MM/YYYY') : 'Chưa có ngày'}
          </Text>
          {activeCell.leaveRequestId != null && (
            <Alert
              showIcon
              type={activeCell.leaveRequestStatus === 'PENDING' ? 'warning' : 'info'}
              message={
                <Space size={8}>
                  <Text strong>Đơn xin nghỉ phép</Text>
                  <Tag color={LEAVE_STATUS_COLOR[activeCell.leaveRequestStatus ?? ''] ?? 'default'}>
                    {LEAVE_STATUS_LABEL[activeCell.leaveRequestStatus ?? ''] ?? activeCell.leaveRequestStatus}
                  </Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={6}>
                  {activeCell.leaveRequestReason && (
                    <Text type="secondary">{activeCell.leaveRequestReason}</Text>
                  )}
                  {activeCell.leaveRequestStatus === 'PENDING' && !readOnly && (
                    <Space size={8} wrap>
                      <Button
                        size="small"
                        type="primary"
                        loading={leaveActionLoading === activeCell.leaveRequestId}
                        onClick={() => void reviewLeave(activeCell.leaveRequestId!, true)}
                      >Duyệt · Vắng có phép</Button>
                      <Button
                        size="small"
                        danger
                        disabled={leaveActionLoading != null}
                        onClick={() => {
                          setRejectLeaveId(activeCell.leaveRequestId!);
                          setRejectReason('');
                        }}
                      >Từ chối · Vắng</Button>
                    </Space>
                  )}
                  {activeCell.leaveRequestStatus === 'PENDING' && readOnly && (
                    <Text type="secondary">Chỉ giảng viên phụ trách buổi học mới được xử lý đơn này.</Text>
                  )}
                </Space>
              }
            />
          )}
          <div>
            <Text strong className="mb-1 block">Trạng thái</Text>
            <Select
              className="w-full"
              value={activeCell.status}
              options={statusOptions}
              onChange={(status: AttendanceStatus) => setActiveCell((current) => current
                ? { ...current, status } : current)}
            />
          </div>
          <div>
            <Text strong className="mb-1 block">Ghi chú / lý do (nếu có)</Text>
            <Input.TextArea
              value={activeCell.note}
              maxLength={2000}
              showCount
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="Ví dụ: đến muộn 15 phút, nghỉ có phép..."
              onChange={(event) => setActiveCell((current) => current
                ? { ...current, note: event.target.value } : current)}
            />
          </div>
        </Space>}
      </Modal>

      {/* Modal từ chối đơn nghỉ: từ chối → attendance = ABSENT */}
      <Modal
        open={rejectLeaveId != null}
        title="Từ chối đơn xin nghỉ phép"
        onCancel={() => { setRejectLeaveId(null); setRejectReason(''); }}
        onOk={() => {
          if (rejectLeaveId != null) void reviewLeave(rejectLeaveId, false, rejectReason.trim());
        }}
        okText="Xác nhận từ chối · Vắng"
        okButtonProps={{ danger: true, loading: leaveActionLoading === rejectLeaveId, disabled: !rejectReason.trim() }}
        cancelText="Hủy"
      >
        <Text type="secondary" className="mb-2 block">
          Học viên sẽ bị điểm danh là <Text strong>Vắng</Text> (không tính vắng có phép).
        </Text>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          maxLength={2000}
          placeholder="Nhập lý do từ chối (bắt buộc)..."
          onChange={(event) => setRejectReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
