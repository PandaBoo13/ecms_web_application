import { useCallback, useEffect, useState } from 'react';
import { Button, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FilePdfOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { certificateApi } from '@/services/api/certificate';
import type { CertificateResponse, CertificateStatus } from '@/services/types/certificate';

const { Text } = Typography;

const STATUS_LABELS: Record<CertificateStatus, string> = {
  ISSUED: 'Đã cấp',
  REVOKED: 'Đã thu hồi',
};

export default function CertificatePage() {
  const [certificates, setCertificates] = useState<CertificateResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    try {
      setCertificates(await certificateApi.myCertificates());
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được chứng chỉ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  const columns: ColumnsType<CertificateResponse> = [
    {
      title: 'Mã chứng chỉ',
      dataIndex: 'certificateCode',
      width: 190,
      render: (value: string) => <Text strong copyable>{value}</Text>,
    },
    {
      title: 'Khóa học',
      dataIndex: 'courseTitle',
      render: (value: string, row) => value || `Khóa học #${row.courseId}`,
    },
    {
      title: 'Điểm cuối khóa',
      dataIndex: 'finalScore',
      width: 130,
      render: (value: number | null) => value ?? '—',
    },
    {
      title: 'Ngày cấp',
      dataIndex: 'issuedAt',
      width: 150,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
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
      width: 210,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            disabled={row.status === 'REVOKED'}
            onClick={() => window.open(certificateApi.fileUrl(row.certificateId), '_blank', 'noopener,noreferrer')}
          >
            Xem PDF
          </Button>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => window.open(`/verify/${encodeURIComponent(row.certificateCode)}`, '_blank', 'noopener,noreferrer')}
          >
            Tra cứu
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Chứng chỉ"
        subtitle="Chứng chỉ do trung tâm cấp sau khi bạn hoàn thành khóa học offline. Mỗi chứng chỉ có một mã tra cứu riêng."
      />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => void loadCertificates()}>Tải lại</Button>
      </div>
      <Table
        rowKey="certificateId"
        columns={columns}
        dataSource={certificates}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 950 }}
        locale={{ emptyText: 'Bạn chưa có chứng chỉ nào.' }}
      />
    </PageContainer>
  );
}
