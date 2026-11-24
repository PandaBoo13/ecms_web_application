// src/pages/admin/CategoryListPage.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button,
  Space,
  Select,
  Drawer,
  Tabs,
  Descriptions,
  Form,
  Input,
  Popconfirm,
  Tag,
  Switch,
  Tooltip,
  Card,
  Table,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  PlusCircleOutlined,
  SearchOutlined,
  ExpandAltOutlined,
  ShrinkOutlined,
  EyeOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  ApartmentOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DateDisplay from '@/components/common/DateDisplay';
import { useDebounce } from '@/hooks/useDebounce';
import { categoryApi } from '@/services/api/course';
import type {
  CategoryResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from '@/services/types/course';

const { TextArea } = Input;

type CategoryDrawerMode = 'create' | 'view' | 'edit';

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
const toSlug = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

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
      result.push({ ...node });
    } else if (childrenFiltered.length > 0) {
      result.push({ ...node, children: childrenFiltered });
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

const findNodeById = (
  nodes: CategoryTreeNode[],
  id: number,
): CategoryTreeNode | undefined => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

// ══════════════════════════════════════════════════════════════════
// DRAWER COMPONENT
// ══════════════════════════════════════════════════════════════════
interface CategoryDrawerProps {
  open: boolean;
  category: CategoryTreeNode | null;
  presetParentId?: number;
  initialMode: CategoryDrawerMode;
  parentOptions: { value: number; label: string }[];
  categoryMap: Map<number, CategoryTreeNode>;
  onClose: () => void;
  onSuccess: (targetId?: number) => void;
  onCreateChild: (parent: CategoryTreeNode) => void;
  onSelectCategory: (cat: CategoryTreeNode) => void;
  onDelete: (record: CategoryTreeNode) => Promise<void>;
}

const CategoryDrawer = ({
  open,
  category,
  presetParentId,
  initialMode,
  parentOptions,
  categoryMap,
  onClose,
  onSuccess,
  onCreateChild,
  onSelectCategory,
  onDelete,
}: CategoryDrawerProps) => {
  const [form] = Form.useForm<CategoryFormValues>();
  const [mode, setMode] = useState<CategoryDrawerMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isFormMode = isCreate || isEdit;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, category?.id, presetParentId, open]);

  useEffect(() => {
    if (!open || !isFormMode) return;
    form.resetFields();
    setSlugTouched(false);

    if (isEdit && category) {
      form.setFieldsValue({
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        isActive: category.isActive,
      });
    } else {
      form.setFieldsValue({
        parentId: presetParentId,
        isActive: true,
      });
    }
  }, [open, isFormMode, isEdit, category, presetParentId, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCreate || slugTouched) return;
    form.setFieldValue('slug', toSlug(e.target.value));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (isEdit && category) {
        const payload: CategoryUpdateRequest = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          description: values.description?.trim() || undefined,
          parentId: values.parentId,
          isActive: values.isActive,
        };
        await categoryApi.update(category.id, payload);
        toast.success('Cập nhật danh mục thành công');
        setMode('view');
        onSuccess(category.id);
      } else {
        const payload: CategoryCreateRequest = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          description: values.description?.trim() || undefined,
          parentId: values.parentId,
        };
        await categoryApi.create(payload);
        toast.success('Tạo danh mục thành công');
        form.resetFields();
        onSuccess();
        onClose();
      }
    } catch (err) {
      const e = err as { message?: string; errorFields?: unknown };
      if (!e.errorFields) toast.error(e.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const parentNode = category?.parentId
    ? categoryMap.get(category.parentId)
    : undefined;
  const presetParentNode = presetParentId
    ? categoryMap.get(presetParentId)
    : undefined;
  const directChildren = category?.children || [];

  const renderCategoryForm = () => (
    <Card
      size="small"
      title={
        isEdit
          ? 'Chỉnh sửa thông tin danh mục'
          : presetParentNode
            ? `Nhập thông tin danh mục con của "${presetParentNode.name}"`
            : 'Nhập thông tin danh mục mới'
      }
      className="!bg-white !border-slate-200/80 !rounded-xl"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
          className="!mb-3"
        >
          <Input
            placeholder="VD: IELTS, Tiếng Anh Giao Tiếp..."
            maxLength={255}
            onChange={handleNameChange}
            className="!h-9 !rounded-lg"
          />
        </Form.Item>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <Form.Item
            name="slug"
            label="Slug (URL)"
            rules={[
              { required: true, message: 'Vui lòng nhập slug' },
              {
                pattern: /^[a-z0-9-]+$/,
                message: 'Chỉ chữ thường, số và dấu gạch ngang',
              },
            ]}
            className="sm:col-span-6 !mb-3"
          >
            <Input
              placeholder="VD: ielts, tieng-anh-giao-tiep"
              maxLength={255}
              onChange={() => setSlugTouched(true)}
              className="!h-9 !rounded-lg font-mono"
            />
          </Form.Item>

          <Form.Item
            name="parentId"
            label="Danh mục cha"
            className="sm:col-span-6 !mb-3"
          >
            <Select
              placeholder="Để trống nếu là danh mục gốc"
              allowClear
              options={parentOptions}
              showSearch
              optionFilterProp="label"
              className="!w-full !h-9"
            />
          </Form.Item>
        </div>

        <Form.Item
          name="description"
          label="Mô tả"
          className={isEdit ? '!mb-3' : '!mb-0'}
        >
          <TextArea
            rows={3}
            maxLength={2000}
            placeholder="Mô tả ngắn về danh mục khóa học..."
            className="!rounded-lg"
          />
        </Form.Item>

        {isEdit && (
          <Form.Item
            name="isActive"
            label="Trạng thái hiển thị"
            valuePropName="checked"
            className="!mb-0"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm ẩn" />
          </Form.Item>
        )}
      </Form>
    </Card>
  );

  return (
    <Drawer
      placement="right"
      width={720}
      open={open}
      onClose={() => !saving && onClose()}
      destroyOnClose
      maskClosable={!saving}
      title={
        isCreate ? (
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
              <PlusOutlined />
            </div>
            <div className="min-w-0">
              <div className="text-[16.5px] font-bold text-slate-900 leading-snug">
                {presetParentNode ? 'Tạo danh mục con' : 'Tạo danh mục gốc'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {presetParentNode ? (
                  <>
                    <span className="text-xs text-slate-500">Trực thuộc:</span>
                    <Tag color="blue" className="!m-0 !text-xs !rounded">
                      {presetParentNode.name}
                    </Tag>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">
                    Thêm phân loại khóa học cấp cao nhất vào hệ thống
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          category && (
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
                {directChildren.length > 0 ? (
                  <FolderOpenOutlined />
                ) : (
                  <FolderOutlined />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[16.5px] font-bold text-slate-900 leading-snug truncate">
                  {category.name}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Tag
                    color="blue"
                    className="!m-0 !font-mono !font-semibold !text-xs !rounded"
                  >
                    {category.slug}
                  </Tag>
                  <Tag
                    color={category.isActive ? 'success' : 'default'}
                    className="!m-0 !rounded-md"
                  >
                    {category.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                  </Tag>
                </div>
              </div>
            </div>
          )
        )
      }
      extra={
        <Space size={8}>
          {isFormMode ? (
            <>
              <Button
                onClick={() => (isEdit ? setMode('view') : onClose())}
                disabled={saving}
                className="!rounded-lg"
              >
                Huỷ
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSubmit}
                className="!rounded-lg"
              >
                {isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}
              </Button>
            </>
          ) : (
            category && (
              <>
                <Tooltip title="Thêm danh mục con trực thuộc">
                  <Button
                    icon={<PlusCircleOutlined />}
                    onClick={() => onCreateChild(category)}
                    className="!rounded-lg"
                  >
                    Thêm mục con
                  </Button>
                </Tooltip>
                <Button
                  type="primary"
                  ghost
                  icon={<EditOutlined />}
                  onClick={() => setMode('edit')}
                  className="!rounded-lg"
                >
                  Chỉnh sửa
                </Button>
                <Popconfirm
                  title="Xoá danh mục này?"
                  description={
                    directChildren.length > 0
                      ? `Danh mục đang có ${directChildren.length} mục con. Xoá có thể ảnh hưởng các mục con.`
                      : `Hành động này không thể hoàn tác.`
                  }
                  okText="Xoá"
                  cancelText="Huỷ"
                  okButtonProps={{ danger: true }}
                  onConfirm={async () => {
                    await onDelete(category);
                    onClose();
                  }}
                >
                  <Tooltip title="Xoá danh mục">
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      className="!rounded-lg"
                    />
                  </Tooltip>
                </Popconfirm>
              </>
            )
          )}
        </Space>
      }
    >
      {isCreate ? (
        renderCategoryForm()
      ) : (
        category && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: (
                  <span>
                    <InfoCircleOutlined /> Thông tin danh mục
                  </span>
                ),
                children: isEdit ? (
                  renderCategoryForm()
                ) : (
                  <div className="flex flex-col gap-4">
                    <Card
                      size="small"
                      title="Chi tiết phân loại"
                      className="!bg-white !border-slate-200/80 !rounded-xl"
                    >
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <FolderOutlined /> Tên danh mục
                            </Space>
                          }
                        >
                          <span className="font-semibold text-slate-800">
                            {category.name}
                          </span>
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <LinkOutlined /> Slug
                            </Space>
                          }
                        >
                          <Tag
                            color="blue"
                            className="!m-0 !font-mono !text-xs !rounded"
                          >
                            {category.slug}
                          </Tag>
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <ApartmentOutlined /> Danh mục cha
                            </Space>
                          }
                        >
                          {parentNode ? (
                            <Tag
                              color="processing"
                              onClick={() => onSelectCategory(parentNode)}
                              className="!m-0 !rounded-md cursor-pointer hover:opacity-80"
                            >
                              {parentNode.name}
                            </Tag>
                          ) : (
                            <span className="text-slate-500">Danh mục gốc</span>
                          )}
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <InfoCircleOutlined /> Trạng thái
                            </Space>
                          }
                        >
                          <Tag
                            color={category.isActive ? 'success' : 'default'}
                            className="!m-0 !rounded-md"
                          >
                            {category.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                          </Tag>
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <CalendarOutlined /> Ngày tạo
                            </Space>
                          }
                        >
                          <DateDisplay
                            value={category.createdAt}
                            format="long"
                          />
                        </Descriptions.Item>

                        <Descriptions.Item
                          label={
                            <Space size={6}>
                              <FolderOpenOutlined /> Danh mục con
                            </Space>
                          }
                        >
                          <span className="font-medium text-slate-700">
                            {directChildren.length} mục trực thuộc
                          </span>
                        </Descriptions.Item>

                        <Descriptions.Item
                          span={2}
                          label={
                            <Space size={6}>
                              <InfoCircleOutlined /> Mô tả
                            </Space>
                          }
                        >
                          {category.description ? (
                            <span className="text-slate-600 whitespace-pre-wrap">
                              {category.description}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Chưa có mô tả
                            </span>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {directChildren.length > 0 && (
                      <Card
                        size="small"
                        title={`Danh mục con trực thuộc (${directChildren.length})`}
                        className="!bg-white !border-slate-200/80 !rounded-xl"
                      >
                        <div className="divide-y divide-slate-100">
                          {directChildren.map((child) => (
                            <div
                              key={child.id}
                              onClick={() => onSelectCategory(child)}
                              className="py-2.5 first:pt-0.5 last:pb-0.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 px-2 -mx-2 rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileOutlined className="text-slate-400 shrink-0" />
                                <span className="font-medium text-[13.5px] text-slate-800 truncate">
                                  {child.name}
                                </span>
                                <Tag className="!m-0 !font-mono !text-[11px] !bg-slate-50 !border-slate-200 !text-slate-500">
                                  {child.slug}
                                </Tag>
                              </div>
                              <Tag
                                color={child.isActive ? 'success' : 'default'}
                                className="!m-0 !rounded-md shrink-0"
                              >
                                {child.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                              </Tag>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )
      )}
    </Drawer>
  );
};

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════
const CategoryListPage = () => {
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const [drawerState, setDrawerState] = useState<{
    mode: CategoryDrawerMode;
    category: CategoryTreeNode | null;
    presetParentId?: number;
  } | null>(null);

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
      return tree;
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Không tải được danh mục',
      );
      setTreeData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map tra cứu nhanh node theo id
  const categoryMap = useMemo(() => {
    const map = new Map<number, CategoryTreeNode>();
    const walk = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((n) => {
        map.set(n.id, n);
        walk(n.children || []);
      });
    };
    walk(treeData);
    return map;
  }, [treeData]);

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
      const matchActive =
        activeFilter === undefined || n.isActive === activeFilter;
      return matchKw && matchActive;
    });
  }, [treeData, keyword, activeFilter]);

  const filteredCount = useMemo(
    () => countNodes(filteredTree),
    [filteredTree],
  );
  const totalCount = useMemo(() => countNodes(treeData), [treeData]);
  const isFiltering = Boolean(keyword.trim() || activeFilter !== undefined);

  // ── ACTIONS ──
  const openView = useCallback((record: CategoryTreeNode) => {
    setDrawerState({ mode: 'view', category: record });
  }, []);

  const openCreateRoot = () => {
    setDrawerState({ mode: 'create', category: null });
  };

  const openCreateChild = useCallback((parent: CategoryTreeNode) => {
    setDrawerState({
      mode: 'create',
      category: null,
      presetParentId: parent.id,
    });
  }, []);

  const openEdit = useCallback((record: CategoryTreeNode) => {
    setDrawerState({ mode: 'edit', category: record });
  }, []);

  const handleDelete = useCallback(
    async (record: CategoryTreeNode) => {
      try {
        await categoryApi.delete(record.id);
        toast.success('Xoá danh mục thành công');
        setDrawerState((prev) =>
          prev?.category?.id === record.id ? null : prev,
        );
        fetchData();
      } catch (err) {
        toast.error((err as { message?: string })?.message || 'Xoá thất bại');
      }
    },
    [fetchData],
  );

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
          const childTotal = record.children?.length ?? record.childCount ?? 0;
          const hasChildren = childTotal > 0;
          const Icon = hasChildren
            ? FolderOpenOutlined
            : record.parentId
              ? FileOutlined
              : FolderOutlined;
          const iconClass = hasChildren
            ? 'text-amber-500'
            : record.parentId
              ? 'text-slate-400'
              : 'text-blue-600';

          return (
            <Space size={8}>
              <Icon className={iconClass} />
              <span
                onClick={() => openView(record)}
                className={`text-[13.5px] text-slate-800 cursor-pointer hover:text-blue-600 transition-colors ${
                  !record.parentId ? 'font-semibold' : 'font-medium'
                }`}
              >
                {record.name}
              </span>
              {childTotal > 0 && (
                <Tag className="!m-0 !rounded-full !text-[11px] !px-2 !bg-blue-50 !border-blue-100 !text-blue-600 font-medium">
                  {childTotal}
                </Tag>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Slug',
        dataIndex: 'slug',
        width: 230,
        render: (slug: string) => (
          <Tag className="!m-0 !font-mono !text-xs !rounded-md !bg-slate-50 !border-slate-200 !text-slate-600">
            {slug}
          </Tag>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        width: 135,
        align: 'center',
        render: (isActive: boolean) => (
          <Tag
            color={isActive ? 'success' : 'default'}
            className="!m-0 !rounded-md"
          >
            {isActive ? 'Hoạt động' : 'Tạm ẩn'}
          </Tag>
        ),
      },
      {
        title: 'Mô tả',
        dataIndex: 'description',
        ellipsis: true,
        render: (v?: string) =>
          v ? (
            <span className="text-[13px] text-slate-600">{v}</span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'createdAt',
        width: 135,
        render: (v: string) => <DateDisplay value={v} format="short" />,
      },
      {
        title: '',
        key: 'actions',
        width: 140,
        align: 'center',
        fixed: 'right',
        render: (_, record) => {
          const childTotal = record.children?.length ?? record.childCount ?? 0;
          return (
            <Space size={2} onDoubleClick={(e) => e.stopPropagation()}>
              <Tooltip title="Xem chi tiết">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined className="text-blue-600" />}
                  onClick={() => openView(record)}
                />
              </Tooltip>
              <Tooltip title="Thêm danh mục con">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusCircleOutlined className="text-emerald-600" />}
                  onClick={() => openCreateChild(record)}
                />
              </Tooltip>
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined className="text-slate-600" />}
                  onClick={() => openEdit(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Xoá danh mục?"
                description={
                  childTotal > 0
                    ? `Danh mục có ${childTotal} mục con. Xoá có thể ảnh hưởng các mục con.`
                    : `Xoá "${record.name}"?`
                }
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(record)}
              >
                <Tooltip title="Xoá">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [openView, openCreateChild, openEdit, handleDelete],
  );

  // Loại trừ node đang sửa và toàn bộ con của nó khỏi danh sách chọn danh mục cha
  const parentOptions = useMemo(() => {
    const editingId =
      drawerState?.mode === 'edit' ? drawerState.category?.id : undefined;
    const options: { value: number; label: string }[] = [];
    const walk = (nodes: CategoryTreeNode[], depth: number) => {
      for (const n of nodes) {
        if (n.id !== editingId) {
          options.push({
            value: n.id,
            label: `${'— '.repeat(depth)}${n.name}`,
          });
          walk(n.children || [], depth + 1);
        }
      }
    };
    walk(treeData, 0);
    return options;
  }, [treeData, drawerState?.mode, drawerState?.category?.id]);

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Danh mục"
        subtitle="Cấu trúc cây danh mục (Cha - Con) phân loại khóa học của trung tâm"
        extra={
          <Space size={8}>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
              className="!rounded-lg"
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateRoot}
              className="!rounded-lg !font-medium"
            >
              Tạo danh mục gốc
            </Button>
          </Space>
        }
      />

      <Card
        className="!rounded-xl border-slate-200/90 shadow-none"
        styles={{ body: { padding: '16px 20px' } }}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Space wrap size={10}>
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm theo tên, slug, mô tả..."
              allowClear
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-72 !h-9 !rounded-lg"
            />
            <Select
              placeholder="Trạng thái"
              allowClear
              className="w-44 !h-9"
              value={activeFilter}
              onChange={setActiveFilter}
              options={[
                { value: true, label: 'Hoạt động' },
                { value: false, label: 'Tạm ẩn' },
              ]}
            />
            {isFiltering && (
              <Button onClick={handleResetFilters} className="!h-9 !rounded-lg">
                Xoá lọc
              </Button>
            )}
          </Space>

          <Space wrap size={8}>
            <Tag className="!m-0 !rounded-full !text-xs !font-medium !bg-slate-50 !border-slate-200 !text-slate-600 px-2.5 py-0.5">
              {isFiltering
                ? `Hiển thị ${filteredCount} / ${totalCount} danh mục`
                : `${totalCount} danh mục`}
            </Tag>
            <Tooltip title="Mở rộng toàn bộ cây">
              <Button
                icon={<ExpandAltOutlined />}
                onClick={handleExpandAll}
                className="!rounded-lg"
              >
                Mở rộng
              </Button>
            </Tooltip>
            <Tooltip title="Thu gọn toàn bộ cây">
              <Button
                icon={<ShrinkOutlined />}
                onClick={handleCollapseAll}
                className="!rounded-lg"
              >
                Thu gọn
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* Tree Table */}
        <Table<CategoryTreeNode>
          columns={columns}
          dataSource={filteredTree}
          loading={loading}
          rowKey="id"
          size="middle"
          pagination={false}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onDoubleClick: () => openView(record),
            className: 'cursor-pointer',
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

      <CategoryDrawer
        open={Boolean(drawerState)}
        category={drawerState?.category ?? null}
        presetParentId={drawerState?.presetParentId}
        initialMode={drawerState?.mode ?? 'view'}
        parentOptions={parentOptions}
        categoryMap={categoryMap}
        onClose={() => setDrawerState(null)}
        onSuccess={async (targetId) => {
          const updatedTree = await fetchData();
          if (targetId) {
            const updatedNode = findNodeById(updatedTree, targetId);
            setDrawerState((prev) =>
              prev && updatedNode ? { ...prev, category: updatedNode } : null,
            );
          }
        }}
        onCreateChild={(parent) => openCreateChild(parent)}
        onSelectCategory={(cat) => openView(cat)}
        onDelete={handleDelete}
      />
    </PageContainer>
  );
};

export default CategoryListPage;