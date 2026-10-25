import { useEffect, useState } from 'react';
import { Card, Row, Col, Descriptions, Space, Typography, Alert, Divider, Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import InlineEdit from '@/components/common/InlineEdit';
import ThumbnailUpload from '@/components/common/ThumbnailUpload';
import StatusTag from '@/components/common/StatusTag';
import MoneyDisplay from '@/components/common/MoneyDisplay';

import { courseApi, categoryApi } from '@/services/api/courses';
import type {
  CourseDetailResponse,
  CourseUpdateRequest,
  CategoryResponse,
} from '@/services/types/course';

const { Text, Paragraph } = Typography;
const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
  readOnly?: boolean;
}

const CourseOverviewForm = ({ course, onRefresh, readOnly }: Props) => {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const isOngoing = readOnly ?? course.status === 'ONGOING';

  useEffect(() => {
    categoryApi.tree().then(setCategories).catch(() => {});
  }, []);

  const update = async (field: keyof CourseUpdateRequest, value: unknown) => {
    try {
      await courseApi.update(course.id, { [field]: value });
      toast.success('Cập nhật thành công');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Cập nhật thất bại');
      throw err;
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const learningModeOptions = [
    { value: 'AUTONOMOUS', label: 'Tự do' },
    { value: 'SEQUENTIAL', label: 'Tuần tự' },
  ];

  return (
    <Card>
      {isOngoing && (
        <Alert
          message="Khóa học đang diễn ra"
          description="Bạn không thể thay đổi cấu trúc nội dung và học phí khi khóa học ở trạng thái ONGOING."
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>
        * Nhấp đúp chuột vào từng dòng để chỉnh sửa · Enter để xác nhận
      </Text>

      <Row gutter={20} style={{ marginTop: 14 }}>
        {/* ═══ CỘT TRÁI: chỉ Thumbnail, sticky ═══ */}
        <Col xs={24} md={8} lg={7}>
          <div style={{ position: 'sticky', top: 16 }}>
            {isOngoing ? (
              course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt="thumbnail"
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '2px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: 12,
                  }}
                >
                  Chưa có ảnh
                </div>
              )
            ) : (
              <ThumbnailUpload
                value={course.thumbnailUrl}
                onChange={(url) => update('thumbnailUrl', url)}
                width={280}
                height={158}
              />
            )}
          </div>
        </Col>

        {/* ═══ CỘT PHẢI: Descriptions 2 cột — GỘP TẤT CẢ INFO ═══ */}
        <Col xs={24} md={16} lg={17}>
          <Descriptions
            column={{ xs: 1, sm: 2 }}
            bordered
            size="small"
            labelStyle={{ width: 120, fontSize: 12, background: '#fafafa' }}
          >
            <Descriptions.Item label="Tên khóa học" span={2}>
              {isOngoing ? (
                <span style={{ fontWeight: 600 }}>{course.title}</span>
              ) : (
                <InlineEdit value={course.title} onSave={(v) => update('title', v)} />
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Mã khóa">
              <Text code>{course.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Display code">
              <Text code>{course.displayCode}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Slug" span={2}>
              <Text code style={{ fontSize: 12 }}>{course.slug}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái">
              <StatusTag status={course.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Loại khóa">
              <StatusTag status={course.courseType} />
            </Descriptions.Item>

            <Descriptions.Item label="Danh mục">
              {isOngoing ? (
                course.categoryName || '—'
              ) : (
                <InlineEdit
                  type="select"
                  value={course.categoryId}
                  options={categoryOptions}
                  onSave={(v) => update('categoryId', v)}
                  formatDisplay={() =>
                    course.categoryName || <span style={{ color: '#bfbfbf' }}>Chưa chọn</span>
                  }
                />
              )}
            </Descriptions.Item>

            {course.courseType === 'ONLINE' ? (
              <Descriptions.Item label="Chế độ học">
                {isOngoing ? (
                  course.learningMode === 'SEQUENTIAL' ? 'Tuần tự' : 'Tự do'
                ) : (
                  <InlineEdit
                    type="select"
                    value={course.learningMode}
                    options={learningModeOptions}
                    onSave={(v) => update('learningMode', v)}
                    formatDisplay={() =>
                      course.learningMode === 'SEQUENTIAL' ? 'Tuần tự' : 'Tự do'
                    }
                  />
                )}
              </Descriptions.Item>
            ) : (
              <Descriptions.Item label="Giảng viên">
                {course.teacherName || <Text type="secondary">Chưa gán</Text>}
              </Descriptions.Item>
            )}

            {course.courseType === 'ONLINE' && (
              <Descriptions.Item label="Giảng viên" span={2}>
                {course.teacherName || <Text type="secondary">Chưa gán</Text>}
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Miễn phí">
              {isOngoing ? (
                course.isFree ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>
              ) : (
                <InlineEdit
                  type="switch"
                  value={course.isFree}
                  onSave={(v) => update('isFree', v)}
                  formatDisplay={() =>
                    course.isFree ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>
                  }
                />
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Giá bán">
              {isOngoing ? (
                <MoneyDisplay value={course.price} strong />
              ) : (
                <InlineEdit
                  type="number"
                  value={course.price}
                  onSave={(v) => update('price', v)}
                  formatDisplay={(v) => <MoneyDisplay value={v} strong />}
                />
              )}
            </Descriptions.Item>

            {!course.isFree && (
              <Descriptions.Item label="Giá gốc" span={2}>
                {isOngoing ? (
                  course.oldPrice ? (
                    <MoneyDisplay value={course.oldPrice} showFree={false} />
                  ) : '—'
                ) : (
                  <InlineEdit
                    type="number"
                    value={course.oldPrice}
                    onSave={(v) => update('oldPrice', v)}
                    formatDisplay={(v) =>
                      v ? (
                        <MoneyDisplay value={v} showFree={false} />
                      ) : (
                        <span style={{ color: '#bfbfbf' }}>Chưa có</span>
                      )
                    }
                  />
                )}
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Sĩ số">
              <Text strong>{course.currentStudents}</Text>
              {course.maxStudents ? <Text type="secondary"> / {course.maxStudents}</Text> : null}
            </Descriptions.Item>

            {course.scheduleDays && course.scheduleDays.length > 0 && (
              <Descriptions.Item label="Lịch học">
                <Space size={4} wrap>
                  {course.scheduleDays.map((d) => (
                    <Tag key={d} style={{ margin: 0 }}>
                      {DAYS[d - 1] || d}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}

            {course.sessionStartTime && (
              <Descriptions.Item label="Giờ học" span={2}>
                {course.sessionStartTime} — {course.sessionEndTime}
              </Descriptions.Item>
            )}

            {course.startDate && (
              <Descriptions.Item label="Ngày bắt đầu">
                {course.startDate}
              </Descriptions.Item>
            )}
            {course.endDate && (
              <Descriptions.Item label="Ngày kết thúc">
                {course.endDate}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Col>
      </Row>

      <Divider orientation="left" style={{ margin: '20px 0 12px', fontSize: 13 }}>
        Nội dung mô tả
      </Divider>

      <Descriptions
        column={1}
        bordered
        size="small"
        labelStyle={{ width: 150, fontSize: 12, background: '#fafafa' }}
      >
        <Descriptions.Item label="Mô tả ngắn">
          {isOngoing ? (
            <Text type="secondary">{course.shortDescription || '—'}</Text>
          ) : (
            <InlineEdit
              type="textarea"
              value={course.shortDescription}
              onSave={(v) => update('shortDescription', v)}
              placeholder="Nhập mô tả ngắn..."
            />
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Mô tả chi tiết">
          {isOngoing ? (
            <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {course.description || '—'}
            </Paragraph>
          ) : (
            <InlineEdit
              type="textarea"
              value={course.description}
              onSave={(v) => update('description', v)}
              placeholder="Nhập mô tả chi tiết..."
            />
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Kết quả đầu ra">
          {isOngoing ? (
            course.outcomes && course.outcomes.length > 0 ? (
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                {course.outcomes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <Text type="secondary">—</Text>
            )
          ) : (
            <InlineEdit
              type="textarea"
              value={(course.outcomes || []).join('\n')}
              onSave={(v) => {
                const arr = String(v || '')
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean);
                update('outcomes', arr);
              }}
              placeholder="Mỗi dòng 1 kết quả đầu ra..."
              formatDisplay={(v) => {
                const arr = String(v || '').split('\n').filter(Boolean);
                return arr.length > 0 ? (
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    {arr.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: '#bfbfbf' }}>Chưa có</span>
                );
              }}
            />
          )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default CourseOverviewForm;