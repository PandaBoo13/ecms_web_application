import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Popconfirm,
  Alert,
  Descriptions,
  Typography,
  Divider,
  Result,
  Spin,
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
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';
import SessionFormModal from './SessionFormModal';

import { sessionApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import type {
  CourseDetailResponse,
  SessionResponse,
  SessionGenerationResult,
} from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

const { Text, Paragraph } = Typography;

interface Props {
  courseId: number;
  sessions: SessionResponse[];
  onRefresh: () => void;
  /** 🆕 Bắt buộc để đọc config lịch (startDate, endDate, scheduleDays...) */
  course?: CourseDetailResponse;
}

interface AssignState {
  sessionId: number;
  currentId?: number;
  type: 'substitute' | 'assistant';
}

// Map cả 2 convention: 0..6 (Sun..Sat) và 1..7 (Mon..Sun)
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
  return days.map((d) => DAY_LABELS[d] ?? `#${d}`).join(', ');
};

const CourseSessionList = ({ courseId, sessions: initialSessions, onRefresh, course }: Props) => {
  // 🆕 Dùng state local thay vì phụ thuộc hoàn toàn vào props
  const [sessions, setSessions] = useState<SessionResponse[]>(initialSessions || []);
  const [loading, setLoading] = useState(false);

  const [instructors, setInstructors] = useState<AccountResponse[]>([]);

  // Modal tạo buổi học
  const [createOpen, setCreateOpen] = useState(false);

  // Modal cancel
  const [cancelState, setCancelState] = useState<{ sessionId: number; title: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modal assign
  const [assignState, setAssignState] = useState<AssignState | null>(null);
  const [assignValue, setAssignValue] = useState<number | undefined>();
  const [assignLoading, setAssignLoading] = useState(false);

  // Modal generate
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateResult, setGenerateResult] = useState<SessionGenerationResult | null>(null);

  // 🆕 Hàm fetch danh sách session từ API
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionApi.list(courseId);
      setSessions(data);
    } catch (err) {
      toast.error('Không tải được danh sách buổi học');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // Tự fetch khi mount hoặc khi courseId thay đổi
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load instructors khi mở modal assign
  useEffect(() => {
    if (!assignState) return;
    if (instructors.length > 0) return;
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

  // 🆕 Kiểm tra course đã cấu hình lịch chưa
  const scheduleConfig = useMemo(() => {
    const startDate = course?.startDate;
    const endDate = course?.endDate;
    const scheduleDays = course?.scheduleDays ?? [];
    const sessionStartTime = course?.sessionStartTime;
    const sessionEndTime = course?.sessionEndTime;
    const totalSessionsExpected = course?.totalSessionsExpected;

    const missing: string[] = [];
    if (!startDate) missing.push('Ngày bắt đầu');
    if (!endDate) missing.push('Ngày kết thúc');
    if (scheduleDays.length === 0) missing.push('Các thứ trong tuần');
    if (!sessionStartTime) missing.push('Giờ bắt đầu');
    if (!sessionEndTime) missing.push('Giờ kết thúc');

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

  // Hàm gọi refresh chung: fetch lại danh sách session VÀ gọi onRefresh để update các thông tin khác của khóa học
  const refreshAll = useCallback(() => {
    fetchSessions();
    onRefresh();
  }, [fetchSessions, onRefresh]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleMarkDone = async (sessionId: number) => {
    try {
      await sessionApi.markDone(courseId, sessionId);
      toast.success('Đã đánh dấu buổi học hoàn thành');
      refreshAll();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Thất bại');
    }
  };

  const openCancel = (s: SessionResponse) => {
    setCancelState({ sessionId: s.id, title: `Buổi #${s.sessionNumber}` });
    setCancelReason('');
  };

  const handleCancelSubmit = async () => {
    if (!cancelState) return;
    if (!cancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy');
      return;
    }
    setCancelLoading(true);
    try {
      await sessionApi.cancel(courseId, cancelState.sessionId, cancelReason.trim());
      toast.success('Đã hủy buổi học');
      setCancelState(null);
      setCancelReason('');
      refreshAll();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Hủy thất bại');
    } finally {
      setCancelLoading(false);
    }
  };

  const openAssign = (s: SessionResponse, type: 'substitute' | 'assistant') => {
    setAssignState({
      sessionId: s.id,
      type,
      currentId: type === 'substitute' ? s.substituteTeacherId : s.assistantId,
    });
    setAssignValue(type === 'substitute' ? s.substituteTeacherId : s.assistantId);
  };

  const handleAssignSubmit = async () => {
    if (!assignState) return;
    setAssignLoading(true);
    try {
      if (assignState.type === 'substitute') {
        await sessionApi.assignSubstituteTeacher(courseId, assignState.sessionId, assignValue ?? null);
        toast.success(assignValue ? 'Đã gán GV dạy thay' : 'Đã gỡ GV dạy thay');
      } else {
        await sessionApi.assignAssistant(courseId, assignState.sessionId, assignValue ?? null);
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

  // Mở modal generate — reset state trước
  const openGenerate = () => {
    setGenerateResult(null);
    setGenerateOpen(true);
  };

  // Gọi API generate
  const handleGenerateSubmit = async () => {
    if (!scheduleConfig.isReady) return;
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
      const msg = (err as { message?: string })?.message || 'Tạo buổi học thất bại';
      toast.error(msg);
    } finally {
      setGenerateLoading(false);
    }
  };

  // Đóng modal generate
  const closeGenerate = () => {
    setGenerateOpen(false);
    setGenerateResult(null);
  };

  const buildActions = (s: SessionResponse): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    const canMarkDone = s.status === 'SCHEDULED' || s.status === 'ONGOING';
    const canModify = s.status !== 'CANCELLED' && s.status !== 'COMPLETED';

    if (canMarkDone) {
      items.push({
        key: 'done',
        icon: <CheckOutlined />,
        label: (
          <Popconfirm
            title="Đánh dấu buổi học đã hoàn thành?"
            onConfirm={() => handleMarkDone(s.id)}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <span>Đánh dấu hoàn thành</span>
          </Popconfirm>
        ),
      });
    }

    if (canModify) {
      items.push({
        key: 'cancel',
        icon: <CloseOutlined />,
        danger: true,
        label: <span onClick={() => openCancel(s)}>Hủy buổi học</span>,
      });

      items.push({ type: 'divider' });

      items.push({
        key: 'substitute',
        icon: <UserSwitchOutlined />,
        label: (
          <span onClick={() => openAssign(s, 'substitute')}>
            {s.substituteTeacherId ? 'Đổi GV dạy thay' : 'Gán GV dạy thay'}
          </span>
        ),
      });
      items.push({
        key: 'assistant',
        icon: <UserAddOutlined />,
        label: (
          <span onClick={() => openAssign(s, 'assistant')}>
            {s.assistantId ? 'Đổi trợ giảng' : 'Gán trợ giảng'}
          </span>
        ),
      });
    }

    return items.length > 0 ? items : undefined;
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<SessionResponse> = [
    {
      title: 'Buổi',
      dataIndex: 'sessionNumber',
      key: 'sessionNumber',
      width: 70,
      align: 'center',
      render: (n: number) => <Tag color="blue">#{n}</Tag>,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 500 }}>{title}</span>
          {record.description && (
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngày / Giờ',
      key: 'time',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontSize: 13 }}>
            <ClockCircleOutlined /> <DateDisplay value={record.startTime} format="long" />
          </span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            →{' '}
            {record.endTime
              ? new Date(record.endTime).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </Space>
      ),
    },
    {
      title: 'GV hiệu lực',
      key: 'teacher',
      width: 200,
      render: (_, record) => {
        const name = record.effectiveTeacherName || record.teacherName;
        const isSub = Boolean(record.substituteTeacherId);
        if (!name) return <span>—</span>;
        return (
          <Space size={4} wrap>
            <UserAvatar name={name} size={24} showName />
            {isSub && (
              <Tag color="orange" style={{ fontSize: 10, padding: '0 6px' }}>
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
      width: 150,
      render: (_, record) =>
        record.assistantName ? (
          <Space size={4}>
            <UserOutlined style={{ color: '#8c8c8c' }} />
            <span style={{ fontSize: 12 }}>{record.assistantName}</span>
          </Space>
        ) : (
          <span style={{ color: '#bfbfbf' }}>—</span>
        ),
    },
    {
      title: 'Phòng',
      key: 'room',
      width: 130,
      render: (_, record) => {
        const name = record.effectiveRoomName || record.roomName;
        return name ? (
          <Space size={4}>
            <HomeOutlined />
            {name}
          </Space>
        ) : (
          <span>—</span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      align: 'center',
      fixed: 'right',
      render: (_, record) => {
        const items = buildActions(record);
        if (!items || items.length === 0) return null;
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  const createButton = (
    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
      Tạo buổi học
    </Button>
  );

  // Nút generate — disable nếu không có course (không đọc được config)
  const generateButton = (
    <Button
      icon={<ThunderboltOutlined />}
      onClick={openGenerate}
      disabled={!course}
      title={!course ? 'Cần tải thông tin khóa học trước' : undefined}
    >
      Tạo tự động
    </Button>
  );

  const headerExtra = (
    <Space>
      {generateButton}
      {createButton}
    </Space>
  );

  // Modal generate
  const generateModal = (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#1677ff' }} />
          <span>Tạo tự động toàn bộ buổi học</span>
        </Space>
      }
      open={generateOpen}
      onCancel={closeGenerate}
      footer={
        generateResult
          ? [
              <Button key="close" type="primary" onClick={closeGenerate}>
                Đóng
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={closeGenerate}>
                Hủy
              </Button>,
              <Button
                key="submit"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={generateLoading}
                disabled={!scheduleConfig.isReady}
                onClick={handleGenerateSubmit}
              >
                Bắt đầu tạo
              </Button>,
            ]
      }
      width={600}
      destroyOnClose
      maskClosable={!generateLoading}
      closable={!generateLoading}
    >
      {/* Trường hợp chưa cấu hình lịch */}
      {!scheduleConfig.isReady && !generateResult && (
        <>
          <Alert
            type="warning"
            showIcon
            message="Khóa học chưa được cấu hình lịch"
            description={
              <div>
                Cần bổ sung các thông tin sau trước khi tạo tự động:
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 18 }}>
                  {scheduleConfig.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            }
            style={{ marginBottom: 12 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Vào tab <strong>Tổng quan</strong> → nút <strong>Chỉnh sửa thông tin lớp Offline</strong>{' '}
            để cấu hình lịch, sau đó quay lại đây.
          </Text>
        </>
      )}

      {/* Trường hợp đủ config — preview trước khi chạy */}
      {scheduleConfig.isReady && !generateResult && (
        <>
          <Paragraph>
            Hệ thống sẽ quét toàn bộ khoảng thời gian và tạo các buổi học còn thiếu.
          </Paragraph>

          <Descriptions
            column={1}
            size="small"
            bordered
            items={[
              {
                key: 'startDate',
                label: 'Ngày bắt đầu',
                children: <DateDisplay value={scheduleConfig.startDate} format="long" />,
              },
              {
                key: 'endDate',
                label: 'Ngày kết thúc',
                children: <DateDisplay value={scheduleConfig.endDate} format="long" />,
              },
              {
                key: 'scheduleDays',
                label: 'Các thứ',
                children: <Tag color="blue">{formatScheduleDays(scheduleConfig.scheduleDays)}</Tag>,
              },
              {
                key: 'time',
                label: 'Giờ học',
                children: (
                  <span>
                    {scheduleConfig.sessionStartTime} → {scheduleConfig.sessionEndTime}
                  </span>
                ),
              },
              ...(scheduleConfig.totalSessionsExpected
                ? [
                    {
                      key: 'total',
                      label: 'Số buổi dự kiến',
                      children: <Tag color="purple">{scheduleConfig.totalSessionsExpected}</Tag>,
                    },
                  ]
                : []),
              {
                key: 'current',
                label: 'Buổi đã có',
                children: <Tag color="default">{sessions.length}</Tag>,
              },
            ]}
          />

          <Alert
            type="info"
            showIcon
            message="Lưu ý"
            description="Các buổi học đã tồn tại (cùng ngày + giờ) sẽ được tự động bỏ qua. Bạn có thể chạy lại nhiều lần mà không lo trùng lặp."
            style={{ marginTop: 12 }}
          />
        </>
      )}

      {/* Kết quả sau khi chạy */}
      {generateResult && (
        <>
          <Result
            status={generateResult.generated > 0 ? 'success' : 'info'}
            icon={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
            title={
              <span>
                Đã tạo <Text strong style={{ color: '#52c41a' }}>{generateResult.generated}</Text>
                <Text type="secondary"> / {generateResult.totalDates} buổi</Text>
              </span>
            }
            subTitle={generateResult.message}
            style={{ padding: '8px 0' }}
          />

          {generateResult.skipped && generateResult.skipped.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} orientation="left">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <CalendarOutlined /> Bỏ qua ({generateResult.skipped.length})
                </Text>
              </Divider>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: '#fafafa',
                  borderRadius: 6,
                  padding: 8,
                }}
              >
                {generateResult.skipped.map((s, idx) => (
                  <div
                    key={`${s.date}-${idx}`}
                    style={{
                      fontSize: 13,
                      padding: '4px 8px',
                      borderBottom:
                        idx < generateResult.skipped.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <Text code style={{ fontSize: 12 }}>
                      {s.date}
                    </Text>{' '}
                    <Text type="secondary">— {s.reason}</Text>
                  </div>
                ))}
              </div>
            </>
          )}

          {generateResult.generated === 0 && (!generateResult.skipped || generateResult.skipped.length === 0) && (
            <Alert
              type="info"
              showIcon
              message="Không có ngày nào khớp với lịch cấu hình trong khoảng thời gian đã chọn."
              style={{ marginTop: 12 }}
            />
          )}
        </>
      )}
    </Modal>
  );

  // Loading state lần đầu
  if (loading && sessions.length === 0) {
    return (
      <Card title="Danh sách buổi học" extra={headerExtra}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Đang tải danh sách buổi học..." />
        </div>
      </Card>
    );
  }

  // Empty state — vẫn hiển thị nút tạo + generate
  if (!sessions || sessions.length === 0) {
    return (
      <>
        <Card title="Danh sách buổi học (0)" extra={headerExtra}>
          <Empty description="Khóa học chưa có buổi học nào">
            <Space>
              {generateButton}
              {createButton}
            </Space>
          </Empty>
        </Card>

        <SessionFormModal
          courseId={courseId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            refreshAll();
          }}
        />
        {generateModal}
      </>
    );
  }

  return (
    <>
      <Card title={`Danh sách buổi học (${sessions.length})`} extra={headerExtra}>
        <Table<SessionResponse>
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          loading={loading} // 🆕 Loading overlay khi fetch lại ngầm
        />
      </Card>

      <SessionFormModal
        courseId={courseId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          refreshAll();
        }}
      />

      {/* Modal hủy buổi */}
      <Modal
        title={cancelState ? `Hủy ${cancelState.title}` : 'Hủy buổi học'}
        open={!!cancelState}
        onCancel={() => setCancelState(null)}
        onOk={handleCancelSubmit}
        confirmLoading={cancelLoading}
        okText="Hủy buổi"
        okButtonProps={{ danger: true }}
        cancelText="Đóng"
        destroyOnClose
      >
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            Lý do hủy <span style={{ color: 'red' }}>*</span>
          </div>
          <Input.TextArea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="VD: GV ốm đột xuất, phòng hỏng..."
          />
        </div>
      </Modal>

      {/* Modal gán GV dạy thay / trợ giảng */}
      <Modal
        title={
          assignState?.type === 'substitute'
            ? assignState.currentId
              ? 'Đổi GV dạy thay'
              : 'Gán GV dạy thay'
            : assignState?.currentId
              ? 'Đổi trợ giảng'
              : 'Gán trợ giảng'
        }
        open={!!assignState}
        onCancel={() => setAssignState(null)}
        onOk={handleAssignSubmit}
        confirmLoading={assignLoading}
        okText="Xác nhận"
        cancelText="Hủy"
        destroyOnClose
      >
        <div style={{ marginTop: 12 }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn giảng viên"
            allowClear
            value={assignValue}
            onChange={setAssignValue}
            showSearch
            optionFilterProp="label"
            options={instructorOptions}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
            Để trống rồi xác nhận để gỡ GV hiện tại.
          </div>
        </div>
      </Modal>

      {generateModal}
    </>
  );
};

export default CourseSessionList;