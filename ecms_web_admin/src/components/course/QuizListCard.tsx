import { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber,
  Switch, Select, Popconfirm, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import DateDisplay from '@/components/common/DateDisplay';
import InlineEdit from '@/components/common/InlineEdit';
import { quizApi } from '@/services/api/courses';
import type { QuizResponse, QuizCreateRequest } from '@/services/types/course';

interface Props {
  courseId: number;
}

const QuizListCard = ({ courseId }: Props) => {
  const [data, setData] = useState<QuizResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<QuizCreateRequest>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quizApi.list(courseId);
      setData(res);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được danh sách quiz');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await quizApi.create(courseId, values);
      toast.success('Tạo quiz thành công');
      setCreateOpen(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Tạo quiz thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await quizApi.delete(courseId, id);
      toast.success('Đã xóa quiz');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa thất bại');
    }
  };

  const handleUpdateTitle = async (id: number, newTitle: string, record: QuizResponse) => {
    try {
      await quizApi.update(courseId, id, {
        title: newTitle,
        quizType: record.quizType,
        passingScore: record.passingScore,
        maxAttempts: record.maxAttempts,
        timeLimit: record.timeLimit,
        shuffleQuestions: record.shuffleQuestions,
        totalQuestions: record.totalQuestions,
        hashtagFilter: record.hashtagFilter,
      });
      toast.success('Đã cập nhật tiêu đề Quiz');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Cập nhật thất bại');
      throw err;
    }
  };

  const columns: ColumnsType<QuizResponse> = [
    { title: 'ID', dataIndex: 'id', width: 70, align: 'center' },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      ellipsis: true,
      render: (title: string, record) => (
        <InlineEdit
          value={title}
          onSave={(newVal) => handleUpdateTitle(record.id, newVal, record)}
        />
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'quizType',
      width: 120,
      align: 'center',
      render: (t: string) => (
        <Tag color={t === 'MANDATORY' ? 'purple' : 'default'}>
          {t === 'MANDATORY' ? 'Bắt buộc' : 'Tự chọn'}
        </Tag>
      ),
    },
    {
      title: 'Passing',
      dataIndex: 'passingScore',
      width: 90,
      align: 'center',
      render: (v?: number) => (v !== undefined && v !== null ? `${v}%` : '—'),
    },
    {
      title: 'Max attempts',
      dataIndex: 'maxAttempts',
      width: 110,
      align: 'center',
      render: (v?: number) => v ?? '∞',
    },
    {
      title: 'Số câu',
      dataIndex: 'totalQuestions',
      width: 90,
      align: 'center',
      render: (v?: number) => v ?? '—',
    },
    {
      title: 'Time limit',
      dataIndex: 'timeLimit',
      width: 110,
      align: 'center',
      render: (v?: number) => (v ? `${v} phút` : '—'),
    },
    {
      title: 'Hashtag filter',
      dataIndex: 'hashtagFilter',
      width: 160,
      ellipsis: true,
      render: (v?: string) => v || <span style={{ color: '#bfbfbf' }}>—</span>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 130,
      render: (v: string) => <DateDisplay value={v} />,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm
          title="Xóa quiz này?"
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
      ),
    },
  ];

  return (
    <>
      <Card
        title={`Danh sách Quiz (${data.length})`}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Tạo Quiz
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontStyle: 'italic', fontSize: 13, color: '#888' }}>
            * Mẹo: Nhấp đúp chuột vào tiêu đề để sửa nhanh.
          </span>
        </div>
        <Table<QuizResponse>
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Chưa có quiz nào' }}
        />
      </Card>

      <Modal
        title="Tạo Quiz mới"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="Tạo"
        cancelText="Hủy"
        width={560}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            quizType: 'OPTIONAL',
            passingScore: 70,
            totalQuestions: 10,
            shuffleQuestions: false,
          }}
          style={{ marginTop: 12 }}
        >
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input maxLength={255} placeholder="VD: Kiểm tra chương 1" />
          </Form.Item>

          <Form.Item name="quizType" label="Loại Quiz" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'OPTIONAL', label: 'Tự chọn (OPTIONAL)' },
                { value: 'MANDATORY', label: 'Bắt buộc pass (MANDATORY)' },
              ]}
            />
          </Form.Item>

          <Space size={12} style={{ display: 'flex' }}>
            <Form.Item name="passingScore" label="Điểm pass (%)" rules={[{ required: true, message: 'Bắt buộc' }]} style={{ flex: 1 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxAttempts" label="Số lần làm tối đa" style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Để trống = không giới hạn" />
            </Form.Item>
          </Space>

          <Space size={12} style={{ display: 'flex' }}>
            <Form.Item name="timeLimit" label="Giới hạn (phút)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="Để trống" />
            </Form.Item>
            <Form.Item name="totalQuestions" label="Số câu hỏi" rules={[{ required: true, message: 'Bắt buộc' }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="hashtagFilter" label="Hashtag filter">
            <Input maxLength={500} placeholder="VD: chuong1,grammar (phân cách bằng dấu phẩy)" />
          </Form.Item>

          <Form.Item name="shuffleQuestions" label="Đảo câu hỏi" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default QuizListCard;