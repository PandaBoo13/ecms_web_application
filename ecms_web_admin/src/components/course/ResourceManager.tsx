// src/components/course/ResourceManager.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Space,
  Typography,
  Tag,
  Empty,
  Popconfirm,
  Tooltip,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  FolderAddOutlined,
  FilePdfOutlined,
  PlayCircleOutlined,
  FilePptOutlined,
  SoundOutlined,
  FileOutlined,
  PictureOutlined,
  LinkOutlined,
  FormOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  BookOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { resourceApi } from '@/services/api/course';
// Chỉnh lại đường dẫn import fileApi nếu file của bạn đặt ở '@/services/api/file'
import { fileApi, extractFileUrl } from '@/services/api/files';
import InlineEdit from '@/components/common/InlineEdit';
import type {
  ResourceType,
  CourseResourceResponse,
  ResourceCreateRequest,
} from '@/services/types/course';
import CourseResourceTree, {
  type ResourceReorderUpdate,
} from './CourseResourceTree';

const { Text } = Typography;
const { TextArea } = Input;

const STRUCTURE_RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'CHAPTER', label: 'Chương (Chapter)' },
  { value: 'LESSON', label: 'Bài học (Lesson)' },
  { value: 'QUIZ', label: 'Bài kiểm tra (Quiz)' },
];

const ATTACHMENT_RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'PDF', label: 'Tài liệu PDF' },
  { value: 'VIDEO', label: 'Video bài giảng' },
  { value: 'SLIDE', label: 'Slide bài giảng' },
  { value: 'DOCUMENT', label: 'Tài liệu (Document)' },
  { value: 'AUDIO', label: 'Âm thanh (Audio)' },
  { value: 'IMAGE', label: 'Hình ảnh (Image)' },
  { value: 'LINK', label: 'Đường dẫn tham khảo (Link)' },
  { value: 'ASSIGNMENT', label: 'Bài tập (Assignment)' },
];

const ALL_RESOURCE_TYPES = [
  ...STRUCTURE_RESOURCE_TYPES,
  ...ATTACHMENT_RESOURCE_TYPES,
];

interface AttachmentMeta {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
}

const ATTACHMENT_META: Record<string, AttachmentMeta> = {
  PDF: {
    icon: <FilePdfOutlined />,
    label: 'PDF',
    color: '#dc2626',
    bg: '#fee2e2',
  },
  VIDEO: {
    icon: <PlayCircleOutlined />,
    label: 'Video',
    color: '#d97706',
    bg: '#fef3c7',
  },
  SLIDE: {
    icon: <FilePptOutlined />,
    label: 'Slide',
    color: '#ea580c',
    bg: '#ffedd5',
  },
  AUDIO: {
    icon: <SoundOutlined />,
    label: 'Audio',
    color: '#0891b2',
    bg: '#cffafe',
  },
  IMAGE: {
    icon: <PictureOutlined />,
    label: 'Hình ảnh',
    color: '#db2777',
    bg: '#fce7f3',
  },
  LINK: {
    icon: <LinkOutlined />,
    label: 'Liên kết',
    color: '#0284c7',
    bg: '#e0f2fe',
  },
  ASSIGNMENT: {
    icon: <FormOutlined />,
    label: 'Bài tập',
    color: '#4f46e5',
    bg: '#e0e7ff',
  },
  DOCUMENT: {
    icon: <FileOutlined />,
    label: 'Tài liệu',
    color: '#475569',
    bg: '#f1f5f9',
  },
};

const detectResourceTypeFromFile = (file: File): ResourceType => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  if (
    mime.startsWith('video/') ||
    /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(name)
  ) {
    return 'VIDEO';
  }
  if (/\.(ppt|pptx)$/i.test(name)) return 'SLIDE';
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/i.test(name)) {
    return 'AUDIO';
  }
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(name)) {
    return 'IMAGE';
  }
  return 'DOCUMENT';
};

const getResourceFileUrl = (
  r: CourseResourceResponse,
): string | undefined => {
  const rec = r as CourseResourceResponse & {
    fileUrl?: string;
    url?: string;
    contentUrl?: string;
  };
  return rec.fileUrl || rec.url || rec.contentUrl || undefined;
};

interface Props {
  courseId: number;
  resources: CourseResourceResponse[];
  onRefresh: () => void;
}

const ResourceManager = ({ courseId, resources, onRefresh }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [form] = Form.useForm();

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [editingRes, setEditingRes] = useState<CourseResourceResponse | null>(
    null,
  );
  const [createPreset, setCreatePreset] =
    useState<Partial<ResourceCreateRequest> | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedType = Form.useWatch('resourceType', form) as ResourceType;

  const chapters = useMemo(
    () =>
      resources
        .filter((r) => r.resourceType === 'CHAPTER')
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [resources],
  );

  const lessons = useMemo(
    () =>
      resources
        .filter((r) => r.resourceType === 'LESSON')
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [resources],
  );

  // Tự động chọn bài học đầu tiên nếu chưa chọn hoặc bài học đang chọn bị xóa
  useEffect(() => {
    if (lessons.length === 0) {
      if (selectedLessonId !== null) setSelectedLessonId(null);
      return;
    }

    const stillExists = lessons.some((l) => l.id === selectedLessonId);
    if (!stillExists) {
      // Ưu tiên lấy bài học đầu tiên theo thứ tự Chương
      const firstChapter = chapters[0];
      const firstInChapter = firstChapter
        ? lessons.find((l) => l.parentId === firstChapter.id)
        : undefined;
      setSelectedLessonId((firstInChapter || lessons[0]).id);
    }
  }, [lessons, chapters, selectedLessonId]);

  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) || null,
    [lessons, selectedLessonId],
  );

  const selectedLessonChapter = useMemo(() => {
    if (!selectedLesson?.parentId) return null;
    return chapters.find((c) => c.id === selectedLesson.parentId) || null;
  }, [selectedLesson, chapters]);

  // Danh sách tài nguyên thuộc riêng bài học đang chọn
  const lessonMaterials = useMemo(() => {
    if (!selectedLesson) return [];
    return resources
      .filter(
        (r) =>
          r.parentId === selectedLesson.id &&
          r.resourceType !== 'CHAPTER' &&
          r.resourceType !== 'LESSON',
      )
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [resources, selectedLesson]);

  useEffect(() => {
    if (!modalOpen) {
      form.resetFields();
      setEditingRes(null);
      setCreatePreset(null);
      return;
    }

    if (editingRes) {
      form.setFieldsValue(editingRes);
    } else {
      form.setFieldsValue({
        resourceType: 'CHAPTER',
        isRequired: false,
        isFreePreview: false,
        status: 'DRAFT',
        ...createPreset,
      });
    }
  }, [modalOpen, editingRes, createPreset, form]);

  const handleOpenCreate = (preset?: Partial<ResourceCreateRequest>) => {
    setEditingRes(null);
    setCreatePreset(preset || null);
    setModalOpen(true);
  };

  // Tải trực tiếp 1 hoặc nhiều file từ máy tính và gắn vào selectedLesson + courseId
  const handleDirectFilesUpload = async (fileList: FileList | File[]) => {
    if (!selectedLesson) {
      toast.error('Vui lòng chọn một bài học ở cột bên trái trước.');
      return;
    }

    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadingFiles(true);
    let uploadedCount = 0;

    try {
      const existingTitles = new Set(
        lessonMaterials.map((m) => m.title.trim().toLowerCase()),
      );

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const cleanTitle =
          file.name.replace(/\.[^/.]+$/, '').trim() || file.name;

        // Tránh tải trùng file cùng tên trong cùng một bài học
        if (existingTitles.has(cleanTitle.toLowerCase())) {
          toast.error(
            `Tài liệu "${cleanTitle}" đã tồn tại trong bài học này.`,
          );
          continue;
        }

        setUploadStatusText(
          `Đang tải lên (${i + 1}/${files.length}): ${file.name}...`,
        );

        const uploadRes = await fileApi.upload(file);
        const fileUrl = extractFileUrl(uploadRes);
        if (!fileUrl) {
          throw new Error(`Không lấy được URL file "${file.name}"`);
        }

        const resourceType = detectResourceTypeFromFile(file);

        const payload = {
          title: cleanTitle,
          resourceType,
          parentId: selectedLesson.id,
          orderIndex: lessonMaterials.length + uploadedCount,
          fileUrl,
          isRequired: true,
          isFreePreview: false,
          status: 'PUBLISHED',
        } as unknown as ResourceCreateRequest;

        await resourceApi.create(courseId, payload);
        existingTitles.add(cleanTitle.toLowerCase());
        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        toast.success(
          `Đã thêm ${uploadedCount} tài liệu vào "${selectedLesson.title}"`,
        );
        onRefresh();
      }
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Tải tài liệu lên thất bại',
      );
    } finally {
      setUploadingFiles(false);
      setUploadStatusText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddOrUpdate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editingRes) {
        await resourceApi.update(courseId, editingRes.id, values);
        toast.success('Cập nhật nội dung thành công');
      } else {
        const created = await resourceApi.create(courseId, values);
        toast.success('Thêm nội dung thành công');
        if (created?.resourceType === 'LESSON' && created?.id) {
          setSelectedLessonId(created.id);
        }
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Lưu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async (id: number, title: string) => {
    try {
      await resourceApi.update(courseId, id, { title });
      toast.success('Đã cập nhật tiêu đề');
      onRefresh();
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Cập nhật thất bại',
      );
      throw err;
    }
  };

  const handleToggleFlag = async (
    item: CourseResourceResponse,
    field: 'isRequired' | 'isFreePreview',
    checked: boolean,
  ) => {
    try {
      await resourceApi.update(courseId, item.id, { [field]: checked });
      toast.success('Đã cập nhật thiết lập');
      onRefresh();
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Cập nhật thất bại',
      );
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await resourceApi.delete(courseId, id);
      toast.success('Đã xóa học liệu');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa thất bại');
    }
  };

  const handleReorder = async (updates: ResourceReorderUpdate[]) => {
    try {
      await resourceApi.reorder(courseId, updates);
      toast.success('Đã cập nhật thứ tự');
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Đổi thứ tự thất bại',
      );
    } finally {
      onRefresh();
    }
  };

  const lessonOptions = useMemo(() => {
    const chapterMap = new Map(chapters.map((c) => [c.id, c.title]));
    return lessons.map((l) => {
      const chTitle = l.parentId ? chapterMap.get(l.parentId) : undefined;
      return {
        value: l.id,
        label: chTitle ? `${chTitle} › ${l.title}` : l.title,
      };
    });
  }, [lessons, chapters]);

  return (
    <div className="flex flex-col gap-4">
      {/* Thanh công cụ trên cùng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text type="secondary" style={{ fontSize: 13 }}>
          Chọn một <Text strong>Bài học</Text> ở cột bên trái để xem và tải
          file tài liệu (PDF, Video...) riêng cho bài học đó.
        </Text>

        <Space wrap>
          <Button
            icon={<FolderAddOutlined />}
            onClick={() => handleOpenCreate({ resourceType: 'CHAPTER' })}
          >
            Thêm chương
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={chapters.length === 0}
            onClick={() =>
              handleOpenCreate({
                resourceType: 'LESSON',
                parentId:
                  selectedLessonChapter?.id ?? chapters[0]?.id ?? undefined,
              })
            }
          >
            Thêm bài học
          </Button>
        </Space>
      </div>

      {/* Bố cục 2 cột Master - Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (5 cột): Cây Chương & Bài học */}
        <div className="lg:col-span-5 min-w-0">
          <CourseResourceTree
            resources={resources}
            selectedLessonId={selectedLessonId}
            onSelectLesson={(lesson) => setSelectedLessonId(lesson.id)}
            editable
            draggable
            onSaveTitle={handleSaveTitle}
            onReorder={handleReorder}
            onDelete={handleDelete}
            onEdit={(r) => {
              setCreatePreset(null);
              setEditingRes(r);
              setModalOpen(true);
            }}
            onAddLesson={(chapter) =>
              handleOpenCreate({
                resourceType: 'LESSON',
                parentId: chapter.id,
              })
            }
          />
        </div>

        {/* CỘT PHẢI (7 cột): Kho tài liệu riêng của Bài học đang chọn */}
        <div className="lg:col-span-7 min-w-0 lg:sticky lg:top-4">
          {/* Input chọn file ẩn — mở thẳng hộp thoại chọn file máy tính */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.mov,.webm,.mkv,.ppt,.pptx,.doc,.docx,audio/*,image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                void handleDirectFilesUpload(e.target.files);
              }
            }}
          />

          <Card
            className="!rounded-xl border-slate-200 shadow-none"
            styles={{ body: { padding: '16px 18px' } }}
            title={
              selectedLesson ? (
                <div className="flex flex-col gap-0.5 py-1 min-w-0">
                  {selectedLessonChapter && (
                    <span className="text-[11.5px] font-medium text-slate-400 flex items-center gap-1 truncate">
                      <BookOutlined />
                      {selectedLessonChapter.title}
                    </span>
                  )}
                  <div className="flex items-center gap-2 min-w-0">
                    <FileTextOutlined className="text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-[15px] truncate">
                      {selectedLesson.title}
                    </span>
                    <Tag
                      color="green"
                      className="!m-0 !rounded-full !text-[11px] font-semibold shrink-0"
                    >
                      {lessonMaterials.length} tài liệu
                    </Tag>
                  </div>
                </div>
              ) : (
                <span className="font-bold text-slate-700 text-[15px]">
                  Tài liệu của bài học
                </span>
              )
            }
            extra={
              selectedLesson && (
                <Space size={8} wrap>
                  <Button
                    size="small"
                    onClick={() =>
                      handleOpenCreate({
                        resourceType: 'LINK',
                        parentId: selectedLesson.id,
                      })
                    }
                  >
                    + Gắn link
                  </Button>
                  <Button
                    type="primary"
                    icon={<CloudUploadOutlined />}
                    loading={uploadingFiles}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Thêm tài liệu
                  </Button>
                </Space>
              )
            }
          >
            {!selectedLesson ? (
              <div className="py-10">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-slate-400">
                      {chapters.length === 0
                        ? 'Hãy tạo Chương và Bài học ở cột bên trái để bắt đầu thêm tài liệu.'
                        : 'Chọn một Bài học ở cột bên trái để quản lý tài liệu riêng.'}
                    </span>
                  }
                >
                  {chapters.length > 0 && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        handleOpenCreate({
                          resourceType: 'LESSON',
                          parentId: chapters[0].id,
                        })
                      }
                    >
                      Tạo bài học đầu tiên
                    </Button>
                  )}
                </Empty>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadingFiles) setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (!uploadingFiles && e.dataTransfer.files?.length) {
                    void handleDirectFilesUpload(e.dataTransfer.files);
                  }
                }}
                className={`rounded-xl transition-all ${
                  isDraggingOver
                    ? 'ring-2 ring-blue-500 bg-blue-50/40 p-2'
                    : ''
                }`}
              >
                {/* Thanh trạng thái khi đang upload */}
                {uploadingFiles && (
                  <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-[13px] text-blue-700 font-medium">
                    <Spin size="small" />
                    <span>{uploadStatusText || 'Đang tải tài liệu lên...'}</span>
                  </div>
                )}

                {lessonMaterials.length === 0 ? (
                  <div
                    onClick={() => {
                      if (!uploadingFiles) fileInputRef.current?.click();
                    }}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 transition-all py-10 px-4 text-center"
                  >
                    <CloudUploadOutlined
                      style={{ fontSize: 34, color: '#2563eb' }}
                    />
                    <div className="mt-2 font-semibold text-[14px] text-slate-700">
                      Bài học này chưa có tài liệu nào
                    </div>
                    <div className="mt-1 text-[12.5px] text-slate-400">
                      Bấm nút <b className="text-blue-600">Thêm tài liệu</b>{' '}
                      hoặc kéo thả file PDF / Video từ máy tính vào đây
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {lessonMaterials.map((item) => {
                      const meta =
                        ATTACHMENT_META[item.resourceType] ||
                        ATTACHMENT_META.DOCUMENT;
                      const fileUrl = getResourceFileUrl(item);

                      return (
                        <div
                          key={item.id}
                          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 hover:border-blue-300 hover:shadow-xs transition-all"
                        >
                          {/* Thông tin file */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              style={{
                                backgroundColor: meta.bg,
                                color: meta.color,
                              }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[17px]"
                            >
                              {meta.icon}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[13.5px] text-slate-800">
                                <InlineEdit
                                  value={item.title}
                                  onSave={(val) => handleSaveTitle(item.id, val)}
                                />
                              </div>

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span
                                  style={{
                                    color: meta.color,
                                    backgroundColor: `${meta.bg}99`,
                                  }}
                                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                                >
                                  {meta.label}
                                </span>

                                <label className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 cursor-pointer select-none">
                                  <Switch
                                    size="small"
                                    checked={!!item.isRequired}
                                    onChange={(checked) =>
                                      void handleToggleFlag(
                                        item,
                                        'isRequired',
                                        checked,
                                      )
                                    }
                                  />
                                  <span>Bắt buộc</span>
                                </label>

                                <label className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 cursor-pointer select-none">
                                  <Switch
                                    size="small"
                                    checked={!!item.isFreePreview}
                                    onChange={(checked) =>
                                      void handleToggleFlag(
                                        item,
                                        'isFreePreview',
                                        checked,
                                      )
                                    }
                                  />
                                  <span>Học thử</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Thao tác file */}
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            {fileUrl && (
                              <Tooltip title="Mở xem tài liệu">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<EyeOutlined />}
                                  onClick={() =>
                                    window.open(
                                      fileUrl,
                                      '_blank',
                                      'noopener,noreferrer',
                                    )
                                  }
                                  className="!text-blue-600 hover:!bg-blue-50"
                                >
                                  Xem
                                </Button>
                              </Tooltip>
                            )}

                            <Tooltip title="Chỉnh sửa thông tin">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setCreatePreset(null);
                                  setEditingRes(item);
                                  setModalOpen(true);
                                }}
                                className="!text-slate-500 hover:!text-blue-600"
                              />
                            </Tooltip>

                            <Popconfirm
                              title="Xóa tài liệu này khỏi bài học?"
                              onConfirm={() => void handleDelete(item.id)}
                              okText="Xóa"
                              okButtonProps={{ danger: true }}
                              cancelText="Hủy"
                            >
                              <Tooltip title="Xóa">
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                />
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Thêm Chương / Bài học / Sửa chi tiết */}
      <Modal
        title={editingRes ? 'Cập nhật nội dung' : 'Thêm nội dung mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAddOrUpdate}
        confirmLoading={loading}
        okText={editingRes ? 'Lưu thay đổi' : 'Thêm mới'}
        cancelText="Hủy"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="resourceType"
            label="Loại nội dung"
            rules={[{ required: true }]}
          >
            <Select options={ALL_RESOURCE_TYPES} disabled={!!editingRes} />
          </Form.Item>

          {(selectedType === 'LESSON' || selectedType === 'QUIZ') && (
            <Form.Item
              name="parentId"
              label="Thuộc Chương"
              rules={[{ required: true, message: 'Vui lòng chọn chương' }]}
            >
              <Select
                placeholder="Chọn chương..."
                options={chapters.map((c) => ({ value: c.id, label: c.title }))}
              />
            </Form.Item>
          )}

          {[
            'VIDEO',
            'PDF',
            'SLIDE',
            'AUDIO',
            'ASSIGNMENT',
            'LINK',
            'DOCUMENT',
            'IMAGE',
          ].includes(selectedType) && (
            <Form.Item
              name="parentId"
              label="Thuộc Bài học (Lesson)"
              rules={[{ required: true, message: 'Vui lòng chọn bài học' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn bài học..."
                options={lessonOptions}
              />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="VD: Bài 1 - Tổng quan khóa học" />
          </Form.Item>

          {[
            'VIDEO',
            'PDF',
            'SLIDE',
            'AUDIO',
            'ASSIGNMENT',
            'LINK',
            'DOCUMENT',
            'IMAGE',
          ].includes(selectedType) && (
            <Form.Item
              name="fileUrl"
              label="Đường dẫn file (URL)"
              rules={[{ required: true, message: 'Vui lòng nhập đường dẫn' }]}
            >
              <Input placeholder="https://..." />
            </Form.Item>
          )}

          {['ASSIGNMENT', 'DOCUMENT'].includes(selectedType) && (
            <Form.Item name="content" label="Nội dung chi tiết">
              <TextArea rows={3} placeholder="Nhập nội dung..." />
            </Form.Item>
          )}

          {selectedType === 'VIDEO' && (
            <Form.Item name="duration" label="Thời lượng (giây)">
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="VD: 300"
              />
            </Form.Item>
          )}

          {selectedType === 'QUIZ' && (
            <Space size={12} style={{ display: 'flex' }}>
              <Form.Item
                name="passingScore"
                label="Điểm đạt (%)"
                style={{ flex: 1 }}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="timeLimit"
                label="Thời gian làm bài (phút)"
                style={{ flex: 1 }}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          <Space size={24} wrap style={{ display: 'flex', marginTop: 8 }}>
            <Form.Item
              name="isRequired"
              label="Bắt buộc học"
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="isFreePreview"
              label="Cho phép học thử"
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Switch />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái" style={{ margin: 0 }}>
              <Select
                options={[
                  { value: 'DRAFT', label: 'Nháp' },
                  { value: 'PUBLISHED', label: 'Xuất bản' },
                  { value: 'HIDDEN', label: 'Tạm ẩn' },
                ]}
                style={{ width: 120 }}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default ResourceManager;