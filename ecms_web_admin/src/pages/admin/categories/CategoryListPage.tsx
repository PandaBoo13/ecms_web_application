import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button, Space, Select, Modal, Form, Input, Popconfirm, Tag,
  Switch, Tooltip, Typography, Card, Table, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  FolderOutlined, FolderOpenOutlined, FileOutlined,
  CheckCircleOutlined, StopOutlined, PlusCircleOutlined,
  SearchOutlined, ExpandAltOutlined, ShrinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DateDisplay from '@/components/common/DateDisplay';
import { useDebounce } from '@/hooks/useDebounce';

import { categoryApi } from '@/services/api/courses';
import type {
  CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest,
} from '@/services/types/course';

const { Text } = Typography;
const { TextArea } = Input;

interface CategoryTreeNode extends CategoryResponse {
  children?: CategoryTreeNode[];
}

interface CategoryFormValues {
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  isActive: boolean;
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
const buildTree = (flat: CategoryResponse[]): CategoryTreeNode[] => {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  flat.forEach((item) => map.set(item.id, { ...item, children: [] }));

  flat.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children || []));
  };
  sortRec(roots);
  return roots;
};

const filterTree = (
  nodes: CategoryTreeNode[],
  predicate: (n: CategoryTreeNode) => boolean,
): CategoryTreeNode[] => {
  const result: CategoryTreeNode[] = [];
  for (const node of nodes) {
    const childrenFiltered = filterTree(node.children || [], predicate);
    const selfMatch = predicate(node);

    if (selfMatch) {
      result.push({ ...node }); // giữ node + toàn bộ con
    } else if (childrenFiltered.length > 0) {
      result.push({ ...node, children: childrenFiltered }); // giữ parent context
    }
  }
  return result;
};

const collectKeys = (nodes: CategoryTreeNode[]): React.Key[] => {
  const keys: React.Key[] = [];
  const walk = (list: CategoryTreeNode[]) => {
    list.forEach((n) => {
      keys.push(n.id);
      walk(n.children || []);
    });
  };
  walk(nodes);
  return keys;
};

const countNodes = (nodes: CategoryTreeNode[]): number =>
  nodes.reduce((s, n) => s + 1 + countNodes(n.children || []), 0);

// ══════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════
const CategoryListPage = () => {
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [presetParentId, setPresetParentId] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CategoryFormValues>();

  const keyword = useDebounce(searchInput, 300);

  // ── FETCH ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoryApi.list({
        page: 0,
        size: 9999,
        sortBy: 'name',
        sortDir: 'asc',
      });
      const tree = buildTree(res.content);
      setTreeData(tree);
      setExpandedKeys(collectKeys(tree));
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được danh mục');
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── FILTER ──
  const filteredTree = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw && activeFilter === undefined) return treeData;

    return filterTree(treeData, (n) => {
      const matchKw =
        !kw ||
        n.name.toLowerCase().includes(kw) ||
        n.slug.toLowerCase().includes(kw) ||
        (n.description || '').toLowerCase().includes(kw);
      const matchActive = activeFilter === undefined || n.isActive === activeFilter;
      return matchKw && matchActive;
    });
  }, [treeData, keyword, activeFilter]);

  const filteredCount = useMemo(() => countNodes(filteredTree), [filteredTree]);
  const totalCount = useMemo(() => countNodes(treeData), [treeData]);
  const isFiltering = Boolean(keyword.trim() || activeFilter !== undefined);

  // ── ACTIONS ──
  const openCreateRoot = () => {
    setEditing(null);
    setPresetParentId(undefined);
    form.resetFields();
    setModalOpen(true);
  };

  const openCreateChild = (parent: CategoryTreeNode) => {
    setEditing(null);
    setPresetParentId(parent.id);
    form.resetFields();
    form.setFieldsValue({ parentId: parent.id });
    setModalOpen(true);
  };

  const openEdit = (record: CategoryResponse) => {
    setEditing(record);
    setPresetParentId(undefined);
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      parentId: record.parentId,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editing) {
        const payload: CategoryUpdateRequest = {
          name: values.name,
          slug: values.slug,
          description: values.description,
          parentId: values.parentId,
          isActive: values.isActive,
        };
        await categoryApi.update(editing.id, payload);
        toast.success('Cập nhật danh mục thành công');
      } else {
        const payload: CategoryCreateRequest = {
          name: values.name,
          slug: values.slug,
          description: values.description,
          parentId: values.parentId,
        };
        await categoryApi.create(payload);
        toast.success('Tạo danh mục thành công');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      const e = err as { message?: string; errorFields?: unknown };
      if (!e.errorFields) toast.error(e.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: CategoryTreeNode) => {
    try {
      await categoryApi.delete(record.id);
      toast.success('Xoá danh mục thành công');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xoá thất bại');
    }
  };

  const handleExpandAll = () => setExpandedKeys(collectKeys(filteredTree));
  const handleCollapseAll = () => setExpandedKeys([]);
  const handleRefresh = () => {
    fetchData();
    toast.success('Đã làm mới');
  };
  const handleResetFilters = () => {
    setSearchInput('');
    setActiveFilter(undefined);
  };

  // ── COLUMNS ──
  const columns: ColumnsType<CategoryTreeNode> = useMemo(
    () => [
      {
        title: 'Tên danh mục',
        dataIndex: 'name',
        key: 'name',
        render: (_: unknown, record) => {
          const hasChildren = (record.children?.length ?? 0) > 0;
          const Icon = hasChildren
            ? FolderOpenOutlined
            : record.parentId
              ? FileOutlined
              : FolderOutlined;
          const color = hasChildren ? '#fa8c16' : record.parentId ? '#94a3b8' : '#1677ff';
          return (
            <Space size={8}>
              <Icon style={{ color }} />
              <Text strong={!record.parentId} style={{ fontSize: 13.5 }}>
                {record.name}
              </Text>
              {record.childCount > 0 && (
                <Badge
                  count={record.childCount}
                  showZero={false}
                  style={{ backgroundColor: '#e6f4ff', color: '#1677ff' }}
                />
              )}
            </Space>
          );
        },
      },
      {
        title: 'Slug',
        dataIndex: 'slug',
        width: 220,
        render: (slug: string) => <Text code>{slug}</Text>,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        width: 140,
        align: 'center',
        render: (isActive: boolean) =>
          isActive ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Hoạt động
            </Tag>
          ) : (
            <Tag color="error" icon={<StopOutlined />}>
              Tạm ẩn
            </Tag>
          ),
      },
      {
        title: 'Mô tả',
        dataIndex: 'description',
        ellipsis: true,
        render: (v?: string) => v || <Text type="secondary">—</Text>,
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'createdAt',
        width: 130,
        render: (v: string) => <DateDisplay value={v} format="short" />,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 130,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={2}>
            <Tooltip title="Thêm danh mục con">
              <Button
                type="text"
                icon={<PlusCircleOutlined style={{ color: '#52c41a' }} />}
                onClick={() => openCreateChild(record)}
              />
            </Tooltip>
            <Tooltip title="Sửa">
              <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
            <Popconfirm
              title="Xoá danh mục?"
              description={
                record.childCount > 0
                  ? `Danh mục có ${record.childCount} con. Xoá có thể ảnh hưởng các mục con.`
                  : `Xoá "${record.name}"?`
              }
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Tooltip title="Xoá">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── PARENT OPTIONS (cho modal Select) ──
  const parentOptions = useMemo(() => {
    const options: { value: number; label: string }[] = [];
    const walk = (nodes: CategoryTreeNode[], depth: number) => {
      for (const n of nodes) {
        if (n.id !== editing?.id) {
          options.push({ value: n.id, label: `${'— '.repeat(depth)}${n.name}` });
          walk(n.children || [], depth + 1);
        }
      }
    };
    walk(treeData, 0);
    return options;
  }, [treeData, editing?.id]);

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Danh mục"
        subtitle="Cấu trúc cây danh mục (Cha - Con) của khóa học · Nhấp đúp vào dòng để sửa nhanh"
        badge={
          <Tag color="blue" style={{ borderRadius: 12 }}>
            {totalCount} danh mục
          </Tag>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined spin={loading} />} onClick={handleRefresh}>
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRoot}>
              Tạo danh mục gốc
            </Button>
          </Space>
        }
      />

      <Card bodyStyle={{ padding: 18 }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Tìm theo tên, slug, mô tả..."
            allowClear
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 340, height: 38 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 160, height: 38 }}
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: true, label: 'Hoạt động' },
              { value: false, label: 'Tạm ẩn' },
            ]}
          />
          {isFiltering && (
            <Button onClick={handleResetFilters} style={{ height: 38 }}>
              Xoá lọc
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Tooltip title="Mở tất cả">
            <Button icon={<ExpandAltOutlined />} onClick={handleExpandAll}>
              Mở rộng
            </Button>
          </Tooltip>
          <Tooltip title="Thu gọn tất cả">
            <Button icon={<ShrinkOutlined />} onClick={handleCollapseAll}>
              Thu gọn
            </Button>
          </Tooltip>
          {isFiltering && (
            <Tag color="blue">
              {filteredCount} / {totalCount} khớp
            </Tag>
          )}
        </div>

        {/* Tree Table */}
        <Table<CategoryTreeNode>
          columns={columns}
          dataSource={filteredTree}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onDoubleClick: () => openEdit(record),
          })}
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
            indentSize: 24,
          }}
          locale={{
            emptyText: isFiltering
              ? 'Không có danh mục nào khớp bộ lọc'
              : 'Chưa có danh mục nào — hãy tạo danh mục gốc đầu tiên',
          }}
        />
      </Card>

      {/* Modal Create/Edit */}
      <Modal
        title={
          editing
            ? `Sửa danh mục #${editing.id}`
            : presetParentId
              ? 'Tạo danh mục con'
              : 'Tạo danh mục gốc'
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editing ? 'Cập nhật' : 'Tạo'}
        cancelText="Huỷ"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
          >
            <Input placeholder="VD: IELTS, Tiếng Anh Giao Tiếp..." maxLength={255} />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug (URL)"
            rules={[
              { required: true, message: 'Vui lòng nhập slug' },
              { pattern: /^[a-z0-9-]+$/, message: 'Chỉ chữ thường, số và dấu gạch ngang' },
            ]}
          >
            <Input placeholder="VD: ielts, tieng-anh-giao-tiep" maxLength={255} />
          </Form.Item>

          <Form.Item name="parentId" label="Danh mục cha">
            <Select
              placeholder="Để trống nếu là danh mục gốc"
              allowClear
              options={parentOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} maxLength={2000} placeholder="Mô tả ngắn về danh mục..." />
          </Form.Item>

          {editing && (
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm ẩn" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CategoryListPage;