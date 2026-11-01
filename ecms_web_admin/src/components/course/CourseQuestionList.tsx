import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Space, Empty, Typography, Select, Button, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import QuestionFormModal from './QuestionFormModal';
import { questionApi, resourceApi } from '@/services/api/course';
import type { QuestionResponse, QuestionType, CourseResourceResponse } from '@/services/types/course';

const { Text } = Typography;

interface Props {
  courseId: number;
}

const CourseQuestionList = ({ courseId }: Props) => {
  const [data, setData] = useState<QuestionResponse[]>([]);
  const [resources, setResources] = useState<CourseResourceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<QuestionType | undefined>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionResponse | null>(null);

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

  // Load resources 1 lần để làm picker lessonId
  useEffect(() => {
    resourceApi
      .getTree(courseId)
      .then((tree) => {
        // Flatten tree (BE trả tree nhưng cũng chấp nhận flat)
        const flat: CourseResourceResponse[] = [];
        const walk = (nodes: CourseResourceResponse[]) => {
          nodes.forEach((n) => {
            flat.push(n);
            if (n.children) walk(n.children as unknown as CourseResourceResponse[]);
          });
        };
        walk(tree as unknown as CourseResourceResponse[]);
        setResources(flat);
      })
      .catch(() => {});
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter]);

  const handleDelete = async (id: number) => {
    try {
      await questionApi.delete(courseId, id);
      toast.success('Đã xóa câu hỏi');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa thất bại');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (q: QuestionResponse) => {
    setEditing(q);
    setModalOpen(true);
  };

  const columns: ColumnsType<QuestionResponse> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
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
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Xóa câu hỏi này?"
            description="Không thể hoàn tác"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={`Ngân hàng câu hỏi (${total})`}
        extra={
          <Space>
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
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo câu hỏi
            </Button>
          </Space>
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

      <QuestionFormModal
        courseId={courseId}
        open={modalOpen}
        question={editing}
        lessons={resources}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
      />
    </>
  );
};

export default CourseQuestionList;