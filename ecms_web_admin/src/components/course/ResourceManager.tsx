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
  Tag,
  Empty,
  Popconfirm,
  Tooltip,
  Spin,
  Dropdown,
} from 'antd';
import {
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
  HolderOutlined,
  InboxOutlined,
  RollbackOutlined,
  SwapOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { resourceApi } from '@/services/api/course';
import { fileApi, extractFileUrl } from '@/services/api/files';
import InlineEdit from '@/components/common/InlineEdit';
import type {
  ResourceType,
  CourseResourceResponse,
  ResourceCreateRequest,
} from '@/services/types/course';
import CourseResourceTree, {
  RESOURCE_DRAG_MIME,
  type ResourceReorderUpdate,
} from './CourseResourceTree';

const { TextArea } = Input;

const MAX_FILE_SIZE_MB = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type PoolFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED';

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
  QUIZ: {
    icon: <QuestionCircleOutlined />,
    label: 'Quiz',
    color: '#7e22ce',
    bg: '#f3e8ff',
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
  readOnly?: boolean;
}

const ResourceManager = ({
  courseId,
  resources,
  onRefresh,
  readOnly = false,
}: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingResourceId, setDraggingResourceId] = useState<number | null>(
    null,
  );
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('ALL');
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

  const parentLabelMap = useMemo(() => {
    const chapterMap = new Map(chapters.map((c) => [c.id, c.title]));
    const map = new Map<number, string>();
    chapters.forEach((c) => map.set(c.id, c.title));
    lessons.forEach((l) => {
      const chTitle = l.parentId ? chapterMap.get(l.parentId) : undefined;
      map.set(l.id, chTitle ? `${chTitle} › ${l.title}` : l.title);
    });
    return map;
  }, [chapters, lessons]);

  useEffect(() => {
    if (selectedLessonId !== null) {
      const stillExists = lessons.some((l) => l.id === selectedLessonId);
      if (!stillExists) {
        setSelectedLessonId(null);
      }
    }
  }, [lessons, selectedLessonId]);

  const selectedLesson = useMemo(
    () =>
      selectedLessonId !== null
        ? lessons.find((l) => l.id === selectedLessonId) || null
        : null,
    [lessons, selectedLessonId],
  );

  const selectedLessonChapter = useMemo(() => {
    if (!selectedLesson?.parentId) return null;
    return chapters.find((c) => c.id === selectedLesson.parentId) || null;
  }, [selectedLesson, chapters]);

  const allCourseMaterials = useMemo(
    () =>
      resources
        .filter(
          (r) =>
            r.resourceType !== 'CHAPTER' && r.resourceType !== 'LESSON',
        )
        .sort((a, b) => {
          const aAssigned = a.parentId ? 1 : 0;
          const bAssigned = b.parentId ? 1 : 0;
          if (aAssigned !== bAssigned) return aAssigned - bAssigned;
          return a.orderIndex - b.orderIndex;
        }),
    [resources],
  );

  const unassignedResources = useMemo(
    () => allCourseMaterials.filter((r) => !r.parentId),
    [allCourseMaterials],
  );

  const assignedResourcesCount =
    allCourseMaterials.length - unassignedResources.length;

  const displayedMaterials = useMemo(() => {
    if (selectedLesson) {
      return allCourseMaterials
        .filter((r) => r.parentId === selectedLesson.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }
    if (poolFilter === 'UNASSIGNED') {
      return allCourseMaterials.filter((r) => !r.parentId);
    }
    if (poolFilter === 'ASSIGNED') {
      return allCourseMaterials.filter((r) => !!r.parentId);
    }
    return allCourseMaterials;
  }, [selectedLesson, allCourseMaterials, poolFilter]);

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
    if (readOnly) return;
    setEditingRes(null);
    setCreatePreset(preset || null);
    setModalOpen(true);
  };

  const handleDirectFilesUpload = async (fileList: FileList | File[]) => {
    if (readOnly) return;

    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadingFiles(true);
    let uploadedCount = 0;

    try {
      const scopeList = selectedLesson
        ? displayedMaterials
        : unassignedResources;
      const existingTitles = new Set(
        scopeList.map((m) => m.title.trim().toLowerCase()),
      );

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            `Tệp "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB.`,
          );
          continue;
        }

        const cleanTitle =
          file.name.replace(/\.[^/.]+$/, '').trim() || file.name;

        if (existingTitles.has(cleanTitle.toLowerCase())) {
          toast.error(`Tài liệu "${cleanTitle}" đã tồn tại.`);
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

        const payload: ResourceCreateRequest = {
          title: cleanTitle,
          resourceType,
          ...(selectedLesson ? { parentId: selectedLesson.id } : {}),
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type || undefined,
          isRequired: true,
          isFreePreview: false,
          status: 'PUBLISHED',
        };

        await resourceApi.create(courseId, payload);
        existingTitles.add(cleanTitle.toLowerCase());
        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        toast.success(
          selectedLesson
            ? `Đã thêm ${uploadedCount} tài liệu vào "${selectedLesson.title}"`
            : `Đã tải ${uploadedCount} tài liệu lên kho khóa học`,
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

  const handleAssignToLesson = async (
    resourceId: number,
    targetLessonId: number,
  ) => {
    if (readOnly) return;
    const item = resources.find((r) => r.id === resourceId);
    const targetLesson = lessons.find((l) => l.id === targetLessonId);
    if (!item || !targetLesson) return;

    if (item.parentId === targetLessonId) {
      toast(`Tài nguyên đã nằm trong "${targetLesson.title}"`);
      return;
    }

    try {
      await resourceApi.update(courseId, resourceId, {
        parentId: targetLessonId,
      });
      toast.success(`Đã gắn "${item.title}" vào "${targetLesson.title}"`);
      onRefresh();
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ||
          'Không thể gắn tài nguyên vào bài học',
      );
    }
  };

  const handleDetachFromLesson = async (item: CourseResourceResponse) => {
    if (readOnly) return;
    try {
      await resourceApi.update(courseId, item.id, { detachParent: true });
      toast.success(`Đã gỡ "${item.title}" khỏi bài học`);
      onRefresh();
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Không thể gỡ tài nguyên',
      );
    }
  };

  const handleAddOrUpdate = async () => {
    if (readOnly) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editingRes) {
        const wasAttached = !!editingRes.parentId;
        const clearedParent =
          wasAttached &&
          !values.parentId &&
          editingRes.resourceType !== 'CHAPTER' &&
          editingRes.resourceType !== 'LESSON';

        await resourceApi.update(courseId, editingRes.id, {
          ...values,
          ...(clearedParent ? { detachParent: true } : {}),
        });
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
    if (readOnly) return;
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
    if (readOnly) return;
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
    if (readOnly) return;
    try {
      await resourceApi.delete(courseId, id);
      toast.success('Đã xóa học liệu');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa thất bại');
    }
  };

  const handleReorder = async (updates: ResourceReorderUpdate[]) => {
    if (readOnly) return;
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
    <div>
      {/* Bố cục 2 cột Master - Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (5 cột): Kho khóa học + Cây Chương & Bài học */}
        <div className="lg:col-span-5 min-w-0">
          <CourseResourceTree
            resources={resources}
            selectedLessonId={selectedLessonId}
            totalResourceCount={allCourseMaterials.length}
            unassignedCount={unassignedResources.length}
            onSelectCoursePool={() => setSelectedLessonId(null)}
            onSelectLesson={(lesson) => setSelectedLessonId(lesson.id)}
            onDropResourceToLesson={
              readOnly
                ? undefined
                : (resourceId, lessonId) =>
                    void handleAssignToLesson(resourceId, lessonId)
            }
            editable={!readOnly}
            draggable={!readOnly}
            canAddLesson={chapters.length > 0}
            onSaveTitle={readOnly ? undefined : handleSaveTitle}
            onReorder={readOnly ? undefined : handleReorder}
            onDelete={readOnly ? undefined : handleDelete}
            onEdit={
              readOnly
                ? undefined
                : (r) => {
                    setCreatePreset(null);
                    setEditingRes(r);
                    setModalOpen(true);
                  }
            }
            onAddChapter={
              readOnly
                ? undefined
                : () => handleOpenCreate({ resourceType: 'CHAPTER' })
            }
            onAddHeaderLesson={
              readOnly
                ? undefined
                : () =>
                    handleOpenCreate({
                      resourceType: 'LESSON',
                      parentId:
                        selectedLessonChapter?.id ??
                        chapters[0]?.id ??
                        undefined,
                    })
            }
            onAddLesson={
              readOnly
                ? undefined
                : (chapter) =>
                    handleOpenCreate({
                      resourceType: 'LESSON',
                      parentId: chapter.id,
                    })
            }
          />
        </div>

        {/* CỘT PHẢI (7 cột): Kho tài nguyên khóa học hoặc Tài liệu của Bài học */}
        <div className="lg:col-span-7 min-w-0 lg:sticky lg:top-4">
          {!readOnly && (
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
          )}

          <Card
            className="!rounded-xl border-slate-200 shadow-none"
            styles={{ body: { padding: '14px 16px' } }}
            title={
              selectedLesson ? (
                <div className="flex flex-col gap-0.5 py-0.5 min-w-0">
                  {selectedLessonChapter && (
                    <span className="text-[11.5px] font-medium text-slate-400 flex items-center gap-1 truncate">
                      <BookOutlined />
                      {selectedLessonChapter.title}
                    </span>
                  )}
                  <div className="flex items-center gap-2 min-w-0">
                    <FileTextOutlined className="text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800 text-[14.5px] truncate">
                      {selectedLesson.title}
                    </span>
                    <Tag
                      color="green"
                      className="!m-0 !rounded-full !text-[11px] font-semibold tabular-nums shrink-0"
                    >
                      {displayedMaterials.length}
                    </Tag>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <InboxOutlined className="text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-800 text-[14.5px] truncate">
                    Kho tài nguyên khóa học
                  </span>
                  <Tag
                    color="geekblue"
                    className="!m-0 !rounded-full !text-[11px] font-semibold tabular-nums shrink-0"
                  >
                    {allCourseMaterials.length}
                  </Tag>
                </div>
              )
            }
            extra={
              !readOnly && (
                <Space size={8}>
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={() =>
                      handleOpenCreate({
                        resourceType: 'LINK',
                        parentId: selectedLesson?.id,
                      })
                    }
                  >
                    Gắn link
                  </Button>
                  <Button
                    size="small"
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
            {/* Bộ lọc trạng thái gắn bài */}
            {!selectedLesson && allCourseMaterials.length > 0 && (
              <div className="mb-3 pb-2.5 border-b border-slate-100">
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 p-1">
                  {(
                    [
                      {
                        key: 'ALL',
                        label: `Tất cả (${allCourseMaterials.length})`,
                      },
                      {
                        key: 'UNASSIGNED',
                        label: `Chưa gắn (${unassignedResources.length})`,
                      },
                      {
                        key: 'ASSIGNED',
                        label: `Đã gắn (${assignedResourcesCount})`,
                      },
                    ] as const
                  ).map((tab) => {
                    const active = poolFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setPoolFilter(tab.key)}
                        className={`px-2.5 py-1 rounded-md text-[12px] font-medium tabular-nums transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              onDragOver={(e) => {
                if (readOnly) return;
                if (!e.dataTransfer.types.includes('Files')) return;
                e.preventDefault();
                if (!uploadingFiles) setIsDraggingOver(true);
              }}
              onDragLeave={() => {
                if (!readOnly) setIsDraggingOver(false);
              }}
              onDrop={(e) => {
                if (readOnly) return;
                if (!e.dataTransfer.types.includes('Files')) return;
                e.preventDefault();
                setIsDraggingOver(false);
                if (!uploadingFiles && e.dataTransfer.files?.length) {
                  void handleDirectFilesUpload(e.dataTransfer.files);
                }
              }}
              className={`rounded-xl transition-all ${
                !readOnly && isDraggingOver
                  ? 'ring-2 ring-blue-500 bg-blue-50/40 p-2'
                  : ''
              }`}
            >
              {/* Thanh tiến trình tải lên */}
              {!readOnly && uploadingFiles && (
                <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-[13px] text-blue-700 font-medium">
                  <Spin size="small" />
                  <span className="truncate">{uploadStatusText}</span>
                </div>
              )}

              {displayedMaterials.length === 0 ? (
                readOnly ? (
                  <div className="py-8">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span className="text-slate-400">
                          {selectedLesson
                            ? 'Chưa có tài liệu'
                            : 'Kho tài nguyên trống'}
                        </span>
                      }
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (!uploadingFiles) fileInputRef.current?.click();
                    }}
                    className="cursor-pointer rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 transition-all py-9 px-4 text-center"
                  >
                    <CloudUploadOutlined
                      style={{ fontSize: 30, color: '#2563eb' }}
                    />
                    <div className="mt-2 font-medium text-[13.5px] text-slate-600">
                      {selectedLesson
                        ? 'Chưa có tài liệu'
                        : allCourseMaterials.length === 0
                          ? 'Kho tài nguyên trống'
                          : 'Không có tài nguyên phù hợp'}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  {displayedMaterials.map((item) => {
                    const meta =
                      ATTACHMENT_META[item.resourceType] ||
                      ATTACHMENT_META.DOCUMENT;
                    const fileUrl = getResourceFileUrl(item);
                    const isBeingDragged = draggingResourceId === item.id;
                    const assignedLocation = item.parentId
                      ? parentLabelMap.get(item.parentId)
                      : undefined;

                    return (
                      <div
                        key={item.id}
                        draggable={!readOnly}
                        onDragStart={(e) => {
                          if (readOnly) return;
                          e.dataTransfer.setData(
                            RESOURCE_DRAG_MIME,
                            String(item.id),
                          );
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingResourceId(item.id);
                        }}
                        onDragEnd={() => setDraggingResourceId(null)}
                        className={`group flex items-start justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 transition-all ${
                          isBeingDragged
                            ? 'opacity-50 border-blue-400 ring-2 ring-blue-200'
                            : 'border-slate-200/90 hover:border-blue-300 hover:shadow-2xs'
                        } ${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      >
                        {/* Cụm thông tin trái */}
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {!readOnly && (
                            <span className="mt-2 text-slate-300 group-hover:text-slate-500 flex items-center shrink-0">
                              <HolderOutlined style={{ fontSize: 14 }} />
                            </span>
                          )}

                          <span
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.color,
                            }}
                            className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[15px]"
                          >
                            {meta.icon}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-[13.5px] text-slate-800 leading-snug"
                            >
                              {readOnly ? (
                                <span className="truncate block">
                                  {item.title}
                                </span>
                              ) : (
                                <InlineEdit
                                  value={item.title}
                                  onSave={(val) =>
                                    handleSaveTitle(item.id, val)
                                  }
                                />
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span
                                style={{
                                  color: meta.color,
                                  backgroundColor: `${meta.bg}99`,
                                }}
                                className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                              >
                                {meta.label}
                              </span>

                              {!selectedLesson &&
                                (assignedLocation ? (
                                  <span
                                    title={assignedLocation}
                                    className="inline-flex items-center gap-1 max-w-[230px] truncate text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                  >
                                    <FileTextOutlined className="text-[10px] shrink-0" />
                                    <span className="truncate">
                                      {assignedLocation}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                                    Chưa gắn bài
                                  </span>
                                ))}

                              <label
                                className={`inline-flex items-center gap-1 text-[11.5px] text-slate-500 select-none ${
                                  readOnly ? 'cursor-default' : 'cursor-pointer'
                                }`}
                              >
                                <Switch
                                  size="small"
                                  disabled={readOnly}
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

                              <label
                                className={`inline-flex items-center gap-1 text-[11.5px] text-slate-500 select-none ${
                                  readOnly ? 'cursor-default' : 'cursor-pointer'
                                }`}
                              >
                                <Switch
                                  size="small"
                                  disabled={readOnly}
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

                        {/* Cụm thao tác phải */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {fileUrl && (
                            <Tooltip title="Xem">
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
                              />
                            </Tooltip>
                          )}

                          {!readOnly && (
                            <>
                              {lessonOptions.length > 0 && (
                                <Dropdown
                                  trigger={['click']}
                                  menu={{
                                    items: lessonOptions
                                      .filter((opt) => opt.value !== item.parentId)
                                      .map((opt) => ({
                                        key: String(opt.value),
                                        label: opt.label,
                                      })),
                                    onClick: ({ key }) =>
                                      void handleAssignToLesson(
                                        item.id,
                                        Number(key),
                                      ),
                                  }}
                                >
                                  <Tooltip
                                    title={
                                      item.parentId
                                        ? 'Chuyển bài học'
                                        : 'Gắn vào bài học'
                                    }
                                  >
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<SwapOutlined />}
                                      className="!text-indigo-600 hover:!bg-indigo-50"
                                    />
                                  </Tooltip>
                                </Dropdown>
                              )}

                              {!!item.parentId && (
                                <Tooltip title="Gỡ khỏi bài học">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<RollbackOutlined />}
                                    onClick={() =>
                                      void handleDetachFromLesson(item)
                                    }
                                    className="!text-amber-600 hover:!bg-amber-50"
                                  />
                                </Tooltip>
                              )}

                              <Tooltip title="Chỉnh sửa">
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
                                title="Xóa tài liệu này?"
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
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Thêm / Sửa */}
      {!readOnly && (
        <Modal
          title={editingRes ? 'Cập nhật nội dung' : 'Thêm nội dung mới'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={handleAddOrUpdate}
          confirmLoading={loading}
          okText={editingRes ? 'Lưu thay đổi' : 'Thêm mới'}
          cancelText="Hủy"
          width={600}
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

            {selectedType === 'LESSON' && (
              <Form.Item
                name="parentId"
                label="Thuộc Chương"
                rules={[{ required: true, message: 'Vui lòng chọn chương' }]}
              >
                <Select
                  placeholder="Chọn chương..."
                  options={chapters.map((c) => ({
                    value: c.id,
                    label: c.title,
                  }))}
                />
              </Form.Item>
            )}

            {[
              'QUIZ',
              'VIDEO',
              'PDF',
              'SLIDE',
              'AUDIO',
              'ASSIGNMENT',
              'LINK',
              'DOCUMENT',
              'IMAGE',
            ].includes(selectedType) && (
              <Form.Item name="parentId" label="Bài học">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn bài học (không bắt buộc)"
                  options={lessonOptions}
                />
              </Form.Item>
            )}

            <Form.Item
              name="title"
              label="Tiêu đề"
              rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
            >
              <Input placeholder="Nhập tiêu đề..." />
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
                  placeholder="0"
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
      )}
    </div>
  );
};

export default ResourceManager;