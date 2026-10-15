import { Table, Space } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { ReactNode } from 'react';
import SearchInput from './SearchInput';
import EmptyState from '../feedback/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';

interface Props<T> {
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;
  rowKey?: string | ((record: T) => string | number);

  // Pagination
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;

  // Toolbar
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  extra?: ReactNode;
  title?: ReactNode;
  showSearch?: boolean;
}

function DataTable<T extends object>({
  columns,
  dataSource,
  loading = false,
  rowKey = 'id',
  total,
  page = 0,
  pageSize = 20,
  onPageChange,
  onSearch,
  searchPlaceholder,
  extra,
  title,
  showSearch = true,
}: Props<T>) {
  const { t } = useTranslation();

  const pagination: TablePaginationConfig | false =
    total !== undefined
      ? {
          current: page + 1,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (totalCount, range) => `${range[0]}-${range[1]} ${t('common.paginationOf')} ${totalCount}`,
          onChange: (p, ps) => onPageChange?.(p - 1, ps),
          pageSizeOptions: ['10', '20', '50', '100'],
        }
      : false;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space>
          {showSearch && onSearch && (
            <SearchInput onSearch={onSearch} placeholder={searchPlaceholder} />
          )}
        </Space>
        <Space>{extra}</Space>
      </div>

      <Table<T>
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        pagination={pagination}
        title={title ? () => title : undefined}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: <EmptyState />,
        }}
      />
    </div>
  );
}

export default DataTable;