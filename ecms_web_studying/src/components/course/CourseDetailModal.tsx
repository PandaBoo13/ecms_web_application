import { Modal, Typography, Tag, Button, Space, Divider, Row, Col } from 'antd';
import {
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  SendOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { CourseResponse } from '@/services/types/course';
import MoneyDisplay from '@/components/common/MoneyDisplay';

const { Title, Paragraph, Text } = Typography;

interface CourseDetailModalProps {
  course: CourseResponse | null;
  open: boolean;
  onClose: () => void;
  onConsultClick: (course: CourseResponse) => void;
}

export default function CourseDetailModal({
  course,
  open,
  onClose,
  onConsultClick,
}: CourseDetailModalProps) {
  if (!course) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="consult"
          type="primary"
          icon={<SendOutlined />}
          style={{ background: '#1677ff', fontWeight: 600 }}
          onClick={() => {
            onClose();
            onConsultClick(course);
          }}
        >
          Đăng ký tư vấn khóa học này
        </Button>,
      ]}
      width={720}
      centered
      title={
        <Space align="center">
          <Tag color={course.courseType === 'ONLINE' ? 'blue' : 'green'}>
            {course.courseType}
          </Tag>
          {course.categoryName && <Tag color="cyan">{course.categoryName}</Tag>}
          {course.isFree && <Tag color="gold">Miễn phí</Tag>}
        </Space>
      }
    >
      <div style={{ marginTop: 12 }}>
        {course.thumbnailUrl && (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            style={{
              width: '100%',
              height: 240,
              objectFit: 'cover',
              borderRadius: 8,
              marginBottom: 16,
            }}
          />
        )}

        <Title level={3} style={{ marginBottom: 8, color: '#0f172a' }}>
          {course.title}
        </Title>

        <Paragraph type="secondary" style={{ fontSize: 15, marginBottom: 16 }}>
          {course.shortDescription || 'Khóa học tiếng Anh chất lượng cao theo chuẩn quốc tế tại ECMS.'}
        </Paragraph>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                <DollarOutlined /> Học phí
              </Text>
              <Text strong style={{ fontSize: 18, color: '#1677ff' }}>
                <MoneyDisplay value={course.isFree ? 0 : course.price} />
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                <CalendarOutlined /> Khai giảng
              </Text>
              <Text strong style={{ fontSize: 14 }}>
                {course.startDate ? new Date(course.startDate).toLocaleDateString('vi-VN') : 'Liên tục mở lớp'}
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                <InfoCircleOutlined /> Hình thức
              </Text>
              <Text strong style={{ fontSize: 14 }}>
                {course.courseType === 'ONLINE' ? 'Trực tuyến (Zoom/LMS)' : 'Trực tiếp tại trung tâm'}
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                <CheckCircleOutlined /> Đánh giá đầu vào
              </Text>
              <Text strong style={{ fontSize: 14, color: '#059669' }}>
                Miễn phí test
              </Text>
            </Col>
          </Row>
        </div>

        {course.description && (
          <div>
            <Title level={5}>Mục tiêu và nội dung khóa học</Title>
            <Paragraph style={{ whiteSpace: 'pre-line', color: '#334155', lineHeight: 1.6 }}>
              {course.description}
            </Paragraph>
          </div>
        )}

        <Divider style={{ margin: '16px 0' }} />

        <div
          style={{
            background: '#eff6ff',
            borderRadius: 6,
            padding: 12,
            borderLeft: '4px solid #3b82f6',
          }}
        >
          <Text style={{ fontSize: 13, color: '#1e40af' }}>
            💡 <strong>Lưu ý nghiệp vụ:</strong> Khi đăng ký tư vấn, thông tin của bạn sẽ được
            tiếp nhận vào hệ thống Lead Module. Tư vấn viên sẽ liên hệ để xếp lịch kiểm tra trình độ
            đầu vào (nếu khóa học yêu cầu) và hỗ trợ hoàn tất thủ tục ghi danh.
          </Text>
        </div>
      </div>
    </Modal>
  );
}

