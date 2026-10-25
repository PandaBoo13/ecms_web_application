import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Tag, Popconfirm,
  Tooltip, Alert, Typography, Select,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SyncOutlined, ApiOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DateDisplay from '@/components/common/DateDisplay';
import { adminPermissionApi } from '@/services/api/admin';
import type { Permission, PermissionRequest } from '@/services/types/user';

const { Text } = Typography;

const METHOD_COLOR: Record<string, string> = {
  GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'purple', DELETE: 'red',
};

const PermissionListPage = () => {
  const [data, setData] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [modules, setModules] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form] = Form.useForm<PermissionRequest>();

  const fetchModules = useCallback(async () => {
    try {
      const list = await adminPermissionApi.getModules();
      setModules(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, size, sortBy: 'module', sortDir: 'asc' };
      if (moduleFilter) params.module = moduleFilter;
      if (keyword.trim()) params.search = keyword.trim();
      const res = await adminPermissionApi.search(params);
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được danh sách quyền');
      setData([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, moduleFilter, keyword]);

  useEffect(() => { fetchModules(); }, [fetchModules]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [moduleFilter, keyword]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (p: Permission) => {
    setEditing(p);
    form.setFieldsValue({
      method: p.method, endpointPattern: p.endpointPattern,
      module: p.module, description: p.description,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await adminPermissionApi.update(editing.id, values);
        toast.success('Cập nhật quyền thành công');
      } else {
        await adminPermissionApi.create(values);
        toast.success('Tạo quyền thành công');
      }
      setModalOpen(false);
      fetchModules();
      fetchData();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminPermissionApi.delete(id);
      toast.success('Đã xoá quyền');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xoá thất bại');
    }
  };

  const handleSync = async () => {
    if (!window.confirm('Đồng bộ permissions từ code annotations của BE? Hành động này sẽ thêm/sửa các quyền dựa trên @PreAuthorize.')) return;
    setSyncing(true);
    try {
      const msg = await adminPermissionApi.sync();
      toast.success(msg || 'Đồng bộ thành công', { duration: 5000 });
      fetchModules();
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const columns: ColumnsType<Permission> = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70, align: 'center' },
    {
      title: 'Method', dataIndex: 'method', width: 100, align: 'center',
      render: (m: string) => <Tag color={METHOD_COLOR[m] || 'default'}>{m}</Tag>,
    },
    {
      title: 'Endpoint', dataIndex: 'endpointPattern',
      render: (v: string) => <Text code copyable={{ text: v }}>{v}</Text>,
    },
    {
      title: 'Module', dataIndex: 'module', width: 160,
      render: (v?: string) => v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Mô tả', dataIndex: 'description', ellipsis: true,
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', width: 140,
      render: (v: string) => <DateDisplay value={v} />,
    },
    {
      title: 'Thao tác', key: 'actions', width: 110, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Space size={2}>
          <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title="Xoá quyền này?" description={r.endpointPattern}
            onConfirm={() => handleDelete(r.id)} okText="Xoá" cancelText="Huỷ"
            okButtonProps={{ danger: true }}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Quyền hạn (Permission)"
        subtitle={`Tổng ${total} quyền trong hệ thống`}
        backButton backTo="/admin/roles"
        extra={
          <Space wrap>
            <Button icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing}>
              Đồng bộ từ code
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchModules(); fetchData(); toast.success('Đã làm mới'); }}>
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm quyền
            </Button>
          </Space>
        }
      />

      <Alert
        type="info" showIcon icon={<ApiOutlined />}
        style={{ marginBottom: 16, borderRadius: 8 }}
        message="Permissions được scan từ @PreAuthorize của BE. Nút 'Đồng bộ' gọi POST /api/rbac/permissions/sync — tự thêm/sửa permission khi BE có endpoint mới."
      />

      <Card bodyStyle={{ padding: 18 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Select
            placeholder="Lọc theo module" allowClear style={{ width: 220 }}
            value={moduleFilter} onChange={setModuleFilter} showSearch
            options={modules.map((m) => ({ value: m, label: m }))}
          />
          <Input.Search
            placeholder="Tìm theo endpoint / mô tả..." style={{ width: 340 }}
            allowClear onSearch={setKeyword} enterButton
          />
        </div>
        <Table<Permission>
          columns={columns} dataSource={data} loading={loading} rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page + 1, pageSize: size, total, showSizeChanger: true,
            showTotal: (t) => `Tổng ${t} quyền`,
            onChange: (p, s) => { setPage(p - 1); setSize(s); },
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          locale={{ emptyText: 'Chưa có quyền nào' }}
        />
      </Card>

      <Modal
        title={editing ? `Sửa quyền #${editing.id}` : 'Thêm quyền mới'}
        open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSubmit}
        confirmLoading={saving} okText={editing ? 'Cập nhật' : 'Tạo mới'} cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="method" label="HTTP Method" rules={[{ required: true, message: 'Chọn method' }]}>
            <Select options={['GET','POST','PUT','PATCH','DELETE'].map((m) => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="endpointPattern" label="Endpoint pattern" rules={[{ required: true, message: 'Nhập endpoint' }]}>
            <Input placeholder="VD: /api/courses/{id}" />
          </Form.Item>
          <Form.Item name="module" label="Module">
            <Input placeholder="VD: COURSES, RBAC, LEADS..." />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="VD: Sửa khoá học" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PermissionListPage;