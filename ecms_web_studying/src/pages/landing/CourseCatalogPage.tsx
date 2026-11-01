import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Col,
  Empty,
  Row,
  Spin,
  Tag,
  Typography,
  Input,
  Radio,
  Button,
  Space,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, BookOutlined, SendOutlined, EyeOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { courseApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành: import { courseApi } from '@/services/api/course/courseApi';

import MoneyDisplay from '@/components/common/MoneyDisplay';
import type { CourseResponse } from '@/services/types/course';
import LeadRegistrationModal from '@/components/lead/LeadRegistrationModal';

const { Title, Paragraph, Text } = Typography;

export default function CourseCatalogPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal state for quick consultation
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultCourse, setConsultCourse] = useState<CourseResponse | null>(null);

  useEffect(() => {
    courseApi
      .search({ page: 0, size: 50, status: 'PUBLISHED' })
      .then((res) => {
        if (res?.content) {
          setCourses(res.content);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error((err as { message?: string })?.message || 'Lỗi khi tải danh mục khóa học');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        !searchText ||
        c.title.toLowerCase().includes(searchText.toLowerCase()) ||
        c.shortDescription?.toLowerCase().includes(searchText.toLowerCase());

      const matchType =
        filterType === 'ALL' || c.courseType === filterType;

      return matchSearch && matchType;
    });
  }, [courses, searchText, filterType]);

  const handleOpenDetail = (course: CourseResponse) => {
    navigate(`/courses/${course.id}`);
  };

  const handleOpenConsult = (course: CourseResponse) => {
    setConsultCourse(course);
    setConsultModalOpen(true);
  };

  return (
    <div style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2} style={{ marginBottom: 12, color: '#0f172a' }}>
          Khám Phá Các Khóa Học Tại ECMS
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 650, margin: '0 auto' }}>
          Chương trình đào tạo chuẩn quốc tế từ cơ bản đến nâng cao. Đăng ký nhận tư vấn lộ trình và
          làm bài kiểm tra năng lực đầu vào hoàn toàn miễn phí.
        </Paragraph>
      </div>

      {/* Filter Bar */}
      <Card
        style={{
          marginBottom: 32,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Tìm kiếm khóa học theo tên hoặc chủ đề..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} md={14} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Text strong style={{ marginRight: 8 }}>
                Hình thức học:
              </Text>
              <Radio.Group
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                buttonStyle="solid"
                size="large"
              >
                <Radio.Button value="ALL">Tất cả ({courses.length})</Radio.Button>
                <Radio.Button value="ONLINE">Trực tuyến</Radio.Button>
                <Radio.Button value="OFFLINE">Tại trung tâm</Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Course List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            Đang tải danh mục khóa học...
          </Paragraph>
        </div>
      ) : filteredCourses.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không tìm thấy khóa học phù hợp với tìm kiếm của bạn"
        >
          <Button
            type="primary"
            onClick={() => {
              setSearchText('');
              setFilterType('ALL');
            }}
          >
            Đặt lại bộ lọc
          </Button>
        </Empty>
      ) : (
        <Row gutter={[24, 24]}>
          {filteredCourses.map((c) => (
            <Col xs={24} sm={12} lg={8} key={c.id}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                }}
                cover={
                  c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
                      alt={c.title}
                      style={{ height: 180, objectFit: 'cover' }}
                      onClick={() => handleOpenDetail(c)}
                    />
                  ) : (
                    <div
                      onClick={() => handleOpenDetail(c)}
                      style={{
                        height: 180,
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 48,
                        cursor: 'pointer',
                      }}
                    >
                      <BookOutlined />
                    </div>
                  )
                }
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Tag color={c.courseType === 'ONLINE' ? 'blue' : 'green'}>
                    {c.courseType}
                  </Tag>
                  {c.categoryName && <Tag color="cyan">{c.categoryName}</Tag>}
                </div>

                <Title
                  level={5}
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 8, cursor: 'pointer', minHeight: 48 }}
                  onClick={() => handleOpenDetail(c)}
                >
                  {c.title}
                </Title>

                <Paragraph
                  type="secondary"
                  ellipsis={{ rows: 2 }}
                  style={{ fontSize: 13, minHeight: 40, marginBottom: 16 }}
                >
                  {c.shortDescription || 'Khóa học cung cấp kiến thức toàn diện, lộ trình tối ưu.'}
                </Paragraph>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      Học phí
                    </Text>
                    <Text strong style={{ color: '#1677ff', fontSize: 18 }}>
                      <MoneyDisplay value={c.isFree ? 0 : c.price} />
                    </Text>
                  </div>

                  <Space>
                    <Button
                      size="middle"
                      icon={<EyeOutlined />}
                      onClick={() => handleOpenDetail(c)}
                    >
                      Chi tiết
                    </Button>
                    <Button
                      type="primary"
                      size="middle"
                      icon={<SendOutlined />}
                      onClick={() => handleOpenConsult(c)}
                      style={{ background: '#1677ff', fontWeight: 600 }}
                    >
                      Tư vấn
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Lead Registration Modal */}
      <LeadRegistrationModal
        open={consultModalOpen}
        initialCourseId={consultCourse?.id}
        initialCourseTitle={consultCourse?.title}
        onClose={() => setConsultModalOpen(false)}
      />
    </div>
  );
}