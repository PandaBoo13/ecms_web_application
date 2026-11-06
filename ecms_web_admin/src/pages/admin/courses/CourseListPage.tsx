import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Space, Select, TreeSelect, Tooltip, Popconfirm, Image, Typography, Row, Col,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
  BookOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusTag from '@/components/common/StatusTag';
import DateDisplay from '@/components/common/DateDisplay';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import StatsCard from '@/components/common/StatsCard';
import { useTranslation } from '@/hooks/useTranslation';

import { courseApi, categoryApi } from '@/services/api/course';
import type { CourseResponse, CategoryResponse } from '@/services/types/course';

const { Text } = Typography;

interface CourseStats {
  total: number;
  published: number;
  pending: number;
  draft: number;
}

const CourseListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [data, setData] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();

  // 🆕 Lưu danh sách categories gốc (không map nữa, để build tree)
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const [stats, setStats] = useState<CourseStats>({
    total: 0, published: 0, pending: 0, draft: 0,
  });

  // ══════════════════════════════════════════════════════════════
  // FETCH CATEGORIES
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    categoryApi
      .list({ page: 0, size: 1000, sortBy: 'name', sortDir: 'asc' })
      .then((res) => {
        if (res?.content) {
          setCategories(res.content);
          console.log('📂 [CATEGORY] Loaded:', res.content.length, 'items');
        }
      })
      .catch((err) => {
        console.error('❌ [CATEGORY] Load failed:', err);
        toast.error('Không thể tải danh sách danh mục');
      });
  }, []);

  // 🆕 BUILD TREE cho TreeSelect
  const categoryTreeData = useMemo(() => {
    const buildTree = (
      items: CategoryResponse[],
      parentId: number | null = null,
      depth: number = 0
    ): any[] => {
      return items
        .filter((item) => (item.parentId ?? null) === parentId)
        .map((item) => ({
          title: item.name,
          value: item.id,
          key: item.id,
          children: buildTree(items, item.id, depth + 1),
        }));
    };
    const tree = buildTree(categories);
    console.log('🌳 [CATEGORY] Tree built:', tree.length, 'root nodes');
    return tree;
  }, [categories]);

  // ══════════════════════════════════════════════════════════════
  // FETCH STATS
  // ══════════════════════════════════════════════════════════════
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, publishedRes, pendingRes, draftRes] = await Promise.all([
        courseApi.search({ page: 0, size: 1 }),
        courseApi.search({ page: 0, size: 1, status: 'PUBLISHED' }),
        courseApi.search({ page: 0, size: 1, status: 'PENDING_REVIEW' }),
        courseApi.search({ page: 0, size: 1, status: 'DRAFT' }),
      ]);
      setStats({
        total: allRes.totalElements,
        published: publishedRes.totalElements,
        pending: pendingRes.totalElements,
        draft: draftRes.totalElements,
      });
    } catch (err) {
      console.warn('[STATS] fetch failed:', err);
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortDir: 'desc',
      };
      if (keyword.trim()) params.search = keyword.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      // ✅ Dùng !== undefined để không bỏ sót id = 0
      if (categoryFilter !== undefined && categoryFilter !== null) {
        params.categoryId = categoryFilter;
      }

      // 🆕 DEBUG: Xem params thực sự gửi đi
      console.log('🚀 [COURSE-FETCH] Params:', params);

      const res = await courseApi.search(params);

      // 🆕 DEBUG: Xem response thực sự nhận về
      console.log('📥 [COURSE-FETCH] Response:', {
        totalElements: res.totalElements,
        contentLength: res.content?.length,
        sampleIds: res.content?.slice(0, 3).map((c) => c.id),
      });

      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      console.error('❌ [COURSE-FETCH] Error:', err);
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách khóa học');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter, typeFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS — reset page ngay trong onChange
  // ══════════════════════════════════════════════════════════════
  const handleKeywordChange = (v: string) => {
    setKeyword(v);
    setPage(0);
  };
  const handleStatusChange = (v: string | undefined) => {
    setStatusFilter(v);
    setPage(0);
  };
  const handleTypeChange = (v: string | undefined) => {
    setTypeFilter(v);
    setPage(0);
  };
  const handleCategoryChange = (v: number | undefined) => {
    console.log('🎯 [CATEGORY-CHANGE] Selected:', v);
    setCategoryFilter(v);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchData();
    fetchStats();
    toast.success('Đã làm mới dữ liệu');
  };

  const handleDelete = async (id: number) => {
    try {
      await courseApi.softDelete(id);
      toast.success('Đã xóa khóa học');
      fetchData();
      fetchStats();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Xóa thất bại');
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatusFilter(undefined);
    setTypeFilter(undefined);
    setCategoryFilter(undefined);
    setPage(0);
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<CourseResponse> = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
      {
        title: t('course.name'),
        key: 'course',
        width: 340,
        render: (_, record) => (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Image
              src={record.thumbnailUrl || ''}
              alt={record.title}
              width={64}
              height={40}
              style={{ objectFit: 'cover', borderRadius: 4 }}
              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2NCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIzMiIgeT0iMjQiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5vIGltZzwvdGV4dD48L3N2Zz4="
              preview={false}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong ellipsis style={{ display: 'block' }}>
                {record.title}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.code}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: t('common.status'),
        dataIndex: 'status',
        key: 'status',
        width: 130,
        align: 'center',
        render: (status: string) => <StatusTag status={status} />,
      },
      {
        title: t('student.title'),
        key: 'students',
        width: 110,
        align: 'center',
        render: (_, record) => (
          <span>
            <Text strong>{record.currentStudents}</Text>
            {record.maxStudents ? ` / ${record.maxStudents}` : ''}
          </span>
        ),
      },
      {
        title: t('course.price'),
        dataIndex: 'price',
        key: 'price',
        width: 130,
        align: 'right',
        render: (price: number, record) => (
          <MoneyDisplay value={record.isFree ? 0 : price} strong />
        ),
      },
      {
        title: t('status.INSTRUCTOR'),
        dataIndex: 'teacherName',
        key: 'teacherName',
        width: 160,
        ellipsis: true,
        render: (v?: string) => v || <span>—</span>,
      },
      {
        title: t('common.createdAt'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 130,
        render: (v?: string) => <DateDisplay value={v} />,
      },
      {
        title: t('common.actions'),
        key: 'action',
        width: 160,
        align: 'center',
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title={t('common.details')}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/admin/courses/${record.id}`)}
              />
            </Tooltip>
            <Tooltip title={t('common.edit')}>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => navigate(`/admin/courses/${record.id}`)}
              />
            </Tooltip>
            <Popconfirm
              title={t('common.delete')}
              description={`Delete "${record.title}"?`}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title={t('common.delete')}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [t, navigate]
  );

  const hasActiveFilters = Boolean(
    keyword || statusFilter || typeFilter || categoryFilter !== undefined
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('course.title')}
        subtitle={t('course.subtitle')}
        extra={
          <>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
             onClick={() => navigate('/admin/courses/create')}
            >
              {t('course.create')}
            </Button>
          </>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="Tổng số khóa học"
            value={stats.total}
            icon={<BookOutlined />}
            color="#2563eb"
            bgColor="#eff6ff"
            active={!statusFilter && !typeFilter && categoryFilter === undefined}
            onClick={handleResetFilters}
            tooltip="Nhấn để xem toàn bộ khóa học"
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
            onClick={() => handleStatusChange(statusFilter === 'PUBLISHED' ? undefined : 'PUBLISHED')}
            tagText="PUBLISHED"
            tagColor="success"
            tooltip="Nhấn để lọc các khóa học đã xuất bản"
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
              handleStatusChange(statusFilter === 'PENDING_REVIEW' ? undefined : 'PENDING_REVIEW')
            }
            tagText="PENDING"
            tagColor="warning"
            tooltip="Nhấn để lọc các khóa học đang chờ duyệt"
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
            onClick={() => handleStatusChange(statusFilter === 'DRAFT' ? undefined : 'DRAFT')}
            tagText="DRAFT"
            tagColor="default"
            tooltip="Nhấn để lọc các khóa học đang ở trạng thái nháp"
          />
        </Col>
      </Row>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
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
          searchPlaceholder={t('course.searchPlaceholder')}
          onRow={(record) => ({
            onDoubleClick: () => navigate(`/admin/courses/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          extra={
            <Space wrap>
              {/* 🆕 TREE SELECT — hiển thị dạng cây có thụt lề */}
              <TreeSelect
                placeholder="Lọc theo danh mục"
                allowClear
                style={{ width: 240 }}
                value={categoryFilter}
                onChange={handleCategoryChange}
                treeData={categoryTreeData}
                showSearch
                treeNodeFilterProp="title"
                treeDefaultExpandAll
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              />

              <Select
                placeholder={t('course.filterStatus')}
                allowClear
                style={{ width: 160 }}
                value={statusFilter}
                onChange={handleStatusChange}
                options={[
                  { value: 'DRAFT', label: t('status.DRAFT') },
                  { value: 'PENDING_REVIEW', label: t('status.PENDING_REVIEW') },
                  { value: 'PLANNED', label: t('status.PLANNED') },
                  { value: 'PUBLISHED', label: t('status.PUBLISHED') },
                  { value: 'ONGOING', label: t('status.ONGOING') },
                  { value: 'FINISHED', label: t('status.FINISHED') },
                  { value: 'CANCELLED', label: t('status.CANCELLED') },
                  { value: 'ARCHIVED', label: t('status.ARCHIVED') },
                ]}
              />

              <Select
                placeholder={t('course.type')}
                allowClear
                style={{ width: 130 }}
                value={typeFilter}
                onChange={handleTypeChange}
                options={[
                  { value: 'ONLINE', label: t('status.ONLINE') },
                  { value: 'OFFLINE', label: t('status.OFFLINE') },
                ]}
              />

              {hasActiveFilters && <Button onClick={handleResetFilters}>Xóa bộ lọc</Button>}
            </Space>
          }
        />
      </div>
    </PageContainer>
  );
};

export default CourseListPage;