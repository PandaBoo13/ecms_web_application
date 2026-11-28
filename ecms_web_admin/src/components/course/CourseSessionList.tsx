// src/components/course/CourseSessionList.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react'; // 🆕 Thêm import Key cho rowSelection
import {
  Card,
  Table,
  Tag,
  Space,
  Empty,
  Button,
  Dropdown,
  Modal,
  Input,
  Select,
  Descriptions,
  Typography,
  Divider,
  Result,
  Spin,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  CheckOutlined,
  CloseOutlined,
  UserSwitchOutlined,
  UserAddOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';
import SessionDrawer, { type SessionDrawerMode } from './SessionDrawer';

import { sessionApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import type {
  CourseDetailResponse,
  SessionResponse,
  SessionGenerationResult,
} from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

const { Text } = Typography;

interface Props {
  courseId: number;
  sessions: SessionResponse[];
  onRefresh: () => void;
  course?: CourseDetailResponse;
  readOnly?: boolean;
}

interface AssignState {
  sessionId: number;
  currentId?: number;
  type: 'substitute' | 'assistant';
}

const DAY_LABELS: Record<number, string> = {
  0: 'CN',
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  7: 'CN',
};

const formatScheduleDays = (days?: number[]): string => {
  if (!days || days.length === 0) return '—';
  return [...days]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => DAY_LABELS[d] ?? `#${d}`)
    .join(', ');
};

const formatShortTime = (time?: string | null): string =>
  time ? time.slice(0, 5) : '—';

const CourseSessionList = ({
  courseId,
  sessions: initialSessions,
  onRefresh,
  course,
  readOnly = false,
}: Props) => {
  const [sessions, setSessions] = useState<SessionResponse[]>(
    initialSessions || [],
  );
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);

  // Drawer tạo mới / xem chi tiết / chỉnh sửa buổi học
  const [drawerState, setDrawerState] = useState<{
    mode: SessionDrawerMode;
    session?: SessionResponse | null;
  } | null>(null);

  // Modal hủy buổi
  const [cancelState, setCancelState] = useState<{
    sessionId: number;
    title: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modal gán GV dạy thay / trợ giảng
  const [assignState, setAssignState] = useState<AssignState | null>(null);
  const [assignValue, setAssignValue] = useState<number | undefined>();
  const [assignLoading, setAssignLoading] = useState(false);

  // Modal sinh tự động
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateResult, setGenerateResult] =
    useState<SessionGenerationResult | null>(null);

  // 🆕 State cho Xóa hàng loạt
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const isCourseClosed =
    course?.status === 'CANCELLED' || course?.status === 'ARCHIVED';
  const isReadOnly = Boolean(readOnly || isCourseClosed);

  const activeSessionsCount = useMemo(
    () => sessions.filter((s) => s.status !== 'CANCELLED').length,
    [sessions],
  );

  useEffect(() => {
    if (initialSessions) {
      setSessions(initialSessions);
    }
  }, [initialSessions]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionApi.list(courseId);
      setSessions(data);
    } catch {
      toast.error('Không tải được danh sách buổi học');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!assignState || instructors.length > 0) return;
    adminUserApi
      .search({ roleCode: 'INSTRUCTOR', isActive: true, page: 0, size: 200 })
      .then((res) => setInstructors(res.content))
      .catch(() => toast.error('Không tải được danh sách giảng viên'));
  }, [assignState, instructors.length]);

  const instructorOptions = useMemo(
    () =>
      instructors.map((a) => ({
        value: a.accountId,
        label: `${a.fullName || a.email} (${a.email})`,
      })),
    [instructors],
  );

  // Kiểm tra đầy đủ điều kiện backend trước khi sinh tự động
  const scheduleConfig = useMemo(() => {
    const startDate = course?.startDate;
    const endDate = course?.endDate;
    const scheduleDays = course?.scheduleDays ?? [];
    const sessionStartTime = course?.sessionStartTime;
    const sessionEndTime = course?.sessionEndTime;
    const totalSessionsExpected = course?.totalSessionsExpected;

    const courseWithNested = course as CourseDetailResponse & {
      teacher?: { id?: number };
      room?: { id?: number };
    };
    const hasTeacher = Boolean(
      course?.teacherId ?? courseWithNested?.teacher?.id,
    );
    const hasRoom = Boolean(course?.roomId ?? courseWithNested?.room?.id);

    const missing: string[] = [];
    if (!startDate) missing.push('Ngày bắt đầu');
    if (!endDate) missing.push('Ngày kết thúc');
    if (scheduleDays.length === 0) missing.push('Lịch học trong tuần');
    if (!sessionStartTime) missing.push('Giờ bắt đầu');
    if (!sessionEndTime) missing.push('Giờ kết thúc');
    if (!hasTeacher) missing.push('Giảng viên chính');
    if (!hasRoom) missing.push('Phòng học mặc định');
    if (!totalSessionsExpected || totalSessionsExpected <= 0) {
      missing.push('Tổng số buổi dự kiến (> 0)');
    }

    return {
      startDate,
      endDate,
      scheduleDays,
      sessionStartTime,
      sessionEndTime,
      totalSessionsExpected,
      missing,
      isReady: missing.length === 0,
    };
  }, [course]);

  const refreshAll = useCallback(() => {
    fetchSessions();
    onRefresh();
  }, [fetchSessions, onRefresh]);

  // ══════════════════════════════════════════════════════════════
  // 🆕 BULK SELECTION LOGIC
  // ══════════════════════════════════════════════════════════════
  const selectedSessions = useMemo(
    () => sessions.filter((s) => selectedRowKeys.includes(s.id)),
    [sessions, selectedRowKeys],
  );

  // Không cho xóa các buổi COMPLETED
  const bulkDeletableSessions = useMemo(
    () => selectedSessions.filter((s) => s.status !== 'COMPLETED'),
    [selectedSessions],
  );

  const bulkHasCompleted = selectedSessions.length > bulkDeletableSessions.length;
  const bulkHasScheduled = bulkDeletableSessions.some(
    (s) => s.status === 'SCHEDULED',
  );

  // Tự động dọn dẹp selection nếu session biến mất khỏi danh sách
  useEffect(() => {
    setSelectedRowKeys((prev) => {
      if (prev.length === 0) return prev;
      const validIds = new Set(sessions.map((s) => s.id));
      const next = prev.filter((id) => validIds.has(id as number));
      return next.length === prev.length ? prev : next;
    });
  }, [sessions]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════

  // 🆕 Handler Xóa hàng loạt
  const handleBulkDelete = useCallback(async () => {
    if (isReadOnly || bulkDeletableSessions.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const idsToDelete = bulkDeletableSessions.map((s) => s.id);
      
      const result = await sessionApi.bulkDelete(courseId, idsToDelete);

      if (result.skippedIds.length === 0) {
        toast.success(result.message || `Đã xóa ${result.deletedIds.length} buổi học`);
      } else {
        toast(
          result.message || `Đã xóa ${result.deletedIds.length} buổi. Bỏ qua ${result.skippedIds.length} buổi.`,
          { icon: '⚠️' },
        );
      }

      // Nếu drawer đang mở đúng session vừa xóa → đóng
      setDrawerState((prev) =>
        prev?.session?.id && result.deletedIds.includes(prev.session.id) ? null : prev,
      );

      setSelectedRowKeys([]);
      setBulkDeleteOpen(false);
      refreshAll();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Xóa hàng loạt thất bại',
      );
    } finally {
      setBulkDeleteLoading(false);
    }
  }, [courseId, isReadOnly, bulkDeletableSessions, refreshAll]);

  const handleMarkDone = useCallback(
    (s: SessionResponse) => {
      if (isReadOnly) return;
      Modal.confirm({
        title: `Đánh dấu Buổi #${s.sessionNumber} đã hoàn thành?`,
        content: 'Tiến độ học tập của học viên sẽ được cập nhật tự động.',
        okText: 'Xác nhận',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            await sessionApi.markDone(courseId, s.id);
            toast.success('Đã đánh dấu buổi học hoàn thành');
            refreshAll();
          } catch (err) {
            toast.error((err as { message?: string })?.message || 'Thất bại');
          }
        },
      });
    },
    [courseId, isReadOnly, refreshAll],
  );

  const handleDelete = useCallback(
    (s: SessionResponse) => {
      if (isReadOnly) return;
      Modal.confirm({
        title: `Xóa Buổi #${s.sessionNumber}?`,
        content:
          s.status === 'SCHEDULED'
            ? 'Buổi học đã được công bố lịch. Khi xóa, hệ thống sẽ gửi thông báo tới giảng viên và học viên.'
            : 'Buổi học sẽ bị xóa vĩnh viễn khỏi danh sách và không thể hoàn tác.',
        okText: 'Xóa buổi học',
        okButtonProps: { danger: true },
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            await sessionApi.delete(courseId, s.id);
            toast.success('Đã xóa buổi học');
            setDrawerState((prev) =>
              prev?.session?.id === s.id ? null : prev,
            );
            refreshAll();
          } catch (err) {
            toast.error(
              (err as { message?: string })?.message || 'Xóa thất bại',
            );
          }
        },
      });
    },
    [courseId, isReadOnly, refreshAll],
  );

  const openCancel = useCallback(
    (s: SessionResponse) => {
      if (isReadOnly) return;
      setCancelState({ sessionId: s.id, title: `Buổi #${s.sessionNumber}` });
      setCancelReason('');
    },
    [isReadOnly],
  );

  const handleCancelSubmit = async () => {
    if (isReadOnly || !cancelState) return;
    if (!cancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy');
      return;
    }
    const targetId = cancelState.sessionId;
    setCancelLoading(true);
    try {
      await sessionApi.cancel(courseId, targetId, cancelReason.trim());
      toast.success('Đã hủy buổi học');
      setCancelState(null);
      setCancelReason('');
      setDrawerState((prev) => (prev?.session?.id === targetId ? null : prev));
      refreshAll();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Hủy thất bại');
    } finally {
      setCancelLoading(false);
    }
  };

  const openAssign = useCallback(
    (s: SessionResponse, type: 'substitute' | 'assistant') => {
      if (isReadOnly) return;
      const current =
        type === 'substitute' ? s.substituteTeacherId : s.assistantId;
      setAssignState({
        sessionId: s.id,
        type,
        currentId: current,
      });
      setAssignValue(current);
    },
    [isReadOnly],
  );

  const handleAssignSubmit = async () => {
    if (isReadOnly || !assignState) return;
    setAssignLoading(true);
    try {
      if (assignState.type === 'substitute') {
        await sessionApi.assignSubstituteTeacher(
          courseId,
          assignState.sessionId,
          assignValue ?? null,
        );
        toast.success(
          assignValue ? 'Đã gán GV dạy thay' : 'Đã gỡ GV dạy thay',
        );
      } else {
        await sessionApi.assignAssistant(
          courseId,
          assignState.sessionId,
          assignValue ?? null,
        );
        toast.success(assignValue ? 'Đã gán trợ giảng' : 'Đã gỡ trợ giảng');
      }
      setAssignState(null);
      setAssignValue(undefined);
      refreshAll();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Thất bại');
    } finally {
      setAssignLoading(false);
    }
  };

  const openGenerate = () => {
    if (isReadOnly) return;
    setGenerateResult(null);
    setGenerateOpen(true);
  };

  const handleGenerateSubmit = async () => {
    if (isReadOnly || !scheduleConfig.isReady) return;
    setGenerateLoading(true);
    try {
      const result = await sessionApi.generate(courseId);
      setGenerateResult(result);
      if (result.generated > 0) {
        toast.success(`Đã tạo ${result.generated} buổi học`);
        refreshAll();
      } else {
        toast('Không có buổi học mới nào được tạo', { icon: 'ℹ️' });
      }
    } catch (err) {
      const msg =
        (err as { message?: string })?.message || 'Tạo buổi học thất bại';
      toast.error(msg);
    } finally {
      setGenerateLoading(false);
    }
  };

  const closeGenerate = () => {
    setGenerateOpen(false);
    setGenerateResult(null);
  };

  const buildActions = useCallback(
    (s: SessionResponse): MenuProps['items'] => {
      if (isReadOnly) return undefined;

      const items: MenuProps['items'] = [];
      const canMarkDone = s.status === 'SCHEDULED' || s.status === 'ONGOING';
      const canModify = s.status !== 'CANCELLED' && s.status !== 'COMPLETED';
      const canDelete = s.status !== 'COMPLETED';

      if (canModify) {
        items.push({
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Chỉnh sửa / Gán phòng',
          onClick: () => setDrawerState({ mode: 'edit', session: s }),
        });
      }

      if (canMarkDone) {
        items.push({
          key: 'done',
          icon: <CheckOutlined />,
          label: 'Đánh dấu hoàn thành',
          onClick: () => handleMarkDone(s),
        });
      }

      if (canModify) {
        items.push({ type: 'divider' });

        items.push({
          key: 'substitute',
          icon: <UserSwitchOutlined />,
          label: s.substituteTeacherId ? 'Đổi GV dạy thay' : 'Gán GV dạy thay',
          onClick: () => openAssign(s, 'substitute'),
        });

        items.push({
          key: 'assistant',
          icon: <UserAddOutlined />,
          label: s.assistantId ? 'Đổi trợ giảng' : 'Gán trợ giảng',
          onClick: () => openAssign(s, 'assistant'),
        });

        items.push({ type: 'divider' });

        items.push({
          key: 'cancel',
          icon: <CloseOutlined />,
          danger: true,
          label: 'Hủy buổi học',
          onClick: () => openCancel(s),
        });
      }

      if (canDelete) {
        items.push({
          key: 'delete',
          icon: <DeleteOutlined />,
          danger: true,
          label: 'Xóa buổi học',
          onClick: () => handleDelete(s),
        });
      }

      return items.length > 0 ? items : undefined;
    },
    [isReadOnly, handleMarkDone, openAssign, openCancel, handleDelete],
  );

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<SessionResponse> = useMemo(
    () => [
      {
        title: 'Buổi',
        dataIndex: 'sessionNumber',
        key: 'sessionNumber',
        width: 72,
        align: 'center',
        render: (n: number) => (
          <Tag
            color="blue"
            className="!m-0 !rounded-md !font-semibold !text-xs"
          >
            #{n}
          </Tag>
        ),
      },
      {
        title: 'Tiêu đề',
        dataIndex: 'title',
        key: 'title',
        render: (title: string, record) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              onClick={() => setDrawerState({ mode: 'view', session: record })}
              className="font-semibold text-[13.5px] text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
            >
              {title}
            </span>
            {record.description && (
              <span className="text-xs text-slate-400 line-clamp-1">
                {record.description}
              </span>
            )}
          </div>
        ),
      },
      {
        title: 'Ngày / Giờ',
        key: 'time',
        width: 210,
        render: (_, record) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-slate-700 inline-flex items-center gap-1.5">
              <ClockCircleOutlined className="text-slate-400 text-xs" />
              <DateDisplay value={record.startTime} format="long" />
            </span>
            <span className="text-xs text-slate-400 pl-4">
              →{' '}
              {record.endTime
                ? new Date(record.endTime).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          </div>
        ),
      },
      {
        title: 'GV hiệu lực',
        key: 'teacher',
        width: 205,
        render: (_, record) => {
          const name = record.effectiveTeacherName || record.teacherName;
          const isSub = Boolean(record.substituteTeacherId);
          if (!name) return <span className="text-slate-300">—</span>;
          return (
            <Space size={6} wrap>
              <UserAvatar name={name} size={24} showName />
              {isSub && (
                <Tag
                  color="orange"
                  className="!m-0 !text-[10.5px] !px-1.5 !rounded"
                >
                  Dạy thay
                </Tag>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Trợ giảng',
        key: 'assistant',
        width: 155,
        render: (_, record) =>
          record.assistantName ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <UserOutlined className="text-slate-400" />
              <span className="truncate max-w-[125px]">
                {record.assistantName}
              </span>
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        title: 'Phòng',
        key: 'room',
        width: 155,
        render: (_, record) => {
          const name = record.effectiveRoomName || record.roomName;
          if (name) {
            return (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                <HomeOutlined className="text-slate-400 text-xs" />
                <span>{name}</span>
              </span>
            );
          }
          if (record.status === 'DRAFT' || record.status === 'SCHEDULED') {
            return (
              <Tag color="warning" className="!m-0 !rounded-md !text-[11.5px]">
                Chưa gán phòng
              </Tag>
            );
          }
          return <span className="text-slate-300">—</span>;
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 150,
        align: 'center',
        render: (s: string, record) => (
          <div className="flex flex-col items-center gap-1">
            <StatusTag status={s} />
            {s === 'CANCELLED' && record.cancelReason && (
              <Text
                type="danger"
                className="!text-[11px] max-w-[140px]"
                ellipsis={{ tooltip: `Lý do hủy: ${record.cancelReason}` }}
              >
                {record.cancelReason}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: isReadOnly ? 52 : 88,
        align: 'center',
        fixed: 'right',
        render: (_, record) => {
          const items = buildActions(record);
          return (
            <Space size={2} onDoubleClick={(e) => e.stopPropagation()}>
              <Tooltip title="Xem chi tiết">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined className="text-blue-600" />}
                  onClick={() =>
                    setDrawerState({ mode: 'view', session: record })
                  }
                />
              </Tooltip>
              {!isReadOnly && items && items.length > 0 && (
                <Dropdown
                  menu={{ items }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined className="text-slate-500" />}
                  />
                </Dropdown>
              )}
            </Space>
          );
        },
      },
    ],
    [isReadOnly, buildActions],
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  const createButton = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => setDrawerState({ mode: 'create', session: null })}
      className="!rounded-lg !font-medium"
    >
      Tạo buổi học
    </Button>
  );

  const generateButton = (
    <Tooltip
      title={
        !course
          ? 'Cần tải thông tin khóa học trước'
          : 'Sinh tự động các buổi học theo cấu hình lịch ở tab Tổng quan'
      }
    >
      <Button
        icon={<ThunderboltOutlined />}
        onClick={openGenerate}
        disabled={!course}
        className="!rounded-lg !font-medium"
      >
        Tạo tự động
      </Button>
    </Tooltip>
  );

  const headerExtra = !isReadOnly ? (
    <Space size={8}>
      {generateButton}
      {createButton}
    </Space>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[12px] font-medium text-slate-500">
      <LockOutlined className="text-[11px]" />
      Khóa chỉnh sửa
    </span>
  );

  const cardTitle = (
    <div className="flex items-center gap-2">
      <CalendarOutlined className="text-blue-600" />
      <span className="font-bold text-slate-800 text-[15px]">
        Danh sách buổi học
      </span>
      <Tag className="!m-0 !rounded-full !text-xs !font-semibold !bg-slate-100 !border-slate-200 !text-slate-600">
        {sessions.length} buổi
      </Tag>
    </div>
  );

  const generateModal = !isReadOnly ? (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-base">
            <ThunderboltOutlined />
          </div>
          <div>
            <div className="text-[15.5px] font-bold text-slate-900">
              Tạo tự động toàn bộ buổi học
            </div>
            <div className="text-xs text-slate-500 font-normal">
              Quét khung thời gian cấu hình và bổ sung các buổi học còn thiếu
            </div>
          </div>
        </div>
      }
      open={generateOpen}
      onCancel={closeGenerate}
      footer={
        generateResult
          ? [
              <Button
                key="close"
                type="primary"
                onClick={closeGenerate}
                className="!rounded-lg"
              >
                Đóng
              </Button>,
            ]
          : [
              <Button
                key="cancel"
                onClick={closeGenerate}
                className="!rounded-lg"
              >
                Hủy
              </Button>,
              <Button
                key="submit"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={generateLoading}
                disabled={!scheduleConfig.isReady}
                onClick={handleGenerateSubmit}
                className="!rounded-lg"
              >
                Bắt đầu tạo
              </Button>,
            ]
      }
      width={560}
      destroyOnClose
      maskClosable={!generateLoading}
      closable={!generateLoading}
    >
      <Divider className="!my-3.5" />

      {!scheduleConfig.isReady && !generateResult && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3.5 py-3">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-800 mb-2">
              <WarningOutlined />
              <span>Chưa đủ thông tin cấu hình lịch học</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scheduleConfig.missing.map((m) => (
                <Tag
                  key={m}
                  color="warning"
                  className="!m-0 !rounded-md !text-xs"
                >
                  {m}
                </Tag>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500 m-0 flex items-center gap-1.5">
            <InfoCircleOutlined className="text-slate-400 shrink-0" />
            <span>
              Vào tab <strong className="text-slate-700">Tổng quan</strong> để
              cập nhật trực tiếp các thông tin lớp Offline, sau đó quay lại
              đây.
            </span>
          </p>
        </div>
      )}

      {scheduleConfig.isReady && !generateResult && (
        <div className="flex flex-col gap-3">
          <Descriptions
            column={1}
            size="small"
            bordered
            items={[
              {
                key: 'startDate',
                label: 'Ngày bắt đầu',
                children: (
                  <DateDisplay
                    value={scheduleConfig.startDate}
                    format="long"
                  />
                ),
              },
              {
                key: 'endDate',
                label: 'Ngày kết thúc',
                children: (
                  <DateDisplay value={scheduleConfig.endDate} format="long" />
                ),
              },
              {
                key: 'scheduleDays',
                label: 'Các thứ trong tuần',
                children: (
                  <Tag color="blue" className="!m-0 !rounded-md !font-semibold">
                    {formatScheduleDays(scheduleConfig.scheduleDays)}
                  </Tag>
                ),
              },
              {
                key: 'time',
                label: 'Khung giờ học',
                children: (
                  <span className="font-medium text-slate-700">
                    {formatShortTime(scheduleConfig.sessionStartTime)} →{' '}
                    {formatShortTime(scheduleConfig.sessionEndTime)}
                  </span>
                ),
              },
              ...(scheduleConfig.totalSessionsExpected
                ? [
                    {
                      key: 'total',
                      label: 'Số buổi dự kiến',
                      children: (
                        <Tag color="purple" className="!m-0 !rounded-md">
                          {scheduleConfig.totalSessionsExpected} buổi
                        </Tag>
                      ),
                    },
                  ]
                : []),
              {
                key: 'current',
                label: 'Buổi hiện có',
                children: (
                  <Tag className="!m-0 !rounded-md">
                    {activeSessionsCount} buổi
                  </Tag>
                ),
              },
            ]}
          />

          <p className="text-xs text-slate-500 m-0 flex items-center gap-1.5">
            <InfoCircleOutlined className="text-blue-500 shrink-0" />
            <span>
              Các buổi sinh tự động sẽ ở trạng thái{' '}
              <strong className="text-slate-700">Nháp (DRAFT)</strong> để kiểm
              tra và gán phòng trước khi công bố lịch.
            </span>
          </p>
        </div>
      )}

      {generateResult && (
        <div className="flex flex-col gap-3">
          <Result
            status={generateResult.generated > 0 ? 'success' : 'info'}
            icon={
              <ThunderboltOutlined
                className={
                  generateResult.generated > 0
                    ? 'text-emerald-500'
                    : 'text-blue-500'
                }
              />
            }
            title={
              <span className="text-base">
                Đã tạo{' '}
                <Text strong className="!text-emerald-600">
                  {generateResult.generated}
                </Text>
                <Text type="secondary">
                  {' '}
                  / {generateResult.totalDates} buổi
                </Text>
              </span>
            }
            subTitle={generateResult.message}
            className="!py-2"
          />

          {generateResult.skipped && generateResult.skipped.length > 0 && (
            <>
              <Divider className="!my-1" titlePlacement="left">
                <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                  <CalendarOutlined /> Bỏ qua ({generateResult.skipped.length})
                </span>
              </Divider>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 divide-y divide-slate-200/60">
                {generateResult.skipped.map((s, idx) => (
                  <div
                    key={`${s.date}-${idx}`}
                    className="text-[13px] py-1.5 first:pt-0.5 last:pb-0.5"
                  >
                    <Text code className="!text-xs">
                      {s.date}
                    </Text>{' '}
                    <span className="text-slate-500">— {s.reason}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {generateResult.generated === 0 &&
            (!generateResult.skipped ||
              generateResult.skipped.length === 0) && (
              <p className="text-xs text-slate-500 text-center m-0 flex items-center justify-center gap-1.5">
                <InfoCircleOutlined className="text-slate-400" />
                <span>
                  Không có ngày nào khớp với lịch cấu hình trong khoảng thời
                  gian đã chọn.
                </span>
              </p>
            )}
        </div>
      )}
    </Modal>
  ) : null;

  const sessionDrawer = (
    <SessionDrawer
      open={Boolean(drawerState)}
      courseId={courseId}
      course={course}
      session={drawerState?.session ?? null}
      initialMode={drawerState?.mode ?? 'view'}
      readOnly={isReadOnly}
      onClose={() => setDrawerState(null)}
      onSuccess={() => {
        refreshAll();
        const targetId = drawerState?.session?.id;
        if (targetId) {
          sessionApi.list(courseId).then((list) => {
            const updated = list.find((item) => item.id === targetId);
            setDrawerState((prev) =>
              prev && updated ? { ...prev, session: updated } : null,
            );
          });
        }
      }}
      onRequestCancel={(s) => openCancel(s)}
    />
  );

  if (loading && sessions.length === 0) {
    return (
      <Card
        className="!rounded-xl border-slate-200/90 shadow-none"
        title={cardTitle}
        extra={headerExtra}
      >
        <div className="text-center py-10">
          <Spin tip="Đang tải danh sách buổi học..." />
        </div>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <>
        <Card
          className="!rounded-xl border-slate-200/90 shadow-none"
          title={cardTitle}
          extra={headerExtra}
        >
          <Empty description="Khóa học chưa có buổi học nào">
            {!isReadOnly && (
              <Space size={8}>
                {generateButton}
                {createButton}
              </Space>
            )}
          </Empty>
        </Card>
        {sessionDrawer}
        {generateModal}
      </>
    );
  }

  return (
    <>
      <Card
        className="!rounded-xl border-slate-200/90 shadow-none"
        styles={{ body: { padding: '16px 20px' } }}
        title={cardTitle}
        extra={headerExtra}
      >
        {/* 🆕 BULK TOOLBAR */}
        {!isReadOnly && selectedRowKeys.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2">
            <span className="text-sm text-slate-700">
              Đã chọn <b>{selectedSessions.length}</b> buổi học
              {bulkHasCompleted && (
                <span className="ml-2 text-[11px] text-amber-700">
                  (bỏ qua {selectedSessions.length - bulkDeletableSessions.length} buổi đã hoàn thành)
                </span>
              )}
            </span>
            <Space size={6}>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                Bỏ chọn
              </Button>
              <Button
                danger
                type="primary"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkDeletableSessions.length === 0}
              >
                Xóa đã chọn ({bulkDeletableSessions.length})
              </Button>
            </Space>
          </div>
        )}

        <Table<SessionResponse>
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          loading={loading}
          size="middle"
          // 🆕 Row Selection
          rowSelection={
            isReadOnly
              ? undefined
              : {
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                  getCheckboxProps: (record) => ({
                    disabled: record.status === 'COMPLETED',
                    name: `buổi ${record.sessionNumber}`,
                  }),
                }
          }
          onRow={(record) => ({
            onDoubleClick: () =>
              setDrawerState({ mode: 'view', session: record }),
            className: 'cursor-pointer',
          })}
        />
      </Card>

      {sessionDrawer}

      {/* Modal hủy buổi */}
      {!isReadOnly && (
        <Modal
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <CloseOutlined />
              </div>
              <span className="font-bold text-slate-900">
                {cancelState ? `Hủy ${cancelState.title}` : 'Hủy buổi học'}
              </span>
            </div>
          }
          open={!!cancelState}
          onCancel={() => setCancelState(null)}
          onOk={handleCancelSubmit}
          confirmLoading={cancelLoading}
          okText="Hủy buổi"
          okButtonProps={{ danger: true, className: '!rounded-lg' }}
          cancelButtonProps={{ className: '!rounded-lg' }}
          cancelText="Đóng"
          destroyOnClose
        >
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 mb-1.5">
              Lý do hủy <span className="text-red-500">*</span>
            </div>
            <Input.TextArea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="VD: GV ốm đột xuất, phòng hỏng..."
              className="!rounded-lg"
            />
          </div>
        </Modal>
      )}

      {/* Modal gán GV dạy thay / trợ giảng */}
      {!isReadOnly && (
        <Modal
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                {assignState?.type === 'substitute' ? (
                  <UserSwitchOutlined />
                ) : (
                  <UserAddOutlined />
                )}
              </div>
              <span className="font-bold text-slate-900">
                {assignState?.type === 'substitute'
                  ? assignState.currentId
                    ? 'Đổi GV dạy thay'
                    : 'Gán GV dạy thay'
                  : assignState?.currentId
                    ? 'Đổi trợ giảng'
                    : 'Gán trợ giảng'}
              </span>
            </div>
          }
          open={!!assignState}
          onCancel={() => setAssignState(null)}
          onOk={handleAssignSubmit}
          confirmLoading={assignLoading}
          okText="Xác nhận"
          okButtonProps={{ className: '!rounded-lg' }}
          cancelButtonProps={{ className: '!rounded-lg' }}
          cancelText="Hủy"
          destroyOnClose
        >
          <div className="mt-3 flex flex-col gap-2">
            <Select
              className="w-full"
              placeholder="Chọn giảng viên"
              allowClear
              value={assignValue}
              onChange={setAssignValue}
              showSearch
              optionFilterProp="label"
              options={instructorOptions}
            />
            <span className="text-xs text-slate-400">
              Để trống rồi xác nhận để gỡ giảng viên hiện tại.
            </span>
          </div>
        </Modal>
      )}

      {/* 🆕 Modal xóa hàng loạt */}
      {!isReadOnly && (
        <Modal
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <DeleteOutlined />
              </div>
              <span className="font-bold text-slate-900">Xóa hàng loạt buổi học</span>
            </div>
          }
          open={bulkDeleteOpen}
          onCancel={() => setBulkDeleteOpen(false)}
          onOk={handleBulkDelete}
          confirmLoading={bulkDeleteLoading}
          okText={`Xóa ${bulkDeletableSessions.length} buổi`}
          okButtonProps={{ danger: true, className: '!rounded-lg' }}
          cancelButtonProps={{ className: '!rounded-lg' }}
          cancelText="Hủy"
          destroyOnClose
          width={520}
        >
          <div className="mt-3 flex flex-col gap-2.5">
            <p className="m-0 text-slate-700">
              Bạn sắp xóa <b>{bulkDeletableSessions.length}</b> buổi học:
            </p>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 flex flex-wrap gap-1.5">
              {bulkDeletableSessions.map((s) => (
                <Tag
                  key={s.id}
                  color={s.status === 'SCHEDULED' ? 'orange' : 'default'}
                  className="!m-0 !rounded-md"
                >
                  #{s.sessionNumber}
                </Tag>
              ))}
            </div>

            {bulkHasScheduled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
                ⚠️ Có buổi đã công bố lịch (SCHEDULED). Hệ thống sẽ gửi thông báo
                tới giảng viên và học viên.
              </div>
            )}

            {bulkHasCompleted && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                ℹ️ {selectedSessions.length - bulkDeletableSessions.length} buổi ở
                trạng thái <b>COMPLETED</b> sẽ được bỏ qua (không thể xóa).
              </div>
            )}

            <p className="m-0 text-xs text-slate-500">
              Hành động này không thể hoàn tác.
            </p>
          </div>
        </Modal>
      )}

      {generateModal}
    </>
  );
};

export default CourseSessionList;