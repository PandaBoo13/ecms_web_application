import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Drawer, Form, Input, Select, TreeSelect, InputNumber, Switch, Space, Button, DatePicker, Tabs, Tag,
} from 'antd';
import {
  CloudUploadOutlined, FileOutlined, CalendarOutlined, SettingOutlined, BookOutlined, FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

import { fileApi, extractFileUrl } from '@/services/api/files';
import type { ResourceType, CourseResourceResponse, ResourceCreateRequest } from '@/services/types/course';

const { TextArea } = Input;
const MAX_FILE_SIZE_MB = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const RESOURCE_TYPE_GROUPS = [
  {
    label: 'Nội dung & Hoạt động học',
    options: [
      { value: 'QUIZ', label: 'Bài kiểm tra (Quiz)' },
      { value: 'ASSIGNMENT', label: 'Bài tập (Assignment)' },
      { value: 'LINK', label: 'Đường dẫn tham khảo (Link)' },
      { value: 'DOCUMENT', label: 'Tài liệu / Bài đọc (Document)' },
    ],
  },
  {
    label: 'Tài nguyên dạng tệp (File)',
    options: [
      { value: 'PDF', label: 'Tài liệu PDF' },
      { value: 'VIDEO', label: 'Video bài giảng' },
      { value: 'SLIDE', label: 'Slide bài giảng' },
      { value: 'AUDIO', label: 'Âm thanh (Audio)' },
      { value: 'IMAGE', label: 'Hình ảnh (Image)' },
    ],
  },
  {
    label: 'Cấu trúc khóa học',
    options: [
      { value: 'CHAPTER', label: 'Chương (Chapter)' },
      { value: 'LESSON', label: 'Bài học (Lesson)' },
    ],
  },
];

const QUIZ_CATEGORY_OPTIONS = [
  { value: 'PRACTICE', label: 'Luyện tập (Practice)' },
  { value: 'QUIZ', label: 'Kiểm tra nhanh (Quiz)' },
  { value: 'MIDTERM', label: 'Kiểm tra giữa kỳ (Midterm)' },
  { value: 'FINAL', label: 'Thi cuối kỳ (Final)' },
];

const FILE_REQUIRED_TYPES: ResourceType[] = ['PDF', 'VIDEO', 'SLIDE', 'AUDIO', 'IMAGE'];
const FILE_OPTIONAL_TYPES: ResourceType[] = ['DOCUMENT', 'ASSIGNMENT'];
const FILE_UPLOAD_TYPES: ResourceType[] = [...FILE_REQUIRED_TYPES, ...FILE_OPTIONAL_TYPES];

interface Props {
  open: boolean;
  loading: boolean;
  editingRes: CourseResourceResponse | null;
  createPreset: Partial<ResourceCreateRequest> | null;
  chapters: CourseResourceResponse[];
  lessons: CourseResourceResponse[];
  onCancel: () => void;
  onSubmit: (values: ResourceCreateRequest) => Promise<void>;
}

const ResourceFormModal = ({
  open, loading, editingRes, createPreset, chapters, lessons, onCancel, onSubmit,
}: Props) => {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  const selectedType = Form.useWatch('resourceType', form) as ResourceType;
  const uploadedFileName = Form.useWatch('fileName', form) as string | undefined;

  // Xây dựng dữ liệu dạng cây: Chương (cha) -> Bài học (con)
  const lessonTreeData = useMemo(() => {
    const sortedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);
    const chapterIds = new Set(sortedChapters.map((c) => c.id));

    const chapterNodes = sortedChapters.map((ch) => {
      const chLessons = lessons
        .filter((l) => l.parentId === ch.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      return {
        key: `chapter-${ch.id}`,
        value: `chapter-${ch.id}`,
        selectable: false,
        searchLabel: ch.title,
        title: (
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <BookOutlined className="text-indigo-500 text-[12px] shrink-0" />
            <span>{ch.title}</span>
          </span>
        ),
        children: chLessons.map((l) => ({
          key: l.id,
          value: l.id,
          searchLabel: `${ch.title} ${l.title}`,
          title: (
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <FileTextOutlined className="text-emerald-600 text-[12px] shrink-0" />
              <span>{l.title}</span>
            </span>
          ),
        })),
      };
    });

    const orphanLessons = lessons
      .filter((l) => !l.parentId || !chapterIds.has(l.parentId))
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((l) => ({
        key: l.id,
        value: l.id,
        searchLabel: l.title,
        title: (
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <FileTextOutlined className="text-emerald-600 text-[12px] shrink-0" />
            <span>{l.title}</span>
          </span>
        ),
      }));

    return [...chapterNodes, ...orphanLessons];
  }, [chapters, lessons]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (editingRes) {
      const ext = editingRes as CourseResourceResponse & { deadline?: string };
      form.setFieldsValue({
        ...editingRes,
        deadline: ext.deadline ? dayjs(ext.deadline) : undefined,
        availableFrom: editingRes.availableFrom ? dayjs(editingRes.availableFrom) : undefined,
        availableUntil: editingRes.availableUntil ? dayjs(editingRes.availableUntil) : undefined,
      });
    } else {
      form.setFieldsValue({
        resourceType: 'QUIZ',
        isRequired: false,
        isFreePreview: false,
        shuffleQuestions: false,
        status: 'DRAFT',
        ...createPreset,
      });
    }
  }, [open, editingRes, createPreset, form]);

  const handleUploadFile = async (file?: File, isThumbnail = false) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Tệp "${file.name}" vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    if (isThumbnail) setUploadingThumb(true);
    else setUploading(true);

    try {
      const res = await fileApi.upload(file);
      const url = extractFileUrl(res);
      if (!url) throw new Error(`Không lấy được URL file "${file.name}"`);

      if (isThumbnail) {
        form.setFieldsValue({ thumbnailUrl: url });
      } else {
        const currentTitle = form.getFieldValue('title')?.trim();
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || file.name;
        form.setFieldsValue({
          ...(currentTitle ? {} : { title: cleanTitle }),
          fileUrl: url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || undefined,
        });
      }
      toast.success(`Đã tải "${file.name}" lên`);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Tải tệp lên thất bại');
    } finally {
      if (isThumbnail) {
        setUploadingThumb(false);
        if (thumbInputRef.current) thumbInputRef.current.value = '';
      } else {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleOk = async () => {
    try {
      const raw = await form.validateFields();
      const payload: ResourceCreateRequest = {
        ...raw,
        deadline: raw.deadline ? dayjs(raw.deadline).toISOString() : undefined,
        availableFrom: raw.availableFrom ? dayjs(raw.availableFrom).toISOString() : undefined,
        availableUntil: raw.availableUntil ? dayjs(raw.availableUntil).toISOString() : undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
    }
  };

  const isAttachmentOrActivity = selectedType && selectedType !== 'CHAPTER' && selectedType !== 'LESSON';

  return (
    <Drawer
      open={open}
      onClose={onCancel}
      width={640}
      destroyOnClose
      styles={{
        header: { padding: '14px 20px', borderBottom: '1px solid #f1f5f9' },
        body: { padding: '12px 20px 24px' },
        footer: { padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' },
      }}
      title={
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-slate-800">
            {editingRes ? 'Cập nhật nội dung' : 'Thêm nội dung mới'}
          </span>
          <span className="text-[12px] font-normal text-slate-400">
            {editingRes
              ? `Chỉnh sửa thông tin "${editingRes.title}"`
              : 'Tạo hoạt động học, tệp tài liệu hoặc cấu trúc bài giảng'}
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="primary"
            loading={loading}
            disabled={uploading || uploadingThumb}
            onClick={handleOk}
          >
            {editingRes ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.mov,.webm,.mkv,.ppt,.pptx,.doc,.docx,audio/*,image/*"
        className="hidden"
        onChange={(e) => void handleUploadFile(e.target.files?.[0], false)}
      />
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleUploadFile(e.target.files?.[0], true)}
      />

      <Form form={form} layout="vertical">
        <Form.Item name="fileName" hidden><Input /></Form.Item>
        <Form.Item name="fileSize" hidden><InputNumber /></Form.Item>
        <Form.Item name="mimeType" hidden><Input /></Form.Item>

        <Tabs
          defaultActiveKey="basic"
          size="small"
          items={[
            {
              key: 'basic',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <SettingOutlined /> Nội dung & Cấu hình
                </span>
              ),
              children: (
                <div className="pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Form.Item name="resourceType" label="Loại nội dung" rules={[{ required: true }]}>
                      <Select options={RESOURCE_TYPE_GROUPS} disabled={!!editingRes} />
                    </Form.Item>

                    {selectedType === 'LESSON' && (
                      <Form.Item name="parentId" label="Thuộc Chương" rules={[{ required: true, message: 'Vui lòng chọn chương' }]}>
                        <Select placeholder="Chọn chương..." options={chapters.map((c) => ({ value: c.id, label: c.title }))} />
                      </Form.Item>
                    )}

                    {isAttachmentOrActivity && (
                      <Form.Item name="parentId" label="Gắn vào bài học">
                        <TreeSelect
                          allowClear
                          showSearch
                          treeDefaultExpandAll
                          treeLine={{ showLeafIcon: false }}
                          listHeight={320}
                          placeholder="Để trống nếu lưu ở kho chung"
                          treeData={lessonTreeData}
                          filterTreeNode={(input, node) =>
                            String((node as { searchLabel?: string }).searchLabel ?? '')
                              .toLowerCase()
                              .includes(input.trim().toLowerCase())
                          }
                        />
                      </Form.Item>
                    )}
                  </div>

                  <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                    <Input placeholder="Nhập tiêu đề..." />
                  </Form.Item>

                  <Form.Item name="description" label="Mô tả ngắn">
                    <TextArea rows={2} placeholder="Tóm tắt mục tiêu hoặc hướng dẫn ngắn..." />
                  </Form.Item>

                  {selectedType === 'LINK' && (
                    <Form.Item name="fileUrl" label="Đường dẫn liên kết (URL)" rules={[{ required: true, message: 'Vui lòng nhập đường dẫn' }]}>
                      <Input placeholder="https://..." />
                    </Form.Item>
                  )}

                  {FILE_UPLOAD_TYPES.includes(selectedType) && (
                    <Form.Item
                      label={
                        <span className="inline-flex items-center gap-2">
                          <span>{FILE_REQUIRED_TYPES.includes(selectedType) ? 'Tệp đính kèm / URL' : 'Tệp đính kèm (không bắt buộc)'}</span>
                          {uploadedFileName && (
                            <Tag color="blue" icon={<FileOutlined />} className="!m-0 !text-[11px]">
                              {uploadedFileName}
                            </Tag>
                          )}
                        </span>
                      }
                      required={FILE_REQUIRED_TYPES.includes(selectedType)}
                    >
                      <div className="flex items-center gap-2">
                        <Button icon={<CloudUploadOutlined />} loading={uploading} onClick={() => fileInputRef.current?.click()}>
                          Chọn tệp từ máy
                        </Button>
                        <Form.Item
                          name="fileUrl"
                          noStyle
                          rules={
                            FILE_REQUIRED_TYPES.includes(selectedType)
                              ? [{ required: true, message: 'Vui lòng tải tệp lên hoặc nhập URL' }]
                              : undefined
                          }
                        >
                          <Input placeholder="Hoặc dán đường dẫn URL..." />
                        </Form.Item>
                      </div>
                    </Form.Item>
                  )}

                  {['ASSIGNMENT', 'DOCUMENT'].includes(selectedType) && (
                    <Form.Item name="content" label={selectedType === 'ASSIGNMENT' ? 'Đề bài & Yêu cầu nộp bài' : 'Nội dung bài đọc'}>
                      <TextArea rows={5} placeholder="Nhập nội dung chi tiết..." />
                    </Form.Item>
                  )}

                  {selectedType === 'VIDEO' && (
                    <Form.Item name="duration" label="Thời lượng video (giây)">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                  )}

                  {selectedType === 'QUIZ' && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 mb-4">
                      <div className="text-[12px] font-semibold text-slate-600 mb-2.5">Thiết lập đề thi & Chấm điểm</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                        <Form.Item name="quizCategory" label="Phân loại bài kiểm tra" className="!mb-3">
                          <Select allowClear placeholder="Chọn phân loại..." options={QUIZ_CATEGORY_OPTIONS} />
                        </Form.Item>
                        <Form.Item name="hashtagFilter" label="Lọc câu hỏi theo Hashtag" className="!mb-3">
                          <Input placeholder="VD: #chuong1, #co-ban" />
                        </Form.Item>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
                        <Form.Item name="totalQuestions" label="Số câu hỏi" className="!mb-2">
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
                        </Form.Item>
                        <Form.Item name="passingScore" label="Điểm đạt (%)" className="!mb-2">
                          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="70" />
                        </Form.Item>
                        <Form.Item name="timeLimit" label="Thời gian (phút)" className="!mb-2">
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="30" />
                        </Form.Item>
                        <Form.Item name="maxAttempts" label="Số lần làm tối đa" className="!mb-2">
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
                        </Form.Item>
                      </div>
                      <Form.Item name="shuffleQuestions" valuePropName="checked" className="!mb-0 mt-1">
                        <Switch size="small" className="mr-2" />
                        <span className="text-[12.5px] text-slate-600">Trộn ngẫu nhiên thứ tự câu hỏi mỗi lần làm bài</span>
                      </Form.Item>
                    </div>
                  )}

                  {selectedType === 'ASSIGNMENT' && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 mb-4">
                      <div className="text-[12px] font-semibold text-slate-600 mb-2.5">Thiết lập nộp bài & Chấm điểm</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                        <Form.Item name="deadline" label="Hạn nộp bài" className="!mb-0">
                          <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Chọn hạn nộp" />
                        </Form.Item>
                        <Form.Item name="points" label="Thang điểm tối đa" className="!mb-0">
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="100" />
                        </Form.Item>
                        <Form.Item name="maxAttempts" label="Số lần nộp tối đa" className="!mb-0">
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
                        </Form.Item>
                      </div>
                    </div>
                  )}

                  <Space size={24} wrap className="flex mt-2 pt-3 border-t border-slate-100">
                    <Form.Item name="isRequired" label="Bắt buộc học" valuePropName="checked" className="!mb-0">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="isFreePreview" label="Cho phép học thử" valuePropName="checked" className="!mb-0">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="status" label="Trạng thái" className="!mb-0">
                      <Select
                        options={[
                          { value: 'DRAFT', label: 'Nháp' },
                          { value: 'PUBLISHED', label: 'Xuất bản' },
                          { value: 'HIDDEN', label: 'Tạm ẩn' },
                        ]}
                        style={{ width: 130 }}
                      />
                    </Form.Item>
                  </Space>
                </div>
              ),
            },
            {
              key: 'schedule',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarOutlined /> Lịch mở & Ảnh bìa
                </span>
              ),
              children: (
                <div className="pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Form.Item name="availableFrom" label="Thời gian mở truy cập">
                      <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Mở ngay khi xuất bản" />
                    </Form.Item>
                    <Form.Item name="availableUntil" label="Thời gian đóng truy cập">
                      <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Không giới hạn" />
                    </Form.Item>
                  </div>

                  <Form.Item label="Ảnh thu nhỏ (Thumbnail)">
                    <div className="flex items-center gap-2">
                      <Button icon={<CloudUploadOutlined />} loading={uploadingThumb} onClick={() => thumbInputRef.current?.click()}>
                        Tải ảnh lên
                      </Button>
                      <Form.Item name="thumbnailUrl" noStyle>
                        <Input placeholder="https://..." />
                      </Form.Item>
                    </div>
                  </Form.Item>

                  <Form.Item name="orderIndex" label="Thứ tự hiển thị (Order Index)">
                    <InputNumber min={0} style={{ width: 180 }} placeholder="Tự động xếp cuối" />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
};

export default ResourceFormModal;