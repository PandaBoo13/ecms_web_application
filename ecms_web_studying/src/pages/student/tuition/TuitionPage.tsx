import { useCallback, useEffect, useState } from 'react';
import { Button, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { LAST_ONLINE_PAYMENT_INVOICE_KEY, tuitionApi } from '@/services/api/tuition';
import { useNavigate } from 'react-router-dom';
import type { InvoiceResponse } from '@/services/types/tuition';
import { printTuitionInvoice } from '@/utils/printTuitionInvoice';

const invoiceColors = { PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default' } as const;
const statusLabels = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Đã hủy',
} as const;
const paymentMethodLabels = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' } as const;
const { Text } = Typography;

export default function TuitionPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const loadInvoices = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const result = await tuitionApi.myInvoices({ page: page - 1, size: pageSize });
      setInvoices(result.content ?? []);
      setPagination((current) => ({ ...current, current: page, pageSize, total: result.totalElements ?? 0 }));
    }
    catch { toast.error('Không tải được hóa đơn'); }
    finally { setLoading(false); }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => { void loadInvoices(); }, [loadInvoices]);

  const payInvoice = async (row: InvoiceResponse) => {
    if (row.status === 'OVERDUE') {
      navigate(`/checkout/${row.courseId}`);
      return;
    }
    setPayingInvoiceId(row.invoiceId);
    try {
      try { sessionStorage.setItem(LAST_ONLINE_PAYMENT_INVOICE_KEY, String(row.invoiceId)); } catch { /* optional */ }
      const paymentUrl = await tuitionApi.createVnpayPayment(row.invoiceId);
      window.location.assign(paymentUrl);
    } catch (e) {
      toast.error((e as Error).message || 'Không tạo được liên kết thanh toán. Vui lòng thử lại.');
      setPayingInvoiceId(null);
    }
  };

  const invoiceColumns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã hóa đơn', dataIndex: 'invoiceCode', render: (value: string) => <Text strong>{value}</Text> },
    { title: 'Khóa học', dataIndex: 'courseTitle', render: (value: string | null | undefined, row: InvoiceResponse) => value || `#${row.courseId}` },
    { title: 'Số tiền', dataIndex: 'amount', render: (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫` },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', render: (value?: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Thanh toán', dataIndex: 'paymentMethod', render: (value?: keyof typeof paymentMethodLabels | null) => value ? paymentMethodLabels[value] : '—' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (value: keyof typeof invoiceColors, row: InvoiceResponse) => <Space direction="vertical" size={0}>
        <Tag color={invoiceColors[value]}>{statusLabels[value]}</Tag>
        {value === 'CANCELLED' && row.reason && <Text type="secondary" style={{ maxWidth: 190, whiteSpace: 'normal' }}>
          Lý do: {row.reason}
        </Text>}
      </Space>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, row: InvoiceResponse) => <Space wrap>
        {row.status === 'PENDING' && <Button type="primary" size="small" loading={payingInvoiceId === row.invoiceId}
          onClick={() => void payInvoice(row)}>Thanh toán</Button>}
        {row.status === 'OVERDUE' && row.courseType === 'ONLINE' && <Button type="primary" size="small"
          onClick={() => void payInvoice(row)}>Tiếp tục thanh toán</Button>}
        {row.status === 'OVERDUE' && row.courseType === 'OFFLINE' && <Text type="secondary">
          Quá hạn — vui lòng liên hệ trung tâm để được hỗ trợ.
        </Text>}
        {row.status === 'CANCELLED' && <Tooltip title={row.reason ? `Lý do hủy: ${row.reason}` : 'Hóa đơn đã bị hủy, vui lòng liên hệ trung tâm nếu cần hỗ trợ.'}>
          <Text type="secondary">Không thể thanh toán</Text>
        </Tooltip>}
        <Button size="small" icon={<FilePdfOutlined />} onClick={() => {
          if (!printTuitionInvoice(row)) toast.error('Trình duyệt đã chặn cửa sổ in. Hãy cho phép cửa sổ bật lên rồi thử lại.');
        }}>In / Lưu PDF</Button>
      </Space>,
    },
  ];

  const handleTableChange = (config: TablePaginationConfig) => {
    const page = config.current ?? 1;
    const pageSize = config.pageSize ?? pagination.pageSize;
    setPagination((current) => ({ ...current, current: page, pageSize }));
  };

  return <PageContainer>
    <PageHeader title="Hóa đơn" subtitle="Theo dõi hóa đơn của bạn." />
    <div className="mb-4 flex justify-end">
      <Button onClick={() => void loadInvoices(pagination.current, pagination.pageSize)}>Tải lại</Button>
    </div>
    <Table rowKey="invoiceId" columns={invoiceColumns} dataSource={invoices} loading={loading}
      pagination={{ ...pagination, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total) => `Tổng ${total} hóa đơn` }}
      onChange={handleTableChange} scroll={{ x: 850 }} />
  </PageContainer>;
}
