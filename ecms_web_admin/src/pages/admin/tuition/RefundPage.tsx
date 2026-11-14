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
import type { InvoiceResponse, InvoiceStatus, PaymentMethod } from '@/services/types/tuition';

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

const RefundPage = () => {
  const [rows, setRows] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceResponse[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceResponse | null>(null);
  const [form] = Form.useForm();
  const invoiceSearchTimer = useRef<number | undefined>(undefined);

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

  useEffect(() => () => window.clearTimeout(invoiceSearchTimer.current), []);

  const loadRefundableInvoices = useCallback(async (search?: string) => {
    setLoadingPaid(true);
    try {
      const result = await tuitionApi.searchInvoices({
        type: 'TUITION_PAYMENT',
        status: 'PAID',
        refundable: true,
        search: search?.trim() || undefined,
        page: 0,
        size: 20,
      });
      setInvoiceOptions(result.content ?? []);
    } catch {
      toast.error('Không tải được danh sách hóa đơn có thể hoàn tiền');
    } finally {
      setLoadingPaid(false);
    }
  }, []);

  const handleInvoiceSearch = (value: string) => {
    window.clearTimeout(invoiceSearchTimer.current);
    invoiceSearchTimer.current = window.setTimeout(() => {
      void loadRefundableInvoices(value);
    }, 350);
  };

  const openCreate = () => {
    form.resetFields();
    setInvoiceOptions([]);
    setCreateOpen(true);
    void loadRefundableInvoices();
  };

  const handleSelectPaidInvoice = (invoiceId: number) => {
    const invoice = invoiceOptions.find((item) => item.invoiceId === invoiceId);
    if (!invoice) return;
    form.setFieldsValue({
      amount: invoice.amount,
      paymentMethod: invoice.paymentMethod ?? 'BANK_TRANSFER',
      payerName: invoice.ownerName,
      payerEmail: invoice.ownerEmail,
      payerPhone: invoice.ownerPhone,
      refundedAt: dayjs(),
    });
  };

  const handleCreate = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await tuitionApi.refundInvoice(Number(values.invoiceId), {
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod as PaymentMethod,
        transactionReference: (values.transactionReference as string | undefined)?.trim() || undefined,
        reason: String(values.reason),
        proofUrl: String(values.proofUrl),
        payerName: String(values.payerName).trim(),
        payerEmail: String(values.payerEmail).trim(),
        payerPhone: (values.payerPhone as string | undefined)?.trim() || undefined,
        refundedAt: dayjs(values.refundedAt as dayjs.ConfigType).format('YYYY-MM-DDTHH:mm:ss'),
      });
      toast.success('Đã tạo chứng từ hoàn tiền và gửi email xác nhận');
      setCreateOpen(false);
      form.resetFields();
      await loadRefunds(1, pagination.pageSize);
    } catch {
      toast.error('Tạo chứng từ hoàn tiền không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<InvoiceResponse> = [
    {
      title: 'Mã hoàn tiền',
      dataIndex: 'invoiceCode',
      width: 190,
      render: (value: string) => <Text strong>{value}</Text>,
    },
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
        <div>
          <Text strong>{value || row.ownerEmail || `ID ${row.studentId ?? row.leadId ?? '—'}`}</Text>
        </div>
      ),
    },
    {
      title: 'Khóa học',
      dataIndex: 'courseTitle',
      width: 200,
      render: (value: string | null, row) => value || `Khóa học #${row.courseId}`,
    },
    { title: 'Số tiền', dataIndex: 'amount', width: 140, render: moneyText },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      width: 140,
      render: (value?: string) => (value ? methodLabels[value] ?? value : '—'),
    },
    {
      title: 'Mã giao dịch',
      dataIndex: 'transactionReference',
      width: 180,
      render: (value: string | null) => value || '—',
    },
    { title: 'Ngày hoàn', dataIndex: 'paidAt', width: 165, render: dateText },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      width: 220,
      ellipsis: true,
      render: (value: string | null) => value || '—',
    },
    {
      title: 'Thao tác',
      fixed: 'right',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Tooltip title="Xem chi tiết">
          <Button
            aria-label="Xem chi tiết"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setDetailInvoice(row)}
          />
        </Tooltip>
      ),
    },
  ];

  const handleTableChange = (config: TablePaginationConfig) =>
    setPagination((current) => ({
      ...current,
      current: config.current ?? 1,
      pageSize: config.pageSize ?? 10,
    }));

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý hoàn tiền"
        subtitle="Theo dõi các chứng từ hoàn tiền và tạo hoàn tiền cho hóa đơn học phí đã thanh toán."
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo hoàn tiền
          </Button>
        </Space>
      </div>

      <Table
        rowKey="invoiceId"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1450 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} chứng từ hoàn tiền`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title="Tạo chứng từ hoàn tiền"
        open={createOpen}
        width={640}
        confirmLoading={submitting}
        okText="Tạo hoàn tiền"
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="Chứng từ được ghi nhận là đã hoàn tiền và hệ thống sẽ gửi email xác nhận cho người nhận. Hoàn đủ 100% sẽ tự động chấm dứt ghi danh; hoàn một phần giữ nguyên ghi danh."
          />
          <Form.Item
            name="invoiceId"
            label="Hóa đơn gốc cần hoàn tiền"
            rules={[{ required: true, message: 'Vui lòng chọn hóa đơn cần hoàn tiền' }]}
            extra="Chỉ hiển thị hóa đơn khóa OFFLINE đã thanh toán và chưa có chứng từ hoàn tiền."
          >
            <Select
              showSearch
              loading={loadingPaid}
              filterOption={false}
              onSearch={handleInvoiceSearch}
              placeholder="Tìm theo mã hóa đơn, tên, email, SĐT..."
              onChange={(value: number) => handleSelectPaidInvoice(value)}
              notFoundContent={loadingPaid ? 'Đang tìm...' : 'Không có hóa đơn phù hợp'}
              options={invoiceOptions.map((invoice) => ({
                value: invoice.invoiceId,
                label: `${invoice.invoiceCode} · ${invoice.ownerName || invoice.ownerEmail || '—'} · ${moneyText(invoice.amount)}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="payerName"
            label="Họ tên người nhận hoàn"
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên người nhận hoàn' }]}
          >
            <Input placeholder="Họ tên người nhận tiền hoàn" />
          </Form.Item>

          <Form.Item
            name="payerEmail"
            label="Email người nhận hoàn"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập email người nhận hoàn' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item name="payerPhone" label="Số điện thoại người nhận hoàn">
            <Input placeholder="Số điện thoại liên hệ" />
          </Form.Item>

          <Form.Item
            name="refundedAt"
            label="Ngày hoàn tiền"
            rules={[{ required: true, message: 'Vui lòng chọn ngày hoàn tiền' }]}
          >
            <DatePicker showTime className="w-full" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Số tiền hoàn"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền hoàn' }]}
          >
            <InputNumber<number>
              min={0.01}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(`${value ?? ''}`.replace(/,/g, ''))}
              addonAfter="₫"
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Phương thức hoàn tiền"
            rules={[{ required: true, message: 'Vui lòng chọn phương thức hoàn tiền' }]}
          >
            <Select
              options={[
                { value: 'CASH', label: 'Tiền mặt' },
                { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
              ]}
            />
          </Form.Item>

          <Form.Item name="transactionReference" label="Mã giao dịch hoàn tiền (tuỳ chọn)">
            <Input placeholder="Mã giao dịch ngân hàng / số phiếu chi" />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do hoàn tiền"
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do hoàn tiền' }]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: Học viên xin nghỉ trước khai giảng..." />
          </Form.Item>

          <Form.Item
            name="proofUrl"
            label="Ảnh minh chứng hoàn tiền"
            rules={[{ required: true, message: 'Vui lòng tải ảnh minh chứng hoàn tiền' }]}
            extra="Bắt buộc với cả hoàn tiền mặt và chuyển khoản."
          >
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
              <Descriptions.Item label="Hóa đơn gốc">
                {detailInvoice.originalInvoiceCode
                  || (detailInvoice.originalInvoiceId ? `#${detailInvoice.originalInvoiceId}` : '—')}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={detailInvoice.status === 'PAID' ? 'green' : 'default'}>
                  {detailInvoice.status === 'PAID' ? 'Đã hoàn tiền' : statusLabels[detailInvoice.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">{moneyText(detailInvoice.amount)}</Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                {detailInvoice.paymentMethod ? methodLabels[detailInvoice.paymentMethod] ?? detailInvoice.paymentMethod : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Mã giao dịch">{detailInvoice.transactionReference || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày hoàn">{dateText(detailInvoice.paidAt)}</Descriptions.Item>
              <Descriptions.Item label="Người xác nhận">{detailInvoice.confirmedBy ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Lý do" span={2}>
                {detailInvoice.reason || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ảnh minh chứng" span={2}>
                {detailInvoice.paymentProofUrl ? (
                  <Image
                    src={detailInvoice.paymentProofUrl}
                    alt="Ảnh minh chứng hoàn tiền"
                    width={220}
                    style={{ borderRadius: 8, objectFit: 'cover' }}
                  />
                ) : '—'}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="Người nhận hoàn" bordered size="small" column={2}>
              <Descriptions.Item label="Họ tên">{detailInvoice.ownerName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailInvoice.ownerEmail || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{detailInvoice.ownerPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khóa học">
                {detailInvoice.courseTitle || `Khóa học #${detailInvoice.courseId}`}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};

export default RefundPage;
