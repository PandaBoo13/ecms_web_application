// src/components/course/QuizAttemptsModal.tsx
import { useEffect, useState } from 'react';
import { Modal, Table, Tag, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

// ✅ SỬA LỖI 1: Import đúng object `quizApi` (không phải `api`)
import { quizApi } from '@/services/api/course/quizApi';
import type { QuizAttemptResponse } from '@/services/types/course/quiz';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: number;
  quizId: number;
  quizTitle: string;
}

const QuizAttemptsModal = ({ open, onClose, courseId, quizId, quizTitle }: Props) => {
  const [attempts, setAttempts] = useState<QuizAttemptResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && courseId && quizId) {
      setLoading(true);
      
      // ✅ SỬA LỖI 2: Gọi qua `quizApi` thay vì `api.get`.
      // Vì BE hiện tại chỉ có API getMyAttempts, nên ta dùng tạm API này.
      // (Lưu ý: API này BE đang code là chỉ trả về bài làm của user đang login).
      quizApi.getMyAttempts(courseId, quizId)
        .then((data) => {
          setAttempts(data || []);
        })
        .catch((err) => {
          toast.error(err?.message || 'Không thể tải lịch sử làm bài');
          setAttempts([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open, courseId, quizId]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} phút ${s} giây`;
  };

  const columns: ColumnsType<QuizAttemptResponse> = [
    {
      title: 'Lần làm',
      dataIndex: 'attemptNumber',
      width: 90,
      align: 'center',
      render: (val) => <Text strong>Lần {val}</Text>,
    },
    {
      // ✅ SỬA LỖI 3: Chỉ hiển thị Account ID theo đúng type hiện tại của FE
      title: 'Học viên',
      dataIndex: 'accountId',
      render: (val) => <Tag color="blue">Account #{val}</Tag>,
    },
    {
      title: 'Điểm số',
      key: 'score',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <span>
          <Text strong style={{ color: record.isPassed ? '#16a34a' : '#dc2626' }}>
            {record.score ?? 0}
          </Text>
          <Text type="secondary"> / {record.maxScore ?? 0}</Text>
        </span>
      ),
    },
    {
      title: 'Kết quả',
      dataIndex: 'isPassed',
      width: 120,
      align: 'center',
      render: (isPassed: boolean, record) => {
        if (record.status === 'IN_PROGRESS') {
          return <Tag color="orange">Đang làm</Tag>;
        }
        return isPassed ? (
          <Tag icon={<CheckCircleOutlined />} color="success">ĐẬU</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">RỚT</Tag>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      align: 'center',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          IN_PROGRESS: 'orange',
          SUBMITTED: 'blue',
          GRADED: 'green',
          TIMEOUT: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startedAt',
      width: 160,
      render: (val: string) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Thời gian nộp',
      dataIndex: 'submittedAt',
      width: 160,
      render: (val: string) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Thời gian làm bài',
      dataIndex: 'timeSpent',
      width: 140,
      align: 'center',
      render: (val: number) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          {formatDuration(val)}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={`Lịch sử làm bài: ${quizTitle}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      <Table<QuizAttemptResponse>
        columns={columns}
        dataSource={attempts}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Chưa có ai làm bài kiểm tra này' }}
      />
    </Modal>
  );
};

export default QuizAttemptsModal;