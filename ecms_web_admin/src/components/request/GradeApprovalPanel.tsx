import { useMemo } from 'react';
import { Alert, Badge, Descriptions, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileProtectOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { RequestDetailResponse } from '@/services/types/request/request';

const { Text, Title } = Typography;

// ─── Kiểu dữ liệu payload snapshot điểm ───────────────────────────────────
interface GradeSnapshot {
  enrollmentId: number;
  studentCode?: string;
  studentName?: string;
  finalScore?: number | null;
  passScore?: number;
  absenceCount?: number;
  totalSessions?: number;
  maxAbsencePercent?: number;
  passed?: boolean;
  note?: string | null;
}

interface GradeApprovalPayload {
  courseId?: number;
  courseTitle?: string;
  courseCode?: string;
  submittedAt?: string;
  submittedByName?: string;
  passScore?: number;
  maxAbsencePercent?: number;
  totalStudents?: number;
  passedCount?: number;
  failedCount?: number;
  grades?: GradeSnapshot[];
}

interface Props {
  request: RequestDetailResponse;
}

const isRowPassed = (row: GradeSnapshot, passScore: number, maxAbsencePercent: number) => {
  if (typeof row.passed === 'boolean') return row.passed;
  if (row.finalScore == null) return false;
  const absencePercent = row.totalSessions
    ? ((row.absenceCount ?? 0) / row.totalSessions) * 100
    : 0;
  return row.finalScore >= passScore && absencePercent <= maxAbsencePercent;
};

/**
 * Panel hiển thị chi tiết bảng điểm trong Drawer khi loại yêu cầu là COURSE_GRADE_APPROVAL.
 */
const GradeApprovalPanel = ({ request }: Props) => {
  const payload = request.payload as GradeApprovalPayload | undefined;

  const grades: GradeSnapshot[] = useMemo(
    () => payload?.grades ?? [],
    [payload],
  );

  const passScore = payload?.passScore ?? 5.0;
  const maxAbsencePercent = payload?.maxAbsencePercent ?? 25;

  const title =
    request.status === 'APPROVED'
      ? 'Bảng điểm đã duyệt & công bố'
      : request.status === 'PENDING'
        ? 'Bảng điểm chờ duyệt'
        : 'Bảng điểm';

  // Tính lại thống kê client-side nếu backend chưa cung cấp sẵn
  const stats = useMemo(() => {
    if (!grades.length) return { passed: 0, failed: 0, noScore: 0 };
    let passed = 0, failed = 0, noScore = 0;
    for (const g of grades) {
      if (g.finalScore == null) { noScore++; continue; }
      if (isRowPassed(g, passScore, maxAbsencePercent)) passed++;
      else failed++;
    }
    return { passed, failed, noScore };
  }, [grades, passScore, maxAbsencePercent]);

  const columns: ColumnsType<GradeSnapshot> = [
    {
      title: 'Mã HV',
      dataIndex: 'studentCode',
      width: 130,
      render: (v: string) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {v || '—'}
        </span>
      ),
    },
    {
      title: 'Học viên',
      dataIndex: 'studentName',
      ellipsis: true,
      render: (v: string) => <Text strong>{v || '—'}</Text>,
    },
    {
      title: 'Điểm cuối khóa',
      dataIndex: 'finalScore',
      width: 130,
      align: 'center',
      render: (score: number | null | undefined, row) => {
        if (score == null) return <Tag color="orange">Chưa có điểm</Tag>;
        const passed = isRowPassed(row, passScore, maxAbsencePercent);
        return (
          <Tag
            color={passed ? 'success' : 'error'}
            icon={passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          >
            {score.toFixed(1)}
          </Tag>
        );
      },
    },
    {
      title: 'Vắng / Tổng',
      width: 110,
      align: 'center',
      render: (_, row) => {
        const absence = row.absenceCount ?? 0;
        const total = row.totalSessions ?? 0;
        const percent = total > 0 ? (absence / total) * 100 : 0;
        const over = percent > maxAbsencePercent;
        return (
          <span className={over ? 'text-red-600 font-semibold' : 'text-slate-600'}>
            {absence}/{total}
            {over && <span className="ml-1 text-xs">(Quá {maxAbsencePercent}%)</span>}
          </span>
        );
      },
    },
    {
      title: 'Kết quả dự kiến',
      width: 170,
      align: 'center',
      render: (_, row) => {
        if (row.finalScore == null)
          return <Tag icon={<QuestionCircleOutlined />} color="warning">Chưa đủ ĐK</Tag>;
        const passed = isRowPassed(row, passScore, maxAbsencePercent);
        return (
          <div>
            {passed
              ? <Tag color="success" icon={<CheckCircleOutlined />}>Hoàn thành (Đạt)</Tag>
              : <Tag color="error" icon={<CloseCircleOutlined />}>Hoàn thành (Không đạt)</Tag>}
            {!passed && row.note && (
              <div className="text-[11px] text-slate-500 mt-1">{row.note}</div>
            )}
          </div>
        );
      },
    },
  ];

  if (!payload) {
    return (
      <Alert
        type="warning"
        message="Không tìm thấy dữ liệu bảng điểm trong yêu cầu này."
        style={{ marginTop: 16 }}
      />
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <FileProtectOutlined style={{ color: '#6366f1', fontSize: 18 }} />
        <Title level={5} style={{ margin: 0, color: '#6366f1' }}>
          {title}
        </Title>
      </div>

      {/* Thông tin khóa học */}
      <Descriptions
        bordered
        size="small"
        column={2}
        style={{ marginBottom: 16 }}
      >
        {payload.courseTitle && (
          <Descriptions.Item label="Khóa học" span={2}>
            <Text strong>{payload.courseTitle}</Text>
            {payload.courseCode && (
              <Text type="secondary" className="ml-2 text-xs">
                ({payload.courseCode})
              </Text>
            )}
          </Descriptions.Item>
        )}
        {payload.submittedByName && (
          <Descriptions.Item label="Người gửi duyệt">
            {payload.submittedByName}
          </Descriptions.Item>
        )}
        {payload.submittedAt && (
          <Descriptions.Item label="Gửi lúc">
            {new Date(payload.submittedAt).toLocaleString('vi-VN')}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Điểm chuẩn đạt">
          <Tag color="blue">≥ {passScore}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Vắng tối đa">
          <Tag color="blue">≤ {maxAbsencePercent}%</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Dự kiến Đạt">
          <Badge count={stats.passed} color="#22c55e" showZero />
          <Text type="secondary" className="ml-2 text-xs">học viên</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Dự kiến Không đạt">
          <Badge count={stats.failed} color="#ef4444" showZero />
          <Text type="secondary" className="ml-2 text-xs">học viên</Text>
        </Descriptions.Item>
        {stats.noScore > 0 && (
          <Descriptions.Item label="Chưa có điểm" span={2}>
            <Badge count={stats.noScore} color="#f59e0b" showZero />
            <Text type="secondary" className="ml-2 text-xs">học viên</Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Bảng điểm chi tiết */}
      {grades.length > 0 ? (
        <Table<GradeSnapshot>
          rowKey="enrollmentId"
          size="small"
          columns={columns}
          dataSource={grades}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: 'Không có dữ liệu điểm.' }}
          scroll={{ x: 600 }}
        />
      ) : (
        <Alert
          type="info"
          message="Yêu cầu này được tạo trước khi bật chụp snapshot bảng điểm."
          description="Hãy từ chối yêu cầu và để giảng viên gửi duyệt lại; bảng điểm chi tiết sẽ hiện ở yêu cầu mới."
        />
      )}
    </div>
  );
};

export default GradeApprovalPanel;
