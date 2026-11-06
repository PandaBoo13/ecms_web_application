import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Input, InputNumber, Select, Switch, Button, Card, Row, Col,
  Space, Alert, TreeSelect,
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import ThumbnailUpload from '@/components/common/ThumbnailUpload';
import { courseApi, categoryApi, roomApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import { useAuth } from '@/hooks/useAuth';
import type {
  CourseCreateRequest,
  CategoryResponse,
  RoomResponse,
} from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

interface Props {
  mode: 'admin' | 'instructor';
}

const CourseCreateForm = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm<CourseCreateRequest>();
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);

  const courseType = Form.useWatch('courseType', form);
  const isFree = Form.useWatch('isFree', form);

  useEffect(() => {
    categoryApi
      .list({ page: 0, size: 9999, sortBy: 'name', sortDir: 'asc' })
      .then((res) => setCategories(res.content || []))
      .catch(() => {});
    roomApi
      .listActive()
      .then(setRooms)
      .catch(() => {});
    if (mode === 'admin') {
      adminUserApi
        .search({ roleCode: 'INSTRUCTOR', isActive: true, page: 0, size: 200 })
        .then((res) => setInstructors(res.content || []))
        .catch(() => {});
    }
  }, [mode]);

  const categoryTreeData = categories
    .filter((c) => !c.parentId)
    .map((c) => ({
      title: c.name,
      value: c.id,
      key: c.id,
      children: categories
        .filter((x) => x.parentId === c.id)
        .map((x) => ({ title: x.name, value: x.id, key: x.id })),
    }));

  const handleSubmit = async (values: CourseCreateRequest) => {
    setSubmitting(true);
    try {
      // 1. Chuẩn bị payload cơ bản (tuân thủ đúng DTO Backend CourseCreateRequest)
      const payload: CourseCreateRequest = {
        ...values,
        price: values.isFree ? 0 : Number(values.price) || 0,
        outcomes: Array.isArray(values.outcomes) ? values.outcomes : [],
        totalSessionsExpected:
          values.courseType === 'OFFLINE' ? values.totalSessionsExpected : undefined,
        learningMode: values.courseType === 'ONLINE' ? values.learningMode : undefined,
        allowedRoomIds: values.courseType === 'OFFLINE' ? values.allowedRoomIds : undefined,
      };
      
      if (mode === 'instructor' && user?.accountId) {
        payload.teacherId = user.accountId;
      }

      // 2. Gọi API tạo COURSE
      const created = await courseApi.create(payload);
      
      // 3. 🆕 Xử lý bổ sung: Nếu là OFFLINE và có nhập Min/Max Students -> Gọi API cập nhật
      // (Vì Backend CourseCreateRequest chưa hỗ trợ min/max)
      if (
        values.courseType === 'OFFLINE' && 
        (values.minStudents !== undefined || values.maxStudents !== undefined)
      ) {
        await courseApi.updateOfflineInfo(created.id, {
          minStudents: values.minStudents,
          maxStudents: values.maxStudents,
          // roomId đã được gửi lúc tạo, nên ở đây không cần gửi lại trừ khi bạn muốn
        });
      }

      toast.success('Tạo khóa học thành công!');
      navigate(
        mode === 'admin'
          ? `/admin/courses/${created.id}`
          : `/instructor/courses/${created.id}/edit`,
      );
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Tạo khóa học thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        courseType: 'ONLINE',
        isFree: false,
        learningMode: 'AUTONOMOUS',
        price: 0,
      }}
      scrollToFirstError
    >
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="Thông tin cơ bản" className="!mb-4">
            <Form.Item
              name="title"
              label="Tiêu đề khóa học"
              rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
            >
              <Input placeholder="VD: IELTS 6.5 - Luyện thi cấp tốc" maxLength={255} />
            </Form.Item>

            <Form.Item name="shortDescription" label="Mô tả ngắn">
              <Input.TextArea
                rows={2}
                maxLength={500}
                placeholder="Mô tả ngắn gọn về khóa học..."
              />
            </Form.Item>

            <Form.Item name="description" label="Mô tả chi tiết">
              <Input.TextArea rows={5} placeholder="Mô tả đầy đủ về khóa học..." />
            </Form.Item>

            <Form.Item
              name="outcomes"
              label="Kết quả đầu ra"
              tooltip="Nhập từng kết quả và nhấn Enter"
            >
              <Select
                mode="tags"
                placeholder="VD: Nắm vững 4 kỹ năng, Đạt IELTS 6.5..."
                tokenSeparators={[',']}
              />
            </Form.Item>
          </Card>

          <Card title="Loại khóa & Cấu hình" className="!mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="courseType" label="Loại khóa" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: 'ONLINE', label: 'Online' },
                      { value: 'OFFLINE', label: 'Offline' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="categoryId"
                  label="Danh mục"
                  rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
                >
                  <TreeSelect
                    placeholder="Chọn danh mục"
                    treeData={categoryTreeData}
                    allowClear
                    showSearch
                    treeNodeFilterProp="title"
                    treeDefaultExpandAll
                  />
                </Form.Item>
              </Col>
            </Row>

            {courseType === 'ONLINE' && (
              <Form.Item name="learningMode" label="Chế độ học">
                <Select
                  options={[
                    { value: 'AUTONOMOUS', label: 'Tự do (Autonomous)' },
                    { value: 'SEQUENTIAL', label: 'Tuần tự (Sequential)' },
                  ]}
                />
              </Form.Item>
            )}

            {/* 🆕 CẤU HÌNH DÀNH RIÊNG CHO OFFLINE */}
            {courseType === 'OFFLINE' && (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="minStudents"
                      label="Sĩ số tối thiểu (Min)"
                      tooltip="Số lượng học viên tối thiểu để mở lớp"
                    >
                      <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 10" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="maxStudents"
                      label="Sĩ số tối đa (Max)"
                      tooltip="Số lượng học viên tối đa của lớp"
                      dependencies={['minStudents']}
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            const min = getFieldValue('minStudents');
                            if (!value || !min || value >= min) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Sĩ số tối đa phải lớn hơn hoặc bằng sĩ số tối thiểu!'));
                          },
                        }),
                      ]}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 20" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="totalSessionsExpected"
                  label="Tổng số buổi dự kiến"
                  tooltip="Số buổi học dự kiến của khóa offline"
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 24" />
                </Form.Item>

                <Form.Item
                  name="allowedRoomIds"
                  label="Danh sách phòng được phép xếp lịch"
                  tooltip="Hệ thống sẽ tự động xếp lịch vào một trong các phòng này"
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn các phòng..."
                    options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                  />
                </Form.Item>
              </>
            )}

            {mode === 'admin' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="teacherId" label="Giảng viên phụ trách">
                    <Select
                      placeholder="Chọn giảng viên"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={instructors.map((a) => ({
                        value: a.accountId,
                        label: `${a.fullName || a.email} (${a.email})`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="roomId" label={courseType === 'OFFLINE' ? "Phòng học chính (Tùy chọn)" : "Phòng học"}>
                    <Select
                      placeholder="Chọn phòng"
                      allowClear
                      options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {mode === 'instructor' && (
              <Form.Item name="roomId" label="Phòng học (nếu có)">
                <Select
                  placeholder="Chọn phòng"
                  allowClear
                  options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                />
              </Form.Item>
            )}
          </Card>

          <Card title="Học phí">
            <Form.Item name="isFree" label="Khóa học miễn phí" valuePropName="checked">
              <Switch checkedChildren="Miễn phí" unCheckedChildren="Có phí" />
            </Form.Item>

            {!isFree && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="price"
                    label="Giá bán (VND)"
                    rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(v) => v!.replace(/,/g, '') as unknown as number}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="oldPrice" label="Giá gốc (VND)">
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(v) => v!.replace(/,/g, '') as unknown as number}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Ảnh thumbnail" className="!mb-4">
            <Form.Item name="thumbnailUrl" noStyle>
              <ThumbnailUpload width={320} height={180} />
            </Form.Item>
          </Card>

          <Card>
            <Alert
              type="info"
              showIcon
              message="Sau khi tạo"
              description="Khóa học sẽ ở trạng thái DRAFT. Bạn có thể thêm nội dung, câu hỏi, quiz, session rồi gửi duyệt."
              className="!mb-4 !rounded-lg"
            />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                block
                size="large"
              >
                Tạo khóa học
              </Button>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() =>
                  navigate(mode === 'admin' ? '/admin/courses' : '/instructor/courses')
                }
                block
              >
                Hủy
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Form>
  );
};

export default CourseCreateForm;