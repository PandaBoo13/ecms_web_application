import { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, InputNumber, Space, Button,
  Radio, Checkbox,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import { questionApi } from '@/services/api/course';
import type {
  QuestionResponse,
  QuestionCreateRequest,
  QuestionType,
  CourseResourceResponse,
} from '@/services/types/course';

interface Props {
  courseId: number;
  open: boolean;
  question?: QuestionResponse | null;
  lessons?: CourseResourceResponse[];
  onClose: () => void;
  onSuccess: () => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Một đáp án đúng' },
  { value: 'MULTIPLE_CHOICE', label: 'Nhiều đáp án đúng' },
  { value: 'TRUE_FALSE', label: 'Đúng / Sai' },
  { value: 'SHORT_ANSWER', label: 'Trả lời ngắn' },
];

const QuestionFormModal = ({
  courseId, open, question, lessons = [], onClose, onSuccess,
}: Props) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const questionType = Form.useWatch('questionType', form) as QuestionType | undefined;
  const options = Form.useWatch('options', form) as string[] | undefined;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (question) {
      const isTF = question.questionType === 'TRUE_FALSE';
      const isShort = question.questionType === 'SHORT_ANSWER';
      form.setFieldsValue({
        lessonId: question.lessonId,
        questionType: question.questionType,
        content: question.content,
        options: question.options || ['', '', '', ''],
        correctAnswer: !isTF && !isShort ? question.correctAnswer || [] : undefined,
        trueFalse: isTF ? (question.correctAnswer?.[0] ?? 'true') : undefined,
        shortAnswer: isShort ? (question.correctAnswer?.[0] ?? '') : undefined,
        explanation: question.explanation,
        hashtag: question.hashtag,
        points: question.points ?? 1,
        orderIndex: question.orderIndex,
        status: question.status ?? 'ACTIVE',
      });
    } else {
      form.setFieldsValue({
        questionType: 'SINGLE_CHOICE',
        options: ['', '', '', ''],
        correctAnswer: [],
        points: 1,
        status: 'ACTIVE',
      });
    }
  }, [open, question, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let correctAnswer: string[] | undefined;
      if (values.questionType === 'TRUE_FALSE') {
        correctAnswer = [String(values.trueFalse ?? 'true')];
      } else if (values.questionType === 'SHORT_ANSWER') {
        correctAnswer = [String(values.shortAnswer || '').trim()];
      } else {
        correctAnswer = Array.isArray(values.correctAnswer) ? values.correctAnswer : [];
      }

      const payload: QuestionCreateRequest = {
        lessonId: values.lessonId || undefined,
        questionType: values.questionType,
        content: values.content.trim(),
        options:
          values.questionType === 'SINGLE_CHOICE' ||
          values.questionType === 'MULTIPLE_CHOICE'
            ? (values.options as string[]).map((o) => o?.trim()).filter(Boolean)
            : undefined,
        correctAnswer,
        explanation: values.explanation?.trim() || undefined,
        hashtag: values.hashtag?.trim() || undefined,
        points: values.points ?? 1,
        orderIndex: values.orderIndex,
        status: values.status || 'ACTIVE',
      };

      if (question) {
        await questionApi.update(courseId, question.id, payload);
        toast.success('Cập nhật câu hỏi thành công');
      } else {
        await questionApi.create(courseId, payload);
        toast.success('Tạo câu hỏi thành công');
      }
      onSuccess();
      onClose();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Lưu câu hỏi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={question ? `Sửa câu hỏi #${question.id}` : 'Tạo câu hỏi mới'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={question ? 'Cập nhật' : 'Tạo câu hỏi'}
      cancelText="Hủy"
      width={760}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item
            name="questionType"
            label="Loại câu hỏi"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <Select options={QUESTION_TYPES} />
          </Form.Item>

          <Form.Item name="lessonId" label="Gắn vào bài học (tùy chọn)" style={{ flex: 1 }}>
            <Select
              placeholder="Không gắn bài học"
              allowClear
              showSearch
              optionFilterProp="label"
              options={lessons
                .filter((l) => l.resourceType === 'LESSON')
                .map((l) => ({ value: l.id, label: l.title }))}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="content"
          label="Nội dung câu hỏi"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung câu hỏi' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="VD: Thì hiện tại hoàn thành được dùng để diễn tả hành động..."
          />
        </Form.Item>

        {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Các đáp án</div>
            <Form.List
              name="options"
              rules={[
                {
                  validator: async (_, opts) => {
                    if (!opts || opts.filter((o: string) => o?.trim()).length < 2) {
                      return Promise.reject(new Error('Cần ít nhất 2 đáp án'));
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  {fields.map((field, idx) => (
                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }}>
                      <Form.Item
                        {...field}
                        rules={[
                          {
                            validator: async (_, val) => {
                              if (!val || !val.trim()) {
                                return Promise.reject(new Error(`Nhập đáp án ${idx + 1}`));
                              }
                            },
                          },
                        ]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Input placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`} />
                      </Form.Item>
                      {fields.length > 2 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      )}
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add('')}
                    block
                  >
                    Thêm đáp án
                  </Button>
                  <Form.ErrorList errors={errors} />
                </>
              )}
            </Form.List>

            {questionType === 'SINGLE_CHOICE' && (
              <Form.Item
                name="correctAnswer"
                label="Chọn đáp án đúng"
                rules={[
                  {
                    required: true,
                    type: 'array',
                    min: 1,
                    message: 'Chọn 1 đáp án đúng',
                  },
                  {
                    validator: async (_, v) => {
                      if (Array.isArray(v) && v.length > 1) {
                        return Promise.reject(new Error('Chỉ được chọn 1 đáp án'));
                      }
                    },
                  },
                ]}
                style={{ marginTop: 12 }}
              >
                <Radio.Group>
                  <Space direction="vertical">
                    {(options || []).map((opt, idx) =>
                      opt ? (
                        <Radio key={idx} value={opt}>
                          {String.fromCharCode(65 + idx)}. {opt}
                        </Radio>
                      ) : null,
                    )}
                  </Space>
                </Radio.Group>
              </Form.Item>
            )}

            {questionType === 'MULTIPLE_CHOICE' && (
              <Form.Item
                name="correctAnswer"
                label="Chọn các đáp án đúng"
                rules={[
                  {
                    required: true,
                    type: 'array',
                    min: 1,
                    message: 'Chọn ít nhất 1 đáp án',
                  },
                ]}
                style={{ marginTop: 12 }}
              >
                <Checkbox.Group>
                  <Space direction="vertical">
                    {(options || []).map((opt, idx) =>
                      opt ? (
                        <Checkbox key={idx} value={opt}>
                          {String.fromCharCode(65 + idx)}. {opt}
                        </Checkbox>
                      ) : null,
                    )}
                  </Space>
                </Checkbox.Group>
              </Form.Item>
            )}
          </>
        )}

        {questionType === 'TRUE_FALSE' && (
          <Form.Item
            name="trueFalse"
            label="Đáp án đúng"
            rules={[{ required: true, message: 'Chọn đáp án' }]}
          >
            <Radio.Group>
              <Radio value="true">Đúng (True)</Radio>
              <Radio value="false">Sai (False)</Radio>
            </Radio.Group>
          </Form.Item>
        )}

        {questionType === 'SHORT_ANSWER' && (
          <Form.Item
            name="shortAnswer"
            label="Đáp án đúng"
            rules={[{ required: true, message: 'Nhập đáp án đúng' }]}
          >
            <Input placeholder="Đáp án chính xác" />
          </Form.Item>
        )}

        <Form.Item name="explanation" label="Giải thích (tùy chọn)">
          <Input.TextArea rows={2} placeholder="Giải thích đáp án đúng..." />
        </Form.Item>

        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item name="hashtag" label="Hashtag" style={{ flex: 1 }}>
            <Input placeholder="VD: grammar, tuong-lai" />
          </Form.Item>
          <Form.Item name="points" label="Điểm" style={{ width: 100 }}>
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="orderIndex" label="Thứ tự" style={{ width: 100 }}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" style={{ width: 130 }}>
            <Select
              options={[
                { value: 'ACTIVE', label: 'Hoạt động' },
                { value: 'INACTIVE', label: 'Tạm ẩn' },
              ]}
            />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};

export default QuestionFormModal;