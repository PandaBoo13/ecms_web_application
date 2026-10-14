import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Popconfirm, Tooltip, Tag,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';

import { adminRoleApi } from '@/services/api/admin';
import type { Role } from '@/services/types/user';

interface RoleFormValues {
  code: string;
  description?: string;
}

const RoleManagePage = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form] = Form.useForm<RoleFormValues>();

  // ══════════════════════════════════════════════════════════════
  // FETCH
  // ══════════════════════════════════════════════════════════════
  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await adminRoleApi.list();
      setRoles(list);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách vai trò');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    form.setFieldsValue({
      code: role.code,
      description: role.description,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await adminRoleApi.update(editing.id, values);
        toast.success('Cập nhật vai trò thành công');
      } else {
        await adminRoleApi.create(values);
        toast.success('Tạo vai trò thành công');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      if (e?.message) toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminRoleApi.delete(id);
      toast.success('Xóa vai trò thành công');
      fetchData();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Xóa thất bại');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<Role> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: 'Mã vai trò',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      render: (code: string) => <StatusTag status={code} />,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v?: string) => v || <Tag>—</Tag>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v?: string) => <DateDisplay value={v} format="long" />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa vai trò"
            description={`Bạn có chắc muốn xóa vai trò "${record.code}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Quản lý vai trò"
        subtitle={`Tổng ${roles.length} vai trò trong hệ thống`}
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchData();
                toast.success('Đã làm mới');
              }}
            >
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo vai trò
            </Button>
          </>
        }
      />

      <Card>
        <Table<Role>
          columns={columns}
          dataSource={roles}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Modal create/edit */}
      <Modal
        title={editing ? `Sửa vai trò #${editing.id}` : 'Tạo vai trò mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editing ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label="Mã vai trò"
            rules={[
              { required: true, message: 'Vui lòng nhập mã vai trò' },
              { max: 50, message: 'Tối đa 50 ký tự' },
              { pattern: /^[A-Z_]+$/, message: 'Chỉ chữ in hoa và dấu _' },
            ]}
          >
            <Input placeholder="VD: ADMIN, INSTRUCTOR, STUDENT" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
          >
            <Input.TextArea rows={3} placeholder="Mô tả vai trò này..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default RoleManagePage;