import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  DatePicker,
  Button,
  Tag,
  Table,
  Progress,
  Avatar,
  Space,
  Spin,
  Empty,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TeamOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  RiseOutlined,
  ReloadOutlined,
  TrophyOutlined,
  UserOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

import { useAuth } from '@/hooks/useAuth';
import { leadApi } from '@/services/api/leads';
import type { LeadStatisticsResponse, ConsultantPerformance } from '@/services/types/lead';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

const DATE_PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: 'Tháng 11/2026 (Hiện tại)', value: [dayjs('2026-11-01').startOf('day'), dayjs('2026-11-30').endOf('day')] },
  { label: '7 ngày qua (Tháng 11)', value: [dayjs('2026-11-13').startOf('day'), dayjs('2026-11-19').endOf('day')] },
  { label: 'Hôm nay (19/11/2026)', value: [dayjs('2026-11-19').startOf('day'), dayjs('2026-11-19').endOf('day')] },
  { label: 'Cả năm 2026', value: [dayjs('2026-01-01').startOf('day'), dayjs('2026-12-31').endOf('day')] },
  { label: 'Năm nay (Theo máy)', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
];

const WORK_STATUS_TAGS: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Sẵn sàng nhận khách', color: 'success' },
  BUSY: { label: 'Đang bận tư vấn', color: 'warning' },
  ON_LEAVE: { label: 'Nghỉ phép', color: 'default' },
  SICK_LEAVE: { label: 'Nghỉ bệnh', color: 'error' },
  RESIGNED: { label: 'Nghỉ việc', color: 'default' },
};

const ConsultantStatisticsPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isConsultant } = useAuth();

  const isConsultantOnly = !isAdmin() && isConsultant();

  // Mặc định null để hiển thị toàn bộ dữ liệu ngay lập tức, không bị ảnh hưởng bởi lệch năm
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState<number | undefined>(
    isConsultantOnly ? user?.accountId : undefined
  );
  const [consultantsList, setConsultantsList] = useState<{ id: number; name: string; email: string }[]>([]);
  const [data, setData] = useState<LeadStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConsultantOnly && user?.accountId && !selectedConsultantId) {
      setSelectedConsultantId(user.accountId);
    }
  }, [isConsultantOnly, user?.accountId]);

  // Load danh sách TVV nếu là Admin / Manager
  useEffect(() => {
    if (!isConsultantOnly) {
      leadApi.getConsultants().then(setConsultantsList).catch(() => {});
    }
  }, [isConsultantOnly]);

  // Load thống kê
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: { consultantId?: number; startDate?: string; endDate?: string } = {};
      if (selectedConsultantId) params.consultantId = selectedConsultantId;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DDTHH:mm:ss');
        params.endDate = dateRange[1].format('YYYY-MM-DDTHH:mm:ss');
      }
      const res = await leadApi.getStatistics(params);
      setData(res);
    } catch (err: any) {
      console.error('Lỗi khi tải thống kê tư vấn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedConsultantId]);

  // ═════ Line Chart Config (Học viên tích lũy theo thời gian) ═════
  const lineChartData = useMemo(() => {
    const timeline = data?.timeline || [];
    if (timeline.length === 0) {
      return {
        labels: ['Chưa có dữ liệu'],
        cumulativeConverted: [0],
        cumulativeLeads: [0],
      };
    }
    return {
      labels: timeline.map((t) => t.period),
      cumulativeConverted: timeline.map((t) => t.cumulativeConverted),
      cumulativeLeads: timeline.map((t) => t.cumulativeLeads),
    };
  }, [data]);

  const lineData = {
    labels: lineChartData.labels,
    datasets: [
      {
        label: 'Học viên chuyển đổi tích lũy',
        data: lineChartData.cumulativeConverted,
        borderColor: '#1677ff',
        backgroundColor: 'rgba(22, 119, 255, 0.12)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#1677ff',
        pointBorderWidth: 2,
      },
      {
        label: 'Tổng khách nhận tích lũy',
        data: lineChartData.cumulativeLeads,
        borderColor: '#8b5cf6',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#8b5cf6',
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b' },
        border: { display: false },
      },
    },
  };

  // ═════ Doughnut Chart Config (Phân bổ học viên) ═════
  const distributionData = useMemo(() => {
    const list = data?.distribution || [];
    return {
      labels: list.map((d) => d.label),
      values: list.map((d) => d.count),
      colors: list.map((d) => d.color),
    };
  }, [data]);

  const doughnutData = {
    labels: distributionData.labels,
    datasets: [
      {
        data: distributionData.values,
        backgroundColor: distributionData.colors,
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
  };

  // ═════ Table Columns (Quản lý so sánh TVV) ═════
  const consultantColumns: ColumnsType<ConsultantPerformance> = [
    {
      title: 'Tư vấn viên',
      key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />}>
            {r.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{r.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Trạng thái ca trực',
      key: 'workStatus',
      render: (_, r) => {
        const item = WORK_STATUS_TAGS[r.workStatus] || { label: r.workStatus, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Khách tiếp nhận',
      dataIndex: 'totalLeads',
      key: 'totalLeads',
      sorter: (a, b) => a.totalLeads - b.totalLeads,
      align: 'center',
    },
    {
      title: 'Đang tư vấn',
      dataIndex: 'inProgressLeads',
      key: 'inProgressLeads',
      align: 'center',
    },
    {
      title: 'Thành học viên',
      dataIndex: 'convertedLeads',
      key: 'convertedLeads',
      sorter: (a, b) => a.convertedLeads - b.convertedLeads,
      align: 'center',
      render: (v) => <Tag color="green" style={{ fontWeight: 600 }}>{v} HV</Tag>,
    },
    {
      title: 'Tỷ lệ chốt',
      key: 'conversionRate',
      sorter: (a, b) => a.conversionRate - b.conversionRate,
      render: (_, r) => (
        <div style={{ width: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <Text strong>{r.conversionRate}%</Text>
          </div>
          <Progress
            percent={r.conversionRate}
            showInfo={false}
            strokeColor={r.conversionRate >= 30 ? '#52c41a' : r.conversionRate >= 15 ? '#1677ff' : '#faad14'}
            size="small"
          />
        </div>
      ),
    },
    {
      title: 'Đánh giá',
      key: 'performanceTier',
      align: 'center',
      render: (_, r) => {
        const tier = (r as any).performanceTier;
        if (tier === 'EXCELLENT') return <Tag color="gold" icon={<TrophyOutlined />}>Xuất sắc</Tag>;
        if (tier === 'STANDARD') return <Tag color="blue">Đạt chuẩn</Tag>;
        return <Tag color="default">Cần cố gắng</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: '4px 0 24px' }}>
      {/* ═══ Header & Bộ lọc ═══ */}
      <Card style={{ marginBottom: 20, borderRadius: 12 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Title level={4} style={{ margin: 0 }}>
              {isConsultantOnly
                ? `Báo cáo hiệu suất tư vấn: ${user?.fullName || 'Tư vấn viên'}`
                : 'Thống kê tuyển sinh & Hiệu suất tư vấn viên'}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {isConsultantOnly
                ? 'Theo dõi lượng khách tiếp nhận và học viên chuyển đổi của bản thân theo thời gian'
                : 'Báo cáo tổng quan năng lực đội ngũ tư vấn viên, tỷ lệ chuyển đổi và phân bổ khách hàng'}
            </Text>
          </Col>
          <Col xs={24} md={12} style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            {!isConsultantOnly && (
              <Select
                placeholder="Tất cả tư vấn viên"
                allowClear
                style={{ width: 200 }}
                value={selectedConsultantId}
                onChange={setSelectedConsultantId}
                options={consultantsList.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            )}
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              presets={DATE_PRESETS}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              allowClear
            />
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/leads')}>
              Danh sách Lead
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ═══ Thẻ KPI tóm tắt ═══ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tổng khách tiếp nhận"
              value={data?.totalLeads || 0}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
              suffix="KH"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Đang trong quá trình tư vấn"
              value={data?.inProgressLeads || 0}
              prefix={<PhoneOutlined style={{ color: '#faad14' }} />}
              suffix="KH"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Chuyển thành học viên"
              value={data?.convertedLeads || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
              suffix="HV"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Tỷ lệ chốt thành công"
              value={data?.conversionRate || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<RiseOutlined />}
              suffix="%"
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {/* ═══ Khối Biểu đồ theo dõi (Chuẩn theo thiết kế mẫu) ═══ */}
      <Card
        title={
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            Biểu đồ theo dõi học viên & khách hàng
          </span>
        }
        style={{ marginBottom: 20, borderRadius: 12 }}
      >
        <Row gutter={[24, 24]}>
          {/* Biểu đồ đường tích lũy */}
          <Col xs={24} lg={15}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14 }}>
                Học viên & khách hàng tích lũy theo thời gian
              </Text>
            </div>
            <div style={{ height: 280, position: 'relative' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Spin size="large" />
                </div>
              ) : lineChartData.labels.length === 0 ? (
                <Empty description="Chưa có dữ liệu trong khoảng thời gian này" />
              ) : (
                <Line data={lineData} options={lineOptions} />
              )}
            </div>
          </Col>

          {/* Biểu đồ tròn phân bổ */}
          <Col xs={24} lg={9}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14 }}>
                Phân bổ trạng thái khách hàng
              </Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                {data?.totalLeads || 0} KH
              </Text>
            </div>
            <div style={{ height: 210, position: 'relative' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Spin />
                </div>
              ) : (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              )}
            </div>
            {/* Custom Legend */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px 16px',
                marginTop: 16,
              }}
            >
              {data?.distribution?.map((d) => (
                <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: d.color,
                      display: 'inline-block',
                    }}
                  />
                  <span>{d.label}</span>
                  <Text strong style={{ color: '#64748b' }}>({d.count})</Text>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* ═══ Bảng so sánh hiệu suất các TVV (Quản lý / Admin) ═══ */}
      {!isConsultantOnly && data?.consultants && data.consultants.length > 0 && (
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                Bảng hiệu suất & xếp hạng nhân viên tư vấn
              </span>
              <Tag color="blue">{data.consultants.length} Tư vấn viên</Tag>
            </div>
          }
          style={{ borderRadius: 12 }}
        >
          <Table
            columns={consultantColumns}
            dataSource={data.consultants}
            rowKey="consultantId"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </Card>
      )}
    </div>
  );
};

export default ConsultantStatisticsPage;
