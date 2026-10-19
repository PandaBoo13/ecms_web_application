import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Form, Input, InputNumber, Select, Switch, Button, Card, Space, Divider, Typography } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageLoading from '@/components/feedback/PageLoading';
import ErrorState from '@/components/feedback/ErrorState';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';

import ResourceManager from '@/components/course/ResourceManager';
import CourseSessionList from '@/components/course/CourseSessionList';
import CourseQuestionList from '@/components/course/CourseQuestionList';
import QuizListCard from '@/components/course/QuizListCard';

import { courseApi, categoryApi } from '@/services/api/courses';
import type { CourseDetailResponse, CourseUpdateRequest } from '@/services/types/course';
import type { CategoryResponse } from '@/services/types/course';

const { TextArea } = Input;
const { Text } = Typography;

const CourseEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm<CourseUpdateRequest>();

  const fetchCourse = async () => {
    if (!courseId || isNaN(courseId)) {
      setError('ID khóa học không hợp lệ');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await courseApi.getById(courseId);
      setCourse(data);
      form.setFieldsValue({
        title: data.title,
        shortDescription: data.shortDescription,
        description: data.description,
        price: data.price,
        oldPrice: data.oldPrice,
        isFree: data.isFree,
        categoryId: data.categoryId,
        learningMode: data.learningMode,
      });
    } catch (err) {
      setError((err as { message?: string })?.message || 'Không tải được khóa học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    categoryApi.tree().then(setCategories).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleUpdateInfo = async (values: CourseUpdateRequest) => {
    try {
      setSaving(true);
      await courseApi.update(courseId, values);
      toast.success('Cập nhật thông tin thành công');
      fetchCourse();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSubmitting(true);
      await courseApi.submitReview(courseId);
      toast.success('Đã gửi duyệt khóa học');
      fetchCourse();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Gửi duyệt thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading tip="Đang tải khóa học..." />;
  if (error) return <ErrorState title="Lỗi" description={error} onRetry={fetchCourse} />;
  if (!course) return <ErrorState description="Không tìm thấy khóa học" />;

  const tabItems = [
    {
      key: 'info',
      label: 'Thông tin cơ bản',
      children: (
        <Card>
          <Form form={form} layout="vertical" onFinish={handleUpdateInfo}>
            <Form.Item name="title" label="Tên khóa học" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="shortDescription" label="Mô tả ngắn">
              <TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
            <Form.Item name="description" label="Mô tả chi tiết">
              <TextArea rows={4} />
            </Form.Item>
            <Form.Item name="categoryId" label="Danh mục">
              <Select allowClear options={categories.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="learningMode" label="Chế độ học (Online)">
              <Select
                options={[
                  { value: 'AUTONOMOUS', label: 'Tự do' },
                  { value: 'SEQUENTIAL', label: 'Tuần tự' },
                ]}
              />
            </Form.Item>
            
            <Divider />
            <Form.Item name="isFree" label="Miễn phí" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Space size={16}>
              <Form.Item name="price" label="Giá bán">
                <InputNumber min={0} style={{ width: 200 }} />
              </Form.Item>
              <Form.Item name="oldPrice" label="Giá gốc">
                <InputNumber min={0} style={{ width: 200 }} />
              </Form.Item>
            </Space>

            <div style={{ marginTop: 16 }}>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                Lưu thay đổi
              </Button>
            </div>
          </Form>
        </Card>
      ),
    },
    {
      key: 'resources',
      label: 'Nội dung (Resources)',
      children: <ResourceManager courseId={courseId} resources={course.resources || []} onRefresh={fetchCourse} />,
    },
    {
      key: 'questions',
      label: 'Câu hỏi',
      children: <CourseQuestionList courseId={courseId} />,
    },
    {
      key: 'quizzes',
      label: 'Quiz',
      children: <QuizListCard courseId={courseId} />,
    },
  ];

  if (course.courseType === 'OFFLINE') {
    tabItems.splice(2, 0, {
      key: 'sessions',
      label: `Buổi học (${course.sessions?.length || 0})`,
      children: <CourseSessionList courseId={courseId} sessions={course.sessions || []} onRefresh={fetchCourse} />,
    });
  }

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        subtitle={
          <Space size={8}>
            <Text type="secondary">{course.code}</Text>
            <StatusTag status={course.status} />
            <StatusTag status={course.courseType} />
          </Space>
        }
        backButton
        backTo="/instructor/courses"
        extra={
          course.status === 'DRAFT' && (
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              loading={submitting} 
              onClick={handleSubmitReview}
            >
              Gửi duyệt
            </Button>
          )
        }
      />
      <Tabs defaultActiveKey="info" items={tabItems} />
    </PageContainer>
  );
};

export default CourseEditPage;