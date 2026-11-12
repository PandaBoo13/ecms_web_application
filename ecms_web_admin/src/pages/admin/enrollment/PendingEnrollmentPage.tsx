import { useCallback, useEffect, useState } from 'react';
import {
  Button, Input, Select, Table, Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import EnrollmentStatusTag from '@/components/enrollment/EnrollmentStatusTag';
import { enrollmentApi } from '@/services/api/enrollment';
import type { PendingEnrollmentCandidate } from '@/services/types/enrollment';

const { Text } = Typography;

export default function PendingEnrollmentPage() {
  const [rows, setRows] = useState<PendingEnrollmentCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [courseType, setCourseType] = useState<'ONLINE' | 'OFFLINE' | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await enrollmentApi.pendingCandidates({
        courseType,
        search: search || undefined,
        page,
        size: 20,
      });
      setRows(data.content ?? []);
      setTotal(data.totalElements ?? 0);
    } catch {
      toast.error('Không tải được danh sách hóa đơn chờ ghi danh');
    } finally {
      setLoading(false);
    }
  }, [courseType, page, search]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const processCandidates = async (invoiceIds: number[]) => {
    if (invoiceIds.length === 0) return;
    if (invoiceIds.length > 100) {
      toast.error('Mỗi lần chỉ có thể xử lý tối đa 100 học viên');
      return;
    }
    setProcessing(true);
    try {
      const result = await enrollmentApi.createPendingBatch(invoiceIds);
      setSelectedIds([]);
      if (result.enrolled > 0) toast.success(`Đã ghi danh ${result.enrolled} học viên`);
      if (result.failed > 0) {
        const firstError = result.results.find((item) => !item.success)?.message;
        toast.error(`${result.failed} trường hợp chưa ghi danh được${firstError ? `: ${firstError}` : ''}`);
      }
      await loadCandidates();
    } catch {
      toast.error('Không xử lý được danh sách đã chọn. Vui lòng tải lại và thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const columns: ColumnsType<PendingEnrollmentCandidate> = [
    {
      title: 'Khóa học',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.courseTitle || `Khóa học #${row.courseId}`}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.courseType === 'ONLINE' ? 'Online' : 'Offline'}
            {row.courseStartDate ? ` · Khai giảng ${dayjs(row.courseStartDate).format('DD/MM/YYYY')}` : ''}
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
        const active = row.courseType === 'ONLINE'
          || (row.courseStartDate != null && !dayjs(row.courseStartDate).isAfter(dayjs(), 'day'));
        return <EnrollmentStatusTag status={active ? 'ACTIVE' : 'PENDING'} />;
      },
    },
  ];

  const hasActiveFilters = Boolean(search) || Boolean(courseType);

  return (
    <PageContainer>
      <PageHeader
        title="Chờ ghi danh"
        subtitle="Hóa đơn học phí đã thanh toán nhưng chưa có ghi danh (cả khóa ONLINE và OFFLINE). Chọn hóa đơn để ghi danh lại thủ công (tối đa 100 mỗi lần)."
      />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <Select
          placeholder="Tất cả hình thức"
          style={{ width: 190 }}
          value={courseType ?? ''}
          onChange={(value) => {
            setPage(0);
            setSelectedIds([]);
            setCourseType(value ? (value as 'ONLINE' | 'OFFLINE') : undefined);
          }}
          disabled={processing}
          options={[
            { value: '', label: 'Tất cả hình thức' },
            { value: 'OFFLINE', label: 'Khóa Offline' },
            { value: 'ONLINE', label: 'Khóa Online' },
          ]}
        />
        <Input.Search
          allowClear
          placeholder="Tìm học viên, mã học viên hoặc hóa đơn"
          style={{ width: 340 }}
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            if (!event.target.value) {
              setSearch('');
              setPage(0);
              setSelectedIds([]);
            }
          }}
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(0);
            setSelectedIds([]);
          }}
          disabled={processing}
        />
        {hasActiveFilters && (
          <Button
            disabled={processing}
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setCourseType(undefined);
              setPage(0);
              setSelectedIds([]);
            }}
          >
            Xoá lọc
          </Button>
        )}
        <Button icon={<ReloadOutlined />} disabled={processing} onClick={() => void loadCandidates()}>
          Tải lại
        </Button>
        <Button
          type="primary"
          disabled={selectedIds.length === 0 || selectedIds.length > 100}
          loading={processing}
          onClick={() => void processCandidates(selectedIds)}
        >
          {selectedIds.length > 100
            ? `Đã chọn ${selectedIds.length} — tối đa 100`
            : `Ghi danh đã chọn (${selectedIds.length})`}
        </Button>
      </div>

      <Table
        rowKey="invoiceId"
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
          getCheckboxProps: () => ({
            disabled: processing,
          }),
        }}
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{
          current: page + 1,
          pageSize: 20,
          total,
          showSizeChanger: false,
          onChange: (nextPage) => setPage(nextPage - 1),
        }}
        locale={{ emptyText: 'Không có hóa đơn nào đang chờ ghi danh.' }}
        scroll={{ x: 1100 }}
      />
    </PageContainer>
  );
}
