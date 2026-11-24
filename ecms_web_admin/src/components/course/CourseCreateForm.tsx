// src/components/course/CourseCreateForm.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Card,
  Row,
  Col,
  Tag,
  TreeSelect,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  SettingOutlined,
  DollarOutlined,
  PictureOutlined,
  InfoCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import ThumbnailUpload from '@/components/common/ThumbnailUpload';
import { courseApi, categoryApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import { useAuth } from '@/hooks/useAuth';
import type {
  CourseCreateRequest,
  CategoryResponse,
} from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';

interface FormValues extends CourseCreateRequest {
  minStudents?: number;
  maxStudents?: number;
}

interface Props {
  mode: 'admin' | 'instructor';
}

interface CategoryTreeOption {
  title: string;
  value: number;
  key: number;
  children?: CategoryTreeOption[];
}

const buildCategoryTree = (
  categories: CategoryResponse[],
  parentId?: number | null,
): CategoryTreeOption[] =>
  categories
    .filter((c) => (c.parentId ?? null) === (parentId ?? null))
    .map((c) => {
      const children = buildCategoryTree(categories, c.id);
      return {
        title: c.name,
        value: c.id,
        key: c.id,
        ...(children.length > 0 ? { children } : {}),
      };
    });

const CourseCreateForm = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const courseType = Form.useWatch('courseType', form);
  const isFree = Form.useWatch('isFree', form);
  const price = Form.useWatch('price', form);
  const oldPrice = Form.useWatch('oldPrice', form);

  useEffect(() => {
    setLoadingOptions(true);
    const tasks: Promise<unknown>[] = [
      categoryApi
        .list({ page: 0, size: 9999, sortBy: 'name', sortDir: 'asc' })
        .then((res) => setCategories(res.content || []))
        .catch(() => {}),
    ];

    if (mode === 'admin') {
      tasks.push(
        adminUserApi
          .search({ roleCode: 'INSTRUCTOR', isActive: true, page: 0, size: 200 })
          .then((res) => setInstructors(res.content || []))
          .catch(() => {}),
      );
    }

    Promise.all(tasks).finally(() => setLoadingOptions(false));
  }, [mode]);

  const categoryTreeData = useMemo(
    () => buildCategoryTree(categories, null),
    [categories],
  );

  const instructorOptions = useMemo(
    () =>
      instructors.map((a) => ({
        value: a.accountId,
        label: `${a.fullName || a.email} (${a.email})`,
      })),
    [instructors],
  );

  const discountPercent = useMemo(() => {
    if (
      isFree ||
      !oldPrice ||
      !price ||
      Number(oldPrice) <= Number(price) ||
      Number(oldPrice) <= 0
    ) {
      return null;
    }
    return Math.round(
      ((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100,
    );
  }, [isFree, price, oldPrice]);

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: CourseCreateRequest = {
        ...values,
        price: values.isFree ? 0 : Number(values.price) || 0,
        oldPrice: values.isFree ? undefined : values.oldPrice,
        outcomes: Array.isArray(values.outcomes) ? values.outcomes : [],
        totalSessionsExpected:
          values.courseType === 'OFFLINE'
            ? values.totalSessionsExpected
            : undefined,
        learningMode:
          values.courseType === 'ONLINE' ? values.learningMode : undefined,
      };

      if (mode === 'instructor' && user?.accountId) {
        payload.teacherId = user.accountId;
      }

      const created = await courseApi.create(payload);

      if (
        values.courseType === 'OFFLINE' &&
        (values.minStudents !== undefined || values.maxStudents !== undefined)
      ) {
        await courseApi.updateOfflineInfo(created.id, {
          minStudents: values.minStudents,
          maxStudents: values.maxStudents,
        });
      }

      toast.success('Tạo khóa học thành công!');
      navigate(
        mode === 'admin'
          ? `/admin/courses/${created.id}`
          : `/instructor/courses/${created.id}/edit`,
      );
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message || 'Tạo khóa học thất bại',
      );
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
      <Row gutter={[20, 20]}>
        {/* Cột trái: Nội dung & Cấu hình */}
        <Col xs={24} lg={16}>
          <div className="flex flex-col gap-4">
            {/* 1. Thông tin cơ bản */}
            <Card
              className="!rounded-xl border-slate-200/90 shadow-none"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <div className="flex items-center gap-2">
                  <BookOutlined className="text-blue-600" />
                  <span className="font-bold text-slate-800 text-[15px]">
                    Thông tin cơ bản
                  </span>
                </div>
              }
            >
              <Form.Item
                name="title"
                label="Tiêu đề khóa học"
                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                className="!mb-3.5"
              >
                <Input
                  placeholder="VD: IELTS 6.5 - Luyện thi cấp tốc"
                  maxLength={255}
                  className="!h-9 !rounded-lg"
                />
              </Form.Item>

              <Form.Item
                name="shortDescription"
                label="Mô tả ngắn"
                className="!mb-3.5"
              >
                <Input.TextArea
                  rows={2}
                  maxLength={500}
                  showCount
                  placeholder="Tóm tắt ngắn gọn mục tiêu và đối tượng phù hợp của khóa học..."
                  className="!rounded-lg"
                />
              </Form.Item>

              <Form.Item
                name="description"
                label="Mô tả chi tiết"
                className="!mb-3.5"
              >
                <Input.TextArea
                  rows={5}
                  placeholder="Giới thiệu chi tiết lộ trình, phương pháp giảng dạy và nội dung khóa học..."
                  className="!rounded-lg"
                />
              </Form.Item>

              <Form.Item
                name="outcomes"
                label="Kết quả đầu ra"
                tooltip="Nhập từng kỹ năng/mục tiêu đạt được và nhấn Enter"
                className="!mb-0"
              >
                <Select
                  mode="tags"
                  placeholder="VD: Nắm vững 4 kỹ năng, Đạt mục tiêu IELTS 6.5..."
                  tokenSeparators={[',']}
                  className="!w-full"
                />
              </Form.Item>
            </Card>

            {/* 2. Loại khóa & Cấu hình */}
            <Card
              className="!rounded-xl border-slate-200/90 shadow-none"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SettingOutlined className="text-blue-600" />
                    <span className="font-bold text-slate-800 text-[15px]">
                      Loại khóa & Cấu hình đào tạo
                    </span>
                  </div>
                  <Tag
                    color={courseType === 'OFFLINE' ? 'purple' : 'blue'}
                    className="!m-0 !rounded-md !font-medium"
                  >
                    {courseType === 'OFFLINE' ? 'Lớp Offline' : 'Khóa Online'}
                  </Tag>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Form.Item
                  name="courseType"
                  label="Hình thức đào tạo"
                  rules={[{ required: true }]}
                  className="!mb-3.5"
                >
                  <Select
                    className="!h-9"
                    options={[
                      { value: 'ONLINE', label: 'Online (Học trực tuyến)' },
                      { value: 'OFFLINE', label: 'Offline (Học tại lớp)' },
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  name="categoryId"
                  label="Danh mục khóa học"
                  rules={[
                    { required: true, message: 'Vui lòng chọn danh mục' },
                  ]}
                  className="!mb-3.5"
                >
                  <TreeSelect
                    placeholder="Chọn danh mục"
                    treeData={categoryTreeData}
                    loading={loadingOptions}
                    allowClear
                    showSearch
                    treeNodeFilterProp="title"
                    treeDefaultExpandAll
                    className="!w-full !h-9"
                  />
                </Form.Item>
              </div>

              {courseType === 'ONLINE' && (
                <Form.Item
                  name="learningMode"
                  label="Chế độ học tập"
                  className={mode === 'admin' ? '!mb-3.5' : '!mb-0'}
                >
                  <Select
                    className="!h-9"
                    options={[
                      {
                        value: 'AUTONOMOUS',
                        label: 'Tự do (Autonomous) — Học viên tự chọn bài học',
                      },
                      {
                        value: 'SEQUENTIAL',
                        label:
                          'Tuần tự (Sequential) — Hoàn thành từng bài theo thứ tự',
                      },
                    ]}
                  />
                </Form.Item>
              )}

              {courseType === 'OFFLINE' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <Form.Item
                    name="minStudents"
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <TeamOutlined className="text-slate-400 text-xs" />
                        Sĩ số tối thiểu
                      </span>
                    }
                    tooltip="Số lượng học viên tối thiểu để mở lớp"
                    className="!mb-3.5"
                  >
                    <InputNumber
                      min={1}
                      placeholder="VD: 10"
                      className="!w-full !h-9 !rounded-lg flex items-center"
                    />
                  </Form.Item>

                  <Form.Item
                    name="maxStudents"
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <TeamOutlined className="text-slate-400 text-xs" />
                        Sĩ số tối đa
                      </span>
                    }
                    tooltip="Số lượng học viên tối đa của lớp"
                    dependencies={['minStudents']}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const min = getFieldValue('minStudents');
                          if (!value || !min || value >= min) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error('Phải lớn hơn hoặc bằng sĩ số tối thiểu'),
                          );
                        },
                      }),
                    ]}
                    className="!mb-3.5"
                  >
                    <InputNumber
                      min={1}
                      placeholder="VD: 20"
                      className="!w-full !h-9 !rounded-lg flex items-center"
                    />
                  </Form.Item>

                  <Form.Item
                    name="totalSessionsExpected"
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarOutlined className="text-slate-400 text-xs" />
                        Số buổi dự kiến
                      </span>
                    }
                    tooltip="Tổng số buổi học dự kiến của khóa offline"
                    className="!mb-3.5"
                  >
                    <InputNumber
                      min={0}
                      placeholder="VD: 24"
                      className="!w-full !h-9 !rounded-lg flex items-center"
                    />
                  </Form.Item>
                </div>
              )}

              {mode === 'admin' && (
                <Form.Item
                  name="teacherId"
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <UserOutlined className="text-slate-400 text-xs" />
                      Giảng viên phụ trách
                    </span>
                  }
                  className="!mb-0"
                >
                  <Select
                    placeholder="Chọn giảng viên phụ trách chính"
                    allowClear
                    showSearch
                    loading={loadingOptions}
                    optionFilterProp="label"
                    options={instructorOptions}
                    className="!w-full !h-9"
                  />
                </Form.Item>
              )}
            </Card>

            {/* 3. Học phí */}
            <Card
              className="!rounded-xl border-slate-200/90 shadow-none"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <DollarOutlined className="text-blue-600" />
                    <span className="font-bold text-slate-800 text-[15px]">
                      Học phí
                    </span>
                  </div>
                  {discountPercent !== null && (
                    <Tag
                      color="success"
                      className="!m-0 !rounded-md !font-semibold"
                    >
                      Giảm {discountPercent}%
                    </Tag>
                  )}
                </div>
              }
            >
              <Form.Item
                name="isFree"
                label="Chính sách học phí"
                valuePropName="checked"
                className={!isFree ? '!mb-3.5' : '!mb-0'}
              >
                <Switch
                  checkedChildren="Miễn phí"
                  unCheckedChildren="Khóa học có phí"
                />
              </Form.Item>

              {!isFree && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Form.Item
                    name="price"
                    label="Giá bán (VND)"
                    rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
                    className="!mb-0"
                  >
                    <InputNumber<number>
                      min={0}
                      placeholder="VD: 3,500,000"
                      className="!w-full !h-9 !rounded-lg flex items-center"
                      formatter={(v) =>
                        `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      parser={(v) => Number(v?.replace(/,/g, '') || 0)}
                    />
                  </Form.Item>

                  <Form.Item
                    name="oldPrice"
                    label="Giá gốc niêm yết (VND)"
                    tooltip="Hiển thị giá gạch ngang để thể hiện mức ưu đãi (không bắt buộc)"
                    className="!mb-0"
                  >
                    <InputNumber<number>
                      min={0}
                      placeholder="VD: 4,500,000"
                      className="!w-full !h-9 !rounded-lg flex items-center"
                      formatter={(v) =>
                        `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      parser={(v) => Number(v?.replace(/,/g, '') || 0)}
                    />
                  </Form.Item>
                </div>
              )}
            </Card>
          </div>
        </Col>

        {/* Cột phải: Thumbnail & Xuất bản */}
        <Col xs={24} lg={8}>
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <Card
              className="!rounded-xl border-slate-200/90 shadow-none"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <div className="flex items-center gap-2">
                  <PictureOutlined className="text-blue-600" />
                  <span className="font-bold text-slate-800 text-[15px]">
                    Ảnh đại diện khóa học
                  </span>
                </div>
              }
            >
              <Form.Item name="thumbnailUrl" noStyle>
                <ThumbnailUpload width={320} height={180} />
              </Form.Item>
              <p className="text-xs text-slate-400 mt-2.5 mb-0">
                Khuyến nghị tỷ lệ 16:9 (tối thiểu 1280×720px) để hiển thị sắc
                nét trên danh sách khóa học.
              </p>
            </Card>

            <Card
              className="!rounded-xl border-slate-200/90 shadow-none"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-[15px]">
                    Khởi tạo khóa học
                  </span>
                  <Tag className="!m-0 !rounded-md !bg-slate-100 !border-slate-200 !text-slate-600 font-medium">
                    Nháp (DRAFT)
                  </Tag>
                </div>
              }
            >
              <p className="text-xs text-slate-500 leading-relaxed mb-4 flex items-start gap-2">
                <InfoCircleOutlined className="text-blue-500 mt-0.5 shrink-0" />
                <span>
                  Khóa học mới sẽ ở trạng thái{' '}
                  <strong className="text-slate-700">Nháp</strong> để bạn bổ
                  sung chương trình học, bài kiểm tra hoặc lịch buổi học trước
                  khi công bố.
                </span>
              </p>

              <div className="flex flex-col gap-2.5">
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={submitting}
                  block
                  size="large"
                  className="!rounded-lg !font-medium"
                >
                  Tạo khóa học
                </Button>
                <Button
                  icon={<ArrowLeftOutlined />}
                  disabled={submitting}
                  onClick={() =>
                    navigate(
                      mode === 'admin'
                        ? '/admin/courses'
                        : '/instructor/courses',
                    )
                  }
                  block
                  className="!rounded-lg"
                >
                  Hủy bỏ
                </Button>
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </Form>
  );
};

export default CourseCreateForm;