import { useState } from 'react';
import { Card, Button, Modal, Form, Input, Select, InputNumber, Switch, Space, Tag, Typography } from 'antd';
import { PlusOutlined, VideoCameraOutlined, FilePdfOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { resourceApi } from '@/services/api/courses';
import type { ResourceType, ResourceCreateRequest } from '@/services/types/course';
import CourseResourceTree from './CourseResourceTree';

const { Text } = Typography;

interface Props {
  courseId: number;
  resources: any[];
  onRefresh: () => void;
}

const RESOURCE_TYPES: { value: ResourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'CHAPTER', label: 'Chương (Chapter)', icon: <BookOutlined /> },
  { value: 'LESSON', label: 'Bài học (Lesson)', icon: <FileTextOutlined /> },
  { value: 'VIDEO', label: 'Video', icon: <VideoCameraOutlined /> },
  { value: 'PDF', label: 'Tài liệu PDF', icon: <FilePdfOutlined /> },
];

const ResourceManager = ({ courseId, resources, onRefresh }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<ResourceCreateRequest>();
  
  const selectedType = Form.useWatch('resourceType', form);

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await resourceApi.create(courseId, values);
      toast.success('Thêm nội dung thành công');
      setModalOpen(false);
      form.resetFields();
      onRefresh();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      toast.error((err as { message?: string })?.message || 'Thêm thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách ID để chọn parent
  const chapters = resources.filter(r => r.resourceType === 'CHAPTER');
  const lessons = resources.filter(r => r.resourceType === 'LESSON');

  return (
    <Card 
      title="Quản lý Nội dung khóa học" 
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          Thêm nội dung
        </Button>
      }
    >
      <CourseResourceTree resources={resources} />

      <Modal
        title="Thêm nội dung mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAdd}
        confirmLoading={loading}
        okText="Thêm"
        cancelText="Hủy"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ resourceType: 'CHAPTER', isRequired: false, isFreePreview: false }}>
          <Form.Item name="resourceType" label="Loại nội dung" rules={[{ required: true }]}>
            <Select options={RESOURCE_TYPES} />
          </Form.Item>

          {/* Chọn Parent dựa vào loại nội dung */}
          {selectedType === 'LESSON' && (
            <Form.Item name="parentId" label="Thuộc Chương" rules={[{ required: true, message: 'Vui lòng chọn chương' }]}>
              <Select placeholder="Chọn Chương" options={chapters.map(c => ({ value: c.id, label: c.title }))} />
            </Form.Item>
          )}

          {(selectedType === 'VIDEO' || selectedType === 'PDF') && (
            <Form.Item name="parentId" label="Thuộc Bài học" rules={[{ required: true, message: 'Vui lòng chọn bài học' }]}>
              <Select placeholder="Chọn Bài học" options={lessons.map(l => ({ value: l.id, label: l.title }))} />
            </Form.Item>
          )}

          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="VD: Chương 1 - Giới thiệu" />
          </Form.Item>

          {(selectedType === 'VIDEO' || selectedType === 'PDF') && (
            <Form.Item name="fileUrl" label="Đường dẫn file (URL)" rules={[{ required: true, message: 'Nhập link file' }]}>
              <Input placeholder="https://..." />
            </Form.Item>
          )}

          {selectedType === 'VIDEO' && (
             <Form.Item name="duration" label="Thời lượng (giây)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 300" />
             </Form.Item>
          )}

          {(selectedType === 'VIDEO' || selectedType === 'PDF') && (
            <Space size={24} style={{ display: 'flex', marginTop: 12 }}>
              <Form.Item name="isRequired" label="Bắt buộc học" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
              <Form.Item name="isFreePreview" label="Cho phép học thử" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </Space>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default ResourceManager;