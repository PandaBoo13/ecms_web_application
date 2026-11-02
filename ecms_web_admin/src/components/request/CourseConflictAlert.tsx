import { useEffect, useState } from 'react';
import { Alert, Spin, Table, Tag, Typography } from 'antd';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from '@/hooks/useTranslation';
import { requestApi } from '@/services/api/request/requestApi';
import {
  getConflictTypesLabel,
  formatScheduleDays,
  type CourseConflictDetail,
  type RequestConflictPreviewResponse,
} from '@/services/types/request/request';

interface Props {
  requestId: number;
  requestType: string;
  onConflictChange?: (hasConflicts: boolean) => void;
}

const CourseConflictAlert = ({
  requestId,
  requestType,
  onConflictChange,
}: Props) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RequestConflictPreviewResponse | null>(null);

  useEffect(() => {
    // Chỉ chạy cho COURSE_REVIEW
    if (requestType !== 'COURSE_REVIEW') {
      onConflictChange?.(false);
      return;
    }

    setLoading(true);
    requestApi
      .previewCourseConflicts(requestId)
      .then((res) => {
        setData(res);
        onConflictChange?.(res.hasConflicts);
      })
      .catch((err) => {
        console.warn('[CourseConflictAlert] preview failed:', err);
        setData(null);
        onConflictChange?.(false);
      })
      .finally(() => setLoading(false));
  }, [requestId, requestType, onConflictChange]);

  if (requestType !== 'COURSE_REVIEW') return null;

  if (loading) {
    return (
      <Alert
        type="info"
        icon={<Spin size="small" />}
        message={t('request.conflict.loading', 'Đang kiểm tra xung đột...')}
        style={{ marginBottom: 16 }}
      />
    );
  }

  if (!data) return null;

  if (!data.hasConflicts) {
    return (
      <Alert
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        message={t(
          'request.conflict.noneMessage',
          'Không phát hiện trùng lịch với khóa học khác',
        )}
        style={{ marginBottom: 16 }}
      />
    );
  }

  const columns = [
    {
      title: t('request.conflict.column.course', 'Khóa học'),
      dataIndex: 'conflictingCourseTitle',
      key: 'course',
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: t('request.conflict.column.type', 'Loại'),
      dataIndex: 'conflictTypes',
      key: 'types',
      render: (types: CourseConflictDetail['conflictTypes']) => (
        <>
          {types.map((tp) => (
            <Tag
              key={tp}
              color={tp === 'TEACHER' ? 'orange' : 'red'}
              style={{ marginRight: 4 }}
            >
              {t(`request.conflict.type.${tp}`, getConflictTypesLabel([tp]))}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: t('request.conflict.column.teacher', 'Giảng viên'),
      dataIndex: 'conflictingTeacherName',
      key: 'teacher',
      render: (v?: string) => v || '—',
    },
    {
      title: t('request.conflict.column.room', 'Phòng'),
      dataIndex: 'conflictingRoomName',
      key: 'room',
      render: (v?: string) => v || '—',
    },
    {
      title: t('request.conflict.column.schedule', 'Thời gian'),
      key: 'schedule',
      render: (_: unknown, rec: CourseConflictDetail) => (
        <div style={{ fontSize: 12 }}>
          <div>{formatScheduleDays(rec.scheduleDays)}</div>
          <div style={{ color: '#8c8c8c' }}>
            {rec.sessionStartTime?.slice(0, 5)} - {rec.sessionEndTime?.slice(0, 5)}
          </div>
        </div>
      ),
    },
  ];

  return (
    <Alert
      type="warning"
      showIcon
      icon={<WarningOutlined />}
      style={{ marginBottom: 16 }}
      message={
        <Typography.Text strong>
          {t('request.conflict.title', 'Cảnh báo trùng lịch')}
          {' — '}
          {t(
            'request.conflict.hasConflicts',
            `Phát hiện ${data.conflictCount} khóa học trùng lịch`,
          ).replace('{count}', String(data.conflictCount))}
        </Typography.Text>
      }
      description={
        <>
          <Typography.Paragraph style={{ marginBottom: 8, fontSize: 13 }}>
            {t(
              'request.conflict.instruction',
              'Vui lòng điều chỉnh lịch (giảng viên/phòng/giờ) trước khi duyệt',
            )}
          </Typography.Paragraph>
          <Table
            size="small"
            rowKey="conflictingCourseId"
            columns={columns}
            dataSource={data.conflicts}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </>
      }
    />
  );
};

export default CourseConflictAlert;