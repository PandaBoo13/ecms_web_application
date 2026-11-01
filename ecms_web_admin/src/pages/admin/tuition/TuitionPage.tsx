import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { tuitionApi } from '@/services/api/tuition-enrollment';
import type { InvoiceResponse, InvoiceStatus } from '@/services/types/tuition-enrollment';

type InvoiceAction = 'create' | 'cash' | 'extend' | 'cancel' | 'refund' | null;
const { Text } = Typography;

const invoiceColor: Record<InvoiceStatus, string> = {
  PENDING: 'gold', PAID: 'green', OVERDUE: 'red', CANCELLED: 'default',
};

export default function TuitionPage() {
  const [invoiceRows, setInvoiceRows] = useState<InvoiceResponse[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | undefined>();
  const [invoiceAction, setInvoiceAction] = useState<InvoiceAction>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [invoiceForm] = Form.useForm();

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const page = await tuitionApi.searchInvoices({ page: 0, size: 100, status: invoiceStatus });
      setInvoiceRows(page.content ?? []);
    } catch {
      toast.error('Không tải được danh sách hóa đơn');
    } finally {
      setLoadingInvoices(false);
    }
  }, [invoiceStatus]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const performInvoiceAction = async (values: Record<string, unknown>) => {
    setBusy(true);
    try {
      if (invoiceAction === 'create') {
        const dueAt = values.dueAt ? dayjs(values.dueAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss') : undefined;
        await tuitionApi.createOfflineInvoice({
          courseId: Number(values.courseId),
          amount: Number(values.amount),
          accountId: values.accountId ? Number(values.accountId) : undefined,
          studentId: values.studentId ? Number(values.studentId) : undefined,
          leadId: values.leadId ? Number(values.leadId) : undefined,
          dueAt,
        });
      } else if (selectedInvoice && invoiceAction === 'cash') {
        await tuitionApi.confirmCash(selectedInvoice.invoiceId);
      } else if (selectedInvoice && invoiceAction === 'extend') {
        const dueAt = dayjs(values.dueAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss');
        await tuitionApi.extendDueDate(selectedInvoice.invoiceId, dueAt);
      } else if (selectedInvoice && invoiceAction === 'cancel') {
        await tuitionApi.cancelInvoice(selectedInvoice.invoiceId, { reason: String(values.reason) });
      } else if (selectedInvoice && invoiceAction === 'refund') {
        await tuitionApi.refundInvoice(selectedInvoice.invoiceId, {
          amount: Number(values.amount),
          paymentMethod: values.paymentMethod as 'CASH' | 'BANK_TRANSFER' | 'VNPAY',
          transactionReference: values.transactionReference as string | undefined,
          reason: String(values.reason),
        });
      }
      toast.success('Đã cập nhật hóa đơn thành công');
      setInvoiceAction(null);
      setSelectedInvoice(null);
      invoiceForm.resetFields();
      await loadInvoices();
    } catch {
      toast.error('Thao tác hóa đơn không thành công');
    } finally {
      setBusy(false);
    }
  };

  const showInvoiceAction = (action: Exclude<InvoiceAction, null>, invoice?: InvoiceResponse) => {
    setSelectedInvoice(invoice ?? null);
    setInvoiceAction(action);
    invoiceForm.resetFields();
  };

  const invoiceColumns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã hóa đơn', dataIndex: 'invoiceCode', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Học viên / tài khoản', render: (_, r) => r.studentId ?? r.accountId ?? r.leadId ?? '—' },
    { title: 'Loại', dataIndex: 'type' },
    { title: 'Số tiền', dataIndex: 'amount', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', render: (v?: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: InvoiceStatus) => <Tag color={invoiceColor[v]}>{v}</Tag> },
    {
      title: 'Thao tác',
      fixed: 'right',
      render: (_, r) => (
        <Space wrap>
          {(r.status === 'PENDING' || r.status === 'OVERDUE') && (
            <Button size="small" type="primary" onClick={() => showInvoiceAction('cash', r)}>
              Thu tiền mặt
            </Button>
          )}
          {r.status === 'OVERDUE' && (
            <Button size="small" onClick={() => showInvoiceAction('extend', r)}>
              Gia hạn
            </Button>
          )}
          {(r.status === 'PENDING' || r.status === 'OVERDUE') && (
            <Button size="small" danger onClick={() => showInvoiceAction('cancel', r)}>
              Hủy
            </Button>
          )}
          {r.status === 'PAID' && r.type === 'TUITION_PAYMENT' && (
            <Button size="small" onClick={() => showInvoiceAction('refund', r)}>
              Hoàn tiền
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Học phí"
        subtitle="Quản lý các hóa đơn học phí, xác nhận thanh toán, gia hạn và hoàn tiền."
      />
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Hóa đơn quá hạn của khóa OFFLINE sẽ được hệ thống tự động quét và chuyển sang trạng thái OVERDUE lúc 01:00 AM hàng ngày."
      />

      <Space className="mb-4" wrap>
        <Select
          allowClear
          placeholder="Lọc trạng thái"
          style={{ width: 180 }}
          value={invoiceStatus}
          onChange={setInvoiceStatus}
          options={Object.keys(invoiceColor).map((v) => ({ value: v, label: v }))}
        />
        <Button onClick={() => void loadInvoices()}>Tải lại</Button>
        <Button type="primary" onClick={() => showInvoiceAction('create')}>
          Tạo hóa đơn offline
        </Button>
      </Space>

      <Table
        rowKey="invoiceId"
        columns={invoiceColumns}
        dataSource={invoiceRows}
        loading={loadingInvoices}
        scroll={{ x: 1250 }}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={
          invoiceAction === 'create'
            ? 'Tạo hóa đơn offline'
            : ({
                cash: 'Xác nhận thu tiền mặt',
                extend: 'Gia hạn hóa đơn',
                cancel: 'Hủy hóa đơn',
                refund: 'Hoàn tiền',
              } as const)[invoiceAction ?? 'cash']
        }
        open={invoiceAction !== null}
        confirmLoading={busy}
        onCancel={() => {
          setInvoiceAction(null);
          setSelectedInvoice(null);
        }}
        onOk={() => invoiceForm.submit()}
        destroyOnClose
      >
        <Form form={invoiceForm} layout="vertical" onFinish={performInvoiceAction}>
          {invoiceAction === 'create' && (
            <>
              <Form.Item name="courseId" label="Mã khóa học" rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="studentId" label="Mã học viên">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="accountId" label="Mã tài khoản (nếu không nhập mã học viên)">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="leadId" label="Mã lead (nếu không nhập hai mã trên)">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="amount" label="Số tiền (VNĐ)" rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="dueAt" label="Hạn thanh toán">
                <DatePicker showTime className="w-full" />
              </Form.Item>
            </>
          )}
          {invoiceAction === 'extend' && (
            <Form.Item name="dueAt" label="Hạn thanh toán mới" rules={[{ required: true }]}>
              <DatePicker showTime className="w-full" />
            </Form.Item>
          )}
          {invoiceAction === 'cancel' && (
            <Form.Item name="reason" label="Lý do hủy" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
          {invoiceAction === 'refund' && (
            <>
              <Form.Item name="amount" label="Số tiền hoàn" rules={[{ required: true }]}>
                <InputNumber min={1} max={Number(selectedInvoice?.amount)} className="w-full" />
              </Form.Item>
              <Form.Item name="paymentMethod" label="Phương thức hoàn" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'CASH', label: 'Tiền mặt' },
                    { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
                    { value: 'VNPAY', label: 'VNPAY' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="transactionReference" label="Mã giao dịch">
                <Input />
              </Form.Item>
              <Form.Item name="reason" label="Lý do hoàn tiền" rules={[{ required: true }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          )}
          {invoiceAction === 'cash' && (
            <Text>
              Xác nhận hóa đơn <b>{selectedInvoice?.invoiceCode}</b> (Số tiền: {Number(selectedInvoice?.amount).toLocaleString('vi-VN')} ₫) đã thu đủ tiền mặt?
            </Text>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
}
