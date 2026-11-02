import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, Space, Tabs, Tag } from 'antd';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import DateDisplay from '@/components/common/DateDisplay';
import StatsCard from '@/components/common/StatsCard';
import RequestStatusTag from '@/components/request/RequestStatusTag';
import { useTranslation } from '@/hooks/useTranslation';

import { requestApi } from '@/services/api/request/requestApi';
import { REQUEST_GROUPS, getGroupByKey } from '@/constants/request-groups';
import {
  getRequestTypeLabel,
  type RequestResponse,
  type RequestStatus,
  type RequestDetailResponse,
} from '@/services/types/request/request';

import RequestDetailDrawer from './RequestDetailDrawer';

// Số request tối đa fetch mỗi type khi filter theo nhóm (client-side pagination).
// Đủ cho demo, nếu production > 500 request/nhóm → cần BE support search mảng requestType.
const GROUP_FETCH_SIZE = 200;

interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const RequestListPage = () => {
  const { t } = useTranslation();

  const [data, setData] = useState<RequestResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | undefined>();
  const [activeTab, setActiveTab] = useState<string>('all');

  const [stats, setStats] = useState<RequestStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<RequestDetailResponse | null>(null);

  // ══════════════════════════════════════════════════════════════
  // FETCH STATS
  // ══════════════════════════════════════════════════════════════
  const fetchStats = useCallback(async () => {
    try {
      const [all, pending, approved, rejected] = await Promise.all([
        requestApi.search({ page: 0, size: 1 }),
        requestApi.search({ page: 0, size: 1, status: 'PENDING' }),
        requestApi.search({ page: 0, size: 1, status: 'APPROVED' }),
        requestApi.search({ page: 0, size: 1, status: 'REJECTED' }),
      ]);
      setStats({
        total: all.totalElements,
        pending: pending.totalElements,
        approved: approved.totalElements,
        rejected: rejected.totalElements,
      });
    } catch (err) {
      console.warn('[Request] fetch stats failed:', err);
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ══════════════════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const group = getGroupByKey(activeTab);
      const baseParams = {
        status: statusFilter,
        keyword: keyword.trim() || undefined,
        sortBy: 'createdAt',
        sortDirection: 'DESC' as const,
      };

      if (!group) {
        // Tab "Tất cả" → server-side pagination
        const res = await requestApi.search({
          ...baseParams,
          page,
          size: pageSize,
        });
        setData(res.content);
        setTotal(res.totalElements);
      } else {
        // Tab nhóm → fetch song song từng requestType rồi gộp + phân trang client
        const results = await Promise.all(
          group.types.map((type) =>
            requestApi.search({
              ...baseParams,
              requestType: type,
              page: 0,
              size: GROUP_FETCH_SIZE,
            }),
          ),
        );

        const merged = results
          .flatMap((r) => r.content)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );

        setTotal(merged.length);
        const start = page * pageSize;
        setData(merged.slice(start, start + pageSize));
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải danh sách yêu cầu');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleKeywordChange = (v: string) => {
    setKeyword(v);
    setPage(0);
  };

  const handleStatusChange = (v: RequestStatus | undefined) => {
    setStatusFilter(v);
    setPage(0);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchData();
    fetchStats();
    toast.success('Đã làm mới dữ liệu');
  };

  const handleResetFilters = () => {
    setKeyword('');
    setStatusFilter(undefined);
    setActiveTab('all');
    setPage(0);
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const detail = await requestApi.getById(id);
      setSelected(detail);
      setDrawerOpen(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải chi tiết yêu cầu');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COLUMNS
  // ══════════════════════════════════════════════════════════════
  const columns: ColumnsType<RequestResponse> = useMemo(
    () => [
      {
        title: t('request.column.code', 'Mã'),
        dataIndex: 'requestCode',
        key: 'requestCode',
        width: 180,
        render: (v: string) => (
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>
        ),
      },
      {
        title: t('request.column.title', 'Tiêu đề'),
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
      },
      {
        title: t('request.column.type', 'Loại'),
        dataIndex: 'requestType',
        key: 'requestType',
        width: 200,
        render: (v: string) => (
          <Tag color="blue" style={{ fontSize: 11 }}>
            {getRequestTypeLabel(v)}
          </Tag>
        ),
      },
      {
        title: t('request.column.requester', 'Người gửi'),
        dataIndex: 'requesterName',
        key: 'requesterName',
        width: 180,
        ellipsis: true,
        render: (v: string | undefined, rec: RequestResponse) =>
          v || `#${rec.requesterId}`,
      },
      {
        title: t('request.column.status', 'Trạng thái'),
        dataIndex: 'status',
        key: 'status',
        width: 130,
        align: 'center',
        render: (v: string) => <RequestStatusTag status={v} />,
      },
      {
        title: t('request.column.createdAt', 'Ngày gửi'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 130,
        render: (v?: string) => <DateDisplay value={v} />,
      },
    ],
    [t],
  );

  // ══════════════════════════════════════════════════════════════
  // TABS
  // ══════════════════════════════════════════════════════════════
  const tabs = useMemo(
    () => [
      { key: 'all', label: t('request.tab.all', 'Tất cả') },
      ...REQUEST_GROUPS.map((g) => ({
        key: g.key,
        label: t(g.labelKey, g.key),
      })),
    ],
    [t],
  );

  const hasActiveFilters = Boolean(keyword || statusFilter);

  return (
    <PageContainer>
      <PageHeader
        title={t('request.title', 'Quản lý yêu cầu')}
        subtitle={t(
          'request.subtitle',
          'Xem xét, duyệt hoặc từ chối các yêu cầu từ người dùng',
        )}
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            {t('common.refresh', 'Làm mới')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <StatsCard
            title={t('request.stats.total', 'Tổng yêu cầu')}
            value={stats.total}
            icon={<InboxOutlined />}
            color="#2563eb"
            bgColor="#eff6ff"
            active={!statusFilter}
            onClick={handleResetFilters}
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <StatsCard
            title={t('request.stats.pending', 'Chờ duyệt')}
            value={stats.pending}
            icon={<ClockCircleOutlined />}
            color="#f59e0b"
            bgColor="#fffbeb"
            active={statusFilter === 'PENDING'}
            onClick={() =>
              handleStatusChange(
                statusFilter === 'PENDING' ? undefined : 'PENDING',
              )
            }
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <StatsCard
            title={t('request.stats.approved', 'Đã duyệt')}
            value={stats.approved}
            icon={<CheckCircleOutlined />}
            color="#10b981"
            bgColor="#ecfdf5"
            active={statusFilter === 'APPROVED'}
            onClick={() =>
              handleStatusChange(
                statusFilter === 'APPROVED' ? undefined : 'APPROVED',
              )
            }
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <StatsCard
            title={t('request.stats.rejected', 'Từ chối')}
            value={stats.rejected}
            icon={<CloseCircleOutlined />}
            color="#ef4444"
            bgColor="#fef2f2"
            active={statusFilter === 'REJECTED'}
            onClick={() =>
              handleStatusChange(
                statusFilter === 'REJECTED' ? undefined : 'REJECTED',
              )
            }
          />
        </div>
      </div>

      {/* Tabs nhóm */}
      <div
        style={{
          background: '#fff',
          padding: '0 16px',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabs}
          size="middle"
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          background: '#fff',
          padding: 16,
          borderRadius: '0 0 8px 8px',
        }}
      >
        <DataTable<RequestResponse>
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
          searchPlaceholder={t(
            'request.filter.searchPlaceholder',
            'Tìm theo mã, tiêu đề, người gửi...',
          )}
          onRow={(record) => ({
            onDoubleClick: () => handleOpenDetail(record.id),
            style: { cursor: 'pointer' },
          })}
          extra={
            <Space wrap>
              <Select
                placeholder={t('request.filter.status', 'Trạng thái')}
                allowClear
                style={{ width: 160 }}
                value={statusFilter}
                onChange={handleStatusChange}
                options={[
                  { value: 'PENDING', label: t('status.PENDING', 'Chờ duyệt') },
                  { value: 'APPROVED', label: t('status.APPROVED', 'Đã duyệt') },
                  { value: 'REJECTED', label: t('status.REJECTED', 'Từ chối') },
                  { value: 'CANCELLED', label: t('status.CANCELLED', 'Đã hủy') },
                ]}
              />
              {hasActiveFilters && (
                <Button onClick={handleResetFilters}>
                  {t('common.clearFilter', 'Xóa lọc')}
                </Button>
              )}
            </Space>
          }
        />
      </div>

      {/* Detail Drawer */}
      <RequestDetailDrawer
        open={drawerOpen}
        request={selected}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onRefresh={() => {
          fetchData();
          fetchStats();
        }}
      />
    </PageContainer>
  );
};

export default RequestListPage;