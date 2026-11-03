import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { tuitionApi } from '@/services/api/tuition';
import type { InvoiceResponse } from '@/services/types/tuition';

const invoiceColors = { PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default' } as const;
const { Text } = Typography;

export default function TuitionPage() {
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try { setInvoices((await tuitionApi.myInvoices({ page: 0, size: 100 })).content ?? []); }
    catch { toast.error('Không tải được hóa đơn'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadInvoices(); }, [loadInvoices]);

  const invoiceColumns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã hóa đơn', dataIndex: 'invoiceCode', render: (value: string) => <Text strong>{value}</Text> },
    { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Số tiền', dataIndex: 'amount', render: (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫` },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', render: (value?: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Thanh toán', dataIndex: 'paymentMethod', render: (value?: string) => value ?? '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: keyof typeof invoiceColors) => <Tag color={invoiceColors[value]}>{value}</Tag> },
  ];

  return <PageContainer>
    <PageHeader title="Học phí" subtitle="Theo dõi hóa đơn học phí của bạn." />
    <Alert className="mb-4" type="info" showIcon message="Thanh toán VNPAY cần cấu hình merchant trên backend. Nếu chưa cấu hình, hóa đơn có thể đã được tạo ở trạng thái PENDING." />
    <div className="mb-4 flex justify-end">
      <Button onClick={() => void loadInvoices()}>Tải lại</Button>
    </div>
    <Table rowKey="invoiceId" columns={invoiceColumns} dataSource={invoices} loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 850 }} />
  </PageContainer>;
}
