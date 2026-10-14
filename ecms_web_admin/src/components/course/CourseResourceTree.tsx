import { Card, Tree, Tag, Space, Empty, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  BookOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  FilePdfOutlined,
  QuestionCircleOutlined,
  FileOutlined,
} from '@ant-design/icons';

import type { CourseResourceResponse, ResourceType } from '@/services/types/course';

const { Text } = Typography;

interface Props {
  resources: CourseResourceResponse[];
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

const buildTree = (flat: CourseResourceResponse[]): DataNode[] => {
  const map = new Map<number, DataNode>();
  const roots: DataNode[] = [];

  flat.forEach((r) => {
    map.set(r.id, {
      key: r.id,
      title: (
        <Space size={8}>
          {ICON_MAP[r.resourceType] || <FileOutlined />}
          <span>{r.title}</span>
          {r.isRequired && <Tag color="red">Bắt buộc</Tag>}
          {r.isFreePreview && <Tag color="green">Preview</Tag>}
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

  flat.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const CourseResourceTree = ({ resources }: Props) => {
  if (!resources || resources.length === 0) {
    return (
      <Card>
        <Empty description="Khóa học chưa có nội dung" />
      </Card>
    );
  }

  return (
    <Card title={`Cây nội dung (${resources.length} mục)`}>
      <Tree
        showIcon={false}
        defaultExpandAll
        treeData={buildTree(resources)}
        selectable={false}
      />
    </Card>
  );
};

export default CourseResourceTree;