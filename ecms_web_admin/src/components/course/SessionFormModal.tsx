import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, DatePicker, Select, Space } from 'antd';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

import { sessionApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import { roomApi } from '@/services/api/course';
import type { SessionCreateRequest, RoomResponse } from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

interface Props {
  courseId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SessionFormModal = ({ courseId, open, onClose, onSuccess }: Props) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingInstructors(true);
    adminUserApi
      .search({ roleCode: 'INSTRUCTOR', isActive: true, page: 0, size: 200 })
      .then((res) => setInstructors(res.content || []))
      .catch(() => toast.error('Không tải được danh sách giảng viên'))
      .finally(() => setLoadingInstructors(false));
    roomApi
      .listActive()
      .then(setRooms)
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
  }, [open, form]);

  const instructorOptions = useMemo(
    () =>
      instructors.map((a) => ({
        value: a.accountId,
        label: `${a.fullName || a.email} (${a.email})`,
      })),
    [instructors],
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload: SessionCreateRequest = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        startTime: values.startTime.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: values.endTime.format('YYYY-MM-DDTHH:mm:ss'),
        teacherId: values.teacherId,
        substituteTeacherId: values.substituteTeacherId,
        assistantId: values.assistantId,
        roomId: values.roomId,
        note: values.note?.trim() || undefined,
      };
      await sessionApi.create(courseId, payload);
      toast.success('Tạo buổi học thành công');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Tạo buổi học thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tạo buổi học mới"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Tạo buổi học"
      cancelText="Hủy"
      width={620}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="title"
          label="Tiêu đề buổi học"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
        >
          <Input placeholder="VD: Buổi 1 - Giới thiệu & Placement test" maxLength={255} />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} placeholder="Nội dung buổi học..." />
        </Form.Item>

        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item
            name="startTime"
            label="Bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
            style={{ flex: 1 }}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="Kết thúc"
            rules={[
              { required: true, message: 'Vui lòng chọn thời gian' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const start = getFieldValue('startTime');
                  if (!value || !start || !value.isBefore(start)) return Promise.resolve();
                  return Promise.reject(new Error('Phải sau giờ bắt đầu'));
                },
              }),
            ]}
            style={{ flex: 1 }}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item name="teacherId" label="Giảng viên chính">
          <Select
            placeholder="Chọn giảng viên"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={loadingInstructors}
            options={instructorOptions}
          />
        </Form.Item>

        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item name="substituteTeacherId" label="Giảng viên dạy thay" style={{ flex: 1 }}>
            <Select
              placeholder="Chọn"
              allowClear
              showSearch
              optionFilterProp="label"
              options={instructorOptions}
            />
          </Form.Item>

          <Form.Item name="assistantId" label="Trợ giảng" style={{ flex: 1 }}>
            <Select
              placeholder="Chọn"
              allowClear
              showSearch
              optionFilterProp="label"
              options={instructorOptions}
            />
          </Form.Item>
        </Space>

        <Form.Item name="roomId" label="Phòng học">
          <Select
            placeholder="Chọn phòng"
            allowClear
            options={rooms.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú nội bộ..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SessionFormModal;