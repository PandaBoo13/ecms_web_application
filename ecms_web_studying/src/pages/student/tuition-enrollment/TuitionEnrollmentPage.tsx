import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Modal, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi, tuitionApi } from '@/services/api/tuition-enrollment';
import type { AttendanceAbsenceResponse, EnrollmentResponse, EnrollmentStatusLogResponse, InvoiceResponse } from '@/services/types/tuition-enrollment';

const invoiceColors = { PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default' } as const;
const enrollmentColors = { PENDING: 'gold', ACTIVE: 'green', RESERVED: 'blue', TERMINATED: 'default', COMPLETED: 'purple' } as const;
const { Text } = Typography;

export default function TuitionEnrollmentPage() {
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [absences, setAbsences] = useState<AttendanceAbsenceResponse[]>([]);
  const [statusLogs, setStatusLogs] = useState<EnrollmentStatusLogResponse[]>([]);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try { setInvoices((await tuitionApi.myInvoices({ page: 0, size: 100 })).content ?? []); }
    catch { toast.error('Không tải được hóa đơn'); }
    finally { setLoadingInvoices(false); }
  }, []);
  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try { setEnrollments((await enrollmentApi.myEnrollments({ page: 0, size: 100 })).content ?? []); }
    catch { toast.error('Không tải được danh sách ghi danh'); }
    finally { setLoadingEnrollments(false); }
  }, []);
  useEffect(() => { void loadInvoices(); void loadEnrollments(); }, [loadInvoices, loadEnrollments]);

  const invoiceColumns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã hóa đơn', dataIndex: 'invoiceCode', render: (value: string) => <Text strong>{value}</Text> },
    { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Số tiền', dataIndex: 'amount', render: (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫` },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', render: (value?: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Thanh toán', dataIndex: 'paymentMethod', render: (value?: string) => value ?? '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: keyof typeof invoiceColors) => <Tag color={invoiceColors[value]}>{value}</Tag> },
  ];
  const enrollmentColumns: ColumnsType<EnrollmentResponse> = [
    { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Loại khóa', dataIndex: 'enrollmentType' },
    { title: 'Ngày ghi danh', dataIndex: 'enrolledAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY') },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: keyof typeof enrollmentColors) => <Tag color={enrollmentColors[value]}>{value}</Tag> },
    { title: 'Số buổi vắng', dataIndex: 'absences' },
    { title: 'Điểm cuối khóa', dataIndex: 'finalScore', render: (value?: number) => value ?? '—' },
    { title: 'Lịch sử', render: (_, row) => <Button size="small" onClick={async () => {
      try {
        const [absenceRows, logRows] = await Promise.all([
          enrollmentApi.attendanceHistory(row.enrollmentId), enrollmentApi.statusHistory(row.enrollmentId),
        ]);
        setAbsences(absenceRows); setStatusLogs(logRows); setHistoryOpen(true);
      } catch { toast.error('Không tải được lịch sử ghi danh'); }
    }}>Xem</Button> },
  ];

  return <PageContainer>
    <PageHeader title="Học phí & ghi danh" subtitle="Theo dõi hóa đơn và tình trạng tham gia khóa học của bạn." />
    <Alert className="mb-4" type="info" showIcon message="Thanh toán VNPAY cần cấu hình merchant trên backend. Nếu chưa cấu hình, hóa đơn có thể đã được tạo ở trạng thái PENDING." />
    <Tabs items={[
      { key: 'invoices', label: `Hóa đơn (${invoices.length})`, children: <>
        <div className="mb-4 flex justify-end gap-2">
          <Button onClick={() => void loadInvoices()}>Tải lại</Button>
        </div>
        <Table rowKey="invoiceId" columns={invoiceColumns} dataSource={invoices} loading={loadingInvoices} pagination={{ pageSize: 10 }} scroll={{ x: 850 }} />
      </> },
      { key: 'enrollments', label: `Ghi danh (${enrollments.length})`, children: <>
        <div className="mb-4 flex justify-end"><Button onClick={() => void loadEnrollments()}>Tải lại</Button></div>
        <Table rowKey="enrollmentId" columns={enrollmentColumns} dataSource={enrollments} loading={loadingEnrollments} pagination={{ pageSize: 10 }} scroll={{ x: 850 }} />
      </> },
    ]} />
    <Modal title="Lịch sử ghi danh" open={historyOpen} footer={null} onCancel={() => setHistoryOpen(false)}>
      <Typography.Title level={5}>Vắng mặt</Typography.Title>
      {absences.length ? absences.map((item) => <div key={item.attendanceId} className="border-b py-2">Buổi #{item.sessionId} · {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}</div>) : <Text type="secondary">Chưa có lượt vắng được ghi nhận.</Text>}
      <Typography.Title level={5} className="mt-5">Thay đổi trạng thái</Typography.Title>
      {statusLogs.length ? statusLogs.map((item) => <div key={item.id} className="border-b py-2">{item.oldStatus ?? 'Khởi tạo'} → {item.newStatus} · {dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}<div>{item.reason}</div></div>) : <Text type="secondary">Chưa có lịch sử trạng thái.</Text>}
    </Modal>
  </PageContainer>;
}
