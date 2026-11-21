import { useEffect, useState } from 'react';
import { Table, Card, Progress, Tag, Space, Typography, Row, Col, Statistic, Button, Input } from 'antd';
import {
  TrophyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SearchOutlined,
  ReloadOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import { leadApi } from '@/services/api/leads';
import type { ConsultantPerformance } from '@/services/types/lead';
import UserAvatar from '@/components/common/UserAvatar';

const { Title } = Typography;

export const ConsultantPerformanceTable = () => {
  const [data, setData] = useState<ConsultantPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await leadApi.getPerformance();
      setData(res || []);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải báo cáo hiệu suất tư vấn viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const filteredData = data.filter((item) => {
    if (!keyword.trim()) return true;
    const kw = keyword.toLowerCase();
    return (
      item.name.toLowerCase().includes(kw) ||
      item.email.toLowerCase().includes(kw) ||
      (item.phone && item.phone.includes(kw))
    );
  });

  // Calculate overall metrics
  const totalLeadsAll = data.reduce((sum, item) => sum + item.totalLeads, 0);
  const totalConvertedAll = data.reduce((sum, item) => sum + item.convertedLeads, 0);
  const avgConversionRate =
    totalLeadsAll > 0
      ? Math.round(((totalConvertedAll / totalLeadsAll) * 100) * 10) / 10
      : 0;

  const renderTierTag = (tier: string) => {
    switch (tier) {
      case 'EXCELLENT':
        return (
          <Tag color="success" style={{ fontWeight: 700, borderRadius: 12, padding: '2px 10px' }}>
            🏆 Xuất sắc (Hạng A)
          </Tag>
        );
      case 'STANDARD':
        return (
          <Tag color="blue" style={{ fontWeight: 600, borderRadius: 12, padding: '2px 10px' }}>
            ⭐ Đạt chỉ tiêu (Hạng B)
          </Tag>
        );
      default:
        return (
          <Tag color="warning" style={{ fontWeight: 500, borderRadius: 12, padding: '2px 10px' }}>
            ⚠️ Cần cải thiện (Hạng C)
          </Tag>
        );
    }
  };

  const renderWorkStatusTag = (status: string) => {
    switch (status) {
      case 'BUSY':
        return (
          <Tag color="warning" style={{ borderRadius: 10 }}>
            🟡 Đang tư vấn
          </Tag>
        );
      case 'ON_LEAVE':
        return (
          <Tag color="default" style={{ borderRadius: 10 }}>
            🟠 Nghỉ phép
          </Tag>
        );
      case 'SICK_LEAVE':
        return (
          <Tag color="error" style={{ borderRadius: 10 }}>
            🔴 Nghỉ bệnh
          </Tag>
        );
      default:
        return (
          <Tag color="success" style={{ borderRadius: 10 }}>
            🟢 Sẵn sàng nhận khách
          </Tag>
        );
    }
  };

  const columns = [
    {
      title: 'Tư vấn viên',
      key: 'consultant',
      width: 250,
      render: (_: unknown, record: ConsultantPerformance) => (
        <Space size={12}>
          <UserAvatar name={record.name} size={38} />
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
              {record.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {record.email} {record.phone ? `· ${record.phone}` : ''}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Ca trực',
      dataIndex: 'workStatus',
      width: 170,
      render: (status: string) => renderWorkStatusTag(status),
    },
    {
      title: 'Tổng Lead nhận',
      dataIndex: 'totalLeads',
      width: 130,
      align: 'center' as const,
      sorter: (a: ConsultantPerformance, b: ConsultantPerformance) => a.totalLeads - b.totalLeads,
      render: (val: number) => (
        <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Đang tư vấn',
      dataIndex: 'inProgressLeads',
      width: 120,
      align: 'center' as const,
      render: (val: number) => (
        <Tag color="purple" style={{ fontWeight: 600, borderRadius: 8 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Đã tư vấn',
      dataIndex: 'consultedLeads',
      width: 120,
      align: 'center' as const,
      render: (val: number) => (
        <Tag color="blue" style={{ fontWeight: 600, borderRadius: 8 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Chốt thành công',
      dataIndex: 'convertedLeads',
      width: 140,
      align: 'center' as const,
      sorter: (a: ConsultantPerformance, b: ConsultantPerformance) => a.convertedLeads - b.convertedLeads,
      render: (val: number) => (
        <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 700, borderRadius: 8 }}>
          {val} học viên
        </Tag>
      ),
    },
    {
      title: 'Tỷ lệ chốt (%)',
      key: 'conversionRate',
      width: 220,
      sorter: (a: ConsultantPerformance, b: ConsultantPerformance) => a.conversionRate - b.conversionRate,
      render: (_: unknown, record: ConsultantPerformance) => (
        <div style={{ width: 180 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
              {record.conversionRate}%
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {record.convertedLeads}/{record.totalLeads} khách
            </span>
          </div>
          <Progress
            percent={record.conversionRate}
            showInfo={false}
            size="small"
            strokeColor={
              record.conversionRate >= 30
                ? '#10b981'
                : record.conversionRate >= 15
                ? '#3b82f6'
                : '#f59e0b'
            }
          />
        </div>
      ),
    },
    {
      title: 'Đánh giá xếp loại',
      dataIndex: 'performanceTier',
      width: 180,
      render: (tier: string) => renderTierTag(tier),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── KPI Summary Cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Đội ngũ Tư vấn viên</span>}
              value={data.length}
              prefix={<UserOutlined style={{ color: '#3b82f6' }} />}
              suffix="nhân sự"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Tổng khách hàng đã tiếp nhận</span>}
              value={totalLeadsAll}
              prefix={<SyncOutlined style={{ color: '#8b5cf6' }} />}
              suffix="leads"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Chốt học viên thành công</span>}
              value={totalConvertedAll}
              valueStyle={{ color: '#10b981' }}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              suffix="học viên"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 13 }}>Tỷ lệ chốt trung bình toàn đội</span>}
              value={avgConversionRate}
              precision={1}
              valueStyle={{ color: '#0ea5e9', fontWeight: 700 }}
              prefix={<TrophyOutlined style={{ color: '#0ea5e9' }} />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* ── Table Card ── */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Space size={8}>
              <PieChartOutlined style={{ color: '#2563eb', fontSize: 18 }} />
              <Title level={5} style={{ margin: 0 }}>
                Bảng Xếp Hạng & Báo Cáo Hiệu Suất Tư Vấn Viên
              </Title>
            </Space>
            <Space wrap>
              <Input
                placeholder="Tìm kiếm tư vấn viên..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 240, height: 38, borderRadius: 8 }}
                allowClear
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchPerformance}
                loading={loading}
                style={{ height: 38, borderRadius: 8 }}
              >
                Làm mới
              </Button>
            </Space>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="consultantId"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} tư vấn viên` }}
        />
      </Card>
    </div>
  );
};

export default ConsultantPerformanceTable;
