import { useEffect, useState } from 'react';
import { 
  Button, 
  Card, 
  Col, 
  Empty, 
  Progress, 
  Row, 
  Spin, 
  Typography, 
  Tag, 
  Input,
  Pagination
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, PlayCircleOutlined, BookOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { courseApi } from '@/services/api/course'; // 🆕 Dùng courseApi thay vì progressApi
import type { EnrolledCourseResponse } from '@/services/types/course';

const { Title, Text } = Typography;

// Helper map trạng thái Đăng ký sang tiếng Việt
const getEnrollmentStatusTag = (status: string) => {
  switch (status) {
    case 'COMPLETED': return <Tag color="success">Hoàn thành</Tag>;
    case 'ACTIVE': return <Tag color="processing">Đang học</Tag>;
    case 'PENDING': return <Tag color="warning">Chờ xử lý</Tag>;
    case 'RESERVED': return <Tag color="purple">Bảo lưu</Tag>;
    case 'TERMINATED': return <Tag color="error">Đã nghỉ</Tag>;
    default: return <Tag color="default">{status}</Tag>;
  }
};

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<EnrolledCourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  useEffect(() => {
    setLoading(true);
    // 🆕 Gọi API mới
    courseApi.getMyEnrolledCourses()
      .then((res) => {
        setItems(res || []);
      })
      .catch((err) => {
        toast.error((err as { message?: string })?.message || 'Không thể tải danh sách khóa học');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 1. Lọc theo từ khóa (Client-side)
  const filteredItems = items.filter((p) => 
    (p.courseTitle || '').toLowerCase().includes(keyword.toLowerCase())
  );

  // 2. Phân trang (Client-side)
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);
  const total = filteredItems.length;

  return (
    <PageContainer>
      <PageHeader 
        title="Khóa học của tôi" 
        subtitle={`Bạn đã đăng ký ${items.length} khóa học`}
        extra={
          <Input 
            placeholder="Tìm kiếm khóa học..." 
            prefix={<SearchOutlined className="text-slate-400" />}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1); // Reset về trang 1 khi tìm kiếm
            }}
            allowClear
            style={{ width: 250 }}
          />
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" description="Đang tải khóa học..." />
        </div>
      ) : items.length === 0 ? (
        <Empty description="Bạn chưa đăng ký khóa học nào" style={{ marginTop: 64 }}>
          <Button type="primary" onClick={() => navigate('/courses')}>
            Khám phá khóa học ngay
          </Button>
        </Empty>
      ) : filteredItems.length === 0 ? (
        <Empty description="Không tìm thấy khóa học nào phù hợp" style={{ marginTop: 64 }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {paginatedItems.map((p) => {
              const percent = Math.round(p.progressPercentage || 0);
              const isDone = percent === 100;
              // Chỉ cho phép vào học nếu đã kích hoạt hoặc đã hoàn thành
              const canLearn = p.enrollmentStatus === 'ACTIVE' || p.enrollmentStatus === 'COMPLETED';

              return (
                <Col xs={24} sm={12} lg={8} key={p.enrollmentId}>
                  <Card 
                    hoverable 
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' } }}
                    className="group"
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        {getEnrollmentStatusTag(p.enrollmentStatus)}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Đăng ký: {dayjs(p.enrolledAt).format('DD/MM/YYYY')}
                        </Text>
                      </div>

                      <Title 
                        level={5} 
                        ellipsis={{ rows: 2 }} 
                        style={{ minHeight: 44, marginTop: 0, marginBottom: 16 }}
                        title={p.courseTitle}
                      >
                        {p.courseTitle || `Khóa học #${p.courseId}`}
                      </Title>
                      
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Tiến độ</Text>
                          <Text strong style={{ fontSize: 12, color: isDone ? '#52c41a' : '#1677ff' }}>{percent}%</Text>
                        </div>
                        <Progress 
                          percent={percent} 
                          status={isDone ? 'success' : 'active'}
                          showInfo={false}
                          strokeColor={isDone ? '#52c41a' : { from: '#1677ff', to: '#36cfc9' }}
                        />
                      </div>
                    </div>

                    <Button 
                      type={isDone ? 'default' : 'primary'} 
                      block 
                      icon={percent === 0 ? <BookOutlined /> : <PlayCircleOutlined />}
                      onClick={() => navigate(`/student/courses/${p.courseId}/learn`)}
                      disabled={!canLearn}
                    >
                      {!canLearn 
                        ? 'Chưa thể vào học'
                        : percent === 0 
                          ? 'Bắt đầu học' 
                          : isDone 
                            ? 'Xem lại bài học' 
                            : 'Học tiếp'}
                    </Button>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {total > pageSize && (
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, s) => {
                  setPage(p);
                  setPageSize(s);
                }}
                showSizeChanger
                showTotal={(t) => `Tổng ${t} khóa học`}
              />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default MyCoursesPage;