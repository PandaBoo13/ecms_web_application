import { useEffect, useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber,
  Switch, Popconfirm, Tooltip, Select, Typography, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { roomApi } from '@/services/api/course/roomApi';
import type { RoomResponse, RoomRequest } from '@/services/types/course/room';

const { Text } = Typography;

const RoomListPage = () => {
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<RoomRequest>();

  // Filter State (Client-side vì API listAll trả về mảng)
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await roomApi.listAll();
      setRooms(data);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Lọc Client-side
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchSearch = 
        r.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (r.code && r.code.toLowerCase().includes(searchText.toLowerCase())) ||
        (r.location && r.location.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchActive = activeFilter === undefined || r.isActive === activeFilter;
      
      return matchSearch && matchActive;
    });
  }, [rooms, searchText, activeFilter]);

  // Handlers
  const handleOpenModal = (room?: RoomResponse) => {
    setEditingRoom(room || null);
    setIsModalOpen(true);
    if (room) {
      form.setFieldsValue(room);
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, capacity: 20 });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingRoom) {
        await roomApi.update(editingRoom.id, values);
        toast.success('Cập nhật phòng thành công');
      } else {
        await roomApi.create(values);
        toast.success('Thêm phòng thành công');
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Lưu thông tin thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await roomApi.delete(id);
      toast.success('Xóa phòng thành công');
      fetchRooms();
    } catch (err) {
      // Bắt lỗi 409 Conflict (Phòng đang được sử dụng)
      toast.error(
        (err as { message?: string })?.message || 
        'Không thể xóa phòng vì đang được sử dụng trong khóa học hoặc buổi học!'
      );
    }
  };

  const columns: ColumnsType<RoomResponse> = [
    {
      title: 'Mã phòng',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (v) => <Text strong>{v || '—'}</Text>,
    },
    {
      title: 'Tên phòng',
      dataIndex: 'name',
      key: 'name',
      render: (v) => <Text style={{ color: '#1677ff', fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'Sức chứa',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      align: 'center',
      render: (v) => (v ? `${v} chỗ` : '—'),
    },
    {
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      render: (v) => (
        <Space size={4}>
          <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
          {v || '—'}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      align: 'center',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          </Tooltip>
          <Popconfirm
            title="Xóa phòng này?"
            description="Hành động này không thể hoàn tác."
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

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Phòng học"
        subtitle="Quản lý danh sách phòng học của trung tâm"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchRooms}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
              Thêm phòng
            </Button>
          </Space>
        }
      />

      <Card bordered={false}>
        <Alert
          type="info"
          showIcon
          message="Lưu ý: Không thể xóa phòng nếu phòng đó đang được sử dụng trong bất kỳ khóa học hoặc buổi học nào."
          style={{ marginBottom: 16 }}
        />

        {/* Thanh Filter */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Tìm theo mã, tên hoặc vị trí..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 160 }}
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: true, label: 'Đang hoạt động' },
              { value: false, label: 'Tạm ngưng' },
            ]}
          />
        </Space>

        <Table<RoomResponse>
          columns={columns}
          dataSource={filteredRooms}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} phòng` }}
        />
      </Card>

      {/* Modal Thêm / Sửa */}
      <Modal
        title={editingRoom ? 'Cập nhật phòng học' : 'Thêm phòng học mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingRoom ? 'Lưu thay đổi' : 'Tạo phòng'}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="Mã phòng" tooltip="Mã định danh phòng (không bắt buộc, nhưng phải là duy nhất)">
            <Input placeholder="VD: P101" maxLength={50} />
          </Form.Item>

          <Form.Item 
            name="name" 
            label="Tên phòng" 
            rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}
          >
            <Input placeholder="VD: Phòng học 101" maxLength={100} />
          </Form.Item>

          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item name="capacity" label="Sức chứa (chỗ ngồi)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 30" />
            </Form.Item>
            
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" style={{ flex: 1 }}>
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm ngưng" />
            </Form.Item>
          </Space>

          <Form.Item name="location" label="Vị trí / Tòa nhà">
            <Input placeholder="VD: Tầng 2, Tòa nhà A" maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default RoomListPage;