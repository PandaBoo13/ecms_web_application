import { Card, Table, Tag, Space, Empty, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, HomeOutlined, ClockCircleOutlined } from '@ant-design/icons';

import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import UserAvatar from '@/components/common/UserAvatar';

import type { SessionResponse } from '@/services/types/course';

interface Props {
  sessions: SessionResponse[];
}

const CourseSessionList = ({ sessions }: Props) => {
  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <Empty description="Khóa học chưa có buổi học nào" />
      </Card>
    );
  }

  const columns: ColumnsType<SessionResponse> = [
    {
      title: 'Buổi',
      dataIndex: 'sessionNumber',
      key: 'sessionNumber',
      width: 80,
      align: 'center',
      render: (n: number) => <Tag color="blue">#{n}</Tag>,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Space direction="vertical" size={2}>
          <span>{title}</span>
          {record.description && (
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span>
            <ClockCircleOutlined /> <DateDisplay value={record.startTime} format="long" />
          </span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            → <DateDisplay value={record.endTime} format="long" />
          </span>
        </Space>
      ),
    },
    {
      title: 'GV / Trợ giảng',
      key: 'teachers',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          {record.teacherName && (
            <UserAvatar name={record.teacherName} size={24} showName />
          )}
          {record.assistantName && (
            <Tooltip title="Trợ giảng">
              <Space size={4}>
                <UserOutlined style={{ color: '#8c8c8c' }} />
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.assistantName}</span>
              </Space>
            </Tooltip>
          )}
          {!record.teacherName && !record.assistantName && <span>—</span>}
        </Space>
      ),
    },
    {
      title: 'Phòng',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 140,
      render: (v?: string) =>
        v ? (
          <Space size={4}>
            <HomeOutlined />
            {v}
          </Space>
        ) : (
          <span>—</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (s: string) => <StatusTag status={s} />,
    },
  ];

  return (
    <Card title={`Danh sách buổi học (${sessions.length})`}>
      <Table<SessionResponse>
        columns={columns}
        dataSource={sessions}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default CourseSessionList;