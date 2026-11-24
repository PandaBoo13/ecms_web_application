// src/pages/instructor/MyCoursesPage.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Select,
  Tooltip,
  Popconfirm,
  Image,
  Tag,
  TreeSelect,
  Row,
  Col,
  Tabs,
  DatePicker,
  Table,
  Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import StatsCard from '@/components/common/StatsCard';

import { courseApi, categoryApi, sessionApi } from '@/services/api/course';
import { useAuth } from '@/hooks/useAuth';
import type { CourseResponse, CategoryResponse } from '@/services/types/course';

const { RangePicker } = DatePicker;

const THUMBNAIL_FALLBACK =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2NCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSIzMiIgeT0iMjQiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiPk5vIGltZzwvdGV4dD48L3N2Zz4=';

interface CourseStats {
  total: number;
  published: number;
  pending: number;
  draft: number;
}

interface CategoryTreeNode {
  title: string;
  value: number;
  key: number;
  children?: CategoryTreeNode[];
}

interface ScheduleSessionItem {
  id: number;
  courseId?: number;
  courseTitle?: string;
  courseCode?: string;
  title?: string;
  startTime: string;
  endTime: string;
  roomName?: string;
  status: string;
  substituteTeacherId?: number | null;
}

const extractErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.message || fallback;
};

// ══════════════════════════════════════════════════════════════
// COMPONENT: LỊCH GIẢNG DẠY (TAB 2)
// ══════════════════════════════════════════════════════════════
const MyScheduleTab = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<ScheduleSessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs().add(30, 'day'),
  ]);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sessionApi.getMySchedule({
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
      });
      setData((res as ScheduleSessionItem[]) || []);
    } catch {
      toast.error('Không thể tải lịch giảng dạy');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Lọc và sắp xếp tăng dần theo thời gian bắt đầu
  const filteredData = useMemo(() => {
    const result = statusFilter
      ? data.filter((item) => item.status === statusFilter)
      : [...data];
    return result.sort(
      (a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf(),
    );
  }, [data, statusFilter]);

  const columns: ColumnsType<ScheduleSessionItem> = useMemo(
    () => [
      {
        title: 'Thời gian',
        key: 'time',
        width: 210,
        render: (_, record) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-[13.5px] text-blue-600">
              {dayjs(record.startTime).format('DD/MM/YYYY')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ClockCircleOutlined className="text-[11px] text-slate-400" />
              {dayjs(record.startTime).format('HH:mm')} –{' '}
              {dayjs(record.endTime).format('HH:mm')}
            </span>
          </div>
        ),
      },
      {
        title: 'Khóa học / Buổi học',
        key: 'course',
        render: (_, record) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-semibold text-[13.5px] text-slate-800 truncate">
              {record.courseTitle || record.title || '—'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {record.courseCode && (
                <span className="font-mono text-xs text-slate-400">
                  {record.courseCode}
                </span>
              )}
              {record.title && record.courseTitle && (
                <span className="text-xs text-slate-500 truncate">
                  • {record.title}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        title: 'Vai trò',
        key: 'role',
        width: 130,
        align: 'center',
        render: (_, record) => {
          const isSubstitute = Boolean(record.substituteTeacherId);
          return isSubstitute ? (
            <Tag color="warning" className="!m-0 !rounded-md !font-medium">
              Dạy thay
            </Tag>
          ) : (
            <Tag color="processing" className="!m-0 !rounded-md !font-medium">
              GV chính
            </Tag>
          );
        },
      },
      {
        title: 'Phòng học',
        dataIndex: 'roomName',
        key: 'roomName',
        width: 165,
        render: (v?: string) =>
          v ? (
            <Tag className="!m-0 !rounded-md !bg-slate-50 !border-slate-200 !text-slate-700 !font-medium">
              {v}
            </Tag>
          ) : (
            <span className="text-xs text-slate-400 italic">Chưa xếp phòng</span>
          ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        align: 'center',
        render: (status: string) => <StatusTag status={status} />,
      },
      {
        title: '',
        key: 'action',
        width: 60,
        align: 'center',
        fixed: 'right',
        render: (_, record) =>
          record.courseId ? (
            <div onDoubleClick={(e) => e.stopPropagation()}>
              <Tooltip title="Mở trang khóa học">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined className="text-blue-600" />}
                  onClick={() =>
                    navigate(`/instructor/courses/${record.courseId}/edit`)
                  }
                />
              </Tooltip>
            </div>
          ) : null,
      },
    ],
    [navigate],
  );

  return (
    <Card
      className="!rounded-xl border-slate-200/90 shadow-none"
      styles={{ body: { padding: '16px 20px' } }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Space wrap size={10}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            format="DD/MM/YYYY"
            allowClear={false}
            className="!rounded-lg"
          />
          <Select
            placeholder="Trạng thái buổi học"
            allowClear
            className="w-48"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'SCHEDULED', label: 'Sắp diễn ra' },
              { value: 'ONGOING', label: 'Đang diễn ra' },
              { value: 'COMPLETED', label: 'Đã dạy xong' },
              { value: 'CANCELLED', label: 'Đã hủy' },
            ]}
          />
          {statusFilter && (
            <Button
              onClick={() => setStatusFilter(undefined)}
              className="!rounded-lg"
            >
              Xóa bộ lọc
            </Button>
          )}
        </Space>

        <Space size={8}>
          <Tag className="!m-0 !rounded-full !text-xs !font-medium !bg-slate-50 !border-slate-200 !text-slate-600 px-2.5 py-0.5">
            {filteredData.length} buổi học
          </Tag>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => {
              fetchSchedule();
              toast.success('Đã làm mới lịch dạy');
            }}
            className="!rounded-lg"
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Table<ScheduleSessionItem>
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        onRow={(record) => ({
          onDoubleClick: () => {
            if (record.courseId) {
              navigate(`/instructor/courses/${record.courseId}/edit`);
            }
          },
          className: record.courseId ? 'cursor-pointer' : undefined,
        })}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (t) => `Tổng ${t} buổi học`,
        }}
        locale={{
          emptyText:
            'Không có buổi giảng dạy nào trong khoảng thời gian đã chọn',
        }}
      />
    </Card>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN PAGE: KHÔNG GIAN LÀM VIỆC GIẢNG VIÊN
// ══════════════════════════════════════════════════════════════
const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [stats, setStats] = useState<CourseStats>({
    total: 0,
    published: 0,
    pending: 0,
    draft: 0,
  });

  // Fetch Categories
  useEffect(() => {
    categoryApi
      .list({ page: 0, size: 1000, sortBy: 'name', sortDir: 'asc' })
      .then((res) => setCategories(res.content || []))
      .catch((err) => console.error('[CATEGORY] Load failed:', err));
  }, []);

  // Build Tree cho TreeSelect
  const categoryTreeData = useMemo(() => {
    const buildTree = (
      items: CategoryResponse[],
      parentId: number | null = null,
    ): CategoryTreeNode[] =>
      items
        .filter((item) => (item.parentId ?? null) === parentId)
        .map((item) => ({
          title: item.name,
          value: item.id,
          key: item.id,
          children: buildTree(items, item.id),
        }));
    return buildTree(categories);
  }, [categories]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!user?.accountId) return;
    try {
      const base = { page: 0, size: 1, teacherId: user.accountId };
      const [allRes, publishedRes, pendingRes, draftRes] = await Promise.all([
        courseApi.search(base),
        courseApi.search({ ...base, status: 'PUBLISHED' }),
        courseApi.search({ ...base, status: 'PENDING_REVIEW' }),
        courseApi.search({ ...base, status: 'DRAFT' }),
      ]);
      setStats({
        total: allRes.totalElements,
        published: publishedRes.totalElements,
        pending: pendingRes.totalElements,
        draft: draftRes.totalElements,
      });
    } catch (err) {
      console.warn('[MyCourses] fetch stats failed:', err);
    }
  }, [user?.accountId]);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!user?.accountId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortDir: 'desc',
        teacherId: user.accountId,
      };
      if (keyword.trim()) params.search = keyword.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter !== undefined && categoryFilter !== null) {
        params.categoryId = categoryFilter;
      }

      const res = await courseApi.search(params);
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Không thể tải danh sách khóa học'));
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    keyword,
    statusFilter,
    typeFilter,
    categoryFilter,
    user?.accountId,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Filter Handlers (đặt lại page = 0 trực tiếp để tránh gọi API 2 lần)
  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(0);
  };

  const handleStatusChange = (value: string | undefined) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleTypeChange = (value: string | undefined) => {
    setTypeFilter(value);
    setPage(0);
  };

  const handleCategoryChange = (value: number | undefined) => {
    setCategoryFilter(value);
    setPage(0);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setCategoryFilter(undefined);
    setPage(0);
  };

  // Action Handlers
  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await courseApi.softDelete(id);
        toast.success('Đã xóa khóa học');
        fetchData();
        fetchStats();
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Xóa khóa học thất bại'));
      }
    },
    [fetchData, fetchStats],
  );

  const handleSubmitReview = useCallback(
    async (id: number) => {
      try {
        await courseApi.submitReview(id);
        toast.success('Đã gửi duyệt khóa học');
        fetchData();
        fetchStats();
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Gửi duyệt thất bại'));
      }
    },
    [fetchData, fetchStats],
  );

  const handleRefresh = () => {
    fetchData();
    fetchStats();
    toast.success('Đã làm mới dữ liệu');
  };

  const goToDetail = useCallback(
    (id: number) => {
      navigate(`/instructor/courses/${id}/edit`);
    },
    [navigate],
  );

  // Columns Khóa học
  const columns: ColumnsType<CourseResponse> = useMemo(
    () => [
      {
        title: 'Khóa học',
        key: 'course',
        width: 350,
        render: (_, record) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-16 h-10 rounded-lg border border-slate-200/80 overflow-hidden shrink-0 bg-slate-100">
              <Image
                src={record.thumbnailUrl || ''}
                alt={record.title}
                width={64}
                height={40}
                className="object-cover block"
                fallback={THUMBNAIL_FALLBACK}
                preview={false}
              />
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              <span className="font-semibold text-[13.5px] text-slate-800 truncate">
                {record.title}
              </span>
              <span className="font-mono text-xs text-slate-400 truncate">
                {record.code}
              </span>
            </div>
          </div>
        ),
      },
      {
        title: 'Loại',
        dataIndex: 'courseType',
        key: 'courseType',
        width: 110,
        align: 'center',
        render: (type: string) => <StatusTag status={type} />,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        align: 'center',
        render: (status: string) => <StatusTag status={status} />,
      },
      {
        title: 'Học viên',
        key: 'students',
        width: 115,
        align: 'center',
        render: (_, record) => (
          <Tag
            color="blue"
            className="!m-0 !rounded-md !font-semibold !text-xs"
          >
            {record.currentStudents}
            {record.maxStudents != null ? ` / ${record.maxStudents}` : ''}
          </Tag>
        ),
      },
      {
        title: 'Học phí',
        dataIndex: 'price',
        key: 'price',
        width: 130,
        align: 'right',
        render: (price: number, record) => (
          <MoneyDisplay value={record.isFree ? 0 : price} strong />
        ),
      },
      {
        title: 'Cập nhật',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 140,
        render: (v?: string) => (
          <span className="text-[13px] text-slate-600">
            <DateDisplay value={v} format="relative" />
          </span>
        ),
      },
      {
        title: 'Thao tác',
        key: 'action',
        width: 170,
        align: 'center',
        fixed: 'right',
        render: (_, record) => {
          const canDelete =
            record.status === 'DRAFT' || record.status === 'ARCHIVED';

          return (
            <div onDoubleClick={(e) => e.stopPropagation()}>
              <Space size={4}>
                {record.status === 'DRAFT' && (
                  <Popconfirm
                    title="Gửi duyệt khóa học"
                    description={`Gửi khóa học "${record.title}" để kiểm duyệt?`}
                    okText="Gửi duyệt"
                    cancelText="Hủy"
                    onConfirm={() => handleSubmitReview(record.id)}
                  >
                    <Tooltip title="Gửi kiểm duyệt">
                      <Button
                        type="text"
                        size="small"
                        icon={<SendOutlined className="text-blue-600" />}
                      />
                    </Tooltip>
                  </Popconfirm>
                )}

                <Tooltip title="Chỉnh sửa / Quản lý">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined className="text-blue-600" />}
                    onClick={() => goToDetail(record.id)}
                  />
                </Tooltip>

                <Tooltip title="Xem chi tiết">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined className="text-slate-600" />}
                    onClick={() => goToDetail(record.id)}
                  />
                </Tooltip>

                <Popconfirm
                  title="Xóa khóa học"
                  description={`Bạn có chắc muốn xóa "${record.title}"?`}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record.id)}
                  disabled={!canDelete}
                >
                  <Tooltip
                    title={
                      !canDelete
                        ? 'Chỉ xóa được khóa học ở trạng thái Nháp hoặc Lưu trữ'
                        : 'Xóa khóa học'
                    }
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!canDelete}
                    />
                  </Tooltip>
                </Popconfirm>
              </Space>
            </div>
          );
        },
      },
    ],
    [goToDetail, handleDelete, handleSubmitReview],
  );

  const hasActiveFilters = Boolean(
    keyword || statusFilter || typeFilter || categoryFilter !== undefined,
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <PageContainer>
      <PageHeader
        title="Không gian làm việc Giảng viên"
        subtitle="Quản lý nội dung khóa học, theo dõi tiến độ kiểm duyệt và lịch giảng dạy của bạn"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/instructor/courses/create')}
            className="!rounded-lg !font-medium"
          >
            Tạo khóa học
          </Button>
        }
      />

      <Tabs
        defaultActiveKey="courses"
        className="[&_.ant-tabs-nav]:!mb-5"
        items={[
          {
            key: 'courses',
            label: (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <BookOutlined /> Khóa học của tôi
              </span>
            ),
            children: (
              <div className="flex flex-col gap-5">
                {/* Stats cards */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Tổng số khóa học"
                      value={stats.total}
                      icon={<BookOutlined />}
                      color="#2563eb"
                      bgColor="#eff6ff"
                      active={
                        !statusFilter &&
                        !typeFilter &&
                        categoryFilter === undefined
                      }
                      onClick={handleResetFilters}
                      tooltip="Nhấn để xem toàn bộ khóa học của bạn"
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Đang xuất bản"
                      value={stats.published}
                      icon={<CheckCircleOutlined />}
                      color="#10b981"
                      bgColor="#ecfdf5"
                      active={statusFilter === 'PUBLISHED'}
                      onClick={() =>
                        handleStatusChange(
                          statusFilter === 'PUBLISHED'
                            ? undefined
                            : 'PUBLISHED',
                        )
                      }
                      tagText="PUBLISHED"
                      tagColor="success"
                      tooltip="Nhấn để lọc khóa học đã xuất bản"
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Chờ duyệt"
                      value={stats.pending}
                      icon={<ClockCircleOutlined />}
                      color="#f59e0b"
                      bgColor="#fffbeb"
                      active={statusFilter === 'PENDING_REVIEW'}
                      onClick={() =>
                        handleStatusChange(
                          statusFilter === 'PENDING_REVIEW'
                            ? undefined
                            : 'PENDING_REVIEW',
                        )
                      }
                      tagText="PENDING"
                      tagColor="warning"
                      tooltip="Nhấn để lọc khóa học đang chờ duyệt"
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <StatsCard
                      title="Bản nháp"
                      value={stats.draft}
                      icon={<FileTextOutlined />}
                      color="#64748b"
                      bgColor="#f8fafc"
                      active={statusFilter === 'DRAFT'}
                      onClick={() =>
                        handleStatusChange(
                          statusFilter === 'DRAFT' ? undefined : 'DRAFT',
                        )
                      }
                      tagText="DRAFT"
                      tagColor="default"
                      tooltip="Nhấn để lọc khóa học đang ở trạng thái nháp"
                    />
                  </Col>
                </Row>

                {/* Bảng danh sách khóa học */}
                <Card
                  className="!rounded-xl border-slate-200/90 shadow-none"
                  styles={{ body: { padding: '16px 20px' } }}
                >
                  <DataTable<CourseResponse>
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    rowKey="id"
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={(p, ps) => {
                      setPage(p);
                      setPageSize(ps);
                    }}
                    onSearch={handleKeywordChange}
                    searchValue={keyword}
                    searchPlaceholder="Tìm theo tiêu đề, mã khóa học..."
                    onRow={(record) => ({
                      onDoubleClick: () => goToDetail(record.id),
                      className: 'cursor-pointer',
                    })}
                    extra={
                      <Space wrap size={10}>
                        <TreeSelect
                          placeholder="Lọc theo danh mục"
                          allowClear
                          className="w-56"
                          value={categoryFilter}
                          onChange={handleCategoryChange}
                          treeData={categoryTreeData}
                          showSearch
                          treeNodeFilterProp="title"
                          treeDefaultExpandAll
                          styles={{
                            popup: {
                              root: { maxHeight: 400, overflow: 'auto' },
                            },
                          }}
                        />
                        <Select
                          placeholder="Trạng thái"
                          allowClear
                          className="w-44"
                          value={statusFilter}
                          onChange={handleStatusChange}
                          options={[
                            { value: 'DRAFT', label: 'Nháp (DRAFT)' },
                            { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
                            { value: 'PLANNED', label: 'Đã lên kế hoạch' },
                            { value: 'PUBLISHED', label: 'Đã xuất bản' },
                            { value: 'ONGOING', label: 'Đang diễn ra' },
                            { value: 'FINISHED', label: 'Đã kết thúc' },
                            { value: 'CANCELLED', label: 'Đã hủy' },
                            { value: 'ARCHIVED', label: 'Lưu trữ' },
                          ]}
                        />
                        <Select
                          placeholder="Loại khóa"
                          allowClear
                          className="w-32"
                          value={typeFilter}
                          onChange={handleTypeChange}
                          options={[
                            { value: 'ONLINE', label: 'Online' },
                            { value: 'OFFLINE', label: 'Offline' },
                          ]}
                        />
                        {hasActiveFilters && (
                          <Button
                            onClick={handleResetFilters}
                            className="!rounded-lg"
                          >
                            Xóa bộ lọc
                          </Button>
                        )}
                        <Button
                          icon={<ReloadOutlined spin={loading} />}
                          onClick={handleRefresh}
                          className="!rounded-lg"
                        >
                          Làm mới
                        </Button>
                      </Space>
                    }
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'schedule',
            label: (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CalendarOutlined /> Lịch giảng dạy
              </span>
            ),
            children: <MyScheduleTab />,
          },
        ]}
      />
    </PageContainer>
  );
};

export default MyCoursesPage;