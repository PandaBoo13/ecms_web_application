import { useEffect, useMemo, useState } from 'react';
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
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';

import { sessionApi } from '@/services/api/courses';
import { adminUserApi } from '@/services/api/admin';
import type { SessionResponse } from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

interface Props {
  courseId: number;
  sessions: SessionResponse[];
  onRefresh: () => void;
}

interface AssignState {
  sessionId: number;
  currentId?: number;
  type: 'substitute' | 'assistant';
}

const CourseSessionList = ({ courseId, sessions, onRefresh }: Props) => {
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);

  // Modal cancel
  const [cancelState, setCancelState] = useState<{ sessionId: number; title: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modal assign
  const [assignState, setAssignState] = useState<AssignState | null>(null);
  const [assignValue, setAssignValue] = useState<number | undefined>();
  const [assignLoading, setAssignLoading] = useState(false);

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

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleMarkDone = async (sessionId: number) => {
    try {
      await sessionApi.markDone(courseId, sessionId);
      toast.success('Đã đánh dấu buổi học hoàn thành');
      onRefresh();
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
      onRefresh();
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
        await sessionApi.assignSubstituteTeacher(
          courseId,
          assignState.sessionId,
          assignValue ?? null,
        );
        toast.success(assignValue ? 'Đã gán GV dạy thay' : 'Đã gỡ GV dạy thay');
      } else {
        await sessionApi.assignAssistant(courseId, assignState.sessionId, assignValue ?? null);
        toast.success(assignValue ? 'Đã gán trợ giảng' : 'Đã gỡ trợ giảng');
      }
      setAssignState(null);
      setAssignValue(undefined);
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Thất bại');
    } finally {
      setAssignLoading(false);
    }
  };

  const buildActions = (s: SessionResponse): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    if (s.status === 'SCHEDULED') {
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
            <span>Đánh dấu DONE</span>
          </Popconfirm>
        ),
      });
      items.push({
        key: 'cancel',
        icon: <CloseOutlined />,
        danger: true,
        label: <span onClick={() => openCancel(s)}>Hủy buổi học</span>,
      });
      items.push({ type: 'divider' });
    }

    if (s.status !== 'CANCELLED') {
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
            → {record.endTime ? new Date(record.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
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

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <Empty description="Khóa học chưa có buổi học nào" />
      </Card>
    );
  }

  return (
    <>
      <Card title={`Danh sách buổi học (${sessions.length})`}>
        <Table<SessionResponse>
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

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
    </>
  );
};

export default CourseSessionList;