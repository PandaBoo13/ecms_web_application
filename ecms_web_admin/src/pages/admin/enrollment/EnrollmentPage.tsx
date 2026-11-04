import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Input, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import EnrollmentStatusTag from '@/components/enrollment/EnrollmentStatusTag';
import { ENROLLMENT_STATUS_FLOW, ENROLLMENT_STATUS_LABEL } from '@/constants/enrollment';
import { courseApi } from '@/services/api/course';
import { enrollmentApi } from '@/services/api/enrollment';
import { showError } from '@/utils/errorHelper';
import type { CourseResponse } from '@/services/types/course';
import type {
  EnrollmentResponse, EnrollmentStatus,
  EnrollmentSummaryResponse, OfflineEnrollmentCandidate,
} from '@/services/types/enrollment';

const { Text } = Typography;

export default function EnrollmentPage() {
  const [enrollmentRows, setEnrollmentRows] = useState<EnrollmentResponse[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | undefined>();
  const [enrollmentPage, setEnrollmentPage] = useState(0);
  const [enrollmentPageSize, setEnrollmentPageSize] = useState(20);
  const [enrollmentTotal, setEnrollmentTotal] = useState(0);
  const [enrollmentSearchInput, setEnrollmentSearchInput] = useState('');
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [summary, setSummary] = useState<EnrollmentSummaryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const [filterCourses, setFilterCourses] = useState<CourseResponse[]>([]);
  const [filterCoursesLoading, setFilterCoursesLoading] = useState(false);
  const [filterCourseId, setFilterCourseId] = useState<number | undefined>();
  const [candidateRows, setCandidateRows] = useState<OfflineEnrollmentCandidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidatePage, setCandidatePage] = useState(0);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidateCourseId, setCandidateCourseId] = useState<number | undefined>();
  const [candidateSearchInput, setCandidateSearchInput] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [processingCandidates, setProcessingCandidates] = useState(false);


  const loadFilterCourses = useCallback(async () => {
    setFilterCoursesLoading(true);
    try {
      const page = await courseApi.search({ page: 0, size: 200 });
      setFilterCourses(page.content ?? []);
    } catch {
      toast.error('Không tải được danh sách khóa học');
    } finally {
      setFilterCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFilterCourses();
  }, [loadFilterCourses]);

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const page = await enrollmentApi.search({
        page: enrollmentPage,
        size: enrollmentPageSize,
        status: enrollmentStatus,
        courseId: filterCourseId,
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
  }, [enrollmentPage, enrollmentPageSize, enrollmentStatus, enrollmentSearch, filterCourseId]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const loadCandidates = useCallback(async () => {
    setCandidateLoading(true);
    try {
      const page = await enrollmentApi.offlineCandidates({
        courseId: candidateCourseId,
        search: candidateSearch || undefined,
        page: candidatePage,
        size: 20,
      });
      setCandidateRows(page.content ?? []);
      setCandidateTotal(page.totalElements ?? 0);
    } catch {
      toast.error('Không tải được danh sách chờ ghi danh OFFLINE');
    } finally {
      setCandidateLoading(false);
    }
  }, [candidateCourseId, candidatePage, candidateSearch]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

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

  const processCandidates = async (invoiceIds: number[]) => {
    if (invoiceIds.length === 0) return;
    if (invoiceIds.length > 100) {
      toast.error('Mỗi lần chỉ có thể xử lý tối đa 100 học viên');
      return;
    }
    setProcessingCandidates(true);
    try {
      const result = await enrollmentApi.createOfflineBatch(invoiceIds);
      setSelectedCandidateIds([]);
      if (result.enrolled > 0) toast.success(`Đã ghi danh ${result.enrolled} học viên`);
      if (result.failed > 0) {
        const firstError = result.results.find((item) => !item.success)?.message;
        toast.error(`${result.failed} trường hợp chưa ghi danh được${firstError ? `: ${firstError}` : ''}`);
      }
      await Promise.all([loadCandidates(), loadEnrollments(), loadSummary()]);
    } catch {
      toast.error('Không xử lý được danh sách đã chọn. Vui lòng tải lại và thử lại.');
    } finally {
      setProcessingCandidates(false);
    }
  };

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

  const candidateColumns: ColumnsType<OfflineEnrollmentCandidate> = [
    {
      title: 'Khóa học',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.courseTitle || `Khóa học #${row.courseId}`}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.courseStartDate ? `Khai giảng ${dayjs(row.courseStartDate).format('DD/MM/YYYY')}` : 'Chưa có ngày khai giảng'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Học viên',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.fullName || 'Chưa có tên'}</div>
          {row.studentCode && <Text type="secondary" style={{ fontSize: 12 }}>Mã: {row.studentCode}</Text>}
          {(row.email || row.phone) && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {[row.email, row.phone].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Hồ sơ học viên',
      dataIndex: 'hasStudentProfile',
      width: 160,
      render: (_ready: boolean, row) => row.hasStudentProfile
        ? <Tag color="green">Đã có</Tag>
        : row.hasLead
          ? <Tag color="gold">Tạo từ Lead khi ghi danh</Tag>
          : <Tag color="red">Cần tạo hồ sơ Student</Tag>,
    },
    {
      title: 'Hóa đơn',
      render: (_, row) => (
        <div>
          <div>{row.invoiceCode}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {Number(row.amount).toLocaleString('vi-VN')}đ
            {row.paidAt ? ` · ${dayjs(row.paidAt).format('DD/MM/YYYY')}` : ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'Trạng thái sau ghi danh',
      width: 170,
      render: (_, row) => {
        const active = row.courseStartDate != null
          && !dayjs(row.courseStartDate).isAfter(dayjs(), 'day');
        return <EnrollmentStatusTag status={active ? 'ACTIVE' : 'PENDING'} />;
      },
    },
  ];

  const selectEnrollmentStatus = (status: EnrollmentStatus) => {
    setEnrollmentStatus(status);
    setEnrollmentPage(0);
    setActiveTab(status);
  };

  const showOfflineQueue = () => {
    setActiveTab('pending-offline');
  };

  const clearEnrollmentFilters = () => {
    setFilterCourseId(undefined);
    setEnrollmentSearch('');
    setEnrollmentSearchInput('');
    setEnrollmentPage(0);
  };

  const cardStyle = (active: boolean) => active
    ? { borderColor: '#1677ff', boxShadow: '0 0 0 2px rgba(22, 119, 255, 0.15)' }
    : undefined;

  const renderEnrollmentList = () => (
    <>
      <Space className="mb-4" wrap>
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
          allowClear
          showSearch
          loading={filterCoursesLoading}
          placeholder="Lọc theo khóa học"
          style={{ width: 280 }}
          optionFilterProp="label"
          value={filterCourseId}
          onChange={(value) => { setFilterCourseId(value); setEnrollmentPage(0); }}
          options={filterCourses.map((course) => ({
            value: course.id,
            label: `${course.code} — ${course.title}`,
          }))}
        />
        <Button onClick={clearEnrollmentFilters}>Xoá lọc</Button>
        <Button onClick={() => void Promise.all([loadEnrollments(), loadSummary()])}>Tải lại</Button>
      </Space>
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
    </>
  );

  const statusTabCounts: Record<EnrollmentStatus, number> = {
    PENDING: summary?.pending ?? 0,
    ACTIVE: summary?.active ?? 0,
    RESERVED: summary?.reserved ?? 0,
    TERMINATED: summary?.terminated ?? 0,
    COMPLETED: summary?.completed ?? 0,
  };
  const allEnrollmentCount = Object.values(statusTabCounts).reduce((sum, count) => sum + count, 0);
  const statusTabLabels: Record<EnrollmentStatus, string> = {
    PENDING: ENROLLMENT_STATUS_LABEL.PENDING,
    ACTIVE: ENROLLMENT_STATUS_LABEL.ACTIVE,
    RESERVED: ENROLLMENT_STATUS_LABEL.RESERVED,
    TERMINATED: 'Đã chấm dứt',
    COMPLETED: ENROLLMENT_STATUS_LABEL.COMPLETED,
  };

  const openStatusTab = (key: string) => {
    setActiveTab(key);
    if (key !== 'pending-offline') {
      setEnrollmentStatus(key === 'ALL' ? undefined : key as EnrollmentStatus);
      setEnrollmentPage(0);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Danh sách ghi danh"
        subtitle="Theo dõi danh sách ghi danh toàn hệ thống theo trạng thái và khóa học."
      />
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Hóa đơn OFFLINE thanh toán thành công sẽ tự động tạo ghi danh."
        description={`Các trường hợp thanh toán thành công nhưng chưa tạo được ghi danh sẽ xuất hiện trong mục Chờ ghi danh. Trạng thái: ${ENROLLMENT_STATUS_FLOW}.`}
      />

      <Row gutter={[12, 12]} className="mb-5">
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable onClick={showOfflineQueue} style={cardStyle(activeTab === 'pending-offline')}>
            <Statistic title="Chờ ghi danh" value={summary?.offlineAwaitingEnrollment ?? candidateTotal} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            hoverable
            onClick={() => selectEnrollmentStatus('PENDING')}
            style={cardStyle(activeTab === 'PENDING')}
          >
            <Statistic title="Chờ khai giảng" value={summary?.pending ?? 0} valueStyle={{ color: '#d48806' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            hoverable
            onClick={() => selectEnrollmentStatus('ACTIVE')}
            style={cardStyle(activeTab === 'ACTIVE')}
          >
            <Statistic title="Đang học" value={summary?.active ?? 0} valueStyle={{ color: '#389e0d' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            hoverable
            onClick={() => selectEnrollmentStatus('RESERVED')}
            style={cardStyle(activeTab === 'RESERVED')}
          >
            <Statistic title="Bảo lưu" value={summary?.reserved ?? 0} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            hoverable
            onClick={() => selectEnrollmentStatus('TERMINATED')}
            style={cardStyle(activeTab === 'TERMINATED')}
          >
            <Statistic title="Đã chấm dứt" value={summary?.terminated ?? 0} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            hoverable
            onClick={() => selectEnrollmentStatus('COMPLETED')}
            style={cardStyle(activeTab === 'COMPLETED')}
          >
            <Statistic title="Hoàn thành" value={summary?.completed ?? 0} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={openStatusTab}
        items={[
          {
            key: 'pending-offline',
            label: `Chờ ghi danh (${candidateTotal})`,
            children: (
              <>
                <Alert
                  className="mb-4"
                  type="info"
                  showIcon
                  message="Danh sách hóa đơn đã thanh toán nhưng chưa có ghi danh."
                  description="Hệ thống tự ghi danh sau thanh toán. Dùng màn hình này để xử lý các trường hợp lỗi hoặc dữ liệu cũ; có thể chọn tối đa 100 học viên mỗi lần."
                />
                <Space className="mb-4" wrap>
                  <Input.Search
                    allowClear
                    placeholder="Tìm học viên, mã học viên hoặc hóa đơn"
                    style={{ width: 320 }}
                    value={candidateSearchInput}
                    onChange={(event) => {
                      setCandidateSearchInput(event.target.value);
                      if (!event.target.value) {
                        setCandidateSearch('');
                        setCandidatePage(0);
                        setSelectedCandidateIds([]);
                      }
                    }}
                    onSearch={(value) => {
                      setCandidateSearch(value.trim());
                      setCandidatePage(0);
                      setSelectedCandidateIds([]);
                    }}
                    disabled={processingCandidates}
                  />
                  <Select
                    allowClear
                    showSearch
                    loading={filterCoursesLoading}
                    placeholder="Lọc theo khóa OFFLINE"
                    style={{ width: 300 }}
                    optionFilterProp="label"
                    value={candidateCourseId}
                    disabled={processingCandidates}
                    onChange={(value) => {
                      setCandidateCourseId(value);
                      setCandidatePage(0);
                      setSelectedCandidateIds([]);
                    }}
                    options={filterCourses.filter((course) => course.courseType === 'OFFLINE').map((course) => ({
                      value: course.id,
                      label: `${course.code} — ${course.title}`,
                    }))}
                  />
                  <Button
                    type="primary"
                    disabled={selectedCandidateIds.length === 0 || selectedCandidateIds.length > 100}
                    loading={processingCandidates}
                    onClick={() => void processCandidates(selectedCandidateIds)}
                  >
                    {selectedCandidateIds.length > 100
                      ? `Đã chọn ${selectedCandidateIds.length} — tối đa 100`
                      : `Ghi danh đã chọn (${selectedCandidateIds.length})`}
                  </Button>
                  <Button onClick={() => void Promise.all([loadCandidates(), loadSummary()])}>Tải lại</Button>
                </Space>
                <Table
                  rowKey="invoiceId"
                  rowSelection={{
                    selectedRowKeys: selectedCandidateIds,
                    onChange: (keys) => setSelectedCandidateIds(keys as number[]),
                    getCheckboxProps: (row) => ({
                      disabled: processingCandidates || (!row.hasStudentProfile && !row.hasLead),
                      title: !row.hasStudentProfile && !row.hasLead
                        ? 'Cần tạo hồ sơ Student trước khi ghi danh'
                        : undefined,
                    }),
                  }}
                  columns={candidateColumns}
                  dataSource={candidateRows}
                  loading={candidateLoading}
                  pagination={{
                    current: candidatePage + 1,
                    pageSize: 20,
                    total: candidateTotal,
                    showSizeChanger: false,
                    onChange: (page) => setCandidatePage(page - 1),
                  }}
                  locale={{ emptyText: 'Không có hóa đơn OFFLINE nào đang chờ ghi danh.' }}
                  scroll={{ x: 1100 }}
                />
              </>
            ),
          },
          {
            key: 'ALL',
            label: `Tất cả (${allEnrollmentCount})`,
            children: renderEnrollmentList(),
          },
          ...(['PENDING', 'ACTIVE', 'RESERVED', 'TERMINATED', 'COMPLETED'] as EnrollmentStatus[]).map((status) => ({
            key: status,
            label: `${statusTabLabels[status]} (${statusTabCounts[status]})`,
            children: renderEnrollmentList(),
          })),
        ]}
      />

    </PageContainer>
  );
}
