import { useCallback, useEffect, useState } from 'react';
import { Button, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { LAST_ONLINE_PAYMENT_INVOICE_KEY, tuitionApi } from '@/services/api/tuition';
import { useNavigate } from 'react-router-dom';
import type { InvoiceResponse } from '@/services/types/tuition';

const invoiceColors = { PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default' } as const;
const { Text } = Typography;

export default function TuitionPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try { setInvoices((await tuitionApi.myInvoices({ page: 0, size: 100 })).content ?? []); }
    catch { toast.error('Không tải được hóa đơn'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    tuitionApi.myInvoices({ page: 0, size: 100 })
      .then((page) => { if (active) setInvoices(page.content ?? []); })
      .catch(() => { if (active) toast.error('Không tải được hóa đơn'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const payOnlineInvoice = async (row: InvoiceResponse) => {
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
    { title: 'Thanh toán', dataIndex: 'paymentMethod', render: (value?: string) => value ?? '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: keyof typeof invoiceColors) => <Tag color={invoiceColors[value]}>{value}</Tag> },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, row: InvoiceResponse) => row.courseType === 'ONLINE' && (row.status === 'PENDING' || row.status === 'OVERDUE')
        ? <Button type="primary" size="small" loading={payingInvoiceId === row.invoiceId}
            onClick={() => void payOnlineInvoice(row)}>{row.status === 'OVERDUE' ? 'Tiếp tục thanh toán' : 'Thanh toán'}</Button>
        : '—',
    },
  ];

  return <PageContainer>
    <PageHeader title="Hóa đơn" subtitle="Theo dõi hóa đơn của bạn." />
    <div className="mb-4 flex justify-end">
      <Button onClick={() => void loadInvoices()}>Tải lại</Button>
    </div>
    <Table rowKey="invoiceId" columns={invoiceColumns} dataSource={invoices} loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 850 }} />
  </PageContainer>;
}
