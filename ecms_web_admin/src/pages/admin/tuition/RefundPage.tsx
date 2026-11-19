import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import ThumbnailUpload from '@/components/common/ThumbnailUpload';
import { tuitionApi } from '@/services/api/tuition';
import type {
  InvoiceResponse,
  InvoiceStatus,
  PaymentMethod,
  RefundApprovalStatusResponse,
} from '@/services/types/tuition';

const { Text } = Typography;

const statusLabels: Record<InvoiceStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Đã hủy',
};
const methodLabels: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
};
const dateText = (value?: string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
const moneyText = (value?: number | null) =>
  value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} ₫`;

const approvalStatusMeta: Record<string, { label: string; color: string }> = {
  NONE: { label: 'Chưa có yêu cầu', color: 'default' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Đã duyệt', color: 'green' },
  REJECTED: { label: 'Từ chối', color: 'red' },
  CANCELLED: { label: 'Đã hủy yêu cầu', color: 'default' },
};

const RefundPage = () => {
  const [rows, setRows] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailInvoice, setDetailInvoice] = useState<InvoiceResponse | null>(null);

  // Gửi yêu cầu duyệt (tối thiểu)
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalForm] = Form.useForm();
  const [paidOptions, setPaidOptions] = useState<InvoiceResponse[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(false);

  // Ghi nhận hoàn tiền đã thực hiện (sau duyệt)
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordForm] = Form.useForm();
  const [recordOptions, setRecordOptions] = useState<InvoiceResponse[]>([]);
  const [loadingRecordOptions, setLoadingRecordOptions] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<RefundApprovalStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const invoiceSearchTimer = useRef<number | undefined>(undefined);
  const recordSearchTimer = useRef<number | undefined>(undefined);

  const loadRefunds = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const result = await tuitionApi.searchInvoices({
          type: 'REFUND',
          page: page - 1,
          size: pageSize,
          search: search || undefined,
        });
        setRows(result.content ?? []);
        setPagination((current) => ({ ...current, current: page, pageSize, total: result.totalElements ?? 0 }));
      } catch {
        toast.error('Không tải được danh sách hoàn tiền');
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    void loadRefunds(pagination.current, pagination.pageSize);
  }, [loadRefunds, pagination.current, pagination.pageSize]);

  useEffect(
    () => () => {
      window.clearTimeout(invoiceSearchTimer.current);
      window.clearTimeout(recordSearchTimer.current);
    },
    [],
  );

  const loadPaidInvoices = useCallback(async (keyword?: string) => {
    setLoadingPaid(true);
    try {
      const result = await tuitionApi.searchInvoices({
        type: 'TUITION_PAYMENT',
        status: 'PAID',
        refundable: true,
        search: keyword?.trim() || undefined,
        page: 0,
        size: 20,
      });
      setPaidOptions(result.content ?? []);
    } catch {
      toast.error('Không tải được danh sách hóa đơn có thể hoàn tiền');
    } finally {
      setLoadingPaid(false);
    }
  }, []);

  const loadRecordInvoices = useCallback(async (keyword?: string) => {
    setLoadingRecordOptions(true);
    try {
      const result = await tuitionApi.searchInvoices({
        type: 'TUITION_PAYMENT',
        status: 'PAID',
        refundable: true,
        search: keyword?.trim() || undefined,
        page: 0,
        size: 20,
      });
      setRecordOptions(result.content ?? []);
    } catch {
      toast.error('Không tải được danh sách hóa đơn');
    } finally {
      setLoadingRecordOptions(false);
    }
  }, []);

  const openApproval = () => {
    approvalForm.resetFields();
    setPaidOptions([]);
    setApprovalOpen(true);
    void loadPaidInvoices();
  };

  const openRecord = () => {
    recordForm.resetFields();
    setRecordOptions([]);
    setApprovalStatus(null);
    setRecordOpen(true);
    void loadRecordInvoices();
  };

  const handleSelectApprovalInvoice = (invoiceId: number) => {
    const invoice = paidOptions.find((item) => item.invoiceId === invoiceId);
    if (!invoice) return;
    approvalForm.setFieldsValue({ amount: invoice.amount });
  };

  const handleSelectRecordInvoice = async (invoiceId: number) => {
    const invoice = recordOptions.find((item) => item.invoiceId === invoiceId);
    if (!invoice) return;
    setApprovalStatus(null);
    recordForm.setFieldsValue({
      amount: invoice.amount,
      paymentMethod: invoice.paymentMethod ?? 'BANK_TRANSFER',
      payerName: invoice.ownerName,
      payerEmail: invoice.ownerEmail,
      payerPhone: invoice.ownerPhone,
      refundedAt: dayjs(),
      reason: undefined,
      transactionReference: undefined,
      proofUrl: undefined,
    });
    setLoadingStatus(true);
    try {
      const status = await tuitionApi.getRefundApprovalStatus(invoiceId);
      setApprovalStatus(status);
      if (status.requestedAmount != null) {
        recordForm.setFieldValue('amount', status.requestedAmount);
      }
      if (status.reason) {
        recordForm.setFieldValue('reason', status.reason);
      }
    } catch {
      toast.error('Không kiểm tra được trạng thái duyệt hoàn tiền');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSubmitApproval = async (values: Record<string, unknown>) => {
    setApprovalSubmitting(true);
    try {
      await tuitionApi.submitRefundApproval(Number(values.invoiceId), {
        amount: Number(values.amount),
        reason: String(values.reason).trim(),
      });
      toast.success('Đã gửi yêu cầu duyệt hoàn tiền, chờ phê duyệt');
      setApprovalOpen(false);
      approvalForm.resetFields();
    } catch {
      toast.error('Gửi yêu cầu duyệt hoàn tiền không thành công');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleRecordRefund = async (values: Record<string, unknown>) => {
    if (!approvalStatus?.canRecordRefund) {
      toast.error('Hóa đơn chưa có yêu cầu hoàn tiền được phê duyệt');
      return;
    }
    setRecordSubmitting(true);
    try {
      await tuitionApi.recordApprovedRefund(Number(values.invoiceId), {
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod as PaymentMethod,
        transactionReference: (values.transactionReference as string | undefined)?.trim() || undefined,
        reason: String(values.reason).trim(),
        proofUrl: String(values.proofUrl),
        payerName: String(values.payerName).trim(),
        payerEmail: String(values.payerEmail).trim(),
        payerPhone: (values.payerPhone as string | undefined)?.trim() || undefined,
        refundedAt: dayjs(values.refundedAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss'),
      });
      toast.success('Đã ghi nhận hoàn tiền và gửi email xác nhận');
      setRecordOpen(false);
      recordForm.resetFields();
      setApprovalStatus(null);
      await loadRefunds(1, pagination.pageSize);
    } catch {
      toast.error('Ghi nhận hoàn tiền không thành công');
    } finally {
      setRecordSubmitting(false);
    }
  };

  const columns: ColumnsType<InvoiceResponse> = [
    { title: 'Mã hoàn tiền', dataIndex: 'invoiceCode', width: 190, render: (value: string) => <Text strong>{value}</Text> },
    {
      title: 'Hóa đơn gốc',
      dataIndex: 'originalInvoiceCode',
      width: 170,
      render: (value: string | null, row) => value || (row.originalInvoiceId ? `#${row.originalInvoiceId}` : '—'),
    },
    {
      title: 'Người nhận hoàn',
      dataIndex: 'ownerName',
      width: 190,
      render: (value: string | null, row) => (
        <Text strong>{value || row.ownerEmail || `ID ${row.studentId ?? row.leadId ?? '—'}`}</Text>
      ),
    },
    { title: 'Khóa học', dataIndex: 'courseTitle', width: 200, render: (value: string | null, row) => value || `Khóa học #${row.courseId}` },
    { title: 'Số tiền', dataIndex: 'amount', width: 140, render: moneyText },
    { title: 'Phương thức', dataIndex: 'paymentMethod', width: 140, render: (value?: string) => (value ? methodLabels[value] ?? value : '—') },
    { title: 'Mã giao dịch', dataIndex: 'transactionReference', width: 180, render: (value: string | null) => value || '—' },
    { title: 'Ngày hoàn', dataIndex: 'paidAt', width: 165, render: dateText },
    { title: 'Lý do', dataIndex: 'reason', width: 220, ellipsis: true, render: (value: string | null) => value || '—' },
    {
      title: 'Thao tác',
      fixed: 'right',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Tooltip title="Xem chi tiết">
          <Button aria-label="Xem chi tiết" type="text" icon={<EyeOutlined />} onClick={() => setDetailInvoice(row)} />
        </Tooltip>
      ),
    },
  ];

  const handleTableChange = (config: TablePaginationConfig) =>
    setPagination((current) => ({ ...current, current: config.current ?? 1, pageSize: config.pageSize ?? 10 }));

  const approvalMeta = approvalStatus ? (approvalStatusMeta[approvalStatus.status] ?? { label: approvalStatus.status, color: 'default' }) : null;

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý hoàn tiền"
        subtitle="Gửi yêu cầu duyệt hoàn tiền (chưa thực hiện thủ công), và ghi nhận chứng từ sau khi yêu cầu được phê duyệt."
      />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <Input.Search
          allowClear
          placeholder="Tìm mã hoàn tiền, học viên, khóa học..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setPagination((current) => ({ ...current, current: 1 }));
            setSearch(value.trim());
          }}
          style={{ width: 340 }}
        />
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => void loadRefunds(pagination.current, pagination.pageSize)}>
            Tải lại
          </Button>
          <Button icon={<PlusOutlined />} onClick={openApproval}>
            Gửi yêu cầu duyệt
          </Button>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={openRecord}>
            Ghi nhận hoàn tiền
          </Button>
        </Space>
      </div>

      <Table
        rowKey="invoiceId"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1450 }}
        pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Tổng ${total} chứng từ hoàn tiền` }}
        onChange={handleTableChange}
      />

      <Modal
        title="Gửi yêu cầu duyệt hoàn tiền"
        open={approvalOpen}
        width={560}
        confirmLoading={approvalSubmitting}
        okText="Gửi yêu cầu"
        onCancel={() => { setApprovalOpen(false); approvalForm.resetFields(); }}
        onOk={() => approvalForm.submit()}
        destroyOnClose
      >
        <Form form={approvalForm} layout="vertical" onFinish={handleSubmitApproval}>
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="Bước 1: chỉ gửi thông tin đề nghị (hóa đơn gốc, số tiền dự kiến, lý do). Chưa nhập phương thức, ảnh minh chứng hay mã giao dịch vì chưa thực hiện hoàn tiền thủ công."
          />
          <Form.Item name="invoiceId" label="Hóa đơn gốc cần hoàn tiền" rules={[{ required: true, message: 'Vui lòng chọn hóa đơn cần hoàn tiền' }]}>
            <Select
              showSearch
              loading={loadingPaid}
              filterOption={false}
              onSearch={(value) => {
                window.clearTimeout(invoiceSearchTimer.current);
                invoiceSearchTimer.current = window.setTimeout(() => void loadPaidInvoices(value), 350);
              }}
              placeholder="Tìm theo mã hóa đơn, tên, email, SĐT..."
              onChange={(value: number) => handleSelectApprovalInvoice(value)}
              notFoundContent={loadingPaid ? 'Đang tìm...' : 'Không có hóa đơn phù hợp'}
              options={paidOptions.map((invoice) => ({
                value: invoice.invoiceId,
                label: `${invoice.invoiceCode} · ${invoice.ownerName || invoice.ownerEmail || '—'} · ${moneyText(invoice.amount)}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền dự kiến hoàn" rules={[{ required: true, message: 'Vui lòng nhập số tiền dự kiến hoàn' }]}>
            <InputNumber<number> min={0.01} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => Number(`${v ?? ''}`.replace(/,/g, ''))} addonAfter="₫" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do hoàn tiền" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do hoàn tiền' }]}>
            <Input.TextArea rows={3} placeholder="Lý do đề nghị hoàn tiền..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Ghi nhận hoàn tiền đã thực hiện"
        open={recordOpen}
        width={680}
        confirmLoading={recordSubmitting}
        okText="Ghi nhận hoàn tiền"
        okButtonProps={{ disabled: !approvalStatus?.canRecordRefund }}
        onCancel={() => { setRecordOpen(false); recordForm.resetFields(); setApprovalStatus(null); }}
        onOk={() => recordForm.submit()}
        destroyOnClose
      >
        <Form form={recordForm} layout="vertical" onFinish={handleRecordRefund}>
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="Bước 3: sau khi yêu cầu được duyệt và đã hoàn tiền thủ công bên ngoài, cập nhật thông tin thực tế (phương thức, minh chứng, mã giao dịch, ngày hoàn...) để tạo chứng từ."
          />
          <Form.Item name="invoiceId" label="Hóa đơn gốc" rules={[{ required: true, message: 'Vui lòng chọn hóa đơn' }]}>
            <Select
              showSearch
              loading={loadingRecordOptions}
              filterOption={false}
              onSearch={(value) => {
                window.clearTimeout(recordSearchTimer.current);
                recordSearchTimer.current = window.setTimeout(() => void loadRecordInvoices(value), 350);
              }}
              placeholder="Tìm theo mã hóa đơn, tên, email, SĐT..."
              onChange={(value: number) => void handleSelectRecordInvoice(value)}
              notFoundContent={loadingRecordOptions ? 'Đang tìm...' : 'Không có hóa đơn phù hợp'}
              options={recordOptions.map((invoice) => ({
                value: invoice.invoiceId,
                label: `${invoice.invoiceCode} · ${invoice.ownerName || invoice.ownerEmail || '—'} · ${moneyText(invoice.amount)}`,
              }))}
            />
          </Form.Item>

          {approvalStatus && (
            <Alert
              className="mb-4"
              showIcon
              type={approvalStatus.canRecordRefund ? 'success' : approvalStatus.status === 'PENDING_APPROVAL' ? 'warning' : 'error'}
              message={
                <Space wrap>
                  <span>Trạng thái duyệt:</span>
                  <Tag color={approvalMeta?.color}>{approvalMeta?.label}</Tag>
                  {approvalStatus.requestCode && <Text type="secondary">({approvalStatus.requestCode})</Text>}
                </Space>
              }
              description={
                <div>
                  {approvalStatus.requestedAmount != null && <div>Số tiền đã duyệt: <strong>{moneyText(approvalStatus.requestedAmount)}</strong></div>}
                  {approvalStatus.reason && <div>Lý do đề nghị: {approvalStatus.reason}</div>}
                  {approvalStatus.rejectReason && <div>Lý do từ chối: {approvalStatus.rejectReason}</div>}
                  {!approvalStatus.canRecordRefund && approvalStatus.status !== 'APPROVED' && <div>Chỉ có thể ghi nhận khi yêu cầu đã được phê duyệt.</div>}
                  {approvalStatus.status === 'APPROVED' && !approvalStatus.canRecordRefund && <div>Hóa đơn đã có chứng từ hoàn tiền.</div>}
                </div>
              }
            />
          )}
          {loadingStatus && <Alert className="mb-4" type="info" showIcon message="Đang kiểm tra trạng thái duyệt..." />}

          <Form.Item name="amount" label="Số tiền hoàn (theo phê duyệt)" rules={[{ required: true, message: 'Vui lòng nhập số tiền hoàn' }]}>
            <InputNumber<number> min={0.01} disabled={!!approvalStatus?.canRecordRefund} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => Number(`${v ?? ''}`.replace(/,/g, ''))} addonAfter="₫" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Phương thức hoàn tiền" rules={[{ required: true, message: 'Vui lòng chọn phương thức hoàn tiền' }]}>
            <Select options={[{ value: 'CASH', label: 'Tiền mặt' }, { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }]} />
          </Form.Item>
          <Form.Item name="transactionReference" label="Mã giao dịch hoàn tiền (tuỳ chọn)">
            <Input placeholder="Mã giao dịch ngân hàng / số phiếu chi" />
          </Form.Item>
          <Form.Item name="refundedAt" label="Ngày hoàn tiền thực tế" rules={[{ required: true, message: 'Vui lòng chọn ngày hoàn tiền' }]}>
            <DatePicker showTime className="w-full" />
          </Form.Item>
          <Form.Item name="payerName" label="Họ tên người nhận hoàn" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên người nhận hoàn' }]}>
            <Input placeholder="Họ tên người nhận tiền hoàn" />
          </Form.Item>
          <Form.Item name="payerEmail" label="Email người nhận hoàn" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="payerPhone" label="Số điện thoại người nhận hoàn">
            <Input placeholder="Số điện thoại liên hệ" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do / ghi chú hoàn tiền" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do/ghi chú' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="proofUrl" label="Ảnh minh chứng hoàn tiền" rules={[{ required: true, message: 'Vui lòng tải ảnh minh chứng hoàn tiền' }]}>
            <ThumbnailUpload width={280} height={160} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Chi tiết hoàn tiền ${detailInvoice?.invoiceCode ?? ''}`}
        open={!!detailInvoice}
        width={720}
        footer={<Button onClick={() => setDetailInvoice(null)}>Đóng</Button>}
        onCancel={() => setDetailInvoice(null)}
      >
        {detailInvoice && (
          <Space direction="vertical" size="middle" className="w-full">
            <Descriptions title="Thông tin hoàn tiền" bordered size="small" column={2}>
              <Descriptions.Item label="Mã hoàn tiền">{detailInvoice.invoiceCode}</Descriptions.Item>
              <Descriptions.Item label="Hóa đơn gốc">{detailInvoice.originalInvoiceCode || (detailInvoice.originalInvoiceId ? `#${detailInvoice.originalInvoiceId}` : '—')}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><Tag color={detailInvoice.status === 'PAID' ? 'green' : 'default'}>{detailInvoice.status === 'PAID' ? 'Đã hoàn tiền' : statusLabels[detailInvoice.status]}</Tag></Descriptions.Item>
              <Descriptions.Item label="Số tiền">{moneyText(detailInvoice.amount)}</Descriptions.Item>
              <Descriptions.Item label="Phương thức">{detailInvoice.paymentMethod ? methodLabels[detailInvoice.paymentMethod] ?? detailInvoice.paymentMethod : '—'}</Descriptions.Item>
              <Descriptions.Item label="Mã giao dịch">{detailInvoice.transactionReference || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày hoàn">{dateText(detailInvoice.paidAt)}</Descriptions.Item>
              <Descriptions.Item label="Người xác nhận">{detailInvoice.confirmedBy ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Lý do" span={2}>{detailInvoice.reason || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ảnh minh chứng" span={2}>
                {detailInvoice.paymentProofUrl ? <Image src={detailInvoice.paymentProofUrl} alt="Ảnh minh chứng hoàn tiền" width={220} style={{ borderRadius: 8, objectFit: 'cover' }} /> : '—'}
              </Descriptions.Item>
            </Descriptions>
            <Descriptions title="Người nhận hoàn" bordered size="small" column={2}>
              <Descriptions.Item label="Họ tên">{detailInvoice.ownerName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailInvoice.ownerEmail || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{detailInvoice.ownerPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khóa học">{detailInvoice.courseTitle || `Khóa học #${detailInvoice.courseId}`}</Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};

export default RefundPage;
