import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Tag, Typography } from 'antd';
import { SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { publicCertificateApi } from '@/services/api/certificate';
import type { PublicCertificateResponse } from '@/services/types/certificate';

const { Title, Text, Paragraph } = Typography;

export default function VerifyCertificatePage() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const [code, setCode] = useState(routeCode ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicCertificateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setError('Vui lòng nhập mã chứng chỉ');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await publicCertificateApi.verify(trimmed));
    } catch (err) {
      setError((err as { message?: string })?.message || 'Không tìm thấy chứng chỉ với mã này');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeCode) {
      setCode(routeCode);
      void lookup(routeCode);
    }
  }, [routeCode, lookup]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <SafetyCertificateOutlined style={{ fontSize: 42, color: '#1677ff' }} />
        <Title level={2} style={{ margin: '12px 0 6px' }}>Tra cứu chứng chỉ</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Nhập mã chứng chỉ in trên tài liệu để xác thực thông tin do ECMS cấp.
        </Paragraph>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            size="large"
            placeholder="Ví dụ: ECMS-1A2B3C4D5E6F"
            prefix={<SearchOutlined />}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onPressEnter={() => void lookup(code)}
            allowClear
          />
          <Button type="primary" size="large" loading={loading} onClick={() => void lookup(code)}>
            Tra cứu
          </Button>
        </div>

        {error && (
          <Alert
            className="mt-4"
            type="error"
            showIcon
            message="Không tìm thấy chứng chỉ"
            description={error}
          />
        )}

        {result && (
          <div className="mt-5">
            <Alert
              type={result.status === 'ISSUED' ? 'success' : 'error'}
              showIcon
              message={result.status === 'ISSUED' ? 'Chứng chỉ hợp lệ' : 'Chứng chỉ đã bị thu hồi'}
              description={
                result.status === 'ISSUED'
                  ? 'Thông tin bên dưới khớp với dữ liệu do ECMS cấp.'
                  : `Chứng chỉ này đã bị thu hồi${result.revokedAt ? ` ngày ${dayjs(result.revokedAt).format('DD/MM/YYYY')}` : ''}.`
              }
            />
            <Descriptions bordered column={1} size="middle" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Mã chứng chỉ">
                <Text strong copyable>{result.certificateCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Học viên">{result.studentName}</Descriptions.Item>
              <Descriptions.Item label="Khóa học">{result.courseTitle}</Descriptions.Item>
              <Descriptions.Item label="Ngày cấp">
                {dayjs(result.issuedAt).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={result.status === 'ISSUED' ? 'green' : 'red'}>
                  {result.status === 'ISSUED' ? 'Đã cấp' : 'Đã thu hồi'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Card>
    </div>
  );
}
