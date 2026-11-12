import { useCallback, useEffect, useState } from 'react';
import {
  Button, Descriptions, Input, Modal, Select, Table, Tabs, Tag, Typography, Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  FilePdfOutlined, ReloadOutlined, SafetyCertificateOutlined, UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { certificateApi } from '@/services/api/certificate';
import { showError } from '@/utils/errorHelper';
import type {
  CertificateEligibleResponse, CertificateResponse, CertificateStatus,
} from '@/services/types/certificate';

const { Text } = Typography;

const STATUS_LABELS: Record<CertificateStatus, string> = {
  ISSUED: 'Đã cấp',
  REVOKED: 'Đã thu hồi',
};

export default function CertificatePage() {
  const [activeTab, setActiveTab] = useState<'eligible' | 'issued'>('eligible');

  const [eligibleRows, setEligibleRows] = useState<CertificateEligibleResponse[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligiblePage, setEligiblePage] = useState(0);
  const [eligibleSize, setEligibleSize] = useState(20);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [eligibleSearchInput, setEligibleSearchInput] = useState('');
  const [eligibleSearch, setEligibleSearch] = useState('');

  const [issuedRows, setIssuedRows] = useState<CertificateResponse[]>([]);
  const [issuedLoading, setIssuedLoading] = useState(false);
  const [issuedPage, setIssuedPage] = useState(0);
  const [issuedSize, setIssuedSize] = useState(20);
  const [issuedTotal, setIssuedTotal] = useState(0);
  const [issuedSearchInput, setIssuedSearchInput] = useState('');
  const [issuedSearch, setIssuedSearch] = useState('');
  const [issuedStatus, setIssuedStatus] = useState<CertificateStatus | undefined>();

  const [issuing, setIssuing] = useState<CertificateEligibleResponse | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [revoking, setRevoking] = useState<CertificateResponse | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingSubmitting, setRevokingSubmitting] = useState(false);

  const loadEligible = useCallback(async () => {
    setEligibleLoading(true);
    try {
      const page = await certificateApi.listEligible({
        page: eligiblePage,
        size: eligibleSize,
        search: eligibleSearch || undefined,
      });
      setEligibleRows(page.content ?? []);
      setEligibleTotal(page.totalElements ?? 0);
    } catch (err) {
      showError(err, 'Không tải được danh sách đủ điều kiện cấp chứng chỉ');
    } finally {
      setEligibleLoading(false);
    }
  }, [eligiblePage, eligibleSize, eligibleSearch]);

  const loadIssued = useCallback(async () => {
    setIssuedLoading(true);
    try {
      const page = await certificateApi.list({
        page: issuedPage,
        size: issuedSize,
        search: issuedSearch || undefined,
        status: issuedStatus,
      });
      setIssuedRows(page.content ?? []);
      setIssuedTotal(page.totalElements ?? 0);
    } catch (err) {
      showError(err, 'Không tải được danh sách chứng chỉ');
    } finally {
      setIssuedLoading(false);
    }
  }, [issuedPage, issuedSize, issuedSearch, issuedStatus]);

  useEffect(() => {
    if (activeTab === 'eligible') void loadEligible();
  }, [activeTab, loadEligible]);

  useEffect(() => {
    if (activeTab === 'issued') void loadIssued();
  }, [activeTab, loadIssued]);

  const openIssue = (row: CertificateEligibleResponse) => {
    setIssuing(row);
    setFileList([]);
  };

  const submitIssue = async () => {
    if (!issuing) return;
    const file = fileList[0]?.originFileObj;
    if (!file) {
      toast.error('Vui lòng chọn tệp PDF chứng chỉ');
      return;
    }
    setSubmitting(true);
    try {
      await certificateApi.issue(issuing.enrollmentId, file as File);
      toast.success('Cấp chứng chỉ thành công');
      setIssuing(null);
      setFileList([]);
      await Promise.all([loadEligible(), loadIssued()]);
    } catch (err) {
      showError(err, 'Không cấp được chứng chỉ');
    } finally {
      setSubmitting(false);
    }
  };

  const submitRevoke = async () => {
    if (!revoking) return;
    if (!revokeReason.trim()) {
      toast.error('Vui lòng nhập lý do thu hồi');
      return;
    }
    setRevokingSubmitting(true);
    try {
      await certificateApi.revoke(revoking.certificateId, revokeReason.trim());
      toast.success('Thu hồi chứng chỉ thành công');
      setRevoking(null);
      setRevokeReason('');
      await loadIssued();
    } catch (err) {
      showError(err, 'Không thu hồi được chứng chỉ');
    } finally {
      setRevokingSubmitting(false);
    }
  };

  const eligibleColumns: ColumnsType<CertificateEligibleResponse> = [
    {
      title: 'Mã GD',
      dataIndex: 'enrollmentId',
      width: 90,
      render: (value: number) => <Text strong>#{value}</Text>,
    },
    {
      title: 'Học viên',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {row.studentName || (row.studentId ? `Học viên #${row.studentId}` : '—')}
          </div>
          {row.studentCode && <Text type="secondary" style={{ fontSize: 12 }}>Mã: {row.studentCode}</Text>}
          {row.studentEmail && <div style={{ fontSize: 12, color: '#64748b' }}>{row.studentEmail}</div>}
        </div>
      ),
    },
    {
      title: 'Khóa học',
      dataIndex: 'courseTitle',
      render: (value: string | null, row) => value || `Khóa học #${row.courseId}`,
    },
    {
      title: 'Điểm cuối khóa',
      dataIndex: 'finalScore',
      width: 130,
      render: (value: number | null) => value ?? '—',
    },
    {
      title: 'Hoàn thành lúc',
      dataIndex: 'completedAt',
      width: 160,
      render: (value: string | null) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, row) => (
        <Button type="primary" size="small" icon={<SafetyCertificateOutlined />} onClick={() => openIssue(row)}>
          Cấp chứng chỉ
        </Button>
      ),
    },
  ];

  const issuedColumns: ColumnsType<CertificateResponse> = [
    {
      title: 'Mã chứng chỉ',
      dataIndex: 'certificateCode',
      width: 180,
      render: (value: string) => <Text strong copyable>{value}</Text>,
    },
    {
      title: 'Học viên',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{row.studentName}</div>
          {row.studentCode && <Text type="secondary" style={{ fontSize: 12 }}>Mã: {row.studentCode}</Text>}
        </div>
      ),
    },
    {
      title: 'Khóa học',
      dataIndex: 'courseTitle',
    },
    {
      title: 'Ngày cấp',
      dataIndex: 'issuedAt',
      width: 160,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (value: CertificateStatus) => (
        <Tag color={value === 'ISSUED' ? 'green' : 'red'}>{STATUS_LABELS[value]}</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 190,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => window.open(certificateApi.fileUrl(row.certificateId), '_blank', 'noopener,noreferrer')}
          >
            Xem PDF
          </Button>
          {row.status === 'ISSUED' && (
            <Button danger size="small" onClick={() => { setRevoking(row); setRevokeReason(''); }}>
              Thu hồi
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý chứng chỉ"
        subtitle="Chỉ cấp chứng chỉ cho ghi danh OFFLINE đã hoàn thành. Trung tâm tải lên tệp PDF đã ký/đóng dấu."
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'eligible' | 'issued')}
        items={[
          {
            key: 'eligible',
            label: 'Đủ điều kiện cấp',
            children: (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                  <Input.Search
                    allowClear
                    placeholder="Tìm học viên, mã học viên, email hoặc khóa học"
                    style={{ width: 360 }}
                    value={eligibleSearchInput}
                    onChange={(event) => {
                      setEligibleSearchInput(event.target.value);
                      if (!event.target.value) {
                        setEligibleSearch('');
                        setEligiblePage(0);
                      }
                    }}
                    onSearch={(value) => {
                      setEligibleSearch(value.trim());
                      setEligiblePage(0);
                    }}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => void loadEligible()}>Tải lại</Button>
                </div>
                <Table
                  rowKey="enrollmentId"
                  columns={eligibleColumns}
                  dataSource={eligibleRows}
                  loading={eligibleLoading}
                  scroll={{ x: 950 }}
                  pagination={{
                    current: eligiblePage + 1,
                    pageSize: eligibleSize,
                    total: eligibleTotal,
                    showSizeChanger: true,
                    onChange: (page, size) => {
                      setEligiblePage(page - 1);
                      setEligibleSize(size);
                    },
                  }}
                />
              </>
            ),
          },
          {
            key: 'issued',
            label: 'Đã cấp',
            children: (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                  <Input.Search
                    allowClear
                    placeholder="Tìm mã chứng chỉ, học viên hoặc khóa học"
                    style={{ width: 340 }}
                    value={issuedSearchInput}
                    onChange={(event) => {
                      setIssuedSearchInput(event.target.value);
                      if (!event.target.value) {
                        setIssuedSearch('');
                        setIssuedPage(0);
                      }
                    }}
                    onSearch={(value) => {
                      setIssuedSearch(value.trim());
                      setIssuedPage(0);
                    }}
                  />
                  <Select
                    style={{ width: 180 }}
                    value={issuedStatus ?? ''}
                    onChange={(value) => {
                      setIssuedStatus(value ? (value as CertificateStatus) : undefined);
                      setIssuedPage(0);
                    }}
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      { value: 'ISSUED', label: STATUS_LABELS.ISSUED },
                      { value: 'REVOKED', label: STATUS_LABELS.REVOKED },
                    ]}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => void loadIssued()}>Tải lại</Button>
                </div>
                <Table
                  rowKey="certificateId"
                  columns={issuedColumns}
                  dataSource={issuedRows}
                  loading={issuedLoading}
                  scroll={{ x: 1050 }}
                  pagination={{
                    current: issuedPage + 1,
                    pageSize: issuedSize,
                    total: issuedTotal,
                    showSizeChanger: true,
                    onChange: (page, size) => {
                      setIssuedPage(page - 1);
                      setIssuedSize(size);
                    },
                  }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        open={Boolean(issuing)}
        title="Cấp chứng chỉ"
        okText="Cấp chứng chỉ"
        cancelText="Hủy"
        confirmLoading={submitting}
        okButtonProps={{ disabled: fileList.length === 0 }}
        onOk={() => void submitIssue()}
        onCancel={() => { setIssuing(null); setFileList([]); }}
        destroyOnHidden
      >
        {issuing && (
          <Descriptions column={1} size="small" className="mb-4">
            <Descriptions.Item label="Học viên">{issuing.studentName || `#${issuing.studentId}`}</Descriptions.Item>
            <Descriptions.Item label="Khóa học">{issuing.courseTitle || `#${issuing.courseId}`}</Descriptions.Item>
            <Descriptions.Item label="Mã ghi danh">#{issuing.enrollmentId}</Descriptions.Item>
          </Descriptions>
        )}
        <Upload
          accept=".pdf,application/pdf"
          maxCount={1}
          fileList={fileList}
          beforeUpload={(file) => {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
              toast.error('Chỉ chấp nhận tệp PDF');
              return Upload.LIST_IGNORE;
            }
            if (file.size > 10 * 1024 * 1024) {
              toast.error('Tệp chứng chỉ tối đa 10MB');
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          onChange={({ fileList: next }) => setFileList(next.slice(-1))}
        >
          <Button icon={<UploadOutlined />}>Chọn tệp PDF chứng chỉ</Button>
        </Upload>
      </Modal>

      <Modal
        open={Boolean(revoking)}
        title="Thu hồi chứng chỉ"
        okText="Thu hồi"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={revokingSubmitting}
        onOk={() => void submitRevoke()}
        onCancel={() => { setRevoking(null); setRevokeReason(''); }}
      >
        {revoking && (
          <p>
            Chứng chỉ <Text strong>{revoking.certificateCode}</Text> của học viên{' '}
            <Text strong>{revoking.studentName}</Text> sẽ không còn hiệu lực tra cứu.
          </p>
        )}
        <Input.TextArea
          rows={3}
          placeholder="Lý do thu hồi (bắt buộc)"
          value={revokeReason}
          onChange={(event) => setRevokeReason(event.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </PageContainer>
  );
}
