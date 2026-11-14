import { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Select, Table, Tag, Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import StatsCard from '@/components/common/StatsCard';
import EnrollmentStatusTag from '@/components/enrollment/EnrollmentStatusTag';
import { ENROLLMENT_STATUS_LABEL } from '@/constants/enrollment';
import { enrollmentApi } from '@/services/api/enrollment';
import { showError } from '@/utils/errorHelper';
import type {
  EnrollmentResponse, EnrollmentStatus, EnrollmentSummaryResponse, EnrollmentType,
} from '@/services/types/enrollment';

const { Text } = Typography;

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  PENDING: ENROLLMENT_STATUS_LABEL.PENDING,
  ACTIVE: ENROLLMENT_STATUS_LABEL.ACTIVE,
  RESERVED: ENROLLMENT_STATUS_LABEL.RESERVED,
  TERMINATED: ENROLLMENT_STATUS_LABEL.TERMINATED,
  COMPLETED: ENROLLMENT_STATUS_LABEL.COMPLETED,
};

const TYPE_LABELS: Record<EnrollmentType, string> = {
  OFFLINE: 'Khóa Offline',
  ONLINE: 'Khóa Online',
};

export default function EnrollmentPage() {
  const [enrollmentRows, setEnrollmentRows] = useState<EnrollmentResponse[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | undefined>();
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType | undefined>();
  const [enrollmentPage, setEnrollmentPage] = useState(0);
  const [enrollmentPageSize, setEnrollmentPageSize] = useState(20);
  const [enrollmentTotal, setEnrollmentTotal] = useState(0);
  const [enrollmentSearchInput, setEnrollmentSearchInput] = useState('');
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [summary, setSummary] = useState<EnrollmentSummaryResponse | null>(null);

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const page = await enrollmentApi.search({
        page: enrollmentPage,
        size: enrollmentPageSize,
        type: enrollmentType,
        status: enrollmentStatus,
        search: enrollmentSearch || undefined,
        includeCompletionEligibility: true,
      });
      setEnrollmentRows(page.content ?? []);
      setEnrollmentTotal(page.totalElements ?? 0);
    } catch (err) {
      showError(err, 'Không tải được danh sách ghi danh');
    } finally {
      setLoadingEnrollments(false);
    }
  }, [enrollmentPage, enrollmentPageSize, enrollmentStatus, enrollmentType, enrollmentSearch]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await enrollmentApi.summary());
    } catch {
      toast.error('Không tải được tổng quan ghi danh');
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const enrollmentColumns: ColumnsType<EnrollmentResponse> = [
    {
      title: 'Mã GD',
      dataIndex: 'enrollmentId',
      width: 90,
      render: (id) => <Text strong>#{id}</Text>,
    },
    {
      title: 'Khóa học',
      dataIndex: 'courseTitle',
      render: (title, r) => (
        <div>
          {r.courseId ? (
            <Link to={`/admin/courses/${r.courseId}?tab=enrollments`} style={{ fontWeight: 600 }}>
              {title || `Khóa học #${r.courseId}`}
            </Link>
          ) : <Text>{title || '—'}</Text>}
        </div>
      ),
    },
    {
      title: 'Học viên',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {r.courseId && (r.studentId || r.accountId) ? (
              <Link
                to={`/admin/courses/${r.courseId}?tab=enrollments&status=${r.status}&${r.studentId ? `studentId=${r.studentId}` : `accountId=${r.accountId}`}`}
              >
                {r.studentName || (r.studentId ? `Học viên #${r.studentId}` : `Tài khoản #${r.accountId}`)}
              </Link>
            ) : (r.studentName || (r.studentId ? `Học viên #${r.studentId}` : (r.accountId ? `Tài khoản #${r.accountId}` : '—')))}
          </div>
          {r.studentCode && <Text type="secondary" style={{ fontSize: 12 }}>Mã: {r.studentCode} </Text>}
          {r.studentEmail && <div style={{ fontSize: 12, color: '#64748b' }}>{r.studentEmail}</div>}
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'enrollmentType',
      width: 100,
      render: (v) => <Tag color={v === 'ONLINE' ? 'blue' : 'green'}>{v}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (status: EnrollmentStatus) => <EnrollmentStatusTag status={status} />,
    },
  ];

  const selectEnrollmentStatus = (status?: EnrollmentStatus) => {
    setEnrollmentStatus(status);
    setEnrollmentPage(0);
  };

  const clearEnrollmentFilters = () => {
    setEnrollmentSearch('');
    setEnrollmentSearchInput('');
    setEnrollmentType(undefined);
    setEnrollmentPage(0);
  };

  const statusCounts: Record<EnrollmentStatus, number> = {
    PENDING: summary?.pending ?? 0,
    ACTIVE: summary?.active ?? 0,
    RESERVED: summary?.reserved ?? 0,
    TERMINATED: summary?.terminated ?? 0,
    COMPLETED: summary?.completed ?? 0,
  };
  const allEnrollmentCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const hasActiveFilters = Boolean(enrollmentSearch || enrollmentStatus || enrollmentType);

  return (
    <PageContainer>
      <PageHeader
        title="Danh sách ghi danh"
        subtitle="Theo dõi danh sách ghi danh toàn hệ thống theo trạng thái và khóa học."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatsCard
          title="Tất cả ghi danh"
          value={allEnrollmentCount}
          icon={<FileTextOutlined />}
          color="#2563eb"
          bgColor="#eff6ff"
          active={!enrollmentStatus}
          onClick={() => selectEnrollmentStatus(undefined)}
          tooltip="Nhấn để xem toàn bộ ghi danh"
        />
        <StatsCard
          title="Chờ khai giảng"
          value={statusCounts.PENDING}
          icon={<ClockCircleOutlined />}
          color="#f59e0b"
          bgColor="#fffbeb"
          active={enrollmentStatus === 'PENDING'}
          onClick={() => selectEnrollmentStatus(enrollmentStatus === 'PENDING' ? undefined : 'PENDING')}
          tooltip="Nhấn để lọc ghi danh chờ khai giảng"
        />
        <StatsCard
          title="Đang học"
          value={statusCounts.ACTIVE}
          icon={<PlayCircleOutlined />}
          color="#10b981"
          bgColor="#ecfdf5"
          active={enrollmentStatus === 'ACTIVE'}
          onClick={() => selectEnrollmentStatus(enrollmentStatus === 'ACTIVE' ? undefined : 'ACTIVE')}
          tooltip="Nhấn để lọc ghi danh đang học"
        />
        <StatsCard
          title="Bảo lưu"
          value={statusCounts.RESERVED}
          icon={<PauseCircleOutlined />}
          color="#1677ff"
          bgColor="#eff6ff"
          active={enrollmentStatus === 'RESERVED'}
          onClick={() => selectEnrollmentStatus(enrollmentStatus === 'RESERVED' ? undefined : 'RESERVED')}
          tooltip="Nhấn để lọc ghi danh đang bảo lưu"
        />
        <StatsCard
          title="Đã chấm dứt"
          value={statusCounts.TERMINATED}
          icon={<StopOutlined />}
          color="#64748b"
          bgColor="#f1f5f9"
          active={enrollmentStatus === 'TERMINATED'}
          onClick={() => selectEnrollmentStatus(enrollmentStatus === 'TERMINATED' ? undefined : 'TERMINATED')}
          tooltip="Nhấn để lọc ghi danh đã chấm dứt"
        />
        <StatsCard
          title="Hoàn thành"
          value={statusCounts.COMPLETED}
          icon={<CheckCircleOutlined />}
          color="#722ed1"
          bgColor="#f5f3ff"
          active={enrollmentStatus === 'COMPLETED'}
          onClick={() => selectEnrollmentStatus(enrollmentStatus === 'COMPLETED' ? undefined : 'COMPLETED')}
          tooltip="Nhấn để lọc ghi danh đã hoàn thành"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <Input.Search
          allowClear
          placeholder="Tìm học viên, mã học viên, khóa hoặc hóa đơn"
          style={{ width: 340 }}
          value={enrollmentSearchInput}
          onChange={(event) => {
            setEnrollmentSearchInput(event.target.value);
            if (!event.target.value) {
              setEnrollmentSearch('');
              setEnrollmentPage(0);
            }
          }}
          onSearch={(value) => {
            setEnrollmentSearch(value.trim());
            setEnrollmentPage(0);
          }}
        />
        <Select
          style={{ width: 200 }}
          value={enrollmentStatus ?? ''}
          onChange={(value) => selectEnrollmentStatus(value ? (value as EnrollmentStatus) : undefined)}
          options={[
            { value: '', label: 'Tất cả trạng thái' },
            ...(['PENDING', 'ACTIVE', 'RESERVED', 'TERMINATED', 'COMPLETED'] as EnrollmentStatus[])
              .map((value) => ({ value, label: STATUS_LABELS[value] })),
          ]}
        />
        <Select
          style={{ width: 180 }}
          value={enrollmentType ?? ''}
          onChange={(value) => {
            setEnrollmentType(value ? (value as EnrollmentType) : undefined);
            setEnrollmentPage(0);
          }}
          options={[
            { value: '', label: 'Tất cả hình thức' },
            ...(['OFFLINE', 'ONLINE'] as EnrollmentType[])
              .map((value) => ({ value, label: TYPE_LABELS[value] })),
          ]}
        />
        {hasActiveFilters && (
          <Button onClick={clearEnrollmentFilters}>Xoá lọc</Button>
        )}
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void Promise.all([loadEnrollments(), loadSummary()])}
        >
          Tải lại
        </Button>
      </div>

      <Table
        rowKey="enrollmentId"
        columns={enrollmentColumns}
        dataSource={enrollmentRows}
        loading={loadingEnrollments}
        scroll={{ x: 1050 }}
        pagination={{
          current: enrollmentPage + 1,
          pageSize: enrollmentPageSize,
          total: enrollmentTotal,
          showSizeChanger: true,
          onChange: (page, size) => {
            setEnrollmentPage(page - 1);
            setEnrollmentPageSize(size);
          },
        }}
      />
    </PageContainer>
  );
}
