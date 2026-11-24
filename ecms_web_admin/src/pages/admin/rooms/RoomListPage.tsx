// src/pages/admin/RoomListPage.tsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Drawer,
  Tabs,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Switch,
  Popconfirm,
  Tooltip,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  TeamOutlined,
  EyeOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { roomApi } from '@/services/api/course/roomApi';
import type { RoomResponse, RoomRequest } from '@/services/types/course/room';

type RoomDrawerMode = 'create' | 'view' | 'edit';

interface RoomDrawerProps {
  open: boolean;
  room: RoomResponse | null;
  initialMode: RoomDrawerMode;
  onClose: () => void;
  onSuccess: (updatedRoom?: RoomResponse) => void;
  onDelete: (id: number) => Promise<void>;
}

const RoomDrawer = ({
  open,
  room,
  initialMode,
  onClose,
  onSuccess,
  onDelete,
}: RoomDrawerProps) => {
  const [form] = Form.useForm<RoomRequest>();
  const [mode, setMode] = useState<RoomDrawerMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);

  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isFormMode = isCreate || isEdit;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, room?.id, open]);

  useEffect(() => {
    if (!open || !isFormMode) return;
    form.resetFields();
    if (isEdit && room) {
      form.setFieldsValue({
        code: room.code,
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        isActive: room.isActive,
      });
    } else {
      form.setFieldsValue({
        isActive: true,
        capacity: 20,
      });
    }
  }, [open, isFormMode, isEdit, room, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload: RoomRequest = {
        ...values,
        code: values.code?.trim() || undefined,
        name: values.name.trim(),
        location: values.location?.trim() || undefined,
      };

      if (isEdit && room) {
        const updated = await roomApi.update(room.id, payload);
        toast.success('Cập nhật phòng thành công');
        setMode('view');
        onSuccess(
          updated && typeof updated === 'object'
            ? updated
            : { ...room, ...payload },
        );
      } else {
        await roomApi.create(payload);
        toast.success('Thêm phòng thành công');
        form.resetFields();
        onSuccess();
        onClose();
      }
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error(
        (err as { message?: string })?.message || 'Lưu thông tin thất bại',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderRoomForm = () => (
    <Card
      size="small"
      title={isEdit ? 'Chỉnh sửa thông tin phòng' : 'Nhập thông tin phòng mới'}
      className="!bg-white !border-slate-200/80 !rounded-xl"
    >
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <Form.Item
            name="code"
            label="Mã phòng"
            tooltip="Mã định danh phòng (không bắt buộc, nhưng phải là duy nhất)"
            className="sm:col-span-4 !mb-3"
          >
            <Input
              placeholder="VD: P101"
              maxLength={50}
              className="!h-9 !rounded-lg font-mono"
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên phòng"
            rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}
            className="sm:col-span-8 !mb-3"
          >
            <Input
              placeholder="VD: Phòng học 101"
              maxLength={100}
              className="!h-9 !rounded-lg"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Form.Item
            name="capacity"
            label="Sức chứa (chỗ ngồi)"
            className="!mb-3"
          >
            <InputNumber
              min={0}
              placeholder="VD: 30"
              className="!w-full !h-9 !rounded-lg flex items-center"
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái hoạt động"
            valuePropName="checked"
            className="!mb-3"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm ngưng" />
          </Form.Item>
        </div>

        <Form.Item name="location" label="Vị trí / Tòa nhà" className="!mb-0">
          <Input
            placeholder="VD: Tầng 2, Tòa nhà A"
            maxLength={255}
            className="!h-9 !rounded-lg"
          />
        </Form.Item>
      </Form>
    </Card>
  );

  return (
    <Drawer
      placement="right"
      width={720}
      open={open}
      onClose={() => !submitting && onClose()}
      destroyOnClose
      maskClosable={!submitting}
      title={
        isCreate ? (
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
              <PlusOutlined />
            </div>
            <div>
              <div className="text-[16.5px] font-bold text-slate-900 leading-snug">
                Thêm phòng học mới
              </div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">
                Khai báo thông tin phòng học và sức chứa cho trung tâm
              </div>
            </div>
          </div>
        ) : (
          room && (
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
                <HomeOutlined />
              </div>
              <div className="min-w-0">
                <div className="text-[16.5px] font-bold text-slate-900 leading-snug truncate">
                  {room.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Tag
                    color="blue"
                    className="!m-0 !font-mono !font-semibold !text-xs !rounded"
                  >
                    {room.code || `#${room.id}`}
                  </Tag>
                  <Tag
                    color={room.isActive ? 'success' : 'default'}
                    className="!m-0 !rounded-md"
                  >
                    {room.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
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
                disabled={submitting}
                className="!rounded-lg"
              >
                Hủy
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={submitting}
                onClick={handleSubmit}
                className="!rounded-lg"
              >
                {isEdit ? 'Lưu thay đổi' : 'Tạo phòng'}
              </Button>
            </>
          ) : (
            room && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setMode('edit')}
                  className="!rounded-lg"
                >
                  Chỉnh sửa
                </Button>
                <Popconfirm
                  title="Xóa phòng học này?"
                  description="Chỉ có thể xóa nếu phòng chưa được gán vào khóa học hoặc buổi học nào."
                  okText="Xóa phòng"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={async () => {
                    await onDelete(room.id);
                    onClose();
                  }}
                >
                  <Tooltip title="Xóa phòng học">
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
        renderRoomForm()
      ) : (
        room && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: (
                  <span>
                    <InfoCircleOutlined /> Thông tin phòng học
                  </span>
                ),
                children: isEdit ? (
                  renderRoomForm()
                ) : (
                  <Card
                    size="small"
                    title="Chi tiết phòng học"
                    className="!bg-white !border-slate-200/80 !rounded-xl"
                  >
                    <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                      <Descriptions.Item
                        label={
                          <Space size={6}>
                            <BarcodeOutlined /> Mã phòng
                          </Space>
                        }
                      >
                        {room.code ? (
                          <Tag
                            color="blue"
                            className="!m-0 !font-mono !font-semibold !rounded"
                          >
                            {room.code}
                          </Tag>
                        ) : (
                          <span className="text-slate-400">Chưa đặt mã</span>
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item
                        label={
                          <Space size={6}>
                            <HomeOutlined /> Tên phòng
                          </Space>
                        }
                      >
                        <span className="font-semibold text-slate-800">
                          {room.name}
                        </span>
                      </Descriptions.Item>

                      <Descriptions.Item
                        label={
                          <Space size={6}>
                            <TeamOutlined /> Sức chứa
                          </Space>
                        }
                      >
                        {room.capacity ? (
                          <span className="font-medium text-slate-700">
                            {room.capacity} chỗ ngồi
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
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
                          color={room.isActive ? 'success' : 'default'}
                          className="!m-0 !rounded-md"
                        >
                          {room.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                        </Tag>
                      </Descriptions.Item>

                      <Descriptions.Item
                        span={2}
                        label={
                          <Space size={6}>
                            <EnvironmentOutlined /> Vị trí / Tòa nhà
                          </Space>
                        }
                      >
                        <span className="text-slate-700">
                          {room.location || '—'}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ),
              },
            ]}
          />
        )
      )}
    </Drawer>
  );
};

const RoomListPage = () => {
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // Drawer State
  const [drawerState, setDrawerState] = useState<{
    mode: RoomDrawerMode;
    room: RoomResponse | null;
  } | null>(null);

  // Filter State
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roomApi.listAll();
      setRooms(data);
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Không thể tải danh sách phòng',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchSearch =
        !keyword ||
        r.name.toLowerCase().includes(keyword) ||
        Boolean(r.code && r.code.toLowerCase().includes(keyword)) ||
        Boolean(r.location && r.location.toLowerCase().includes(keyword));

      const matchActive =
        activeFilter === undefined || r.isActive === activeFilter;

      return matchSearch && matchActive;
    });
  }, [rooms, searchText, activeFilter]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await roomApi.delete(id);
        toast.success('Xóa phòng thành công');
        setDrawerState((prev) => (prev?.room?.id === id ? null : prev));
        fetchRooms();
      } catch (err) {
        toast.error(
          (err as { message?: string })?.message ||
            'Không thể xóa phòng vì đang được sử dụng trong khóa học hoặc buổi học!',
        );
      }
    },
    [fetchRooms],
  );

  const columns: ColumnsType<RoomResponse> = useMemo(
    () => [
      {
        title: 'Mã phòng',
        dataIndex: 'code',
        key: 'code',
        width: 130,
        render: (v: string | undefined, record) =>
          v ? (
            <Tag
              color="blue"
              onClick={() => setDrawerState({ mode: 'view', room: record })}
              className="!m-0 !font-mono !font-semibold !rounded-md cursor-pointer"
            >
              {v}
            </Tag>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        title: 'Tên phòng',
        dataIndex: 'name',
        key: 'name',
        render: (v: string, record) => (
          <span
            onClick={() => setDrawerState({ mode: 'view', room: record })}
            className="font-semibold text-[13.5px] text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
          >
            {v}
          </span>
        ),
      },
      {
        title: 'Sức chứa',
        dataIndex: 'capacity',
        key: 'capacity',
        width: 120,
        align: 'center',
        render: (v?: number) =>
          v ? (
            <span className="inline-flex items-center gap-1 text-[13px] text-slate-700">
              <TeamOutlined className="text-slate-400 text-xs" />
              {v} chỗ
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        title: 'Vị trí',
        dataIndex: 'location',
        key: 'location',
        render: (v?: string) =>
          v ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
              <EnvironmentOutlined className="text-slate-400 text-xs" />
              <span>{v}</span>
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 145,
        align: 'center',
        render: (isActive: boolean) => (
          <Tag
            color={isActive ? 'success' : 'default'}
            className="!m-0 !rounded-md"
          >
            {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
          </Tag>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 112,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={2} onDoubleClick={(e) => e.stopPropagation()}>
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined className="text-blue-600" />}
                onClick={() => setDrawerState({ mode: 'view', room: record })}
              />
            </Tooltip>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="text-slate-600" />}
                onClick={() => setDrawerState({ mode: 'edit', room: record })}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa phòng học này?"
              description="Hành động này không thể hoàn tác."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title="Xóa (chỉ xóa được khi phòng chưa gắn với lớp/buổi học)">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleDelete],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Phòng học"
        subtitle="Danh sách phòng học, sức chứa và trạng thái vận hành của trung tâm"
        extra={
          <Space size={8}>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchRooms}
              className="!rounded-lg"
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDrawerState({ mode: 'create', room: null })}
              className="!rounded-lg !font-medium"
            >
              Thêm phòng
            </Button>
          </Space>
        }
      />

      <Card
        className="!rounded-xl border-slate-200/90 shadow-none"
        styles={{ body: { padding: '16px 20px' } }}
      >
        {/* Thanh Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Space wrap size={10}>
            <Input.Search
              placeholder="Tìm theo mã, tên hoặc vị trí..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-72"
            />
            <Select
              placeholder="Trạng thái"
              allowClear
              className="w-44"
              value={activeFilter}
              onChange={setActiveFilter}
              options={[
                { value: true, label: 'Đang hoạt động' },
                { value: false, label: 'Tạm ngưng' },
              ]}
            />
          </Space>

          <Tag className="!m-0 !rounded-full !text-xs !font-medium !bg-slate-50 !border-slate-200 !text-slate-600 px-2.5 py-0.5">
            Hiển thị {filteredRooms.length} / {rooms.length} phòng
          </Tag>
        </div>

        <Table<RoomResponse>
          columns={columns}
          dataSource={filteredRooms}
          loading={loading}
          rowKey="id"
          size="middle"
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onDoubleClick: () => setDrawerState({ mode: 'view', room: record }),
            className: 'cursor-pointer',
          })}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `Tổng ${t} phòng`,
          }}
        />
      </Card>

      <RoomDrawer
        open={Boolean(drawerState)}
        room={drawerState?.room ?? null}
        initialMode={drawerState?.mode ?? 'view'}
        onClose={() => setDrawerState(null)}
        onSuccess={(updatedRoom) => {
          fetchRooms();
          if (updatedRoom) {
            setDrawerState((prev) =>
              prev ? { ...prev, room: updatedRoom } : null,
            );
          }
        }}
        onDelete={handleDelete}
      />
    </PageContainer>
  );
};

export default RoomListPage;