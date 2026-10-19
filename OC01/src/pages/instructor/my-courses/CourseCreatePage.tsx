import { useState } from 'react';
import { Form, Input, InputNumber, Select, Switch, Button, Card, Space, Typography, Divider } from 'antd';
import { MinusCircleOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { courseApi, categoryApi, roomApi } from '@/services/api/courses';
import type { CourseCreateRequest, CourseType } from '@/services/types/course';
import { useEffect } from 'react';
import type { CategoryResponse, RoomResponse } from '@/services/types/course';

const { TextArea } = Input;
const { Text } = Typography;

const CourseCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [form] = Form.useForm<CourseCreateRequest>();
  const courseType = Form.useWatch('courseType', form);
  const isFree = Form.useWatch('isFree', form);

  useEffect(() => {
    Promise.all([
      categoryApi.tree().catch(() => []),
      roomApi.listActive().catch(() => [])
    ]).then(([cats, rms]) => {
      setCategories(cats);
      setRooms(rms);
    });
  }, []);

  const handleSubmit = async (values: CourseCreateRequest) => {
    try {
      setLoading(true);
      const newCourse = await courseApi.create(values);
      toast.success('Tạo khóa học thành công');
      // Chuyển sang trang chỉnh sửa để thêm nội dung
      navigate(`/instructor/courses/${newCourse.id}/edit`);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Tạo khóa học thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Tạo khóa học mới"
        subtitle="Khởi tạo khóa học ở trạng thái Nháp (DRAFT)"
        backButton
        backTo="/instructor/courses"
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            courseType: 'ONLINE',
            isFree: false,
            price: 0,
            learningMode: 'AUTONOMOUS',
          }}
        >
          <Text strong>Thông tin cơ bản</Text>
          <Divider style={{ margin: '12px 0' }} />
          
          <Form.Item
            name="title"
            label="Tên khóa học"
            rules={[{ required: true, message: 'Vui lòng nhập tên khóa học' }]}
          >
            <Input placeholder="VD: Tiếng Anh Giao Tiếp Cơ Bản" size="large" />
          </Form.Item>

          <Form.Item name="shortDescription" label="Mô tả ngắn">
            <TextArea rows={2} maxLength={500} showCount placeholder="Tóm tắt nội dung khóa học..." />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chi tiết">
            <TextArea rows={4} placeholder="Giới thiệu chi tiết về khóa học..." />
          </Form.Item>

          <Form.Item name="outcomes" label="Kết quả đạt được (Outcomes)">
            <Form.List name="outcomes">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name]}
                        rules={[{ required: true, message: 'Nhập kết quả' }]}
                        style={{ margin: 0, flex: 1 }}
                      >
                        <Input placeholder="VD: Tự tin giao tiếp cơ bản" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Thêm kết quả
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Text strong>Phân loại & Cấu hình</Text>
          <Divider style={{ margin: '12px 0' }} />

          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item
              name="courseType"
              label="Hình thức học"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={[
                  { value: 'ONLINE', label: 'Online (Tự học)' },
                  { value: 'OFFLINE', label: 'Offline (Tại trung tâm)' },
                ]}
              />
            </Form.Item>

            <Form.Item name="categoryId" label="Danh mục" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="Chọn danh mục"
                options={categories.map(c => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          </Space>

          {courseType === 'ONLINE' && (
            <Form.Item name="learningMode" label="Chế độ học">
              <Select
                options={[
                  { value: 'AUTONOMOUS', label: 'Tự do (Học bài nào cũng được)' },
                  { value: 'SEQUENTIAL', label: 'Tuần tự (Bắt buộc học theo thứ tự)' },
                ]}
              />
            </Form.Item>
          )}

          {courseType === 'OFFLINE' && (
            <Form.Item name="roomId" label="Phòng học mặc định" rules={[{ required: true, message: 'Chọn phòng cho lớp Offline' }]}>
              <Select
                allowClear
                placeholder="Chọn phòng"
                options={rooms.map(r => ({ value: r.id, label: r.name }))}
              />
            </Form.Item>
          )}

          <Text strong>Học phí</Text>
          <Divider style={{ margin: '12px 0' }} />

          <Form.Item name="isFree" label="Khóa học miễn phí" valuePropName="checked">
            <Switch />
          </Form.Item>

          {!isFree && (
            <Space size={16} style={{ display: 'flex' }}>
              <Form.Item name="price" label="Giá bán (VNĐ)" rules={[{ required: true }]} style={{ flex: 1 }}>
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  min={0}
                />
              </Form.Item>
              <Form.Item name="oldPrice" label="Giá gốc (VNĐ - Tùy chọn)" style={{ flex: 1 }}>
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  min={0}
                />
              </Form.Item>
            </Space>
          )}

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={loading}>
              Tạo khóa học
            </Button>
          </div>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default CourseCreatePage;