import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Empty, Input, Modal, Select, Space, Table, Tag, Timeline, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { enrollmentApi } from '@/services/api/enrollment';
import { requestApi } from '@/services/api/request/requestApi';
import { showError } from '@/utils/errorHelper';
import type {
  AttendanceAuditLogResponse,
  AttendanceMatrixSession,
  AttendanceRecordResponse,
  AttendanceStatus,
  SessionAttendanceResponse,
} from '@/services/types/enrollment';

const { Text } = Typography;

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  NOT_MARKED: 'Chưa điểm danh',
  PRESENT: 'Có mặt',
  ABSENT: 'Vắng',
  EXCUSED: 'Vắng có phép',
};

export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  NOT_MARKED: 'default',
  PRESENT: 'green',
  ABSENT: 'red',
  EXCUSED: 'blue',
};

const statusOptions = Object.entries(ATTENDANCE_STATUS_LABEL)
  .map(([value, label]) => ({ value: value as AttendanceStatus, label }));

const baselineOf = (records: AttendanceRecordResponse[]): Record<number, AttendanceStatus> =>
  records.reduce<Record<number, AttendanceStatus>>((acc, record) => {
    acc[record.enrollmentId] = record.status;
    return acc;
  }, {});

const statusLabelOf = (value: unknown): string => {
  const key = String(value ?? '') as AttendanceStatus;
  return ATTENDANCE_STATUS_LABEL[key] ?? (value != null ? String(value) : '—');
};

interface SessionAttendanceEditorProps {
  open: boolean;
  courseId: number;
  session: AttendanceMatrixSession | null;
  readOnly?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

/** Modal sửa điểm danh một buổi, dùng lại API session attendance + audit history. */
export default function SessionAttendanceEditor({
  open, courseId, session, readOnly = false, onClose, onSaved,
}: SessionAttendanceEditorProps) {
  const [attendance, setAttendance] = useState<SessionAttendanceResponse | null>(null);
  const [baseline, setBaseline] = useState<Record<number, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<AttendanceAuditLogResponse[]>([]);
  const [rejectLeaveId, setRejectLeaveId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!open || !session) return;
    let active = true;
    setLoading(true);
    setAttendance(null);
    setDirty(false);
    setSearch('');
    enrollmentApi.sessionAttendance(courseId, session.sessionId).then((result) => {
      if (active) {
        setAttendance(result);
        setBaseline(baselineOf(result.records));
      }
    }).catch((err) => {
      if (active) showError(err, 'Không tải được danh sách điểm danh');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [open, courseId, session]);

  const editable = Boolean(attendance?.editable);
  const records = attendance?.records ?? [];

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      `${record.studentName ?? ''} ${record.studentCode ?? ''}`.toLocaleLowerCase().includes(query));
  }, [records, search]);

  const unmarked = records.filter((record) => record.status === 'NOT_MARKED').length;

  const updateRecord = (enrollmentId: number, update: Partial<AttendanceRecordResponse>) => {
    setAttendance((current) => current ? ({
      ...current,
      records: current.records.map((record) => record.enrollmentId === enrollmentId
        ? { ...record, ...update } : record),
    }) : current);
    setDirty(true);
  };

  const persistSave = async () => {
    if (!attendance) return;
    setSaving(true);
    try {
      const saved = await enrollmentApi.saveSessionAttendance(
        attendance.courseId,
        attendance.sessionId,
        attendance.records.map(({ enrollmentId, status, note }) => ({
          enrollmentId, status, note,
        })),
      );
      setAttendance(saved);
      setBaseline(baselineOf(saved.records));
      setDirty(false);
      toast.success('Đã lưu trạng thái điểm danh');
      onSaved?.();
    } catch (err) {
      showError(err, 'Không lưu được điểm danh');
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!attendance || !dirty) return;
    const excusedToPresent = attendance.records.filter((record) =>
      baseline[record.enrollmentId] === 'EXCUSED' && record.status === 'PRESENT');
    if (excusedToPresent.length > 0) {
      Modal.confirm({
        title: 'Xác nhận chuyển sang Có mặt',
        content: `${excusedToPresent.length} học viên đang ở trạng thái "${ATTENDANCE_STATUS_LABEL.EXCUSED}" sẽ chuyển sang "${ATTENDANCE_STATUS_LABEL.PRESENT}". Tiếp tục lưu?`,
        okText: 'Xác nhận',
        cancelText: 'Hủy',
        onOk: () => persistSave(),
      });
      return;
    }
    void persistSave();
  };

  const loadHistory = async () => {
    if (!session) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      setHistory(await enrollmentApi.sessionAttendanceHistory(courseId, session.sessionId));
    } catch (err) {
      showError(err, 'Không tải được lịch sử điểm danh');
    } finally {
      setHistoryLoading(false);
    }
  };

  const reloadAttendance = () => {
    if (!session) return;
    setLoading(true);
    enrollmentApi.sessionAttendance(courseId, session.sessionId).then((result) => {
      setAttendance(result);
      setBaseline(baselineOf(result.records));
      setDirty(false);
    }).catch((err) => {
      showError(err, 'Không tải được danh sách điểm danh');
    }).finally(() => setLoading(false));
  };

  const [leaveActionLoading, setLeaveActionLoading] = useState<number | null>(null);

  const approveLeave = async (requestId: number) => {
    setLeaveActionLoading(requestId);
    try {
      await requestApi.review(requestId, { approved: true });
      toast.success('Đã duyệt đơn nghỉ phép');
      reloadAttendance();
      onSaved?.();
    } catch (err) {
      showError(err, 'Không thể duyệt đơn');
    } finally {
      setLeaveActionLoading(null);
    }
  };

  const submitRejectLeave = async () => {
    if (rejectLeaveId == null) return;
    setLeaveActionLoading(rejectLeaveId);
    try {
      await requestApi.review(rejectLeaveId, { approved: false, note: rejectReason || undefined });
      toast.success('Đã từ chối đơn nghỉ phép');
      setRejectLeaveId(null);
      setRejectReason('');
      reloadAttendance();
      onSaved?.();
    } catch (err) {
      showError(err, 'Không thể từ chối đơn');
    } finally {
      setLeaveActionLoading(null);
    }
  };

  const columns: ColumnsType<AttendanceRecordResponse> = [
    {
      title: 'Học viên', dataIndex: 'studentName',
      render: (name: string | null, row) => (
        <div>
          <Text strong>{name || `Ghi danh #${row.enrollmentId}`}</Text>
          {row.studentCode && <div><Text type="secondary">{row.studentCode}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 190,
      render: (status: AttendanceStatus, row) => readOnly ? (
        <Tag color={ATTENDANCE_STATUS_COLOR[status]}>{ATTENDANCE_STATUS_LABEL[status]}</Tag>
      ) : (
        <Select
          className="w-full"
          value={status}
          disabled={!editable}
          options={statusOptions}
          onChange={(value: AttendanceStatus) => updateRecord(row.enrollmentId, {
            status: value,
          })}
        />
      ),
    },
    {
      title: 'Ghi chú', dataIndex: 'note',
      render: (note: string | null, row) => readOnly ? (
        <Text type={note ? undefined : 'secondary'}>{note || '—'}</Text>
      ) : (
        <Input
          value={note ?? ''}
          disabled={!editable}
          maxLength={2000}
          placeholder="Ghi chú (nếu có)"
          onChange={(event) => updateRecord(row.enrollmentId, { note: event.target.value || null })}
        />
      ),
    },
    {
      title: 'Đơn nghỉ phép',
      key: 'leave',
      width: 220,
      render: (_: unknown, row: AttendanceRecordResponse) => {
        const lid = row.leaveRequestId;
        const lStatus = row.leaveRequestStatus;
        const lReason = row.leaveRequestReason;
        if (!lid) return <Text type="secondary">—</Text>;
        if (lStatus === 'PENDING') {
          return (
            <Space direction="vertical" size={4}>
              <Tag color="orange">Chờ duyệt</Tag>
              {lReason && <Text type="secondary" style={{ fontSize: 12 }}>{lReason}</Text>}
              {!readOnly && (
                <Space size={4}>
                  <Button
                    size="small"
                    type="primary"
                    loading={leaveActionLoading === lid}
                    onClick={() => void approveLeave(lid)}
                  >Duyệt</Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => { setRejectLeaveId(lid); setRejectReason(''); }}
                  >Từ chối</Button>
                </Space>
              )}
            </Space>
          );
        }
        if (lStatus === 'APPROVED') {
          return (
            <Space direction="vertical" size={2}>
              <Tag color="blue">Đã duyệt → Vắng có phép</Tag>
              {lReason && <Text type="secondary" style={{ fontSize: 12 }}>{lReason}</Text>}
            </Space>
          );
        }
        if (lStatus === 'REJECTED') {
          return (
            <Space direction="vertical" size={2}>
              <Tag>Từ chối</Tag>
              {lReason && <Text type="secondary" style={{ fontSize: 12 }}>{lReason}</Text>}
            </Space>
          );
        }
        return <Tag>{lStatus}</Tag>;
      },
    },
  ];

  const renderHistory = () => {
    if (historyLoading) return <Empty description="Đang tải lịch sử..." />;
    if (!history.length) return <Empty description="Chưa có thay đổi nào." />;
    return (
      <Timeline
        items={history.map((entry) => ({
          key: entry.id,
          color: entry.action === 'CREATE' ? 'green' : 'blue',
          children: (
            <div>
              <Text strong>{entry.actorName || `Tài khoản #${entry.actorId}`}</Text>
              <Text type="secondary"> · {dayjs(entry.changedAt).format('DD/MM/YYYY HH:mm')}</Text>
              <div className="text-sm mt-1">
                Ghi danh #{String(entry.newValue?.enrollmentId ?? entry.oldValue?.enrollmentId ?? '')}:{' '}
                <Tag>{statusLabelOf(entry.oldValue?.status)}</Tag>
                → <Tag color={ATTENDANCE_STATUS_COLOR[(String(entry.newValue?.status ?? 'NOT_MARKED')) as AttendanceStatus]}>
                  {statusLabelOf(entry.newValue?.status)}
                </Tag>
              </div>
            </div>
          ),
        }))}
      />
    );
  };

  return (
    <>
      <Modal
        open={open}
        width={1000}
        title={session
          ? `Điểm danh · Buổi ${session.sessionNumber} · ${dayjs(session.startTime).format('DD/MM/YYYY HH:mm')}`
          : 'Điểm danh buổi học'}
        onCancel={onClose}
        destroyOnHidden
        footer={[
          <Button key="history" onClick={() => void loadHistory()}>Lịch sử thay đổi</Button>,
          <Button key="close" onClick={onClose}>Đóng</Button>,
          ...(!readOnly ? [<Button key="save" type="primary" loading={saving} disabled={!editable || !dirty} onClick={() => void save()}>
            Lưu điểm danh
          </Button>] : []),
        ]}
      >
        {attendance && !editable && (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message="Buổi học đã khóa chỉnh sửa"
            description={attendance.lockReason || 'Bạn không có quyền chỉnh sửa điểm danh buổi này.'}
          />
        )}
        {attendance && editable && !readOnly && (
          <Alert
            className="mb-4"
            type="info"
            showIcon
            message={`Hạn chỉnh sửa điểm danh: ${attendance.editDeadline
              ? dayjs(attendance.editDeadline).format('DD/MM/YYYY HH:mm')
              : 'không giới hạn'}.`}
          />
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Tag color="blue">Tổng: {records.length}</Tag>
            <Tag color="green">Đã điểm danh: {records.length - unmarked}</Tag>
            {unmarked > 0 && <Tag color="gold">Chưa điểm danh: {unmarked}</Tag>}
            {dirty && <Tag color="orange">Có thay đổi chưa lưu</Tag>}
          </Space>
          <Space wrap>
            <Input.Search
              allowClear
              className="w-56"
              placeholder="Tìm tên hoặc mã học viên"
              onChange={(event) => setSearch(event.target.value)}
            />
          </Space>
        </div>

        <Table
          rowKey="enrollmentId"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={visibleRecords}
          pagination={false}
          scroll={{ x: 780, y: 420 }}
          locale={{ emptyText: 'Không có học viên trong danh sách buổi học này.' }}
        />
      </Modal>

      <Modal
        open={historyOpen}
        width={640}
        title="Lịch sử thay đổi điểm danh"
        onCancel={() => setHistoryOpen(false)}
        footer={<Button onClick={() => setHistoryOpen(false)}>Đóng</Button>}
      >
        {renderHistory()}
      </Modal>

      {/* Modal từ chối đơn nghỉ phép */}
      <Modal
        open={rejectLeaveId != null}
        title="Từ chối đơn xin nghỉ phép"
        onCancel={() => { setRejectLeaveId(null); setRejectReason(''); }}
        onOk={() => void submitRejectLeave()}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true, loading: leaveActionLoading === rejectLeaveId }}
        cancelText="Hủy"
      >
        <p className="mb-2">Lý do từ chối (nếu có):</p>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do..."
          maxLength={500}
        />
      </Modal>
    </>
  );
}
