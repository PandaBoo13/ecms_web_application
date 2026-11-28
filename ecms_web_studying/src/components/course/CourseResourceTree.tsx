import { useMemo, useState } from 'react';
import { Empty, Tag, Tooltip, Button } from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  FilePdfOutlined,
  QuestionCircleOutlined,
  FileOutlined,
  HolderOutlined,
  DownOutlined,
  RightOutlined,
  LinkOutlined,
  SoundOutlined,
  PictureOutlined,
  FilePptOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  TagOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import InlineEdit from '@/components/common/InlineEdit';
import type {
  CourseResourceResponse,
  ResourceType,
} from '@/services/types/course';

export interface ResourceReorderUpdate {
  id: number;
  orderIndex: number;
}

interface Props {
  resources: CourseResourceResponse[];
  editable?: boolean;
  draggable?: boolean;
  onSaveTitle?: (id: number, title: string) => Promise<void>;
  onReorder?: (updates: ResourceReorderUpdate[]) => Promise<void>;
  onSelectResource?: (resource: CourseResourceResponse) => void;
}

const RESOURCE_META: Record<
  ResourceType,
  { icon: React.ReactNode; badgeClass: string; label: string }
> = {
  CHAPTER: {
    icon: <BookOutlined />,
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-100',
    label: 'Chương',
  },
  LESSON: {
    icon: <FileTextOutlined />,
    badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    label: 'Bài học',
  },
  VIDEO: {
    icon: <PlayCircleOutlined />,
    badgeClass: 'bg-amber-50 text-amber-600 border-amber-100',
    label: 'Video',
  },
  PDF: {
    icon: <FilePdfOutlined />,
    badgeClass: 'bg-rose-50 text-rose-600 border-rose-100',
    label: 'PDF',
  },
  SLIDE: {
    icon: <FilePptOutlined />,
    badgeClass: 'bg-orange-50 text-orange-600 border-orange-100',
    label: 'Slide',
  },
  AUDIO: {
    icon: <SoundOutlined />,
    badgeClass: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    label: 'Audio',
  },
  QUIZ: {
    icon: <QuestionCircleOutlined />,
    badgeClass: 'bg-purple-50 text-purple-600 border-purple-100',
    label: 'Quiz',
  },
  ASSIGNMENT: {
    icon: <CheckCircleOutlined />,
    badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    label: 'Bài tập',
  },
  LINK: {
    icon: <LinkOutlined />,
    badgeClass: 'bg-sky-50 text-sky-600 border-sky-100',
    label: 'Liên kết',
  },
  DOCUMENT: {
    icon: <FileOutlined />,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    label: 'Tài liệu',
  },
  IMAGE: {
    icon: <PictureOutlined />,
    badgeClass: 'bg-pink-50 text-pink-600 border-pink-100',
    label: 'Hình ảnh',
  },
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}g ${rem}p` : `${hrs} giờ`;
};

const isPublicResource = (r: CourseResourceResponse) => {
  const status = (r as CourseResourceResponse & { status?: string }).status;
  return !status || status === 'PUBLISHED';
};

const CourseResourceTree = ({
  resources,
  editable = false,
  draggable = false,
  onSaveTitle,
  onReorder,
  onSelectResource,
}: Props) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const { visibleResources, rootItems, childrenMap, chapterCount } = useMemo(() => {
    const publicItems = (resources || []).filter(isPublicResource);

    const sorted = [...publicItems].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    const idSet = new Set(sorted.map((r) => r.id));
    const map = new Map<number, CourseResourceResponse[]>();
    const roots: CourseResourceResponse[] = [];

    sorted.forEach((item) => {
      if (item.parentId && idSet.has(item.parentId)) {
        const list = map.get(item.parentId) || [];
        list.push(item);
        map.set(item.parentId, list);
      } else {
        roots.push(item);
      }
    });

    const filteredRoots = roots.filter(
      (r) => r.resourceType !== 'CHAPTER' || (map.get(r.id)?.length || 0) > 0,
    );

    const chapters = filteredRoots.filter(
      (r) => r.resourceType === 'CHAPTER',
    ).length;

    return {
      visibleResources: sorted,
      rootItems: filteredRoots,
      childrenMap: map,
      chapterCount: chapters,
    };
  }, [resources]);

  if (rootItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-slate-500 text-[13px]">
              Khóa học chưa có nội dung bài giảng nào
            </span>
          }
        />
      </div>
    );
  }

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allExpandableIds = rootItems
    .filter((r) => (childrenMap.get(r.id)?.length || 0) > 0)
    .map((r) => r.id);

  const isAllCollapsed =
    allExpandableIds.length > 0 &&
    allExpandableIds.every((id) => collapsedIds.has(id));

  const toggleAll = () => {
    if (isAllCollapsed) {
      setCollapsedIds(new Set());
    } else {
      setCollapsedIds(new Set(allExpandableIds));
    }
  };

  const handleDropItem = async (targetId: number) => {
    setDragOverId(null);
    if (!draggable || !onReorder || draggedId == null || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const dragRecord = visibleResources.find((r) => r.id === draggedId);
    const dropRecord = visibleResources.find((r) => r.id === targetId);
    setDraggedId(null);

    if (!dragRecord || !dropRecord) return;
    if (dragRecord.parentId !== dropRecord.parentId) {
      toast.error('Chỉ có thể đổi thứ tự các mục cùng cấp.');
      return;
    }

    const siblings = visibleResources
      .filter((r) => r.parentId === dragRecord.parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const dragIdx = siblings.findIndex((s) => s.id === draggedId);
    const dropIdx = siblings.findIndex((s) => s.id === targetId);
    if (dragIdx === -1 || dropIdx === -1 || dragIdx === dropIdx) return;

    const reordered = [...siblings];
    const [removed] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, removed);

    const updates: ResourceReorderUpdate[] = reordered.map((r, idx) => ({
      id: r.id,
      orderIndex: idx,
    }));

    await onReorder(updates);
  };

  const renderLeafItem = (
    item: CourseResourceResponse,
    depth = 0,
  ): React.ReactNode => {
    const meta = RESOURCE_META[item.resourceType] || RESOURCE_META.DOCUMENT;
    const durationText = formatDuration(item.duration);
    const nestedChildren = childrenMap.get(item.id) || [];
    const isDragOver = dragOverId === item.id && draggedId !== item.id;

    return (
      <div key={item.id} className={depth > 0 ? 'ml-6 mt-1.5' : ''}>
        <div
          draggable={draggable}
          onDragStart={(e) => {
            e.stopPropagation();
            setDraggedId(item.id);
          }}
          onDragOver={(e) => {
            if (!draggable) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOverId(item.id);
          }}
          onDragLeave={() => {
            if (dragOverId === item.id) setDragOverId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleDropItem(item.id);
          }}
          onClick={() => onSelectResource?.(item)}
          className={`group flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-all ${
            isDragOver
              ? 'border-blue-400 bg-blue-50/50 shadow-xs'
              : 'border-slate-200/75 bg-white hover:border-slate-300 hover:bg-slate-50/70'
          } ${onSelectResource ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {draggable && (
              <HolderOutlined className="text-slate-300 group-hover:text-slate-500 cursor-grab shrink-0" />
            )}

            <span
              className={`w-7 h-7 rounded-lg border inline-flex items-center justify-center text-[13px] shrink-0 ${meta.badgeClass}`}
            >
              {meta.icon}
            </span>

            <div className="min-w-0 flex-1">
              {editable && onSaveTitle ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <InlineEdit
                    value={item.title}
                    onSave={(val) => onSaveTitle(item.id, val)}
                  />
                </div>
              ) : (
                <div className="text-[13.5px] font-medium text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                  {item.title}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {item.resourceType === 'QUIZ' && item.hashtagFilter && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                <TagOutlined className="text-[10px]" />
                {item.hashtagFilter}
              </span>
            )}

            {item.resourceType === 'QUIZ' && item.quizCategory && (
              <Tag
                color={item.quizCategory === 'MANDATORY' ? 'purple' : 'default'}
                className="!m-0 !rounded-md !text-[11px]"
              >
                {item.quizCategory === 'MANDATORY' ? 'Bắt buộc' : 'Tự chọn'}
              </Tag>
            )}

            {item.isFreePreview && (
              <Tag
                icon={<EyeOutlined />}
                color="success"
                className="!m-0 !rounded-md !text-[11px]"
              >
                Học thử
              </Tag>
            )}

            {item.isRequired && item.resourceType !== 'QUIZ' && (
              <Tag color="red" className="!m-0 !rounded-md !text-[11px]">
                Bắt buộc
              </Tag>
            )}

            {durationText && (
              <span className="inline-flex items-center gap-1 text-[12px] text-slate-400 pl-1">
                <ClockCircleOutlined className="text-[11px]" />
                {durationText}
              </span>
            )}
          </div>
        </div>

        {nestedChildren.length > 0 && (
          <div className="border-l-2 border-slate-200/80 ml-5 pl-1 mt-1.5 space-y-1.5">
            {nestedChildren.map((sub) => renderLeafItem(sub, 0))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
          <span className="font-semibold text-slate-700">
            Cấu trúc chương trình
          </span>
          <span>•</span>
          <span>
            {chapterCount > 0 ? `${chapterCount} chương · ` : ''}
            {visibleResources.length} mục
          </span>
          {draggable && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-slate-400">
                <HolderOutlined /> Kéo thả để sắp xếp
              </span>
            </>
          )}
        </div>

        {allExpandableIds.length > 0 && (
          <Button
            type="text"
            size="small"
            onClick={toggleAll}
            className="!text-xs !text-slate-600 hover:!text-blue-600 !px-2"
          >
            {isAllCollapsed ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {rootItems.map((root, index) => {
          const children = childrenMap.get(root.id) || [];
          const isChapter =
            root.resourceType === 'CHAPTER' || children.length > 0;
          const isCollapsed = collapsedIds.has(root.id);
          const isDragOver = dragOverId === root.id && draggedId !== root.id;

          if (!isChapter) {
            return renderLeafItem(root, 0);
          }

          return (
            <div
              key={root.id}
              draggable={draggable}
              onDragStart={() => setDraggedId(root.id)}
              onDragOver={(e) => {
                if (!draggable) return;
                e.preventDefault();
                setDragOverId(root.id);
              }}
              onDragLeave={() => {
                if (dragOverId === root.id) setDragOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                void handleDropItem(root.id);
              }}
              className={`rounded-xl border transition-all overflow-hidden ${
                isDragOver
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : 'border-slate-200/90 bg-slate-50/60'
              }`}
            >
              <div
                onClick={() => toggleCollapse(root.id)}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/90 hover:bg-slate-100/70 cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {draggable && (
                    <HolderOutlined
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-slate-600 cursor-grab shrink-0"
                    />
                  )}

                  <span className="w-6 h-6 rounded-md bg-white border border-slate-200/80 inline-flex items-center justify-center text-[11px] text-slate-500 shrink-0">
                    {isCollapsed ? <RightOutlined /> : <DownOutlined />}
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold shrink-0">
                    Chương {index + 1}
                  </span>

                  <div
                    className="min-w-0 flex-1"
                    onClick={(e) => {
                      if (editable) e.stopPropagation();
                    }}
                  >
                    {editable && onSaveTitle ? (
                      <InlineEdit
                        value={root.title}
                        onSave={(val) => onSaveTitle(root.id, val)}
                      />
                    ) : (
                      <span className="font-semibold text-[14px] text-slate-900 truncate block">
                        {root.title}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip title="Số mục học liệu trong chương">
                    <span className="rounded-full bg-white border border-slate-200/80 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600">
                      {children.length} mục
                    </span>
                  </Tooltip>
                </div>
              </div>

              {!isCollapsed && (
                <div className="p-3 pt-2 border-t border-slate-200/70 bg-white/60 space-y-2">
                  {children.length > 0 ? (
                    children.map((child) => renderLeafItem(child, 0))
                  ) : (
                    <div className="text-center py-4 text-[12.5px] text-slate-400">
                      Chưa có bài học nào trong chương này
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseResourceTree;