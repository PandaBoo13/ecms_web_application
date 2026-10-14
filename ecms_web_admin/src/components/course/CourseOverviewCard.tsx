import { Card, Descriptions, Tag, Typography, Space } from 'antd';

import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';

import type { CourseDetailResponse } from '@/services/types/course';

const { Text, Paragraph } = Typography;

interface Props {
  course: CourseDetailResponse;
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const CourseOverviewCard = ({ course }: Props) => {
  return (
    <Card>
      <Descriptions
        column={{ xs: 1, sm: 2, md: 2, lg: 3 }}
        bordered
        size="middle"
      >
        <Descriptions.Item label="Mã khóa">{course.code}</Descriptions.Item>
        <Descriptions.Item label="Display code">{course.displayCode}</Descriptions.Item>
        <Descriptions.Item label="Slug">{course.slug}</Descriptions.Item>

        <Descriptions.Item label="Loại khóa">
          <StatusTag status={course.courseType} />
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <StatusTag status={course.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái lớp">
          {course.classStatus ? <StatusTag status={course.classStatus} /> : <Tag>—</Tag>}
        </Descriptions.Item>

        <Descriptions.Item label="Giá">
          <MoneyDisplay value={course.isFree ? 0 : course.price} strong />
        </Descriptions.Item>
        <Descriptions.Item label="Giá cũ">
          {course.oldPrice ? <MoneyDisplay value={course.oldPrice} showFree={false} /> : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Miễn phí">
          {course.isFree ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>}
        </Descriptions.Item>

        <Descriptions.Item label="Giảng viên">
          {course.teacherName || <Text type="secondary">Chưa gán</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Danh mục">
          {course.categoryName || <Text type="secondary">Chưa gán</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Phòng">
          {course.roomName || <Text type="secondary">—</Text>}
        </Descriptions.Item>

        <Descriptions.Item label="Số học viên">
          <Text strong>{course.currentStudents}</Text>
          {course.maxStudents ? <Text type="secondary"> / {course.maxStudents}</Text> : null}
        </Descriptions.Item>
        <Descriptions.Item label="Sĩ số tối thiểu">
          {course.minStudents ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Sĩ số tối đa">
          {course.maxStudents ?? '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Ngày bắt đầu">
          <DateDisplay value={course.startDate} />
        </Descriptions.Item>
        <Descriptions.Item label="Ngày kết thúc">
          <DateDisplay value={course.endDate} />
        </Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">
          <DateDisplay value={course.createdAt} format="long" />
        </Descriptions.Item>

        {course.scheduleDays && course.scheduleDays.length > 0 && (
          <Descriptions.Item label="Lịch học" span={3}>
            <Space size={4}>
              {course.scheduleDays.map((d) => (
                <Tag key={d}>{DAY_LABELS[d - 1] || d}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
        )}

        {course.sessionStartTime && (
          <Descriptions.Item label="Giờ học" span={3}>
            {course.sessionStartTime} — {course.sessionEndTime}
          </Descriptions.Item>
        )}

        {course.shortDescription && (
          <Descriptions.Item label="Mô tả ngắn" span={3}>
            {course.shortDescription}
          </Descriptions.Item>
        )}

        {course.description && (
          <Descriptions.Item label="Mô tả đầy đủ" span={3}>
            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
              {course.description}
            </Paragraph>
          </Descriptions.Item>
        )}

        {course.outcomes && course.outcomes.length > 0 && (
          <Descriptions.Item label="Kết quả đầu ra" span={3}>
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              {course.outcomes.map((o, idx) => (
                <li key={idx}>{o}</li>
              ))}
            </ul>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
};

export default CourseOverviewCard;