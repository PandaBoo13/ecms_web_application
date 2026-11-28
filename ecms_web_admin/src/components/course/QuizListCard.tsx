// src/components/course/QuizListCard.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Popconfirm,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  CheckSquareOutlined,
  LockOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import DateDisplay from '@/components/common/DateDisplay';
import InlineEdit from '@/components/common/InlineEdit';
import QuizAttemptsModal from '@/components/course/QuizAttemptsModal';

import { quizApi, resourceApi } from '@/services/api/course';
import type { QuizResponse, QuizCreateRequest } from '@/services/types/course';

type QuizStatusValue = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface QuizWithStatus extends QuizResponse {
  status?: QuizStatusValue;
}

interface QuizPayloadWithStatus extends QuizCreateRequest {
  status?: QuizStatusValue;
}

interface Props {
  courseId: number;
  readOnly?: boolean;
}

const QUIZ_STATUS_META: Record<
  QuizStatusValue,
  { label: string; dotColor: string }
> = {
  PUBLISHED: {
    label: 'Đang mở',
    dotColor: '#10b981',
  },
  DRAFT: {
    label: 'Tạm ẩn (Nháp)',
    dotColor: '#64748b',
  },
  ARCHIVED: {
    label: 'Đã đóng',
    dotColor: '#f59e0b',
  },
};

const QuizListCard = ({ courseId, readOnly = false }: Props) => {
  const [data, setData] = useState<QuizWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizWithStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<QuizPayloadWithStatus>();

  const [attemptModalOpen, setAttemptModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quizApi.list(courseId);
      setData(res as QuizWithStatus[]);
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Không tải được danh sách quiz',
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    if (readOnly) return;
    setEditingQuiz(null);
    form.resetFields();
    form.setFieldsValue({
      quizType: 'OPTIONAL',
      status: 'PUBLISHED',
      passingScore: 70,
      totalQuestions: 10,
      shuffleQuestions: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (record: QuizWithStatus) => {
    setEditingQuiz(record);
    form.setFieldsValue({
      title: record.title,
      quizType: record.quizType,
      status: record.status ?? 'PUBLISHED',
      passingScore: record.passingScore,
      maxAttempts: record.maxAttempts,
      timeLimit: record.timeLimit,
      totalQuestions: record.totalQuestions,
      hashtagFilter: record.hashtagFilter,
      shuffleQuestions: record.shuffleQuestions,
    });
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingQuiz) {
        if (readOnly) {
          // Khi khóa học đã khóa cấu trúc, gọi resourceApi.update với đúng trường status
          await resourceApi.update(courseId, editingQuiz.id, {
            status: values.status,
          });
          toast.success('Đã cập nhật trạng thái Quiz');
        } else {
          await quizApi.update(
            courseId,
            editingQuiz.id,
            values as QuizCreateRequest,
          );
          toast.success('Cập nhật cấu hình Quiz thành công');
        }
      } else {
        await quizApi.create(courseId, values as QuizCreateRequest);
        toast.success('Tạo Quiz mới thành công');
      }

      setModalOpen(false);
      setEditingQuiz(null);
      form.resetFields();
      fetchData();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Lưu Quiz thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Đổi trạng thái trực tiếp trên từng dòng qua resourceApi.update (hỗ trợ cả khi course != DRAFT)
  const handleStatusChange = async (
    record: QuizWithStatus,
    nextStatus: QuizStatusValue,
  ) => {
    if ((record.status || 'PUBLISHED') === nextStatus) return;
    setUpdatingStatusId(record.id);
    try {
      await resourceApi.update(courseId, record.id, {
        status: nextStatus,
      });

      toast.success(
        `Đã chuyển "${record.title}" sang ${QUIZ_STATUS_META[nextStatus].label}`,
      );
      setData((prev) =>
        prev.map((q) => (q.id === record.id ? { ...q, status: nextStatus } : q)),
      );
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Đổi trạng thái Quiz thất bại',
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (readOnly) return;
    try {
      await quizApi.delete(courseId, id);
      toast.success('Đã xóa quiz');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa thất bại');
    }
  };

  const handleUpdateTitle = async (
    id: number,
    newTitle: string,
    record: QuizWithStatus,
  ) => {
    if (readOnly) return;
    try {
      const payload: QuizPayloadWithStatus = {
        title: newTitle,
        quizType: record.quizType,
        passingScore: record.passingScore,
        maxAttempts: record.maxAttempts,
        timeLimit: record.timeLimit,
        shuffleQuestions: record.shuffleQuestions,
        totalQuestions: record.totalQuestions,
        hashtagFilter: record.hashtagFilter,
        status: record.status,
      };
      await quizApi.update(courseId, id, payload as QuizCreateRequest);
      toast.success('Đã cập nhật tiêu đề Quiz');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Cập nhật thất bại');
      throw err;
    }
  };

  const openAttempts = (quiz: QuizResponse) => {
    setSelectedQuiz(quiz);
    setAttemptModalOpen(true);
  };

  const columns: ColumnsType<QuizWithStatus> = [
    {
      title: '#',
      dataIndex: 'id',
      width: 64,
      align: 'center',
      render: (id: number) => (
        <span className="font-mono text-xs text-slate-400">#{id}</span>
      ),
    },
    {
      title: 'Tên bài kiểm tra',
      dataIndex: 'title',
      minWidth: 220,
      ellipsis: true,
      render: (title: string, record) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          {readOnly ? (
            <span className="font-semibold text-slate-800 text-[13.5px] truncate">
              {title}
            </span>
          ) : (
            <div className="font-semibold text-slate-800 text-[13.5px]">
              <InlineEdit
                value={title}
                onSave={(newVal) => handleUpdateTitle(record.id, newVal, record)}
              />
            </div>
          )}
          {record.hashtagFilter && (
            <span className="text-[11px] font-mono text-slate-400 truncate">
              #{record.hashtagFilter}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 175,
      align: 'center',
      render: (status: QuizStatusValue | undefined, record) => {
        const current: QuizStatusValue = status || 'PUBLISHED';
        return (
          <Select<QuizStatusValue>
            size="small"
            value={current}
            loading={updatingStatusId === record.id}
            onChange={(val) => void handleStatusChange(record, val)}
            className="w-[155px]"
            popupMatchSelectWidth={false}
            options={(Object.keys(QUIZ_STATUS_META) as QuizStatusValue[]).map(
              (key) => {
                const meta = QUIZ_STATUS_META[key];
                return {
                  value: key,
                  label: (
                    <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta.dotColor }}
                      />
                      <span>{meta.label}</span>
                    </span>
                  ),
                };
              },
            )}
          />
        );
      },
    },
    {
      title: 'Phân loại',
      dataIndex: 'quizType',
      width: 115,
      align: 'center',
      render: (t: string) => (
        <Tag
          color={t === 'MANDATORY' ? 'purple' : 'default'}
          className="!m-0 !rounded-full !text-[11.5px] !font-medium !px-2.5"
        >
          {t === 'MANDATORY' ? 'Bắt buộc' : 'Tự chọn'}
        </Tag>
      ),
    },
    {
      title: 'Điểm đạt',
      dataIndex: 'passingScore',
      width: 95,
      align: 'center',
      render: (v?: number) =>
        v !== undefined && v !== null ? (
          <span className="font-semibold text-slate-700 tabular-nums text-[13px]">
            {v}%
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      title: 'Lượt làm',
      dataIndex: 'maxAttempts',
      width: 95,
      align: 'center',
      render: (v?: number) => (
        <span className="text-slate-600 tabular-nums text-[13px]">
          {v ?? 'Không giới hạn'}
        </span>
      ),
    },
    {
      title: 'Số câu',
      dataIndex: 'totalQuestions',
      width: 85,
      align: 'center',
      render: (v?: number) => (
        <span className="font-medium text-slate-700 tabular-nums text-[13px]">
          {v ?? '—'}
        </span>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'timeLimit',
      width: 105,
      align: 'center',
      render: (v?: number) =>
        v ? (
          <span className="inline-flex items-center gap-1 text-slate-600 tabular-nums text-[12.5px]">
            <ClockCircleOutlined className="text-slate-400 text-[11px]" />
            {v} phút
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => (
        <span className="text-slate-500 text-[12.5px]">
          <DateDisplay value={v} />
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Lịch sử làm bài của học viên">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openAttempts(record)}
              className="!text-slate-500 hover:!text-blue-600"
            />
          </Tooltip>

          <Tooltip
            title={
              readOnly ? 'Điều chỉnh trạng thái Quiz' : 'Chỉnh sửa cấu hình Quiz'
            }
          >
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              className="!text-slate-500 hover:!text-indigo-600"
            />
          </Tooltip>

          {!readOnly && (
            <Popconfirm
              title="Xóa bài kiểm tra này?"
              description="Dữ liệu đề thi sẽ bị xóa vĩnh viễn."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title="Xóa Quiz">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        className="!rounded-xl border-slate-200/90 shadow-none"
        styles={{ body: { padding: '14px 16px' } }}
        title={
          <div className="flex flex-wrap items-center gap-2.5">
            <CheckSquareOutlined className="text-purple-600" />
            <span className="font-semibold text-slate-800 text-[14.5px]">
              Danh sách Quiz
            </span>
            <Tag
              color="purple"
              className="!m-0 !rounded-full !text-[11px] font-semibold tabular-nums"
            >
              {data.length}
            </Tag>

            {readOnly ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600">
                <LockOutlined className="text-[10.5px] text-slate-500" />
                Cố định đề thi • Chỉ cho phép đổi trạng thái mở/ẩn
              </span>
            ) : (
              <span className="text-[12px] font-normal text-slate-400 hidden sm:inline">
                Nhấp đúp vào tên để sửa nhanh
              </span>
            )}
          </div>
        }
        extra={
          <Space size={8}>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={fetchData}
              className="!rounded-lg"
            >
              Làm mới
            </Button>
            {!readOnly && (
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
                className="!rounded-lg font-medium"
              >
                Tạo Quiz
              </Button>
            )}
          </Space>
        }
      >
        <Table<QuizWithStatus>
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          size="middle"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Chưa có bài kiểm tra nào trong khóa học' }}
        />
      </Card>

      {/* Modal Tạo / Chỉnh sửa Quiz */}
      <Modal
        title={
          <span className="text-[15.5px] font-bold text-slate-900">
            {editingQuiz
              ? readOnly
                ? 'Điều chỉnh trạng thái Quiz'
                : 'Chỉnh sửa cấu hình Quiz'
              : 'Tạo Quiz mới'}
          </span>
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingQuiz(null);
        }}
        onOk={handleSaveModal}
        confirmLoading={submitting}
        okText={editingQuiz ? 'Lưu thay đổi' : 'Tạo Quiz'}
        cancelText="Hủy"
        okButtonProps={{ className: '!rounded-lg font-medium' }}
        cancelButtonProps={{ className: '!rounded-lg' }}
        width={540}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-3">
          <Form.Item
            name="status"
            label="Trạng thái hiển thị với học viên"
            rules={[{ required: true }]}
          >
            <Select
              options={(Object.keys(QUIZ_STATUS_META) as QuizStatusValue[]).map(
                (key) => {
                  const meta = QUIZ_STATUS_META[key];
                  return {
                    value: key,
                    label: (
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: meta.dotColor }}
                        />
                        <span>{meta.label}</span>
                      </span>
                    ),
                  };
                },
              )}
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input
              maxLength={255}
              disabled={readOnly && !!editingQuiz}
              placeholder="VD: Kiểm tra chương 1"
            />
          </Form.Item>

          <Form.Item
            name="quizType"
            label="Loại Quiz"
            rules={[{ required: true }]}
          >
            <Select
              disabled={readOnly && !!editingQuiz}
              options={[
                { value: 'OPTIONAL', label: 'Tự chọn (OPTIONAL)' },
                { value: 'MANDATORY', label: 'Bắt buộc pass (MANDATORY)' },
              ]}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="passingScore"
              label="Điểm đạt (%)"
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <InputNumber
                min={0}
                max={100}
                disabled={readOnly && !!editingQuiz}
                className="!w-full"
              />
            </Form.Item>
            <Form.Item name="maxAttempts" label="Số lần làm tối đa">
              <InputNumber
                min={1}
                disabled={readOnly && !!editingQuiz}
                className="!w-full"
                placeholder="Không giới hạn"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="timeLimit" label="Giới hạn thời gian (phút)">
              <InputNumber
                min={0}
                disabled={readOnly && !!editingQuiz}
                className="!w-full"
                placeholder="Không giới hạn"
              />
            </Form.Item>
            <Form.Item
              name="totalQuestions"
              label="Số câu hỏi"
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <InputNumber
                min={1}
                disabled={readOnly && !!editingQuiz}
                className="!w-full"
              />
            </Form.Item>
          </div>

          <Form.Item name="hashtagFilter" label="Hashtag lọc câu hỏi">
            <Input
              maxLength={500}
              disabled={readOnly && !!editingQuiz}
              placeholder="VD: chuong1, grammar (phân cách bằng dấu phẩy)"
            />
          </Form.Item>

          <Form.Item
            name="shuffleQuestions"
            label="Đảo ngẫu nhiên thứ tự câu hỏi"
            valuePropName="checked"
            className="!mb-0"
          >
            <Switch disabled={readOnly && !!editingQuiz} />
          </Form.Item>
        </Form>
      </Modal>

      {selectedQuiz && (
        <QuizAttemptsModal
          open={attemptModalOpen}
          onClose={() => setAttemptModalOpen(false)}
          courseId={courseId}
          quizId={selectedQuiz.id}
          quizTitle={selectedQuiz.title}
        />
      )}
    </>
  );
};

export default QuizListCard;