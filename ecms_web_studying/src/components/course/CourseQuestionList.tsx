import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Space, Empty, Typography, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import { questionApi } from '@/services/api/courses';
import type { QuestionResponse, QuestionType } from '@/services/types/course';

const { Text } = Typography;

interface Props {
  courseId: number;
}

const CourseQuestionList = ({ courseId }: Props) => {
  const [data, setData] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<QuestionType | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, size };
      if (typeFilter) params.questionType = typeFilter;

      const res = await questionApi.search(courseId, params);
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được câu hỏi');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, page, size, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter]);

  const columns: ColumnsType<QuestionResponse> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      align: 'center',
    },
    {
      title: 'Câu hỏi',
      dataIndex: 'content',
      key: 'content',
      render: (content: string, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text>{content}</Text>
          {record.hashtag && <Tag color="purple">{record.hashtag}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'questionType',
      key: 'questionType',
      width: 150,
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: 'Lesson',
      dataIndex: 'lessonTitle',
      key: 'lessonTitle',
      width: 200,
      ellipsis: true,
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Điểm',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'center',
      render: (p: number) => <Text strong>{p}</Text>,
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
    <Card
      title={`Ngân hàng câu hỏi (${total})`}
      extra={
        <Select
          placeholder="Loại câu hỏi"
          allowClear
          style={{ width: 180 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'SINGLE_CHOICE', label: 'Một đáp án' },
            { value: 'MULTIPLE_CHOICE', label: 'Nhiều đáp án' },
            { value: 'TRUE_FALSE', label: 'Đúng/Sai' },
            { value: 'SHORT_ANSWER', label: 'Trả lời ngắn' },
          ]}
        />
      }
    >
      {!loading && data.length === 0 ? (
        <Empty description="Chưa có câu hỏi nào" />
      ) : (
        <Table<QuestionResponse>
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page + 1,
            pageSize: size,
            total,
            showSizeChanger: true,
            showTotal: (t) => `Tổng ${t} câu hỏi`,
            onChange: (p, s) => {
              setPage(p - 1);
              setSize(s);
            },
          }}
        />
      )}
    </Card>
  );
};

export default CourseQuestionList;