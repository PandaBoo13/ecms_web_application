// src/components/course/CourseResourceTree.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Tree,
  Tag,
  Space,
  Empty,
  Button,
  Popconfirm,
  Tooltip,
  Dropdown, // 🆕 Thêm Dropdown
} from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import {
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  HolderOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined,
  FolderOpenOutlined,
  FolderAddOutlined,
  PlusOutlined,
  RightOutlined,
  InboxOutlined,
  DownOutlined, // 🆕 Thêm icon
  CheckOutlined, // 🆕 Thêm icon
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import InlineEdit from '@/components/common/InlineEdit';
import type { CourseResourceResponse } from '@/services/types/course';

export const RESOURCE_DRAG_MIME = 'application/x-course-resource-id';

export interface ResourceReorderUpdate {
  id: number;
  orderIndex: number;
}

// 🆕 Định nghĩa trạng thái
const STATUS_META: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: 'Công khai', color: 'success' },
  DRAFT: { label: 'Bản nháp', color: 'default' },
  HIDDEN: { label: 'Tạm ẩn', color: 'warning' },
  ARCHIVED: { label: 'Lưu trữ', color: 'error' },
};

interface Props {
  resources: CourseResourceResponse[];
  selectedLessonId?: number | null;
  totalResourceCount?: number;
  unassignedCount?: number;
  onSelectCoursePool?: () => void;
  onSelectLesson?: (lesson: CourseResourceResponse) => void;
  onDropResourceToLesson?: (resourceId: number, lessonId: number) => void;
  editable?: boolean;
  draggable?: boolean;
  canAddLesson?: boolean;
  onSaveTitle?: (id: number, title: string) => Promise<void>;
  onReorder?: (updates: ResourceReorderUpdate[]) => Promise<void>;
  onDelete?: (id: number) => void;
  onEdit?: (resource: CourseResourceResponse) => void;
  onAddChapter?: () => void;
  onAddHeaderLesson?: () => void;
  onAddLesson?: (chapter: CourseResourceResponse) => void;
  onUpdateStatus?: (item: CourseResourceResponse, status: string) => void; // 🆕 Thêm prop xử lý trạng thái
}

const CourseResourceTree = ({
  resources,
  selectedLessonId = null,
  totalResourceCount = 0,
  unassignedCount = 0,
  onSelectCoursePool,
  onSelectLesson,
  onDropResourceToLesson,
  editable = false,
  draggable = false,
  canAddLesson = false,
  onSaveTitle,
  onReorder,
  onDelete,
  onEdit,
  onAddChapter,
  onAddHeaderLesson,
  onAddLesson,
  onUpdateStatus, // 🆕 Nhận prop
}: Props) => {
  const structureResources = useMemo(
    () =>
      resources.filter(
        (r) =>
          r.resourceType === 'CHAPTER' ||
          r.resourceType === 'LESSON' ||
          (r.resourceType === 'QUIZ' && !!r.parentId),
      ),
    [resources],
  );

  const materialCountByLesson = useMemo(() => {
    const counts = new Map<number, number>();
    resources.forEach((r) => {
      if (
        r.parentId &&
        r.resourceType !== 'CHAPTER' &&
        r.resourceType !== 'LESSON'
      ) {
        counts.set(r.parentId, (counts.get(r.parentId) || 0) + 1);
      }
    });
    return counts;
  }, [resources]);

  const lessonCountByChapter = useMemo(() => {
    const counts = new Map<number, number>();
    structureResources.forEach((r) => {
      if (r.parentId) {
        counts.set(r.parentId, (counts.get(r.parentId) || 0) + 1);
      }
    });
    return counts;
  }, [structureResources]);

  const chapterKeys = useMemo(
    () =>
      structureResources
        .filter((r) => r.resourceType === 'CHAPTER')
        .map((r) => r.id),
    [structureResources],
  );

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(chapterKeys);
  const [dragOverLessonId, setDragOverLessonId] = useState<number | null>(null);
  const expandTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setExpandedKeys((prev) => {
      const merged = new Set([...prev, ...chapterKeys]);
      return Array.from(merged);
    });
  }, [chapterKeys]);

  useEffect(() => {
    return () => {
      if (expandTimerRef.current) {
        window.clearTimeout(expandTimerRef.current);
      }
    };
  }, []);

  const isExternalResourceDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes(RESOURCE_DRAG_MIME);

  const scheduleExpandChapter = (chapterId: number) => {
    if (expandedKeys.includes(chapterId)) return;
    if (expandTimerRef.current) window.clearTimeout(expandTimerRef.current);
    expandTimerRef.current = window.setTimeout(() => {
      setExpandedKeys((prev) =>
        prev.includes(chapterId) ? prev : [...prev, chapterId],
      );
    }, 350);
  };

  const treeData = useMemo<DataNode[]>(() => {
    const map = new Map<number, DataNode>();
    const roots: DataNode[] = [];
    const sorted = [...structureResources].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );

    sorted.forEach((r) => {
      const isChapter = r.resourceType === 'CHAPTER';
      const isLesson = r.resourceType === 'LESSON';
      const isSelected = isLesson && selectedLessonId === r.id;
      const isDropTarget = isLesson && dragOverLessonId === r.id;
      const lessonCount = lessonCountByChapter.get(r.id) || 0;
      const materialCount = materialCountByLesson.get(r.id) || 0;
      
      // 🆕 Lấy trạng thái hiện tại
      const statusMeta = STATUS_META[r.status] || STATUS_META.DRAFT;

      const rowStyleClass = isChapter
        ? 'bg-slate-100/80 border-slate-200/90 px-2.5 py-2 my-1 hover:border-blue-300'
        : isDropTarget
          ? 'bg-blue-50 border-blue-500 ring-2 ring-dashed ring-blue-400 px-2.5 py-2 my-1'
          : isSelected
            ? 'bg-blue-50/90 border-blue-500 px-2.5 py-2 my-1 shadow-[0_0_0_2px_rgba(59,130,246,0.1)] cursor-pointer'
            : 'bg-white border-slate-200/80 px-2.5 py-2 my-1 hover:border-blue-300 hover:bg-slate-50/80 cursor-pointer';

      map.set(r.id, {
        key: r.id,
        title: (
          <div
            onClick={() => {
              if (isLesson) {
                onSelectLesson?.(r);
              }
            }}
            onDragOver={(e) => {
              if (!editable || !isExternalResourceDrag(e)) return;
              if (isChapter) {
                e.preventDefault();
                scheduleExpandChapter(r.id);
                return;
              }
              if (isLesson) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverLessonId !== r.id) {
                  setDragOverLessonId(r.id);
                }
              }
            }}
            onDragLeave={(e) => {
              if (!isLesson) return;
              const related = e.relatedTarget as Node | null;
              if (related && e.currentTarget.contains(related)) return;
              if (dragOverLessonId === r.id) {
                setDragOverLessonId(null);
              }
            }}
            onDrop={(e) => {
              if (!editable || !isLesson || !isExternalResourceDrag(e)) return;
              e.preventDefault();
              e.stopPropagation();
              setDragOverLessonId(null);
              const rawId = e.dataTransfer.getData(RESOURCE_DRAG_MIME);
              if (rawId) {
                onDropResourceToLesson?.(Number(rawId), r.id);
              }
            }}
            className={`resource-tree-row group flex items-center justify-between gap-2 rounded-lg border transition-all ${rowStyleClass}`}
          >
            {/* Cụm trái */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {draggable && (
                <span
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex items-center shrink-0"
                >
                  <HolderOutlined style={{ fontSize: 13 }} />
                </span>
              )}

              <span
                style={{
                  backgroundColor: isChapter
                    ? '#dbeafe'
                    : isLesson
                      ? isSelected || isDropTarget
                        ? '#2563eb'
                        : '#dcfce7'
                      : '#f3e8ff',
                  color: isChapter
                    ? '#1d4ed8'
                    : isLesson
                      ? isSelected || isDropTarget
                        ? '#ffffff'
                        : '#15803d'
                      : '#7e22ce',
                }}
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[13px] transition-colors"
              >
                {isChapter ? (
                  <BookOutlined />
                ) : isLesson ? (
                  <FileTextOutlined />
                ) : (
                  <QuestionCircleOutlined />
                )}
              </span>

              <div
                onClick={(e) => {
                  if (editable && onSaveTitle) e.stopPropagation();
                }}
                className={`min-w-0 flex-1 ${
                  isChapter
                    ? 'font-semibold text-[13.5px] text-slate-800'
                    : isSelected || isDropTarget
                      ? 'font-semibold text-[13.5px] text-blue-700'
                      : 'font-medium text-[13.5px] text-slate-700'
                }`}
              >
                {editable && onSaveTitle ? (
                  <InlineEdit
                    value={r.title}
                    onSave={(val) => onSaveTitle(r.id, val)}
                  />
                ) : (
                  <span className="truncate block">{r.title}</span>
                )}
              </div>

              {/* 🆕 DROPDOWN TRẠNG THÁI (Luôn hiển thị, không bị ảnh hưởng bởi editable) */}
              {onUpdateStatus && (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: Object.entries(STATUS_META).map(([key, val]) => ({
                      key: key,
                      label: val.label,
                      icon: r.status === key ? <CheckOutlined /> : <span className="w-3" />,
                    })),
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
                      onUpdateStatus(r, key);
                    },
                  }}
                >
                  <Tag
                    color={statusMeta.color}
                    onClick={(e) => e.stopPropagation()}
                    className="!m-0 !cursor-pointer !text-[10.5px] !rounded-md !border-dashed hover:!border-solid hover:opacity-80 flex items-center gap-1 shrink-0 transition-all font-medium"
                  >
                    {statusMeta.label}
                    <DownOutlined className="text-[8px]" />
                  </Tag>
                </Dropdown>
              )}

              {isChapter && (
                <span className="text-[11px] font-medium tabular-nums text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full shrink-0">
                  {lessonCount} bài
                </span>
              )}

              {isLesson && (
                <span
                  className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full shrink-0 ${
                    isSelected || isDropTarget
                      ? 'bg-blue-600 text-white'
                      : materialCount > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {materialCount}
                </span>
              )}
            </div>

            {/* Cụm phải: Thao tác */}
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {editable && isChapter && onAddLesson && (
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => onAddLesson(r)}
                  className="!text-[11.5px] !px-2 !text-blue-600 !border-blue-300 hover:!bg-blue-50"
                >
                  Bài học
                </Button>
              )}

              {editable && (
                <div className="resource-row-actions flex items-center gap-0.5">
                  {onEdit && (
                    <Tooltip title="Chỉnh sửa">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(r)}
                        className="!text-slate-500 hover:!text-blue-600"
                      />
                    </Tooltip>
                  )}

                  {onDelete && (
                    <Popconfirm
                      title="Xóa mục này?"
                      description={
                        isChapter && lessonCount > 0
                          ? `Chương này đang có ${lessonCount} bài học.`
                          : isLesson && materialCount > 0
                            ? `Bài học này đang có ${materialCount} tài liệu.`
                            : undefined
                      }
                      onConfirm={() => onDelete(r.id)}
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
                  )}
                </div>
              )}

              {isLesson && (
                <RightOutlined
                  className={`text-[11px] ml-0.5 transition-transform ${
                    isSelected
                      ? 'text-blue-600 translate-x-0.5'
                      : 'text-slate-300'
                  }`}
                />
              )}
            </div>
          </div>
        ),
        children: [],
      });
    });

    sorted.forEach((r) => {
      const node = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId)) {
        map.get(r.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [
    structureResources,
    selectedLessonId,
    dragOverLessonId,
    lessonCountByChapter,
    materialCountByLesson,
    editable,
    draggable,
    expandedKeys,
    onSelectLesson,
    onDropResourceToLesson,
    onAddLesson,
    onEdit,
    onDelete,
    onSaveTitle,
    onUpdateStatus, // 🆕 Thêm dependency
  ]);

  const handleDrop: NonNullable<TreeProps['onDrop']> = async (info) => {
    if (!onReorder || !info.dragNode) return;
    const dragKey = Number(info.dragNode.key);
    const dropKey = Number(info.node.key);
    const dragRecord = structureResources.find((r) => r.id === dragKey);
    const dropRecord = structureResources.find((r) => r.id === dropKey);
    if (!dragRecord || !dropRecord || dragRecord.id === dropRecord.id) return;
    if (dragRecord.parentId !== dropRecord.parentId) {
      toast.error('Chỉ có thể đổi thứ tự các mục cùng cấp.');
      return;
    }

    const siblings = structureResources
      .filter((r) => r.parentId === dragRecord.parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const dragIdx = siblings.findIndex((s) => s.id === dragKey);
    const dropIdx = siblings.findIndex((s) => s.id === dropKey);
    const reordered = [...siblings];
    const [removed] = reordered.splice(dragIdx, 1);

    let insertAt = dropIdx;
    if (dragIdx < dropIdx) insertAt -= 1;

    if (info.dropToGap) {
      const dropPos = info.node.pos.split('-');
      const dropPosition =
        info.dropPosition - Number(dropPos[dropPos.length - 1]);
      reordered.splice(dropPosition === -1 ? insertAt : insertAt + 1, 0, removed);
    } else {
      reordered.splice(insertAt, 0, removed);
    }

    await onReorder(reordered.map((r, idx) => ({ id: r.id, orderIndex: idx })));
  };

  const isAllExpanded =
    chapterKeys.length > 0 && expandedKeys.length >= chapterKeys.length;
  const isCoursePoolSelected = selectedLessonId === null;

  return (
    <Card
      className="!rounded-xl border-slate-200 shadow-none"
      styles={{ body: { padding: '12px 14px' } }}
      title={
        <Space size={8}>
          <FolderOpenOutlined className="text-blue-600" />
          <span className="font-semibold text-slate-800 text-[14.5px]">
            Cấu trúc khóa học
          </span>
          <Tag
            color="blue"
            className="!m-0 !rounded-full !text-[11px] font-semibold tabular-nums"
          >
            {chapterKeys.length} chương
          </Tag>
        </Space>
      }
      extra={
        (chapterKeys.length > 0 || editable) && (
          <Space size={6}>
            {chapterKeys.length > 0 && (
              <Tooltip title={isAllExpanded ? 'Thu gọn' : 'Mở rộng'}>
                <Button
                  size="small"
                  type="text"
                  icon={
                    isAllExpanded ? <ShrinkOutlined /> : <ArrowsAltOutlined />
                  }
                  onClick={() => setExpandedKeys(isAllExpanded ? [] : chapterKeys)}
                  className="!text-slate-500 hover:!text-blue-600"
                />
              </Tooltip>
            )}

            {editable && onAddChapter && (
              <Tooltip title="Thêm chương">
                <Button
                  size="small"
                  icon={<FolderAddOutlined />}
                  onClick={onAddChapter}
                >
                  Chương
                </Button>
              </Tooltip>
            )}

            {editable && onAddHeaderLesson && (
              <Tooltip title="Thêm bài học">
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!canAddLesson}
                  onClick={onAddHeaderLesson}
                >
                  Bài học
                </Button>
              </Tooltip>
            )}
          </Space>
        )
      }
    >
      <style>{`
        .course-curriculum-tree .ant-tree-treenode {
          padding: 0 !important;
          align-items: center !important;
          width: 100%;
        }
        .course-curriculum-tree .ant-tree-switcher {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 22px !important;
          height: 34px !important;
          color: #64748b;
          border-radius: 6px;
          margin-right: 2px;
        }
        .course-curriculum-tree .ant-tree-switcher:hover {
          background-color: #f1f5f9;
          color: #0f172a;
        }
        .course-curriculum-tree .ant-tree-node-content-wrapper {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .course-curriculum-tree .ant-tree-node-content-wrapper:hover {
          background: transparent !important;
        }
        .course-curriculum-tree .ant-tree-indent-unit {
          width: 20px !important;
        }
        .course-curriculum-tree .resource-row-actions {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .course-curriculum-tree .resource-tree-row:hover .resource-row-actions,
        .course-curriculum-tree .resource-tree-row:focus-within .resource-row-actions {
          opacity: 1;
        }
        @media (hover: none) {
          .course-curriculum-tree .resource-row-actions {
            opacity: 1;
          }
        }
      `}</style>

      {/* Mục cố định: Kho tài nguyên khóa học */}
      <div className="pb-2.5 mb-2 border-b border-slate-100">
        <div
          onClick={() => onSelectCoursePool?.()}
          className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-all ${
            isCoursePoolSelected
              ? 'bg-indigo-50/90 border-indigo-500 shadow-[0_0_0_2px_rgba(99,102,241,0.1)]'
              : 'bg-slate-50/70 border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[13px] transition-colors ${
                isCoursePoolSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              <InboxOutlined />
            </span>
            <span
              className={`text-[13.5px] truncate ${
                isCoursePoolSelected
                  ? 'font-semibold text-indigo-700'
                  : 'font-medium text-slate-700'
              }`}
            >
              Kho tài nguyên khóa học
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unassignedCount > 0 && (
              <span className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                {unassignedCount} chưa gắn
              </span>
            )}
            <span
              className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                isCoursePoolSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {totalResourceCount}
            </span>
            <RightOutlined
              className={`text-[11px] transition-transform ${
                isCoursePoolSelected
                  ? 'text-indigo-600 translate-x-0.5'
                  : 'text-slate-300'
              }`}
            />
          </div>
        </div>
      </div>

      {structureResources.length === 0 ? (
        <div className="py-5">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-400 text-[12.5px]">
                Chưa có Chương hoặc Bài học nào
              </span>
            }
          />
        </div>
      ) : (
        <div className="course-curriculum-tree">
          <Tree
            showIcon={false}
            blockNode
            selectable={false}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            draggable={draggable ? { icon: false } : true}
            onDrop={handleDrop}
            treeData={treeData}
          />
        </div>
      )}
    </Card>
  );
};

export default CourseResourceTree;