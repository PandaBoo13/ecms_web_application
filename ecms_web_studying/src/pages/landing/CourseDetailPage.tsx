import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Spin,
  Empty,
  Breadcrumb,
  Tabs,
  Descriptions,
  List,
  Collapse,
  Divider,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SendOutlined,
  UserOutlined,
  HomeOutlined,
  BookOutlined,
  DollarOutlined,
  AuditOutlined,
  PhoneOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { courseApi } from '@/services/api/course';
import { resourceApi } from '@/services/api/course';
import { sessionApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành import từ thư mục file tương ứng

import type {
  CourseDetailResponse,
  ResourceTreeResponse,
  SessionResponse,
  ResourceType,
} from '@/services/types/course';

import MoneyDisplay from '@/components/common/MoneyDisplay';
import DateDisplay from '@/components/common/DateDisplay';
import StatusTag from '@/components/common/StatusTag';
import LeadRegistrationModal from '@/components/lead/LeadRegistrationModal';
import LeadRegistrationForm from '@/components/lead/LeadRegistrationForm';
import FloatingLeadButton from '@/components/lead/FloatingLeadButton';

const { Title, Paragraph, Text } = Typography;

const DAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const RESOURCE_ICON_MAP: Record<ResourceType, React.ReactNode> = {
  CHAPTER: <BookOutlined style={{ color: '#1677ff' }} />,
  LESSON: <FileTextOutlined style={{ color: '#52c41a' }} />,
  VIDEO: <PlayCircleOutlined style={{ color: '#faad14' }} />,
  PDF: <FileTextOutlined style={{ color: '#ff4d4f' }} />,
  SLIDE: <FileTextOutlined style={{ color: '#13c2c2' }} />,
  AUDIO: <FileTextOutlined style={{ color: '#eb2f96' }} />,
  QUIZ: <QuestionCircleOutlined style={{ color: '#722ed1' }} />,
  ASSIGNMENT: <FileTextOutlined style={{ color: '#fa8c16' }} />,
  LINK: <FileTextOutlined style={{ color: '#1890ff' }} />,
  DOCUMENT: <FileTextOutlined style={{ color: '#595959' }} />,
  IMAGE: <FileTextOutlined style={{ color: '#52c41a' }} />,
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [resourceTree, setResourceTree] = useState<ResourceTreeResponse[]>([]);
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultModalOpen, setConsultModalOpen] = useState(false);

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setLoading(false);
      return;
    }

    const courseId = Number(id);
    setLoading(true);

    Promise.allSettled([
      courseApi.getById(courseId),
      resourceApi.getTree(courseId),
      sessionApi.list(courseId),
    ])
      .then(([courseRes, treeRes, sessionsRes]) => {
        if (courseRes.status === 'fulfilled') {
          setCourse(courseRes.value);
        } else {
          toast.error('Không tìm thấy thông tin khóa học');
        }

        if (treeRes.status === 'fulfilled' && treeRes.value) {
          setResourceTree(treeRes.value);
        }

        if (sessionsRes.status === 'fulfilled' && sessionsRes.value) {
          setSessions(sessionsRes.value);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải dữ liệu khóa học:', err);
        toast.error('Lỗi tải dữ liệu khóa học');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 24px' }}>
        <Spin size="large" />
        <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 16 }}>
          Đang tải toàn bộ thông tin khóa học...
        </Paragraph>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '80px 24px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <Empty description="Khóa học không tồn tại hoặc đã ngừng phát hành">
          <Button type="primary" onClick={() => navigate('/courses')}>
            Quay lại danh mục khóa học
          </Button>
        </Empty>
      </div>
    );
  }

  // Render resource tree recursively in Collapse accordion
  const renderResourceItems = (items: ResourceTreeResponse[]) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      return {
        key: String(item.id),
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space>
              {RESOURCE_ICON_MAP[item.resourceType] || <FileTextOutlined />}
              <span style={{ fontWeight: item.resourceType === 'CHAPTER' ? 600 : 400 }}>
                {item.title}
              </span>
              {item.isFreePreview && <Tag color="green">Học thử</Tag>}
              {item.isRequired && <Tag color="blue">Bắt buộc</Tag>}
            </Space>
            {item.duration && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {item.duration} phút
              </Text>
            )}
          </div>
        ),
        children: hasChildren ? (
          <div style={{ paddingLeft: 12 }}>
            <Collapse
              ghost
              items={renderResourceItems(item.children || [])}
            />
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {item.resourceType} • Bài học trong chương trình đào tạo
          </div>
        ),
      };
    });
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: 64 }}>
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & BREADCRUMB */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)',
          color: '#ffffff',
          padding: '40px 24px 48px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Breadcrumb
            style={{ marginBottom: 20 }}
            items={[
              {
                title: (
                  <Link to="/" style={{ color: '#93c5fd' }}>
                    <HomeOutlined /> Trang chủ
                  </Link>
                ),
              },
              {
                title: (
                  <Link to="/courses" style={{ color: '#93c5fd' }}>
                    Khóa học
                  </Link>
                ),
              },
              {
                title: <span style={{ color: '#ffffff' }}>{course.title}</span>,
              },
            ]}
          />

          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/courses')}
            style={{ color: '#bfdbfe', padding: 0, marginBottom: 12 }}
          >
            Quay lại danh mục
          </Button>

          <Row gutter={[32, 24]} align="middle">
            <Col xs={24} lg={16}>
              <Space wrap size={8} style={{ marginBottom: 12 }}>
                <Tag color={course.courseType === 'ONLINE' ? 'blue' : 'green'} style={{ fontWeight: 600 }}>
                  {course.courseType}
                </Tag>
                {course.categoryName && <Tag color="cyan">{course.categoryName}</Tag>}
                {course.isFree && <Tag color="gold">Miễn phí</Tag>}
                <Tag color="purple">Mã: {course.displayCode || course.code}</Tag>
                {course.status && <StatusTag status={course.status} />}
              </Space>

              <Title
                style={{
                  color: '#ffffff',
                  fontSize: 'clamp(26px, 4vw, 36px)',
                  fontWeight: 800,
                  marginBottom: 16,
                  lineHeight: 1.3,
                }}
              >
                {course.title}
              </Title>

              <Paragraph
                style={{
                  color: '#cbd5e1',
                  fontSize: 16,
                  lineHeight: 1.6,
                  marginBottom: 24,
                  maxWidth: 720,
                }}
              >
                {course.shortDescription || 'Khóa học cung cấp lộ trình bài bản, toàn diện giúp học viên nâng cao năng lực tiếng Anh theo chuẩn quốc tế.'}
              </Paragraph>

              {/* Quick info badges */}
              <div
                style={{
                  display: 'flex',
                  gap: 24,
                  flexWrap: 'wrap',
                  color: '#e2e8f0',
                  fontSize: 14,
                }}
              >
                <div>
                  <UserOutlined style={{ marginRight: 6, color: '#60a5fa' }} />
                  Giảng viên: <strong>{course.teacherName || 'Chuyên gia ECMS'}</strong>
                </div>
                <div>
                  <CalendarOutlined style={{ marginRight: 6, color: '#60a5fa' }} />
                  Khai giảng: <strong>{course.startDate ? new Date(course.startDate).toLocaleDateString('vi-VN') : 'Liên tục mở lớp'}</strong>
                </div>
                <div>
                  <TeamOutlined style={{ marginRight: 6, color: '#60a5fa' }} />
                  Sĩ số: <strong>{course.currentStudents} / {course.maxStudents || '—'} học viên</strong>
                </div>
                <div>
                  <AuditOutlined style={{ marginRight: 6, color: '#4ade80' }} />
                  Kiểm tra đầu vào: <strong style={{ color: '#4ade80' }}>Miễn phí 100%</strong>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. BODY CONTENT: TABS & STICKY SIDEBAR */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1200, margin: '-24px auto 0', padding: '0 24px' }}>
        <Row gutter={[32, 32]}>
          {/* CỘT TRÁI: NỘI DUNG CHI TIẾT TẤT CẢ THÔNG TIN KHÓA HỌC */}
          <Col xs={24} lg={16}>
            <Card
              style={{
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                marginBottom: 32,
              }}
            >
              <Tabs
                defaultActiveKey="overview"
                size="large"
                items={[
                  // TAB 1: TỔNG QUAN & THÔNG TIN TOÀN DIỆN
                  {
                    key: 'overview',
                    label: (
                      <span>
                        <BookOutlined /> Tổng quan khóa học
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        {course.description && (
                          <div style={{ marginBottom: 28 }}>
                            <Title level={4} style={{ color: '#0f172a' }}>
                              Mục tiêu & Nội dung khóa học
                            </Title>
                            <Paragraph
                              style={{
                                whiteSpace: 'pre-line',
                                fontSize: 15,
                                color: '#334155',
                                lineHeight: 1.8,
                              }}
                            >
                              {course.description}
                            </Paragraph>
                          </div>
                        )}

                        {course.outcomes && course.outcomes.length > 0 && (
                          <div style={{ marginBottom: 28 }}>
                            <Title level={4} style={{ color: '#0f172a' }}>
                              Chuẩn đầu ra cam kết (Learning Outcomes)
                            </Title>
                            <List
                              dataSource={course.outcomes}
                              renderItem={(outcome) => (
                                <List.Item style={{ padding: '8px 0', border: 'none' }}>
                                  <Space align="start">
                                    <CheckCircleOutlined style={{ color: '#16a34a', marginTop: 4 }} />
                                    <span style={{ fontSize: 14, color: '#334155' }}>{outcome}</span>
                                  </Space>
                                </List.Item>
                              )}
                            />
                          </div>
                        )}

                        <Title level={4} style={{ color: '#0f172a', marginBottom: 16 }}>
                          Bảng thông số kỹ thuật khóa học
                        </Title>
                        <Descriptions
                          bordered
                          size="middle"
                          column={{ xs: 1, sm: 2 }}
                          style={{ marginBottom: 28 }}
                        >
                          <Descriptions.Item label="Mã khóa học">{course.code}</Descriptions.Item>
                          <Descriptions.Item label="Mã hiển thị">{course.displayCode || course.code}</Descriptions.Item>
                          <Descriptions.Item label="Danh mục đào tạo">{course.categoryName || 'Chưa phân loại'}</Descriptions.Item>
                          <Descriptions.Item label="Hình thức đào tạo">
                            <Tag color={course.courseType === 'ONLINE' ? 'blue' : 'green'}>
                              {course.courseType === 'ONLINE' ? 'Trực tuyến (Online LMS/Zoom)' : 'Trực tiếp tại trung tâm (Offline)'}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Chế độ học tập">
                            {course.learningMode === 'SEQUENTIAL' ? 'Học theo lộ trình tuần tự' : 'Học tự do theo tiến độ'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Cách tính tiến độ">
                            {course.progressType === 'SESSION_BASED' ? 'Theo từng buổi học (Session)' : 'Theo hoàn thành bài học (Resource)'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Phòng học">
                            {course.roomName || (course.courseType === 'ONLINE' ? 'Phòng học trực tuyến' : 'Chưa xếp phòng')}
                          </Descriptions.Item>
                          <Descriptions.Item label="Giảng viên chính">
                            {course.teacherName || 'Đội ngũ giáo viên ECMS'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Số học viên tối thiểu">{course.minStudents || 1} học viên</Descriptions.Item>
                          <Descriptions.Item label="Số học viên tối đa">{course.maxStudents || 25} học viên</Descriptions.Item>
                          <Descriptions.Item label="Ngày bắt đầu">
                            <DateDisplay value={course.startDate} format="short" />
                          </Descriptions.Item>
                          <Descriptions.Item label="Ngày kết thúc dự kiến">
                            <DateDisplay value={course.endDate} format="short" />
                          </Descriptions.Item>

                          {/* 🆕 Hiển thị tổng số buổi dự kiến cho khóa OFFLINE */}
                          {course.courseType === 'OFFLINE' && course.totalSessionsExpected && (
                            <Descriptions.Item label="Tổng số buổi dự kiến" span={2}>
                              <strong>{course.totalSessionsExpected} buổi</strong>
                            </Descriptions.Item>
                          )}

                          {course.scheduleDays && course.scheduleDays.length > 0 && (
                            <Descriptions.Item label="Lịch học trong tuần" span={2}>
                              <Space size={6}>
                                {course.scheduleDays.map((d) => (
                                  <Tag key={d} color="blue">
                                    {DAY_LABELS[d - 1] || `Ngày ${d}`}
                                  </Tag>
                                ))}
                              </Space>
                            </Descriptions.Item>
                          )}

                          {course.sessionStartTime && (
                            <Descriptions.Item label="Khung giờ học" span={2}>
                              <ClockCircleOutlined style={{ marginRight: 6 }} />
                              {course.sessionStartTime} — {course.sessionEndTime || '21:00'}
                            </Descriptions.Item>
                          )}
                        </Descriptions>
                      </div>
                    ),
                  },

                  // TAB 2: ĐỀ CƯƠNG BÀI HỌC & TÀI NGUYÊN (RESOURCES)
                  {
                    key: 'curriculum',
                    label: (
                      <span>
                        <FileTextOutlined /> Đề cương bài học ({resourceTree.length || course.resources?.length || 0})
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <Title level={4} style={{ color: '#0f172a', marginBottom: 8 }}>
                          Chương trình đào tạo chi tiết
                        </Title>
                        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                          Chương trình được biên soạn chuẩn hóa theo từng chương và bài học, kết hợp video, bài đọc và trắc nghiệm thực hành.
                        </Paragraph>

                        {resourceTree.length > 0 ? (
                          <Collapse
                            defaultActiveKey={[String(resourceTree[0]?.id)]}
                            items={renderResourceItems(resourceTree)}
                            style={{ background: '#fff', borderRadius: 8 }}
                          />
                        ) : course.resources && course.resources.length > 0 ? (
                          <List
                            bordered
                            dataSource={course.resources}
                            renderItem={(res) => (
                              <List.Item
                                actions={[
                                  res.isFreePreview ? (
                                    <Tag color="green" key="preview">
                                      Học thử
                                    </Tag>
                                  ) : (
                                    <Tag key="normal">Bài học</Tag>
                                  ),
                                ]}
                              >
                                <Space>
                                  {RESOURCE_ICON_MAP[res.resourceType] || <FileTextOutlined />}
                                  <Text strong={res.resourceType === 'CHAPTER'}>{res.title}</Text>
                                </Space>
                              </List.Item>
                            )}
                          />
                        ) : (
                          <Empty description="Đề cương chi tiết đang được cập nhật bởi ban chuyên môn" />
                        )}
                      </div>
                    ),
                  },

                  // TAB 3: LỊCH CÁC BUỔI HỌC (SESSIONS)
                  {
                    key: 'sessions',
                    label: (
                      <span>
                        <CalendarOutlined /> Lịch các buổi học ({sessions.length})
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <Title level={4} style={{ color: '#0f172a', marginBottom: 8 }}>
                          Lịch trình các buổi học
                        </Title>
                        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                          Thời gian cụ thể của từng buổi học, giảng viên đứng lớp và phòng học.
                        </Paragraph>

                        {sessions.length > 0 ? (
                          <List
                            itemLayout="horizontal"
                            dataSource={sessions}
                            renderItem={(session) => (
                              <List.Item
                                style={{
                                  background: '#fff',
                                  padding: '16px',
                                  borderRadius: 8,
                                  marginBottom: 12,
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <List.Item.Meta
                                  avatar={
                                    <div
                                      style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 8,
                                        background: '#eff6ff',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 16,
                                      }}
                                    >
                                      #{session.sessionNumber}
                                    </div>
                                  }
                                  title={
                                    <Space wrap>
                                      <Text strong style={{ fontSize: 15 }}>
                                        {session.title || `Buổi học số ${session.sessionNumber}`}
                                      </Text>
                                      <StatusTag status={session.status} />
                                    </Space>
                                  }
                                  description={
                                    <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                                      <span>
                                        <CalendarOutlined style={{ marginRight: 4 }} />
                                        {session.sessionDate}
                                      </span>
                                      <span>
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                        {session.startTime} - {session.endTime}
                                      </span>
                                      {session.effectiveTeacherName && (
                                        <span>
                                          <UserOutlined style={{ marginRight: 4 }} />
                                          {session.effectiveTeacherName}
                                        </span>
                                      )}
                                      {session.effectiveRoomName && (
                                        <span>
                                          <HomeOutlined style={{ marginRight: 4 }} />
                                          {session.effectiveRoomName}
                                        </span>
                                      )}
                                    </div>
                                  }
                                />
                              </List.Item>
                            )}
                          />
                        ) : (
                          <Empty description="Lịch các buổi học chi tiết sẽ được công bố khi mở lớp" />
                        )}
                      </div>
                    ),
                  },

                  // TAB 4: QUY TRÌNH TIẾP NHẬN LEAD & STUDENT
                  {
                    key: 'process',
                    label: (
                      <span>
                        <AuditOutlined /> Quy trình ghi danh
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <Title level={4} style={{ color: '#0f172a', marginBottom: 16 }}>
                          Quy trình từ Khách tiềm năng (Lead) đến Học viên chính thức (Student)
                        </Title>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <Card size="small" style={{ borderLeft: '4px solid #3b82f6' }}>
                            <Title level={5} style={{ margin: 0, color: '#1d4ed8' }}>
                              Bước 1: Đăng ký tư vấn trực tuyến (Form Web)
                            </Title>
                            <Paragraph style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
                              Khách hàng điền thông tin đăng ký quan tâm khóa học. Hệ thống tự động chuẩn hóa email, số điện thoại và chuyển hồ sơ vào hàng đợi (Queue) ở trạng thái <strong>NEW</strong>.
                            </Paragraph>
                          </Card>

                          <Card size="small" style={{ borderLeft: '4px solid #10b981' }}>
                            <Title level={5} style={{ margin: 0, color: '#059669' }}>
                              Bước 2: Tư vấn viên liên hệ & Đánh giá đầu vào (Placement Test)
                            </Title>
                            <Paragraph style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
                              Tư vấn viên liên hệ trong 24 giờ để xếp lịch làm bài kiểm tra trình độ miễn phí. Kết quả làm bài sẽ giúp xác định đúng trình độ và lớp học phù hợp.
                            </Paragraph>
                          </Card>

                          <Card size="small" style={{ borderLeft: '4px solid #f59e0b' }}>
                            <Title level={5} style={{ margin: 0, color: '#d97706' }}>
                              Bước 3: Xác nhận giữ chỗ (Enrollment) & Đóng cọc (Tuition)
                            </Title>
                            <Paragraph style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
                              Hệ thống kiểm tra sĩ số lớp còn chỗ để giữ chỗ cho học viên. Bộ phận học phí phát hành hóa đơn tiền cọc để khách hoàn tất thanh toán.
                            </Paragraph>
                          </Card>

                          <Card size="small" style={{ borderLeft: '4px solid #8b5cf6' }}>
                            <Title level={5} style={{ margin: 0, color: '#7c3aed' }}>
                              Bước 4: Cấp mã học viên (Student) & Tài khoản đăng nhập
                            </Title>
                            <Paragraph style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
                              Khi đóng cọc thành công, hệ thống tự động sinh mã học viên dạng <strong>STD + yyyyMM + 4 số</strong>, kích hoạt trạng thái <strong>ACTIVE</strong> và gửi tài khoản qua email để học viên bắt đầu học tập.
                            </Paragraph>
                          </Card>
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            {/* FORM ĐĂNG KÝ TƯ VẤN TRỰC TIẾP DƯỚI CHÂN TRANG KHÓA HỌC */}
            <Card
              id="consult-form"
              title={
                <div>
                  <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                    Đăng Ký Tư Vấn Khóa Học Này
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Chuyên viên ECMS sẽ gọi điện tư vấn chi tiết lịch học, ưu đãi và xếp lịch test miễn phí
                  </Text>
                </div>
              }
              style={{
                borderRadius: 16,
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <LeadRegistrationForm initialCourseId={course.id} />
            </Card>
          </Col>

          {/* CỘT PHẢI: STICKY SIDEBAR (THÔNG TIN HỌC PHÍ, CTA ĐĂNG KÝ TƯ VẤN) */}
          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: 90 }}>
              <Card
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                }}
                cover={
                  course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      style={{ height: 200, objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 200,
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 56,
                      }}
                    >
                      <BookOutlined />
                    </div>
                  )
                }
              >
                {/* Giá tiền */}
                <div style={{ marginBottom: 20 }}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                    <DollarOutlined /> Học phí khóa học
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                    <Text strong style={{ fontSize: 28, color: '#1677ff' }}>
                      <MoneyDisplay value={course.isFree ? 0 : course.price} />
                    </Text>
                    {course.oldPrice && course.oldPrice > course.price && (
                      <Text delete type="secondary" style={{ fontSize: 16 }}>
                        <MoneyDisplay value={course.oldPrice} />
                      </Text>
                    )}
                  </div>
                </div>

                {/* Nút hành động chính */}
                <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 24 }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    block
                    style={{
                      height: 48,
                      fontSize: 16,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                      boxShadow: '0 4px 12px rgba(22, 119, 255, 0.35)',
                    }}
                    onClick={() => setConsultModalOpen(true)}
                  >
                    Đăng ký nhận tư vấn ngay
                  </Button>

                  <Button
                    size="large"
                    icon={<AuditOutlined />}
                    block
                    style={{
                      height: 48,
                      fontSize: 15,
                      fontWeight: 600,
                      borderColor: '#0284c7',
                      color: '#0284c7',
                    }}
                    onClick={() => setConsultModalOpen(true)}
                  >
                    Đăng ký kiểm tra trình độ đầu vào
                  </Button>
                </Space>

                <Divider style={{ margin: '16px 0' }} />

                {/* Cam kết của khóa học */}
                <Title level={5} style={{ marginBottom: 12, color: '#0f172a' }}>
                  Khóa học này bao gồm:
                </Title>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14, color: '#475569' }}>
                  <li style={{ padding: '6px 0', display: 'flex', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#16a34a', marginTop: 4 }} />
                    <span>Lộ trình học theo chuẩn quốc tế CEFR</span>
                  </li>
                  <li style={{ padding: '6px 0', display: 'flex', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#16a34a', marginTop: 4 }} />
                    <span>Kiểm tra đánh giá đầu vào & xếp lớp miễn phí</span>
                  </li>
                  <li style={{ padding: '6px 0', display: 'flex', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#16a34a', marginTop: 4 }} />
                    <span>Giảng viên đạt chuẩn IELTS 8.0+ & CELTA</span>
                  </li>
                  <li style={{ padding: '6px 0', display: 'flex', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#16a34a', marginTop: 4 }} />
                    <span>Kho tài liệu bài giảng & video học trực tuyến</span>
                  </li>
                  <li style={{ padding: '6px 0', display: 'flex', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#16a34a', marginTop: 4 }} />
                    <span>Cấp mã học viên & theo dõi kết quả học tập</span>
                  </li>
                </ul>

                {/* Hỗ trợ nhanh */}
                <div
                  style={{
                    marginTop: 20,
                    padding: 12,
                    background: '#eff6ff',
                    borderRadius: 8,
                    textAlign: 'center',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                    Cần hỗ trợ tư vấn gấp?
                  </Text>
                  <Text strong style={{ fontSize: 16, color: '#1d4ed8' }}>
                    <PhoneOutlined style={{ marginRight: 6 }} />
                    1900 8888 - 028 1234 5678
                  </Text>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </div>

      {/* MODAL ĐĂNG KÝ TƯ VẤN NHANH */}
      <LeadRegistrationModal
        open={consultModalOpen}
        initialCourseId={course.id}
        initialCourseTitle={course.title}
        onClose={() => setConsultModalOpen(false)}
      />

      {/* FLOATING ACTION BUTTON */}
      <FloatingLeadButton onClick={() => setConsultModalOpen(true)} />
    </div>
  );
}