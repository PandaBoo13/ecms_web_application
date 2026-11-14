import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, Select, InputNumber, Switch, Space, Typography, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { resourceApi } from '@/services/api/course';
import type { ResourceType, CourseResourceResponse } from '@/services/types/course';
import CourseResourceTree, { type ResourceReorderUpdate } from './CourseResourceTree';

const { Text } = Typography;
const { TextArea } = Input;

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'CHAPTER', label: 'Chương (Chapter)' },
  { value: 'LESSON', label: 'Bài học (Lesson)' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'PDF', label: 'Tài liệu PDF' },
  { value: 'SLIDE', label: 'Slide bài giảng' },
  { value: 'AUDIO', label: 'Âm thanh (Audio)' },
  { value: 'ASSIGNMENT', label: 'Bài tập (Assignment)' },
  { value: 'LINK', label: 'Đường dẫn (Link)' },
  { value: 'DOCUMENT', label: 'Tài liệu (Document)' },
  { value: 'IMAGE', label: 'Hình ảnh (Image)' },
  { value: 'QUIZ', label: 'Bài kiểm tra (Quiz)' },
];

interface Props {
  courseId: number;
  resources: any[];
  onRefresh: () => void;
}

const ResourceManager = ({ courseId, resources, onRefresh }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [editingRes, setEditingRes] = useState<CourseResourceResponse | null>(null);
  
  const selectedType = Form.useWatch('resourceType', form);

  useEffect(() => {
    if (!modalOpen) {
      form.resetFields();
      setEditingRes(null);
    } else if (editingRes) {
      form.setFieldsValue(editingRes);
    } else {
      form.setFieldsValue({ resourceType: 'CHAPTER', isRequired: false, isFreePreview: false, status: 'DRAFT' });
    }
  }, [modalOpen, editingRes, form]);

  const handleAddOrUpdate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editingRes) {
        await resourceApi.update(courseId, editingRes.id, values);
        toast.success('Cập nhật nội dung thành công');
      } else {
        await resourceApi.create(courseId, values);
        toast.success('Thêm nội dung thành công');
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Lưu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async (id: number, title: string) => {
    try {
      await resourceApi.update(courseId, id, { title });
      toast.success('Đã cập nhật tiêu đề');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Cập nhật thất bại');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await resourceApi.delete(courseId, id);
      toast.success('Đã xóa học liệu');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa thất bại');
    }
  };

  const handleReorder = async (updates: ResourceReorderUpdate[]) => {
    try {
      await resourceApi.reorder(courseId, updates);
      toast.success('Đã cập nhật thứ tự');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Đổi thứ tự thất bại');
    } finally {
      onRefresh();
    }
  };

  const handleToggleStatus = async (id: number, status: string) => {
    const nextStatus = status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    try {
      await resourceApi.update(courseId, id, { status: nextStatus });
      toast.success('Đã cập nhật trạng thái');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Cập nhật thất bại');
    }
  };

  const chapters = resources.filter(r => r.resourceType === 'CHAPTER');
  const lessons = resources.filter(r => r.resourceType === 'LESSON');

  return (
    <Card 
      title="Quản lý Nội dung khóa học" 
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRes(null); setModalOpen(true); }}>Thêm nội dung</Button>}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontStyle: 'italic' }}>
          * Mẹo: Nhấp đúp vào tiêu đề để sửa nhanh · Kéo thả để đổi thứ tự.
        </Text>
      </div>
      <CourseResourceTree 
        resources={resources} 
        editable 
        draggable
        onSaveTitle={handleSaveTitle}
        onReorder={handleReorder}
        onDelete={handleDelete}
        onEdit={(r) => { setEditingRes(r); setModalOpen(true); }}
      />

      <Modal
        title={editingRes ? 'Cập nhật nội dung' : 'Thêm nội dung mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAddOrUpdate}
        confirmLoading={loading}
        okText={editingRes ? 'Lưu thay đổi' : 'Thêm mới'}
        cancelText="Hủy"
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="resourceType" label="Loại nội dung" rules={[{ required: true }]}>
            <Select options={RESOURCE_TYPES} disabled={!!editingRes} />
          </Form.Item>

          {(selectedType === 'LESSON' || selectedType === 'QUIZ') && (
            <Form.Item name="parentId" label="Thuộc Chương" rules={[{ required: true, message: 'Chọn chương' }]}>
              <Select options={chapters.map(c => ({ value: c.id, label: c.title }))} />
            </Form.Item>
          )}

          {['VIDEO', 'PDF', 'SLIDE', 'AUDIO', 'ASSIGNMENT', 'LINK', 'DOCUMENT', 'IMAGE'].includes(selectedType) && (
            <Form.Item name="parentId" label="Thuộc Bài học (Lesson)" rules={[{ required: true, message: 'Chọn bài học' }]}>
              <Select options={lessons.map(l => ({ value: l.id, label: l.title }))} />
            </Form.Item>
          )}

          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="VD: Chương 1 - Giới thiệu" />
          </Form.Item>

          {['VIDEO', 'PDF', 'SLIDE', 'AUDIO', 'ASSIGNMENT', 'LINK', 'DOCUMENT', 'IMAGE'].includes(selectedType) && (
            <Form.Item name="fileUrl" label="Đường dẫn file (URL)" rules={[{ required: true, message: 'Nhập link file' }]}>
              <Input placeholder="https://..." />
            </Form.Item>
          )}

          {['ASSIGNMENT', 'DOCUMENT'].includes(selectedType) && (
             <Form.Item name="content" label="Nội dung chi tiết">
               <TextArea rows={4} placeholder="Nhập nội dung..." />
             </Form.Item>
          )}

          {selectedType === 'VIDEO' && (
             <Form.Item name="duration" label="Thời lượng (giây)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 300" />
             </Form.Item>
          )}

          {selectedType === 'QUIZ' && (
            <Space size={12} style={{ display: 'flex' }}>
              <Form.Item name="passingScore" label="Điểm đạt (%)" style={{ flex: 1 }}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="timeLimit" label="Thời gian làm bài (phút)" style={{ flex: 1 }}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          <Space size={24} style={{ display: 'flex', marginTop: 12 }}>
            <Form.Item name="isRequired" label="Bắt buộc học" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="isFreePreview" label="Cho phép học thử" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái" style={{ margin: 0 }}>
              <Select options={[
                { value: 'DRAFT', label: 'Nháp' },
                { value: 'PUBLISHED', label: 'Xuất bản' },
                { value: 'HIDDEN', label: 'Tạm ẩn' },
              ]} style={{ width: 120 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default ResourceManager;