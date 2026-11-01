import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Col,
  Row,
  Typography,
  Tag,
  Space,
  Spin,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  BookOutlined,
  TeamOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  LoginOutlined,
  ArrowRightOutlined,
  PhoneOutlined,
  SendOutlined,
  EyeOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { courseApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành: import { courseApi } from '@/services/api/course/courseApi';

import type { CourseResponse } from '@/services/types/course';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import LeadRegistrationModal from '@/components/lead/LeadRegistrationModal';
import StatusLookupSection from '@/components/lead/StatusLookupSection';
import FloatingLeadButton from '@/components/lead/FloatingLeadButton';
import heroImg from '@/assets/hero.png';

const { Title, Paragraph, Text } = Typography;

const features = [
  {
    icon: <BookOutlined />,
    title: 'Khóa học đa dạng',
    desc: 'Lớp học trực tuyến & trực tiếp tại trung tâm với giáo trình chuẩn quốc tế.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Giảng viên chuẩn quốc tế',
    desc: 'Đội ngũ giáo viên giàu kinh nghiệm, sở hữu chứng chỉ IELTS 8.0+ và CELTA/TESOL.',
  },
  {
    icon: <AuditOutlined />,
    title: 'Đánh giá đầu vào miễn phí',
    desc: 'Bài kiểm tra Placement Test chính xác giúp xác định đúng trình độ và lộ trình tối ưu.',
  },
  {
    icon: <TrophyOutlined />,
    title: 'Cam kết chuẩn đầu ra',
    desc: 'Hỗ trợ kèm 1-1, cam kết kết quả học tập và cấp chứng nhận hoàn thành khóa học.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Modal states
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseResponse | null>(null);

  // Tự động hiển thị popup đăng ký tư vấn sau 1.5s khi vào trang
  // Nhưng cho phép người dùng tắt đi và không tự động hiện lại nếu đã tắt trong phiên làm việc
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('ecms_consult_popup_dismissed');
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setLeadModalOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Xử lý khi đóng popup tư vấn
  const handleCloseLeadModal = () => {
    setLeadModalOpen(false);
    setSelectedCourseForModal(null);
    // Ghi nhận đã đóng popup để không tự động bật lại làm phiền người dùng
    sessionStorage.setItem('ecms_consult_popup_dismissed', 'true');
  };

  useEffect(() => {
    courseApi
      .search({ page: 0, size: 6, status: 'PUBLISHED' })
      .then((res) => {
        if (res?.content) {
          setCourses(res.content);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải khóa học nổi bật:', err);
      })
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleOpenConsultForCourse = (course: CourseResponse) => {
    setSelectedCourseForModal(course);
    setLeadModalOpen(true);
  };

  const handleOpenDetail = (course: CourseResponse) => {
    navigate(`/courses/${course.id}`);
  };

  const scrollToLookup = () => {
    const el = document.getElementById('status-lookup-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div>
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. HERO SECTION (THOÁNG ĐÃNG, KHÔNG BỊ CHIẾM CHỖ UI BỞI FORM) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
          color: '#fff',
          padding: '80px 24px 96px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 48]} align="middle">
            {/* Cột trái: Thông điệp cốt lõi & Kêu gọi hành động */}
            <Col xs={24} lg={13}>
              <Tag
                color="blue"
                style={{
                  background: 'rgba(59, 130, 246, 0.25)',
                  border: '1px solid rgba(147, 197, 253, 0.4)',
                  color: '#93c5fd',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 20,
                }}
              >
                🚀 Hệ Thống Đào Tạo Tiếng Anh Chuẩn Quốc Tế ECMS
              </Tag>

              <Title
                style={{
                  color: '#ffffff',
                  fontSize: 'clamp(32px, 5vw, 52px)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  marginBottom: 20,
                }}
              >
                Nâng Tầm Tiếng Anh, <br />
                <span
                  style={{
                    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Mở Lối Tương Lai
                </span>
              </Title>

              <Paragraph
                style={{
                  color: '#e2e8f0',
                  fontSize: 18,
                  lineHeight: 1.7,
                  marginBottom: 36,
                  maxWidth: 580,
                }}
              >
                Lộ trình học tập cá nhân hóa được thiết kế dựa trên kết quả đánh giá năng lực đầu vào
                (Placement Test). Đội ngũ tư vấn viên đồng hành 24/7 giúp bạn chọn đúng lớp, đúng mục
                tiêu với chi phí tối ưu.
              </Paragraph>

              <Space size={16} wrap style={{ marginBottom: 40 }}>
                {/* Nút bấm mở trực tiếp Popup đăng ký tư vấn */}
                <Button
                  type="primary"
                  size="large"
                  icon={<SendOutlined />}
                  onClick={() => setLeadModalOpen(true)}
                  style={{
                    height: 52,
                    padding: '0 30px',
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    borderColor: '#16a34a',
                    boxShadow: '0 8px 20px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  Đăng ký tư vấn ngay
                </Button>

                <Button
                  ghost
                  size="large"
                  icon={<AuditOutlined />}
                  onClick={() => setLeadModalOpen(true)}
                  style={{
                    height: 52,
                    padding: '0 26px',
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 10,
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    color: '#ffffff',
                  }}
                >
                  Kiểm tra trình độ miễn phí
                </Button>

                <Button
                  type="link"
                  onClick={scrollToLookup}
                  style={{
                    color: '#93c5fd',
                    fontSize: 15,
                    fontWeight: 500,
                    padding: '0 8px',
                  }}
                >
                  Tra cứu hồ sơ <ArrowRightOutlined />
                </Button>
              </Space>

              {/* Cam kết ngắn gọn */}
              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0' }}>
                    <CheckCircleOutlined style={{ color: '#4ade80', fontSize: 16 }} />
                    <span style={{ fontSize: 14 }}>Tư vấn viên phản hồi trong 24h</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0' }}>
                    <CheckCircleOutlined style={{ color: '#4ade80', fontSize: 16 }} />
                    <span style={{ fontSize: 14 }}>Miễn phí 100% Placement Test</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0' }}>
                    <CheckCircleOutlined style={{ color: '#4ade80', fontSize: 16 }} />
                    <span style={{ fontSize: 14 }}>Bảo mật dữ liệu cá nhân (NFR-02)</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0' }}>
                    <CheckCircleOutlined style={{ color: '#4ade80', fontSize: 16 }} />
                    <span style={{ fontSize: 14 }}>Chính sách ưu đãi học viên cũ</span>
                  </div>
                </Col>
              </Row>
            </Col>

            {/* Cột phải: Hình ảnh minh họa & Thẻ thông số sinh động (thay thế form chiếm chỗ) */}
            <Col xs={24} lg={11}>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* Ảnh Hero */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 24,
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '4px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <img
                    src={heroImg}
                    alt="ECMS Education Hero"
                    style={{
                      width: '100%',
                      maxWidth: 480,
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                </div>

                {/* Card nổi 1: Học viên theo học */}
                <Card
                  style={{
                    position: 'absolute',
                    top: -16,
                    left: -16,
                    borderRadius: 16,
                    background: 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    padding: '8px 16px',
                    border: 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Space align="center" size={12}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      <UsergroupAddOutlined />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>10,000+</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Học viên tin tưởng</div>
                    </div>
                  </Space>
                </Card>

                {/* Card nổi 2: Tỷ lệ đạt chuẩn */}
                <Card
                  style={{
                    position: 'absolute',
                    bottom: -20,
                    right: -16,
                    borderRadius: 16,
                    background: 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    padding: '8px 16px',
                    border: 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Space align="center" size={12}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#f0fdf4',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      <TrophyOutlined />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>98.5%</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Đạt mục tiêu cam kết</div>
                    </div>
                  </Space>
                </Card>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. KHÓA HỌC NỔI BẬT */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '72px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 40,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <Tag color="blue" style={{ borderRadius: 10, padding: '2px 10px', fontSize: 12 }}>
              Chương trình đào tạo
            </Tag>
            <Title level={2} style={{ margin: '8px 0 0', color: '#0f172a' }}>
              Khóa Học Tiêu Biểu Tại ECMS
            </Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 16 }}>
              Khám phá các khóa học được thiết kế sát thực tế, đáp ứng mọi nhu cầu từ học sinh đến người
              đi làm.
            </Paragraph>
          </div>
          <Button
            type="link"
            size="large"
            onClick={() => navigate('/courses')}
            style={{ fontWeight: 600, fontSize: 16 }}
          >
            Xem tất cả khóa học <ArrowRightOutlined />
          </Button>
        </div>

        {loadingCourses ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : courses.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 40 }}>
            <Title level={4}>Đang cập nhật danh sách khóa học mới</Title>
            <Paragraph type="secondary">
              Vui lòng để lại thông tin để nhận thông báo về khóa học mới nhất.
            </Paragraph>
            <Button type="primary" onClick={() => setLeadModalOpen(true)}>
              Nhận tư vấn ngay
            </Button>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {courses.slice(0, 3).map((c) => (
              <Col xs={24} sm={12} lg={8} key={c.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 16,
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
                          fontSize: 44,
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
                    {c.shortDescription || 'Khóa học cung cấp lộ trình từ nền tảng đến nâng cao.'}
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
                        onClick={() => handleOpenConsultForCourse(c)}
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
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. SECTION ĐÁNH GIÁ ĐẦU VÀO (PLACEMENT TEST - LEAD MODULE) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: '#f1f5f9',
          padding: '72px 24px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Row gutter={[40, 40]} align="middle">
            <Col xs={24} md={12}>
              <Tag color="cyan" style={{ borderRadius: 10, padding: '2px 10px', fontSize: 12 }}>
                Quy trình đánh giá đầu vào
              </Tag>
              <Title level={2} style={{ marginTop: 8, marginBottom: 16, color: '#0f172a' }}>
                Kiểm Tra Trình Độ Tiếng Anh Đầu Vào (Placement Test)
              </Title>
              <Paragraph style={{ fontSize: 16, color: '#475569', lineHeight: 1.7, marginBottom: 24 }}>
                Theo quy chuẩn học thuật tại ECMS, mỗi học viên trước khi xếp lớp đều được tham gia bài kiểm
                tra đánh giá năng lực toàn diện để:
              </Paragraph>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                      Đăng ký qua Form Web hoặc Hotline
                    </Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                      Hệ thống tự động tiếp nhận Lead và điều phối tư vấn viên phụ trách liên hệ hẹn lịch làm
                      bài.
                    </Paragraph>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                      Thực hiện bài kiểm tra & Ghi nhận điểm số
                    </Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                      Khách hoàn thành bài test; hệ thống tự động gợi ý trình độ (Level) tương ứng dựa trên
                      điểm số.
                    </Paragraph>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                      Tư vấn lộ trình học tối ưu & Giữ chỗ lớp
                    </Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                      Tư vấn viên giới thiệu lớp học, học phí và kiểm tra sĩ số lớp còn chỗ để hoàn tất giữ
                      chỗ.
                    </Paragraph>
                  </div>
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<AuditOutlined />}
                style={{
                  height: 48,
                  padding: '0 28px',
                  fontWeight: 600,
                  borderRadius: 8,
                  background: '#0284c7',
                  borderColor: '#0284c7',
                }}
                onClick={() => setLeadModalOpen(true)}
              >
                Đăng ký kiểm tra trình độ ngay (Miễn phí)
              </Button>
            </Col>

            <Col xs={24} md={12}>
              <Card
                style={{
                  borderRadius: 16,
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                  background: '#ffffff',
                }}
              >
                <Title level={4} style={{ marginBottom: 16, color: '#0f172a' }}>
                  Khung Trình Độ Chuẩn Quốc Tế Tại ECMS
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 14 }}>
                  Tương quan giữa điểm đánh giá đầu vào và các chứng chỉ quốc tế:
                </Paragraph>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 8,
                      borderLeft: '4px solid #3b82f6',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>Cơ bản (A1 - A2)</Text>
                      <Tag color="blue">Mất gốc / Mới bắt đầu</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Phù hợp với học viên cần củng cố ngữ pháp, từ vựng và phản xạ giao tiếp cơ bản.
                    </Text>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 8,
                      borderLeft: '4px solid #10b981',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>Trung cấp (B1 - B2 / IELTS 4.5 - 6.0)</Text>
                      <Tag color="green">Độc lập sử dụng</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Nâng cao kỹ năng nghe - nói thuyết trình, viết luận và làm quen bài thi chuẩn hóa.
                    </Text>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 8,
                      borderLeft: '4px solid #8b5cf6',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>Nâng cao (C1 - C2 / IELTS 6.5+)</Text>
                      <Tag color="purple">Thành thạo</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Luyện thi chuyên sâu, tiếng Anh học thuật và chuyên ngành cho du học và công việc toàn
                      cầu.
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. TÍNH NĂNG TRA CỨU HỒ SƠ TƯ VẤN & HỌC VIÊN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="status-lookup-section" style={{ padding: '72px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <StatusLookupSection onRegisterClick={() => setLeadModalOpen(true)} />
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. TẠI SAO CHỌN ECMS? */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 12, color: '#0f172a' }}>
          Tại Sao Chọn ECMS?
        </Title>
        <Paragraph
          type="secondary"
          style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 48px', fontSize: 16 }}
        >
          Môi trường giáo dục hiện đại, chuyên nghiệp cùng cam kết chất lượng đào tạo hàng đầu.
        </Paragraph>
        <Row gutter={[24, 24]}>
          {features.map((f, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card
                hoverable
                style={{
                  textAlign: 'center',
                  borderRadius: 16,
                  height: '100%',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: 40, color: '#1677ff', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <Title level={4} style={{ marginBottom: 8, color: '#1e293b' }}>
                  {f.title}
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 14 }}>
                  {f.desc}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. BANNER DÀNH CHO HỌC VIÊN ĐÃ ĐÓNG CỌC / ĐÃ CÓ TÀI KHOẢN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
          padding: '60px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>
            Bạn Đã Là Học Viên Của ECMS?
          </Title>
          <Paragraph style={{ color: '#94a3b8', fontSize: 16, marginBottom: 28, lineHeight: 1.6 }}>
            Sau khi hoàn tất đóng cọc thành công, hệ thống đã cấp cho bạn tài khoản học viên (STUDENT)
            với tên đăng nhập là Email. Đăng nhập ngay để vào lớp học, làm bài tập và theo dõi điểm số.
          </Paragraph>
          <Space size={16} wrap>
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              onClick={() => navigate('/login')}
              style={{
                height: 48,
                padding: '0 28px',
                fontWeight: 600,
                borderRadius: 8,
                fontSize: 16,
                background: '#3b82f6',
              }}
            >
              Đăng nhập cổng học tập
            </Button>
            <Button
              ghost
              size="large"
              icon={<PhoneOutlined />}
              onClick={() => navigate('/contact')}
              style={{
                height: 48,
                padding: '0 24px',
                fontWeight: 600,
                borderRadius: 8,
                fontSize: 16,
              }}
            >
              Liên hệ phòng học vụ
            </Button>
          </Space>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <LeadRegistrationModal
        open={leadModalOpen}
        initialCourseId={selectedCourseForModal?.id}
        initialCourseTitle={selectedCourseForModal?.title}
        onClose={handleCloseLeadModal}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FLOATING ACTION BUTTON ĐĂNG KÝ TƯ VẤN (TƯƠNG TỰ PMP ENGLISH) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <FloatingLeadButton onClick={() => setLeadModalOpen(true)} />
    </div>
  );
}