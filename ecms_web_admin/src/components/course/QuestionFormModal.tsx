import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Drawer, Form, Input, Select, InputNumber, Button,
  Radio, Checkbox, Segmented, Upload, Alert, Table, Tag, Space,
} from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  PlusOutlined, DeleteOutlined, CheckCircleOutlined,
  CheckSquareOutlined, QuestionCircleOutlined, FileTextOutlined,
  TagOutlined, FileExcelOutlined, InboxOutlined, DownloadOutlined,
  CloseCircleOutlined, FormOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { questionApi } from '@/services/api/course/questionApi';
import type {
  QuestionResponse,
  QuestionCreateRequest,
  QuestionType,
  CourseResourceResponse,
  QuestionImportResult,
  QuestionImportRowError,
} from '@/services/types/course';

const { Dragger } = Upload;

interface Props {
  courseId: number;
  open: boolean;
  question?: QuestionResponse | null;
  lessons?: CourseResourceResponse[];
  onClose: () => void;
  onSuccess: () => void;
}

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: 'SINGLE_CHOICE', label: 'Một đáp án', icon: <CheckCircleOutlined /> },
  { value: 'MULTIPLE_CHOICE', label: 'Nhiều đáp án', icon: <CheckSquareOutlined /> },
  { value: 'TRUE_FALSE', label: 'Đúng / Sai', icon: <QuestionCircleOutlined /> },
  { value: 'SHORT_ANSWER', label: 'Trả lời ngắn', icon: <FileTextOutlined /> },
];

const QuestionFormModal = ({
  courseId, open, question, lessons = [], onClose, onSuccess,
}: Props) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const contentInputRef = useRef<TextAreaRef | null>(null);

  // Chế độ nhập: 'manual' (từng câu) | 'excel' (import hàng loạt)
  const [createMode, setCreateMode] = useState<'manual' | 'excel'>('manual');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [downloadingTpl, setDownloadingTpl] = useState(false);
  const [importResult, setImportResult] = useState<QuestionImportResult | null>(null);

  const questionType = (Form.useWatch('questionType', form) || 'SINGLE_CHOICE') as QuestionType;
  const options = (Form.useWatch('options', form) || []) as string[];
  const correctAnswer = (Form.useWatch('correctAnswer', form) || []) as string[];

  const lessonSelectOptions = useMemo(() => {
    const chapterMap = new Map(
      lessons.filter((r) => r.resourceType === 'CHAPTER').map((c) => [c.id, c]),
    );
    return lessons
      .filter((r) => r.resourceType === 'LESSON')
      .sort((a, b) => {
        const chA = a.parentId ? chapterMap.get(a.parentId)?.orderIndex ?? 9999 : 9999;
        const chB = b.parentId ? chapterMap.get(b.parentId)?.orderIndex ?? 9999 : 9999;
        return chA - chB || a.orderIndex - b.orderIndex;
      })
      .map((l) => {
        const chTitle = l.parentId ? chapterMap.get(l.parentId)?.title : undefined;
        return {
          value: l.id,
          label: chTitle ? `${chTitle} › ${l.title}` : l.title,
        };
      });
  }, [lessons]);

  useEffect(() => {
    if (!open) return;
    setCreateMode('manual');
    setFileList([]);
    setImportResult(null);
    form.resetFields();

    if (question) {
      const isTF = question.questionType === 'TRUE_FALSE';
      const isShort = question.questionType === 'SHORT_ANSWER';
      form.setFieldsValue({
        lessonId: question.lessonId ?? undefined,
        questionType: question.questionType,
        content: question.content,
        options: question.options?.length ? question.options : ['', '', '', ''],
        correctAnswer: !isTF && !isShort ? question.correctAnswer || [] : [],
        trueFalse: isTF ? (question.correctAnswer?.[0] ?? 'true') : 'true',
        shortAnswer: isShort ? (question.correctAnswer?.[0] ?? '') : '',
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
        trueFalse: 'true',
        points: 1,
        status: 'ACTIVE',
      });
    }
  }, [open, question, form]);

  const toggleCorrectOption = (optValue: string) => {
    const trimmed = optValue.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập nội dung đáp án trước khi chọn làm đáp án đúng');
      return;
    }
    if (questionType === 'SINGLE_CHOICE') {
      form.setFieldValue('correctAnswer', [trimmed]);
    } else if (questionType === 'MULTIPLE_CHOICE') {
      const exists = correctAnswer.includes(trimmed);
      const next = exists
        ? correctAnswer.filter((v) => v !== trimmed)
        : [...correctAnswer, trimmed];
      form.setFieldValue('correctAnswer', next);
    }
  };

  const handleOptionTextChange = (oldVal: string, newVal: string) => {
    const oldTrimmed = (oldVal || '').trim();
    const newTrimmed = (newVal || '').trim();
    if (!oldTrimmed || !correctAnswer.includes(oldTrimmed)) return;

    const updated = newTrimmed
      ? correctAnswer.map((ans) => (ans === oldTrimmed ? newTrimmed : ans))
      : correctAnswer.filter((ans) => ans !== oldTrimmed);
    form.setFieldValue('correctAnswer', updated);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const isChoice =
        values.questionType === 'SINGLE_CHOICE' || values.questionType === 'MULTIPLE_CHOICE';

      const cleanedOptions = isChoice
        ? (values.options as string[]).map((o) => o?.trim()).filter(Boolean)
        : undefined;

      let finalCorrectAnswer: string[] = [];
      if (values.questionType === 'TRUE_FALSE') {
        finalCorrectAnswer = [String(values.trueFalse ?? 'true')];
      } else if (values.questionType === 'SHORT_ANSWER') {
        finalCorrectAnswer = [String(values.shortAnswer || '').trim()];
      } else if (cleanedOptions) {
        const rawSelected: string[] = Array.isArray(values.correctAnswer)
          ? values.correctAnswer
          : [];
        finalCorrectAnswer = rawSelected
          .map((s) => s.trim())
          .filter((s) => cleanedOptions.includes(s));

        if (finalCorrectAnswer.length === 0) {
          toast.error('Vui lòng đánh dấu ít nhất 1 đáp án đúng');
          return;
        }
        if (values.questionType === 'SINGLE_CHOICE' && finalCorrectAnswer.length > 1) {
          finalCorrectAnswer = [finalCorrectAnswer[0]];
        }
      }

      setSubmitting(true);

      const payload: QuestionCreateRequest = {
        lessonId: values.lessonId ?? null,
        questionType: values.questionType,
        content: values.content.trim(),
        options: cleanedOptions,
        correctAnswer: finalCorrectAnswer,
        explanation: values.explanation?.trim() || undefined,
        hashtag: values.hashtag?.trim() || undefined,
        points: values.points ?? 1,
        orderIndex: values.orderIndex,
        status: values.status || 'ACTIVE',
      };

      if (question) {
        await questionApi.update(courseId, question.id, payload);
        toast.success('Cập nhật câu hỏi thành công');
        onSuccess();
        onClose();
      } else {
        await questionApi.create(courseId, payload);
        toast.success('Tạo câu hỏi thành công — tiếp tục nhập câu tiếp theo');
        onSuccess();
        form.setFieldsValue({
          content: '',
          options: ['', '', '', ''],
          correctAnswer: [],
          trueFalse: 'true',
          shortAnswer: '',
          explanation: '',
          orderIndex:
            typeof values.orderIndex === 'number' ? values.orderIndex + 1 : undefined,
        });
        setTimeout(() => contentInputRef.current?.focus(), 50);
      }
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Lưu câu hỏi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTpl(true);
    try {
      await questionApi.downloadImportTemplate(courseId);
    } catch {
      toast.error('Không tải được file Excel mẫu');
    } finally {
      setDownloadingTpl(false);
    }
  };

  const handleImportExcel = async () => {
    const rawFile = fileList[0]?.originFileObj;
    if (!rawFile) {
      toast.error('Vui lòng chọn file Excel (.xlsx)');
      return;
    }

    setUploadingExcel(true);
    try {
      const res = await questionApi.importExcel(courseId, rawFile);
      setImportResult(res);
      if (res.successCount > 0) {
        toast.success(`Đã import thành công ${res.successCount} câu hỏi`);
        onSuccess();
      }
      if (res.failedCount > 0) {
        toast.error(`Có ${res.failedCount} dòng bị lỗi, vui lòng kiểm tra chi tiết bên dưới`);
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Import file Excel thất bại');
    } finally {
      setUploadingExcel(false);
    }
  };

  const isExcelMode = !question && createMode === 'excel';

  return (
    <Drawer
      title={
        <div className="flex flex-col gap-0.5">
          <span className="text-[15.5px] font-semibold text-slate-800">
            {question ? `Chỉnh sửa câu hỏi #${question.id}` : 'Thêm câu hỏi vào ngân hàng'}
          </span>
          <span className="text-[12px] font-normal text-slate-400">
            Câu hỏi sẽ được lưu vào ngân hàng của khóa học và dùng để tạo đề Quiz
          </span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={660}
      destroyOnClose
      styles={{
        body: { padding: '16px 20px' },
        footer: { padding: '12px 20px', borderTop: '1px solid #f1f5f9' },
      }}
      footer={
        isExcelMode ? (
          <div className="flex items-center justify-between">
            <Button
              icon={<DownloadOutlined />}
              loading={downloadingTpl}
              onClick={handleDownloadTemplate}
            >
              Tải file Excel mẫu (.xlsx)
            </Button>
            <Space>
              <Button onClick={onClose} disabled={uploadingExcel}>
                Đóng
              </Button>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                loading={uploadingExcel}
                disabled={fileList.length === 0}
                onClick={handleImportExcel}
              >
                Bắt đầu Import
              </Button>
            </Space>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button onClick={onClose} disabled={submitting}>
              {question ? 'Hủy' : 'Đóng'}
            </Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting}>
              {question ? 'Lưu thay đổi' : 'Tạo câu hỏi'}
            </Button>
          </div>
        )
      }
    >
      {/* Thanh chuyển đổi chế độ khi tạo mới */}
      {!question && (
        <div className="mb-4">
          <Segmented
            block
            value={createMode}
            onChange={(val) => setCreateMode(val as 'manual' | 'excel')}
            options={[
              {
                value: 'manual',
                label: (
                  <span className="flex items-center justify-center gap-1.5 py-0.5 font-medium">
                    <FormOutlined /> Nhập từng câu
                  </span>
                ),
              },
              {
                value: 'excel',
                label: (
                  <span className="flex items-center justify-center gap-1.5 py-0.5 font-medium">
                    <FileExcelOutlined className="text-emerald-600" /> Import file Excel (.xlsx)
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {isExcelMode ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-[12.5px] text-slate-600 leading-relaxed">
            <div className="font-semibold text-emerald-800 mb-1">Hướng dẫn chuẩn bị file Excel:</div>
            <ul className="list-disc pl-4 space-y-0.5 m-0">
              <li>
                Bấm nút <b>Tải file Excel mẫu (.xlsx)</b> ở góc dưới bên trái để lấy đúng cấu trúc cột.
              </li>
              <li>
                Cột <code>questionType</code> nhận: <code>SINGLE_CHOICE</code>,{' '}
                <code>MULTIPLE_CHOICE</code>, <code>TRUE_FALSE</code>, <code>SHORT_ANSWER</code>.
              </li>
              <li>
                Cột <code>lessonId</code> có thể bỏ trống để đưa câu hỏi vào <b>kho chung toàn khóa học</b>.
              </li>
            </ul>
          </div>

          <Dragger
            accept=".xlsx"
            maxCount={1}
            fileList={fileList}
            beforeUpload={(file) => {
              if (!file.name.toLowerCase().endsWith('.xlsx')) {
                toast.error('Chỉ hỗ trợ định dạng .xlsx');
                return Upload.LIST_IGNORE;
              }
              setImportResult(null);
              setFileList([{ uid: file.uid, name: file.name, status: 'done', originFileObj: file }]);
              return false;
            }}
            onRemove={() => {
              setFileList([]);
              setImportResult(null);
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined className="!text-emerald-600" />
            </p>
            <p className="ant-upload-text font-medium text-slate-700">
              Kéo thả file Excel (.xlsx) vào đây hoặc bấm để chọn tệp
            </p>
            <p className="ant-upload-hint text-[12px] text-slate-400">
              Hỗ trợ import hàng trăm đến hàng nghìn câu hỏi cùng lúc
            </p>
          </Dragger>

          {importResult && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold text-slate-700 text-[13.5px]">
                  Kết quả xử lý ({importResult.totalRows} dòng dữ liệu)
                </span>
                <Space size={8}>
                  <Tag color="success" icon={<CheckCircleOutlined />} className="!m-0">
                    Thành công: {importResult.successCount}
                  </Tag>
                  {importResult.failedCount > 0 && (
                    <Tag color="error" icon={<CloseCircleOutlined />} className="!m-0">
                      Lỗi: {importResult.failedCount}
                    </Tag>
                  )}
                </Space>
              </div>

              {importResult.errors.length > 0 ? (
                <Table<QuestionImportRowError>
                  size="small"
                  rowKey="rowNumber"
                  dataSource={importResult.errors}
                  pagination={{ pageSize: 6, hideOnSinglePage: true }}
                  columns={[
                    {
                      title: 'Dòng',
                      dataIndex: 'rowNumber',
                      width: 70,
                      align: 'center',
                      render: (r: number) => <Tag color="red">#{r}</Tag>,
                    },
                    {
                      title: 'Câu hỏi',
                      dataIndex: 'content',
                      ellipsis: true,
                      width: 200,
                    },
                    {
                      title: 'Lý do lỗi',
                      dataIndex: 'reason',
                      render: (msg: string) => (
                        <span className="text-red-600 text-[12.5px]">{msg}</span>
                      ),
                    },
                  ]}
                />
              ) : (
                <Alert
                  type="success"
                  showIcon
                  message="Toàn bộ câu hỏi trong file đã được thêm vào ngân hàng câu hỏi thành công!"
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <Form form={form} layout="vertical" requiredMark="optional">
          {/* Khối 1: Phân loại & Phạm vi */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 mb-4">
            <Form.Item
              name="questionType"
              label={<span className="font-semibold text-slate-700 text-[13px]">Loại câu hỏi</span>}
              className="!mb-3"
            >
              <Segmented
                block
                options={QUESTION_TYPE_OPTIONS}
                onChange={(val) => {
                  if (val === 'SINGLE_CHOICE' && correctAnswer.length > 1) {
                    form.setFieldValue('correctAnswer', [correctAnswer[0]]);
                  }
                }}
              />
            </Form.Item>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Form.Item
                name="lessonId"
                label={<span className="text-[12.5px] font-medium text-slate-600">Bài học liên kết (tùy chọn)</span>}
                className="!mb-0"
              >
                <Select
                  placeholder="Kho chung toàn khóa học"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={lessonSelectOptions}
                />
              </Form.Item>

              <Form.Item
                name="hashtag"
                label={<span className="text-[12.5px] font-medium text-slate-600">Hashtag phân nhóm đề</span>}
                className="!mb-0"
              >
                <Input
                  prefix={<TagOutlined className="text-slate-400" />}
                  placeholder="VD: chuong-1, oop, ngu-phap"
                />
              </Form.Item>
            </div>
          </div>

          {/* Khối 2: Nội dung & Đáp án */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 mb-4">
            <Form.Item
              name="content"
              label={<span className="font-semibold text-slate-700 text-[13px]">Nội dung câu hỏi</span>}
              rules={[{ required: true, message: 'Vui lòng nhập nội dung câu hỏi' }]}
              className="!mb-4"
            >
              <Input.TextArea
                ref={contentInputRef}
                rows={3}
                placeholder="Nhập đề bài hoặc câu hỏi..."
                className="!text-[13.5px]"
              />
            </Form.Item>

            {/* Hidden field lưu danh sách đáp án đúng */}
            <Form.Item name="correctAnswer" hidden>
              <Input />
            </Form.Item>

            {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700 text-[13px]">
                    Danh sách lựa chọn
                  </span>
                  <span className="text-[11.5px] text-slate-400">
                    {questionType === 'SINGLE_CHOICE'
                      ? 'Tích chọn 1 đáp án đúng'
                      : 'Tích chọn một hoặc nhiều đáp án đúng'}
                  </span>
                </div>

                <Form.List
                  name="options"
                  rules={[
                    {
                      validator: async (_, opts) => {
                        if (!opts || opts.filter((o: string) => o?.trim()).length < 2) {
                          return Promise.reject(new Error('Cần nhập ít nhất 2 lựa chọn'));
                        }
                      },
                    },
                  ]}
                >
                  {(fields, { add, remove }, { errors }) => (
                    <div className="flex flex-col gap-2">
                      {fields.map((field, idx) => {
                        const rawVal = options[idx] || '';
                        const trimmedVal = rawVal.trim();
                        const isCorrect = !!trimmedVal && correctAnswer.includes(trimmedVal);
                        const letter = String.fromCharCode(65 + idx);

                        return (
                          <div
                            key={field.key}
                            className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 transition-all ${
                              isCorrect
                                ? 'border-emerald-300 bg-emerald-50/60'
                                : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                            }`}
                          >
                            {questionType === 'SINGLE_CHOICE' ? (
                              <Radio
                                checked={isCorrect}
                                onChange={() => toggleCorrectOption(rawVal)}
                              />
                            ) : (
                              <Checkbox
                                checked={isCorrect}
                                onChange={() => toggleCorrectOption(rawVal)}
                              />
                            )}

                            <span
                              className={`w-6 h-6 rounded-md text-[12px] font-bold flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200/80 text-slate-600'
                              }`}
                            >
                              {letter}
                            </span>

                            <Form.Item
                              {...field}
                              rules={[
                                {
                                  validator: async (_, val) => {
                                    if (!val || !val.trim()) {
                                      return Promise.reject(new Error(`Nhập nội dung đáp án ${letter}`));
                                    }
                                  },
                                },
                              ]}
                              className="!flex-1 !mb-0"
                            >
                              <Input
                                variant="borderless"
                                placeholder={`Nhập lựa chọn ${letter}...`}
                                onChange={(e) => handleOptionTextChange(rawVal, e.target.value)}
                                className="!px-1 !text-[13px]"
                              />
                            </Form.Item>

                            {fields.length > 2 && (
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  if (trimmedVal && correctAnswer.includes(trimmedVal)) {
                                    form.setFieldValue(
                                      'correctAnswer',
                                      correctAnswer.filter((v) => v !== trimmedVal),
                                    );
                                  }
                                  remove(field.name);
                                }}
                              />
                            )}
                          </div>
                        );
                      })}

                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => add('')}
                        className="mt-1 !text-slate-600"
                      >
                        Thêm lựa chọn
                      </Button>
                      <Form.ErrorList errors={errors} />
                    </div>
                  )}
                </Form.List>
              </div>
            )}

            {questionType === 'TRUE_FALSE' && (
              <Form.Item
                name="trueFalse"
                label={<span className="font-semibold text-slate-700 text-[13px]">Đáp án đúng</span>}
                rules={[{ required: true, message: 'Vui lòng chọn Đúng hoặc Sai' }]}
                className="!mb-0"
              >
                <Radio.Group className="w-full">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 cursor-pointer hover:border-blue-300">
                      <Radio value="true" />
                      <span className="font-medium text-slate-700 text-[13px]">Đúng (True)</span>
                    </label>
                    <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 cursor-pointer hover:border-blue-300">
                      <Radio value="false" />
                      <span className="font-medium text-slate-700 text-[13px]">Sai (False)</span>
                    </label>
                  </div>
                </Radio.Group>
              </Form.Item>
            )}

            {questionType === 'SHORT_ANSWER' && (
              <Form.Item
                name="shortAnswer"
                label={<span className="font-semibold text-slate-700 text-[13px]">Đáp án chính xác</span>}
                rules={[{ required: true, message: 'Vui lòng nhập đáp án chính xác' }]}
                className="!mb-0"
              >
                <Input placeholder="Nhập từ khóa hoặc cụm từ đáp án đúng..." />
              </Form.Item>
            )}
          </div>

          {/* Khối 3: Giải thích & Thiết lập điểm */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
            <Form.Item
              name="explanation"
              label={<span className="text-[12.5px] font-medium text-slate-600">Giải thích đáp án (tùy chọn)</span>}
              className="!mb-3"
            >
              <Input.TextArea
                rows={2}
                placeholder="Hiển thị cho học viên sau khi nộp bài để giải thích lý do đáp án đúng..."
              />
            </Form.Item>

            <div className="grid grid-cols-3 gap-3">
              <Form.Item
                name="points"
                label={<span className="text-[12.5px] font-medium text-slate-600">Điểm số</span>}
                className="!mb-0"
              >
                <InputNumber min={0} step={0.5} className="!w-full" />
              </Form.Item>

              <Form.Item
                name="orderIndex"
                label={<span className="text-[12.5px] font-medium text-slate-600">Thứ tự</span>}
                className="!mb-0"
              >
                <InputNumber min={0} placeholder="Tự động" className="!w-full" />
              </Form.Item>

              <Form.Item
                name="status"
                label={<span className="text-[12.5px] font-medium text-slate-600">Trạng thái</span>}
                className="!mb-0"
              >
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Hoạt động' },
                    { value: 'INACTIVE', label: 'Tạm ẩn' },
                  ]}
                />
              </Form.Item>
            </div>
          </div>
        </Form>
      )}
    </Drawer>
  );
};

export default QuestionFormModal;