import { useEffect, useMemo, useState } from 'react';
import { Card, Descriptions, Tag, Typography, Space, Button, Modal } from 'antd';
import { SaveOutlined, UndoOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import ThumbnailUpload from '@/components/common/ThumbnailUpload';
import InlineDraftField from '@/components/common/InlineDraftField';

import { courseApi, categoryApi, roomApi } from '@/services/api/courses';
import type {
  CourseDetailResponse,
  CourseUpdateRequest,
  CategoryResponse,
  RoomResponse,
} from '@/services/types/course';

const { Text, Paragraph } = Typography;

interface Props {
  course: CourseDetailResponse;
  /** Truyền handler này → bật chế độ sửa inline + nút Lưu */
  onRefresh?: () => void;
}

/** Các field cho phép sửa inline qua PUT /api/courses/:id */
type EditableField =
  | 'title'
  | 'shortDescription'
  | 'description'
  | 'thumbnailUrl'
  | 'price'
  | 'oldPrice'
  | 'isFree'
  | 'learningMode'
  | 'categoryId'
  | 'roomId'
  | 'outcomes';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const learningModeLabel = (mode?: string) =>
  mode === 'SEQUENTIAL' ? 'Tuần tự' : mode === 'AUTONOMOUS' ? 'Tự do' : '—';

/** So sánh 2 giá trị, kể cả mảng primitive */
const valuesEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => valuesEqual(v, b[i]));
  }
  return false;
};

const CourseOverviewCard = ({ course, onRefresh }: Props) => {
  const canEdit = Boolean(onRefresh);

  const [draft, setDraft] = useState<Partial<CourseUpdateRequest>>({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);

  // Reset draft khi đổi khóa học
  useEffect(() => {
    setDraft({});
  }, [course.id]);

  // Load categories + rooms cho select fields (chỉ khi ở chế độ edit)
  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    categoryApi
      .list({ page: 0, size: 9999, sortBy: 'name', sortDir: 'asc' })
      .then((res) => {
        if (!cancelled) setCategories(res.content);
      })
      .catch(() => {});
    roomApi
      .listActive()
      .then((res) => {
        if (!cancelled) setRooms(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  const isDirty = Object.keys(draft).length > 0;
  const dirtyCount = Object.keys(draft).length;

  /** Giá trị hiệu lực: draft nếu đã sửa, ngược lại là giá trị gốc */
  const val = (field: EditableField): any => {
    if (field in draft) return draft[field];
    return (course as unknown as Record<string, unknown>)[field];
  };

  const isFieldDirty = (field: EditableField) => field in draft;

  const commitField = (field: EditableField, value: unknown) => {
    const original = (course as unknown as Record<string, unknown>)[field];
    if (valuesEqual(value, original)) {
      setDraft((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      setDraft((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await courseApi.update(course.id, draft);
      toast.success(`Đã lưu ${dirtyCount} thay đổi`);
      setDraft({});
      onRefresh?.();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!isDirty) return;
    Modal.confirm({
      title: 'Huỷ các thay đổi?',
      icon: <ExclamationCircleOutlined />,
      content: `${dirtyCount} thay đổi chưa lưu sẽ bị mất.`,
      okText: 'Huỷ thay đổi',
      cancelText: 'Ở lại',
      okButtonProps: { danger: true },
      onOk: () => {
        setDraft({});
        toast.success('Đã huỷ thay đổi');
      },
    });
  };

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id })),
    [categories],
  );

  const roomOptions = useMemo(
    () => rooms.map((r) => ({ label: r.name, value: r.id })),
    [rooms],
  );

  const learningModeOptions = [
    { label: 'Tuần tự', value: 'SEQUENTIAL' },
    { label: 'Tự do', value: 'AUTONOMOUS' },
  ];

  return (
    <Card
      title={
        <Space size={8}>
          <span>Thông tin khóa học</span>
          {canEdit && isDirty && (
            <Tag color="orange" style={{ margin: 0 }}>
              {dirtyCount} thay đổi chưa lưu
            </Tag>
          )}
        </Space>
      }
      extra={
        canEdit && isDirty ? (
          <Space>
            <Button icon={<UndoOutlined />} onClick={handleDiscard} disabled={saving}>
              Huỷ
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              Lưu thay đổi ({dirtyCount})
            </Button>
          </Space>
        ) : canEdit ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Nhấp đúp vào từng dòng để sửa
          </Text>
        ) : null
      }
    >
      {/* ── Thumbnail ── */}
      {canEdit && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#0f172a' }}>
            Ảnh thumbnail khóa học
            {isFieldDirty('thumbnailUrl') && (
              <Tag color="orange" style={{ marginLeft: 8 }}>
                Chưa lưu
              </Tag>
            )}
          </div>
          <ThumbnailUpload
            value={(val('thumbnailUrl') as string | undefined) || undefined}
            onChange={(url) => commitField('thumbnailUrl', url)}
            width={320}
            height={180}
          />
        </div>
      )}

      <Descriptions
        column={{ xs: 1, sm: 2, md: 2, lg: 3 }}
        bordered
        size="middle"
      >
        <Descriptions.Item label="Tiêu đề" span={2}>
          <InlineDraftField
            value={val('title')}
            onCommit={(v) => commitField('title', v)}
            disabled={!canEdit}
            isDirty={isFieldDirty('title')}
            required
            placeholder="Tiêu đề khóa học..."
          />
        </Descriptions.Item>

        <Descriptions.Item label="Mã khóa">
          <Text code>{course.code}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Display code">
          <Text code>{course.displayCode}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Slug">
          <Text code>{course.slug}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Loại khóa">
          <StatusTag status={course.courseType} />
        </Descriptions.Item>

        <Descriptions.Item label="Trạng thái">
          <StatusTag status={course.status} />
        </Descriptions.Item>

        <Descriptions.Item label="Trạng thái lớp">
          {course.classStatus ? <StatusTag status={course.classStatus} /> : <Tag>—</Tag>}
        </Descriptions.Item>

        <Descriptions.Item label="Miễn phí">
          <InlineDraftField
            type="switch"
            value={val('isFree')}
            onCommit={(v) => commitField('isFree', v)}
            disabled={!canEdit}
            isDirty={isFieldDirty('isFree')}
            formatDisplay={(v) => (v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>)}
          />
        </Descriptions.Item>

        {!val('isFree') && (
          <>
            <Descriptions.Item label="Giá">
              <InlineDraftField
                type="number"
                value={val('price')}
                onCommit={(v) => commitField('price', v)}
                disabled={!canEdit}
                isDirty={isFieldDirty('price')}
                formatDisplay={(v) => <MoneyDisplay value={v as number} strong />}
                min={0}
              />
            </Descriptions.Item>

            <Descriptions.Item label="Giá cũ">
              <InlineDraftField
                type="number"
                value={val('oldPrice')}
                onCommit={(v) => commitField('oldPrice', v)}
                disabled={!canEdit}
                isDirty={isFieldDirty('oldPrice')}
                formatDisplay={(v) =>
                  v ? <MoneyDisplay value={v as number} showFree={false} /> : <Text type="secondary">—</Text>
                }
                min={0}
              />
            </Descriptions.Item>
          </>
        )}

        <Descriptions.Item label="Learning mode">
          <InlineDraftField
            type="select"
            value={val('learningMode')}
            options={learningModeOptions}
            onCommit={(v) => commitField('learningMode', v)}
            disabled={!canEdit}
            isDirty={isFieldDirty('learningMode')}
            allowClear
            formatDisplay={(v) =>
              v ? (
                <Tag color={v === 'SEQUENTIAL' ? 'blue' : 'cyan'}>
                  {learningModeLabel(v as string)}
                </Tag>
              ) : (
                <Text type="secondary">—</Text>
              )
            }
          />
        </Descriptions.Item>

        <Descriptions.Item label="Danh mục">
          <InlineDraftField
            type="select"
            value={val('categoryId')}
            options={categoryOptions}
            onCommit={(v) => commitField('categoryId', v)}
            disabled={!canEdit}
            isDirty={isFieldDirty('categoryId')}
            allowClear
            formatDisplay={(v) => {
              const cat = categories.find((c) => c.id === v);
              return cat?.name || course.categoryName || <Text type="secondary">Chưa gán</Text>;
            }}
          />
        </Descriptions.Item>

        <Descriptions.Item label="Phòng">
          <InlineDraftField
            type="select"
            value={val('roomId')}
            options={roomOptions}
            onCommit={(v) => commitField('roomId', v)}
            disabled={!canEdit}
            isDirty={isFieldDirty('roomId')}
            allowClear
            formatDisplay={(v) => {
              const room = rooms.find((r) => r.id === v);
              return room?.name || course.roomName || <Text type="secondary">—</Text>;
            }}
          />
        </Descriptions.Item>

        <Descriptions.Item label="Giảng viên">
          {course.teacherName || <Text type="secondary">Chưa gán</Text>}
        </Descriptions.Item>

        <Descriptions.Item label="Progress type">
          <Tag color="geekblue">{course.progressType}</Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Phòng được phép">
          {course.allowedRoomIds && course.allowedRoomIds.length > 0 ? (
            <Space size={4} wrap>
              {course.allowedRoomIds.map((rid) => (
                <Tag key={rid}>#{rid}</Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">Tất cả</Text>
          )}
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

        <Descriptions.Item label="Mô tả ngắn" span={3}>
          <InlineDraftField
            type="textarea"
            value={val('shortDescription')}
            onCommit={(v) => commitField('shortDescription', v)}
            disabled={!canEdit}
            isDirty={isFieldDirty('shortDescription')}
            rows={2}
            placeholder="Mô tả ngắn về khóa học..."
            formatDisplay={(v) =>
              v ? <span>{v as string}</span> : <Text type="secondary">—</Text>
            }
          />
        </Descriptions.Item>

        <Descriptions.Item label="Mô tả đầy đủ" span={3}>
          <InlineDraftField
            type="textarea"
            value={val('description')}
            onCommit={(v) => commitField('description', v)}
            disabled={!canEdit}
            isDirty={isFieldDirty('description')}
            rows={4}
            placeholder="Mô tả đầy đủ..."
            formatDisplay={(v) =>
              v ? (
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {v as string}
                </Paragraph>
              ) : (
                <Text type="secondary">—</Text>
              )
            }
          />
        </Descriptions.Item>

        <Descriptions.Item label="Kết quả đầu ra" span={3}>
          <InlineDraftField
            type="textarea"
            value={
              isFieldDirty('outcomes')
                ? ((draft.outcomes as string[] | undefined) || []).join('\n')
                : (course.outcomes || []).join('\n')
            }
            onCommit={(v) => {
              const arr = String(v || '')
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
              commitField('outcomes', arr);
            }}
            disabled={!canEdit}
            isDirty={isFieldDirty('outcomes')}
            rows={4}
            placeholder="Mỗi dòng 1 kết quả đầu ra..."
            formatDisplay={(v) => {
              const arr = String(v || '')
                .split('\n')
                .filter(Boolean);
              return arr.length > 0 ? (
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  {arr.map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">—</Text>
              );
            }}
          />
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default CourseOverviewCard;