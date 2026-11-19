// src/components/course/CourseResourceTree.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Tree,
  Tag,
  Space,
  Empty,
  Typography,
  Button,
  Popconfirm,
  Tooltip,
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
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import InlineEdit from '@/components/common/InlineEdit';
import type { CourseResourceResponse } from '@/services/types/course';

const { Text } = Typography;

export interface ResourceReorderUpdate {
  id: number;
  orderIndex: number;
}

interface Props {
  resources: CourseResourceResponse[];
  selectedLessonId?: number | null;
  onSelectLesson?: (lesson: CourseResourceResponse) => void;
  editable?: boolean;
  draggable?: boolean;
  onSaveTitle?: (id: number, title: string) => Promise<void>;
  onReorder?: (updates: ResourceReorderUpdate[]) => Promise<void>;
  onDelete?: (id: number) => void;
  onEdit?: (resource: CourseResourceResponse) => void;
  onAddLesson?: (chapter: CourseResourceResponse) => void;
}

const CourseResourceTree = ({
  resources,
  selectedLessonId,
  onSelectLesson,
  editable = false,
  draggable = false,
  onSaveTitle,
  onReorder,
  onDelete,
  onEdit,
  onAddLesson,
}: Props) => {
  // Chỉ giữ Chương, Bài học và Quiz cấp chương ở cây bên trái
  // Các file tài liệu của từng Lesson được hiển thị ở panel bên phải
  const structureResources = useMemo(
    () =>
      resources.filter(
        (r) =>
          r.resourceType === 'CHAPTER' ||
          r.resourceType === 'LESSON' ||
          r.resourceType === 'QUIZ',
      ),
    [resources],
  );

  // Đếm số lượng file tài liệu đính kèm của mỗi Lesson
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

  // Đếm số lượng bài học trong mỗi Chương
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

  useEffect(() => {
    setExpandedKeys((prev) => {
      const merged = new Set([...prev, ...chapterKeys]);
      return Array.from(merged);
    });
  }, [chapterKeys]);

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
      const lessonCount = lessonCountByChapter.get(r.id) || 0;
      const materialCount = materialCountByLesson.get(r.id) || 0;

      const rowStyleClass = isChapter
        ? 'bg-slate-100/90 border-slate-200/90 px-3 py-2.5 my-1.5 hover:border-blue-300'
        : isSelected
          ? 'bg-blue-50/90 border-blue-500 px-3 py-2 my-1 shadow-[0_0_0_2px_rgba(59,130,246,0.12)] cursor-pointer'
          : 'bg-white border-slate-200/80 px-3 py-2 my-1 hover:border-blue-300 hover:bg-slate-50/80 cursor-pointer';

      map.set(r.id, {
        key: r.id,
        title: (
          <div
            onClick={() => {
              if (isLesson) {
                onSelectLesson?.(r);
              }
            }}
            className={`resource-tree-row group flex items-center justify-between gap-2.5 rounded-lg border transition-all ${rowStyleClass}`}
          >
            {/* Cụm trái */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {draggable && (
                <Tooltip title="Kéo thả cùng cấp để sắp xếp">
                  <span
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex items-center shrink-0"
                  >
                    <HolderOutlined style={{ fontSize: 13 }} />
                  </span>
                </Tooltip>
              )}

              {/* Icon phân loại */}
              <span
                style={{
                  backgroundColor: isChapter
                    ? '#dbeafe'
                    : isLesson
                      ? isSelected
                        ? '#2563eb'
                        : '#dcfce7'
                      : '#f3e8ff',
                  color: isChapter
                    ? '#1d4ed8'
                    : isLesson
                      ? isSelected
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

              {/* Tiêu đề */}
              <div
                onClick={(e) => {
                  if (editable && onSaveTitle) e.stopPropagation();
                }}
                className={`min-w-0 flex-1 ${
                  isChapter
                    ? 'font-bold text-[13.5px] text-slate-800'
                    : isSelected
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

              {/* Bộ đếm số lượng */}
              {isChapter && (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full shrink-0">
                  {lessonCount} bài
                </span>
              )}

              {isLesson && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : materialCount > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {materialCount} file
                </span>
              )}
            </div>

            {/* Cụm phải: Thao tác */}
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {editable && isChapter && onAddLesson && (
                <Tooltip title="Thêm bài học vào chương này">
                  <Button
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => onAddLesson(r)}
                    className="!text-[11.5px] !px-2 !text-blue-600 !border-blue-300 hover:!bg-blue-50"
                  >
                    Bài học
                  </Button>
                </Tooltip>
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
    lessonCountByChapter,
    materialCountByLesson,
    editable,
    draggable,
    onSelectLesson,
    onAddLesson,
    onEdit,
    onDelete,
    onSaveTitle,
  ]);

  const handleDrop: NonNullable<TreeProps['onDrop']> = async (info) => {
    if (!onReorder) return;
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

  if (structureResources.length === 0) {
    return (
      <Card className="!rounded-xl border-slate-200 shadow-none">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-slate-400">
              Chưa có Chương hoặc Bài học nào
            </span>
          }
        />
      </Card>
    );
  }

  const isAllExpanded =
    chapterKeys.length > 0 && expandedKeys.length >= chapterKeys.length;

  return (
    <Card
      className="!rounded-xl border-slate-200 shadow-none"
      styles={{ body: { padding: '12px 14px' } }}
      title={
        <Space size={8}>
          <FolderOpenOutlined className="text-blue-600" />
          <span className="font-bold text-slate-800 text-[14.5px]">
            Chương & Bài học
          </span>
          <Tag
            color="blue"
            className="!m-0 !rounded-full !text-[11px] font-semibold"
          >
            {chapterKeys.length} chương
          </Tag>
        </Space>
      }
      extra={
        chapterKeys.length > 0 && (
          <Button
            size="small"
            type="text"
            icon={isAllExpanded ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
            onClick={() => setExpandedKeys(isAllExpanded ? [] : chapterKeys)}
            className="!text-slate-500 hover:!text-blue-600 !text-[12px]"
          >
            {isAllExpanded ? 'Thu gọn' : 'Mở rộng'}
          </Button>
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

      <div className="course-curriculum-tree">
        <Tree
          showIcon={false}
          blockNode
          selectable={false}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys)}
          draggable={draggable ? { icon: false } : false}
          onDrop={handleDrop}
          treeData={treeData}
        />
      </div>
    </Card>
  );
};

export default CourseResourceTree;