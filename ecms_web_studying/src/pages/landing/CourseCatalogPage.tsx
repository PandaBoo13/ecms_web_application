import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { SearchOutlined, BookOutlined, SendOutlined, EyeOutlined, CreditCardOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import { courseApi, progressApi } from '@/services/api/course';
import { useAuth } from '@/hooks/useAuth';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import type { CourseResponse } from '@/services/types/course';
import LeadRegistrationModal from '@/components/lead/LeadRegistrationModal';

const { Title, Paragraph, Text } = Typography;

export default function CourseCatalogPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [ownedCourseIds, setOwnedCourseIds] = useState<Set<number>>(new Set());
  const [ownedLoading, setOwnedLoading] = useState(false);

  // Modal state for quick consultation
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultCourse, setConsultCourse] = useState<CourseResponse | null>(null);

  const loadCourses = useCallback((type: string) => {
    courseApi
      .search({ page: 0, size: 50, status: 'PUBLISHED', ...(type !== 'ALL' ? { type } : {}) })
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

  useEffect(() => {
    loadCourses('ALL');
  }, [loadCourses]);

  // Lấy danh sách khóa học đã mua/đã ghi danh để ẩn nút "Mua khóa học"
  useEffect(() => {
    if (!isAuthenticated) {
      setOwnedCourseIds(new Set());
      setOwnedLoading(false);
      return;
    }
    let active = true;
    setOwnedLoading(true);
    progressApi
      .getMyCourses({ page: 0, size: 500 })
      .then((res) => {
        if (!active) return;
        setOwnedCourseIds(new Set((res.content ?? []).map((p) => p.courseId)));
      })
      .catch(() => {
        if (active) setOwnedCourseIds(new Set());
      })
      .finally(() => {
        if (active) setOwnedLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleFilterTypeChange = (type: string) => {
    setFilterType(type);
    setLoading(true);
    loadCourses(type);
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        !searchText ||
        c.title.toLowerCase().includes(searchText.toLowerCase()) ||
        c.shortDescription?.toLowerCase().includes(searchText.toLowerCase());

      return matchSearch;
    });
  }, [courses, searchText]);

  const handleOpenDetail = (course: CourseResponse) => {
    navigate(`/courses/${course.id}`);
  };

  const handleOpenConsult = (course: CourseResponse) => {
    setConsultCourse(course);
    setConsultModalOpen(true);
  };

  const handleOnlineCheckout = (course: CourseResponse, event: React.MouseEvent) => {
    event.stopPropagation();
    if (ownedCourseIds.has(course.id)) {
      toast.success('Bạn đã mua khóa học này.');
      return;
    }
    // Guest checkout is allowed; the account is provisioned after successful payment.
    navigate(`/checkout/${course.id}`);
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
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Input
              placeholder="Tìm kiếm theo tên khóa học hoặc nội dung..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Radio.Group
              value={filterType}
              onChange={(e) => handleFilterTypeChange(e.target.value)}
              buttonStyle="solid"
              size="large"
            >
              <Radio.Button value="ALL">Tất cả hình thức</Radio.Button>
              <Radio.Button value="OFFLINE">Trực tiếp (Offline)</Radio.Button>
              <Radio.Button value="ONLINE">Trực tuyến (Online)</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </Card>

      {/* Course List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <Empty description="Không tìm thấy khóa học phù hợp" style={{ padding: '48px 0' }} />
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
                }}
                bodyStyle={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 20,
                }}
                cover={
                  c.thumbnailUrl ? (
                    <img
                      alt={c.title}
                      src={c.thumbnailUrl}
                      style={{ height: 180, objectFit: 'cover', cursor: 'pointer' }}
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
                    {c.courseType === 'ONLINE' && !c.isFree ? (
                      ownedCourseIds.has(c.id) ? (
                        <Tag color="green" style={{ margin: 0, padding: '4px 10px', fontWeight: 600 }}>
                          Đã mua
                        </Tag>
                      ) : (
                        <Button
                          type="primary"
                          size="middle"
                          icon={<CreditCardOutlined />}
                          loading={ownedLoading}
                          disabled={ownedLoading}
                          onClick={(e) => handleOnlineCheckout(c, e)}
                          style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
                        >
                          Mua khóa học
                        </Button>
                      )
                    ) : (
                      <Button
                        type="primary"
                        size="middle"
                        icon={<SendOutlined />}
                        onClick={() => handleOpenConsult(c)}
                        style={{ background: '#1677ff', fontWeight: 600 }}
                      >
                        Tư vấn
                      </Button>
                    )}
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
