import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card, Button, Input, Select, Switch, Space, Tag, Empty, Popconfirm, Tooltip, Spin, Dropdown,
} from 'antd';
import {
  FilePdfOutlined, PlayCircleOutlined, FilePptOutlined, SoundOutlined,
  FileOutlined, PictureOutlined, LinkOutlined, FormOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, CloudUploadOutlined,
  BookOutlined, FileTextOutlined, HolderOutlined, InboxOutlined,
  RollbackOutlined, SwapOutlined, QuestionCircleOutlined, FilterOutlined,
  PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import { resourceApi } from '@/services/api/course';
import { fileApi, extractFileUrl } from '@/services/api/files';
import InlineEdit from '@/components/common/InlineEdit';
import type { ResourceType, CourseResourceResponse, ResourceCreateRequest } from '@/services/types/course';
import CourseResourceTree, { RESOURCE_DRAG_MIME, type ResourceReorderUpdate } from './CourseResourceTree';
import ResourceFormModal from './ResourceFormModal';

const MAX_FILE_SIZE_MB = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
type PoolFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED';

const ATTACHMENT_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  PDF: { icon: <FilePdfOutlined />, label: 'PDF', color: '#dc2626', bg: '#fee2e2' },
  VIDEO: { icon: <PlayCircleOutlined />, label: 'Video', color: '#d97706', bg: '#fef3c7' },
  SLIDE: { icon: <FilePptOutlined />, label: 'Slide', color: '#ea580c', bg: '#ffedd5' },
  AUDIO: { icon: <SoundOutlined />, label: 'Audio', color: '#0891b2', bg: '#cffafe' },
  IMAGE: { icon: <PictureOutlined />, label: 'Hình ảnh', color: '#db2777', bg: '#fce7f3' },
  LINK: { icon: <LinkOutlined />, label: 'Liên kết', color: '#0284c7', bg: '#e0f2fe' },
  ASSIGNMENT: { icon: <FormOutlined />, label: 'Bài tập', color: '#4f46e5', bg: '#e0e7ff' },
  QUIZ: { icon: <QuestionCircleOutlined />, label: 'Quiz', color: '#7e22ce', bg: '#f3e8ff' },
  DOCUMENT: { icon: <FileOutlined />, label: 'Tài liệu', color: '#475569', bg: '#f1f5f9' },
};

const detectResourceTypeFromFile = (file: File): ResourceType => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(name)) return 'VIDEO';
  if (/\.(ppt|pptx)$/i.test(name)) return 'SLIDE';
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/i.test(name)) return 'AUDIO';
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(name)) return 'IMAGE';
  return 'DOCUMENT';
};

const getResourceFileUrl = (r: CourseResourceResponse): string | undefined => {
  const rec = r as CourseResourceResponse & { fileUrl?: string; url?: string; contentUrl?: string };
  return rec.fileUrl || rec.url || rec.contentUrl || undefined;
};

const getErrMsg = (err: unknown, fallback: string) =>
  (err as { message?: string })?.message || fallback;

interface Props {
  courseId: number;
  resources: CourseResourceResponse[];
  onRefresh: () => void;
  readOnly?: boolean;
}

const ResourceManager = ({ courseId, resources, onRefresh, readOnly = false }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingResourceId, setDraggingResourceId] = useState<number | null>(null);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [editingRes, setEditingRes] = useState<CourseResourceResponse | null>(null);
  const [createPreset, setCreatePreset] = useState<Partial<ResourceCreateRequest> | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const chapters = useMemo(
    () => resources.filter((r) => r.resourceType === 'CHAPTER').sort((a, b) => a.orderIndex - b.orderIndex),
    [resources],
  );

  const lessons = useMemo(
    () => resources.filter((r) => r.resourceType === 'LESSON').sort((a, b) => a.orderIndex - b.orderIndex),
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
    if (selectedLessonId !== null && !lessons.some((l) => l.id === selectedLessonId)) {
      setSelectedLessonId(null);
    }
    setTypeFilter('ALL');
    setSearchQuery('');
  }, [lessons, selectedLessonId]);

  const selectedLesson = useMemo(
    () => (selectedLessonId !== null ? lessons.find((l) => l.id === selectedLessonId) || null : null),
    [lessons, selectedLessonId],
  );

  const selectedLessonChapter = useMemo(
    () => (selectedLesson?.parentId ? chapters.find((c) => c.id === selectedLesson.parentId) || null : null),
    [selectedLesson, chapters],
  );

  const allCourseMaterials = useMemo(
    () =>
      resources
        .filter((r) => r.resourceType !== 'CHAPTER' && r.resourceType !== 'LESSON')
        .sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId) || a.orderIndex - b.orderIndex),
    [resources],
  );

  const unassignedResources = useMemo(() => allCourseMaterials.filter((r) => !r.parentId), [allCourseMaterials]);
  const assignedResourcesCount = allCourseMaterials.length - unassignedResources.length;

  const scopedMaterials = useMemo(() => {
    if (selectedLesson) {
      return allCourseMaterials.filter((r) => r.parentId === selectedLesson.id).sort((a, b) => a.orderIndex - b.orderIndex);
    }
    if (poolFilter === 'UNASSIGNED') return unassignedResources;
    if (poolFilter === 'ASSIGNED') return allCourseMaterials.filter((r) => !!r.parentId);
    return allCourseMaterials;
  }, [selectedLesson, allCourseMaterials, unassignedResources, poolFilter]);

  const displayedMaterials = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return scopedMaterials.filter((r) => {
      if (typeFilter !== 'ALL' && r.resourceType !== typeFilter) return false;
      if (keyword) {
        const matchTitle = r.title.toLowerCase().includes(keyword);
        const matchFile = (r.fileName || '').toLowerCase().includes(keyword);
        if (!matchTitle && !matchFile) return false;
      }
      return true;
    });
  }, [scopedMaterials, typeFilter, searchQuery]);

  const typeFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    scopedMaterials.forEach((r) => counts.set(r.resourceType, (counts.get(r.resourceType) || 0) + 1));
    const dynamicOptions = Object.entries(ATTACHMENT_META).map(([key, meta]) => ({
      value: key,
      label: (
        <span className="inline-flex items-center gap-1.5 text-[12.5px]">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span>{meta.label}</span>
          <span className="text-slate-400 tabular-nums">({counts.get(key) || 0})</span>
        </span>
      ),
    }));

    return [
      {
        value: 'ALL',
        label: (
          <span className="inline-flex items-center gap-1.5 text-[12.5px]">
            <FilterOutlined className="text-slate-400" />
            <span>Tất cả định dạng ({scopedMaterials.length})</span>
          </span>
        ),
      },
      ...dynamicOptions,
    ];
  }, [scopedMaterials]);

  const lessonOptions = useMemo(() => {
    const chapterMap = new Map(chapters.map((c) => [c.id, c]));
    return [...lessons]
      .sort((a, b) => {
        const chA = a.parentId ? chapterMap.get(a.parentId)?.orderIndex ?? 9999 : 9999;
        const chB = b.parentId ? chapterMap.get(b.parentId)?.orderIndex ?? 9999 : 9999;
        return chA - chB || a.orderIndex - b.orderIndex;
      })
      .map((l) => {
        const chTitle = l.parentId ? chapterMap.get(l.parentId)?.title : undefined;
        return { value: l.id, label: chTitle ? `${chTitle} › ${l.title}` : l.title };
      });
  }, [lessons, chapters]);

  const handleOpenCreate = (preset?: Partial<ResourceCreateRequest>) => {
    if (readOnly) return;
    setEditingRes(null);
    setCreatePreset(preset || null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: CourseResourceResponse) => {
    if (readOnly) return;
    setCreatePreset(null);
    setEditingRes(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRes(null);
    setCreatePreset(null);
  };

  const handleDirectFilesUpload = async (fileList: FileList | File[]) => {
    if (readOnly) return;
    const files = Array.from(fileList);
    if (!files.length) return;

    setUploadingFiles(true);
    let uploadedCount = 0;

    try {
      const scopeList = selectedLesson ? scopedMaterials : unassignedResources;
      const existingTitles = new Set(scopeList.map((m) => m.title.trim().toLowerCase()));

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(`Tệp "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB.`);
          continue;
        }
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || file.name;
        if (existingTitles.has(cleanTitle.toLowerCase())) {
          toast.error(`Tài liệu "${cleanTitle}" đã tồn tại.`);
          continue;
        }

        setUploadStatusText(`Đang tải lên (${i + 1}/${files.length}): ${file.name}...`);
        const uploadRes = await fileApi.upload(file);
        const fileUrl = extractFileUrl(uploadRes);
        if (!fileUrl) throw new Error(`Không lấy được URL file "${file.name}"`);

        await resourceApi.create(courseId, {
          title: cleanTitle,
          resourceType: detectResourceTypeFromFile(file),
          ...(selectedLesson ? { parentId: selectedLesson.id } : {}),
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type || undefined,
          isRequired: true,
          isFreePreview: false,
          status: 'PUBLISHED',
        });
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
      toast.error(getErrMsg(err, 'Tải tài liệu lên thất bại'));
    } finally {
      setUploadingFiles(false);
      setUploadStatusText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAssignToLesson = async (resourceId: number, targetLessonId: number) => {
    if (readOnly) return;
    const item = resources.find((r) => r.id === resourceId);
    const targetLesson = lessons.find((l) => l.id === targetLessonId);
    if (!item || !targetLesson) return;
    if (item.parentId === targetLessonId) {
      toast(`Tài nguyên đã nằm trong "${targetLesson.title}"`);
      return;
    }
    try {
      await resourceApi.update(courseId, resourceId, { parentId: targetLessonId });
      toast.success(`Đã gắn "${item.title}" vào "${targetLesson.title}"`);
      onRefresh();
    } catch (err) {
      toast.error(getErrMsg(err, 'Không thể gắn tài nguyên vào bài học'));
    }
  };

  const handleDetachFromLesson = async (item: CourseResourceResponse) => {
    if (readOnly) return;
    try {
      await resourceApi.update(courseId, item.id, { detachParent: true });
      toast.success(`Đã gỡ "${item.title}" khỏi bài học`);
      onRefresh();
    } catch (err) {
      toast.error(getErrMsg(err, 'Không thể gỡ tài nguyên'));
    }
  };

  const handleAddOrUpdate = async (values: ResourceCreateRequest) => {
    if (readOnly) return;
    setSaving(true);
    try {
      if (editingRes) {
        const clearedParent =
          !!editingRes.parentId &&
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
        if (created?.resourceType === 'LESSON' && created?.id) setSelectedLessonId(created.id);
      }
      handleCloseModal();
      onRefresh();
    } catch (err) {
      toast.error(getErrMsg(err, 'Lưu thất bại'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = async (id: number, title: string) => {
    if (readOnly) return;
    try {
      await resourceApi.update(courseId, id, { title });
      toast.success('Đã cập nhật tiêu đề');
      onRefresh();
    } catch (err) {
      toast.error(getErrMsg(err, 'Cập nhật thất bại'));
      throw err;
    }
  };

  const handleToggleFlag = async (item: CourseResourceResponse, field: 'isRequired' | 'isFreePreview', checked: boolean) => {
    if (readOnly) return;
    try {
      await resourceApi.update(courseId, item.id, { [field]: checked });
      toast.success('Đã cập nhật thiết lập');
      onRefresh();
    } catch (err) {
      toast.error(getErrMsg(err, 'Cập nhật thất bại'));
    }
  };

  const handleDelete = async (id: number) => {
    if (readOnly) return;
    try {
      await resourceApi.delete(courseId, id);
      toast.success('Đã xóa học liệu');
      onRefresh();
    } catch (err) {
      toast.error(getErrMsg(err, 'Xóa thất bại'));
    }
  };

  const handleReorder = async (updates: ResourceReorderUpdate[]) => {
    if (readOnly) return;
    try {
      await resourceApi.reorder(courseId, updates);
      toast.success('Đã cập nhật thứ tự');
    } catch (err) {
      toast.error(getErrMsg(err, 'Đổi thứ tự thất bại'));
    } finally {
      onRefresh();
    }
  };

  return (
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
          onDropResourceToLesson={readOnly ? undefined : (resId, lessonId) => void handleAssignToLesson(resId, lessonId)}
          editable={!readOnly}
          draggable={!readOnly}
          canAddLesson={chapters.length > 0}
          onSaveTitle={readOnly ? undefined : handleSaveTitle}
          onReorder={readOnly ? undefined : handleReorder}
          onDelete={readOnly ? undefined : handleDelete}
          onEdit={readOnly ? undefined : handleOpenEdit}
          onAddChapter={readOnly ? undefined : () => handleOpenCreate({ resourceType: 'CHAPTER' })}
          onAddHeaderLesson={
            readOnly ? undefined : () => handleOpenCreate({ resourceType: 'LESSON', parentId: selectedLessonChapter?.id ?? chapters[0]?.id })
          }
          onAddLesson={readOnly ? undefined : (chapter) => handleOpenCreate({ resourceType: 'LESSON', parentId: chapter.id })}
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
            onChange={(e) => { if (e.target.files) void handleDirectFilesUpload(e.target.files); }}
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
                    <BookOutlined /> {selectedLessonChapter.title}
                  </span>
                )}
                <div className="flex items-center gap-2 min-w-0">
                  <FileTextOutlined className="text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800 text-[14.5px] truncate">{selectedLesson.title}</span>
                  <Tag color="green" className="!m-0 !rounded-full !text-[11px] font-semibold tabular-nums shrink-0">
                    {scopedMaterials.length}
                  </Tag>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <InboxOutlined className="text-indigo-600 shrink-0" />
                <span className="font-semibold text-slate-800 text-[14.5px] truncate">Kho tài nguyên khóa học</span>
                <Tag color="geekblue" className="!m-0 !rounded-full !text-[11px] font-semibold tabular-nums shrink-0">
                  {allCourseMaterials.length}
                </Tag>
              </div>
            )
          }
          extra={
            !readOnly && (
              <Space size={8}>
                <Button size="small" icon={<CloudUploadOutlined />} loading={uploadingFiles} onClick={() => fileInputRef.current?.click()}>
                  Tải tệp lên
                </Button>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate({ resourceType: 'QUIZ', parentId: selectedLesson?.id })}>
                  Thêm nội dung
                </Button>
              </Space>
            )
          }
        >
          {/* Thanh lọc trạng thái gắn bài, tìm kiếm & định dạng */}
          {(scopedMaterials.length > 0 || (!selectedLesson && allCourseMaterials.length > 0)) && (
            <div className="mb-3 pb-2.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              {!selectedLesson ? (
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 p-1">
                  {(
                    [
                      { key: 'ALL', label: `Tất cả (${allCourseMaterials.length})` },
                      { key: 'UNASSIGNED', label: `Chưa gắn (${unassignedResources.length})` },
                      { key: 'ASSIGNED', label: `Đã gắn (${assignedResourcesCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPoolFilter(tab.key)}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-medium tabular-nums transition-all cursor-pointer ${
                        poolFilter === tab.key ? 'bg-white text-indigo-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-[12px] text-slate-400">
                  Hiển thị {displayedMaterials.length}/{scopedMaterials.length} mục
                </span>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  size="small"
                  allowClear
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefix={<SearchOutlined className="text-slate-400" />}
                  placeholder="Tìm học liệu..."
                  className="w-[165px]"
                />
                <Select
                  size="small"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={typeFilterOptions}
                  className="min-w-[175px]"
                  popupMatchSelectWidth={false}
                />
              </div>
            </div>
          )}

          <div
            onDragOver={(e) => {
              if (readOnly || !e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              if (!uploadingFiles) setIsDraggingOver(true);
            }}
            onDragLeave={() => { if (!readOnly) setIsDraggingOver(false); }}
            onDrop={(e) => {
              if (readOnly || !e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              setIsDraggingOver(false);
              if (!uploadingFiles && e.dataTransfer.files?.length) void handleDirectFilesUpload(e.dataTransfer.files);
            }}
            className={`rounded-xl transition-all ${!readOnly && isDraggingOver ? 'ring-2 ring-blue-500 bg-blue-50/40 p-2' : ''}`}
          >
            {!readOnly && uploadingFiles && (
              <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-[13px] text-blue-700 font-medium">
                <Spin size="small" />
                <span className="truncate">{uploadStatusText}</span>
              </div>
            )}

            {displayedMaterials.length === 0 ? (
              readOnly || scopedMaterials.length > 0 ? (
                <div className="py-8">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className="text-slate-400">
                        {scopedMaterials.length > 0
                          ? 'Không có tài nguyên phù hợp với bộ lọc'
                          : selectedLesson ? 'Chưa có tài liệu' : 'Kho tài nguyên trống'}
                      </span>
                    }
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-8 px-4 text-center">
                  <div className="font-medium text-[13.5px] text-slate-600">
                    {selectedLesson ? 'Bài học chưa có nội dung nào' : 'Kho tài nguyên khóa học đang trống'}
                  </div>
                  <div className="text-[12px] text-slate-400 mt-1 mb-3">
                    Tạo Quiz, Bài tập, Liên kết mới hoặc kéo-thả tệp từ máy vào đây
                  </div>
                  <Space size={8}>
                    <Button size="small" icon={<CloudUploadOutlined />} disabled={uploadingFiles} onClick={() => fileInputRef.current?.click()}>
                      Tải tệp từ máy
                    </Button>
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate({ resourceType: 'QUIZ', parentId: selectedLesson?.id })}>
                      Thêm nội dung
                    </Button>
                  </Space>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-2">
                {displayedMaterials.map((item) => {
                  const meta = ATTACHMENT_META[item.resourceType] || ATTACHMENT_META.DOCUMENT;
                  const fileUrl = getResourceFileUrl(item);
                  const assignedLocation = item.parentId ? parentLabelMap.get(item.parentId) : undefined;

                  return (
                    <div
                      key={item.id}
                      draggable={!readOnly}
                      onDragStart={(e) => {
                        if (readOnly) return;
                        e.dataTransfer.setData(RESOURCE_DRAG_MIME, String(item.id));
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggingResourceId(item.id);
                      }}
                      onDragEnd={() => setDraggingResourceId(null)}
                      className={`group flex items-start justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 transition-all ${
                        draggingResourceId === item.id
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
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                          className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[15px]"
                        >
                          {meta.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div onClick={(e) => e.stopPropagation()} className="font-semibold text-[13.5px] text-slate-800 leading-snug">
                            {readOnly ? (
                              <span className="truncate block">{item.title}</span>
                            ) : (
                              <InlineEdit value={item.title} onSave={(val) => handleSaveTitle(item.id, val)} />
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span
                              style={{ color: meta.color, backgroundColor: `${meta.bg}99` }}
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
                                  <span className="truncate">{assignedLocation}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                                  Chưa gắn bài
                                </span>
                              ))}

                            <label className={`inline-flex items-center gap-1 text-[11.5px] text-slate-500 select-none ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                              <Switch size="small" disabled={readOnly} checked={!!item.isRequired} onChange={(c) => void handleToggleFlag(item, 'isRequired', c)} />
                              <span>Bắt buộc</span>
                            </label>

                            <label className={`inline-flex items-center gap-1 text-[11.5px] text-slate-500 select-none ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                              <Switch size="small" disabled={readOnly} checked={!!item.isFreePreview} onChange={(c) => void handleToggleFlag(item, 'isFreePreview', c)} />
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
                              onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
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
                                    .map((opt) => ({ key: String(opt.value), label: opt.label })),
                                  onClick: ({ key }) => void handleAssignToLesson(item.id, Number(key)),
                                }}
                              >
                                <Tooltip title={item.parentId ? 'Chuyển bài học' : 'Gắn vào bài học'}>
                                  <Button type="text" size="small" icon={<SwapOutlined />} className="!text-indigo-600 hover:!bg-indigo-50" />
                                </Tooltip>
                              </Dropdown>
                            )}

                            {!!item.parentId && (
                              <Tooltip title="Gỡ khỏi bài học">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<RollbackOutlined />}
                                  onClick={() => void handleDetachFromLesson(item)}
                                  className="!text-amber-600 hover:!bg-amber-50"
                                />
                              </Tooltip>
                            )}

                            <Tooltip title="Chỉnh sửa">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenEdit(item)}
                                className="!text-slate-500 hover:!text-blue-600"
                              />
                            </Tooltip>

                            <Popconfirm title="Xóa tài liệu này?" onConfirm={() => void handleDelete(item.id)} okText="Xóa" okButtonProps={{ danger: true }} cancelText="Hủy">
                              <Tooltip title="Xóa">
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
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

      {/* Drawer Thêm / Sửa tách riêng */}
      {!readOnly && (
        <ResourceFormModal
          open={modalOpen}
          loading={saving}
          editingRes={editingRes}
          createPreset={createPreset}
          chapters={chapters}
          lessons={lessons}
          onCancel={handleCloseModal}
          onSubmit={handleAddOrUpdate}
        />
      )}
    </div>
  );
};

export default ResourceManager;