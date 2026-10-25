import { Card, Tree, Tag, Space, Empty, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  BookOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  FilePdfOutlined,
  QuestionCircleOutlined,
  FileOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import InlineEdit from '@/components/common/InlineEdit';
import type { CourseResourceResponse, ResourceType } from '@/services/types/course';

const { Text } = Typography;

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
}

const ICON_MAP: Record<ResourceType, React.ReactNode> = {
  CHAPTER: <BookOutlined style={{ color: '#1677ff' }} />,
  LESSON: <FileTextOutlined style={{ color: '#52c41a' }} />,
  VIDEO: <PlayCircleOutlined style={{ color: '#faad14' }} />,
  PDF: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
  SLIDE: <FileOutlined />,
  AUDIO: <FileOutlined />,
  QUIZ: <QuestionCircleOutlined style={{ color: '#722ed1' }} />,
  ASSIGNMENT: <FileTextOutlined />,
  LINK: <FileOutlined />,
  DOCUMENT: <FileOutlined />,
  IMAGE: <FileOutlined />,
};

const buildTree = (
  flat: CourseResourceResponse[],
  editable: boolean,
  onSaveTitle?: (id: number, title: string) => Promise<void>,
): DataNode[] => {
  const map = new Map<number, DataNode>();
  const roots: DataNode[] = [];

  const sorted = [...flat].sort((a, b) => a.orderIndex - b.orderIndex);

  sorted.forEach((r) => {
    map.set(r.id, {
      key: r.id,
      title: (
        <Space size={8} style={{ width: '100%' }}>
          {ICON_MAP[r.resourceType] || <FileOutlined />}
          {editable && onSaveTitle ? (
            <InlineEdit
              value={r.title}
              onSave={(val) => onSaveTitle(r.id, val)}
            />
          ) : (
            <span>{r.title}</span>
          )}
          {r.isRequired && <Tag color="red">Bắt buộc</Tag>}
          {r.isFreePreview && <Tag color="green">Preview</Tag>}
          {r.resourceType === 'QUIZ' && r.quizCategory && (
            <Tag color={r.quizCategory === 'MANDATORY' ? 'purple' : 'default'}>
              {r.quizCategory === 'MANDATORY' ? 'Bắt buộc' : 'Tự chọn'}
            </Tag>
          )}
          {r.resourceType === 'QUIZ' && r.hashtagFilter && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              #{r.hashtagFilter}
            </Text>
          )}
          {r.duration ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {Math.floor(r.duration / 60)} phút
            </Text>
          ) : null}
        </Space>
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
};

const CourseResourceTree = ({
  resources,
  editable = false,
  draggable = false,
  onSaveTitle,
  onReorder,
}: Props) => {
  if (!resources || resources.length === 0) {
    return (
      <Card>
        <Empty description="Khóa học chưa có nội dung" />
      </Card>
    );
  }

  const handleDrop = async (info: any) => {
    if (!onReorder) return;

    const dragKey = Number(info.dragNode.key);
    const dropKey = Number(info.node.key);

    const dragRecord = resources.find((r) => r.id === dragKey);
    const dropRecord = resources.find((r) => r.id === dropKey);
    if (!dragRecord || !dropRecord) return;
    if (dragRecord.id === dropRecord.id) return;

    // Bắt buộc phải cùng cấp (cùng parentId) mới cho phép đổi thứ tự
    if (dragRecord.parentId !== dropRecord.parentId) {
      toast.error('Chỉ có thể đổi thứ tự các mục cùng cấp.');
      return;
    }

    const siblings = resources
      .filter((r) => r.parentId === dragRecord.parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const dragIdx = siblings.findIndex((s) => s.id === dragKey);
    const dropIdx = siblings.findIndex((s) => s.id === dropKey);
    if (dragIdx === -1 || dropIdx === -1 || dragIdx === dropIdx) return;

    const reordered = [...siblings];
    const [removed] = reordered.splice(dragIdx, 1);

    let insertAt = dropIdx;
    if (dragIdx < dropIdx) {
      insertAt -= 1; // trừ đi 1 vị trí vì đã xóa dragRecord khỏi mảng
    }

    if (info.dropToGap) {
      // Thả vào khoảng trống (trước hoặc sau)
      const dropPos = info.node.pos.split('-');
      const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
      const finalIdx = dropPosition === -1 ? insertAt : insertAt + 1;
      reordered.splice(finalIdx, 0, removed);
    } else {
      // Thả đè lên node (dropToGap = false)
      // Chèn vào đúng vị trí của node bị đè (đẩy node bị đè xuống dưới)
      reordered.splice(insertAt, 0, removed);
    }

    const updates: ResourceReorderUpdate[] = reordered.map((r, idx) => ({
      id: r.id,
      orderIndex: idx,
    }));

    await onReorder(updates);
  };

  const draggableConfig = draggable ? { icon: false } : false;

  return (
    <Card
      title={`Cây nội dung (${resources.length} mục)`}
      extra={
        draggable && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <HolderOutlined /> Kéo thả để đổi thứ tự
          </Text>
        )
      }
    >
      <Tree
        showIcon={false}
        defaultExpandAll
        blockNode
        draggable={draggableConfig}
        onDrop={handleDrop}
        treeData={buildTree(resources, editable, onSaveTitle)}
        selectable={false}
      />
    </Card>
  );
};

export default CourseResourceTree;