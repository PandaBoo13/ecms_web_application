import { Card, Row, Col, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

const { Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

const MOCK_WEEKLY_PROGRESS = {
  labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Tuần 6', 'Tuần 7', 'Tuần 8'],
  values: [5, 15, 28, 42, 55, 62, 68, 72],
};

const MOCK_DISTRIBUTION = {
  labels: ['Chưa bắt đầu', 'Đang học', 'Hoàn thành', 'Tạm dừng'],
  values: [3, 20, 12, 7],
  colors: ['#94a3b8', '#1677ff', '#52c41a', '#faad14'],
};

interface Props {
  courseId: number;
}

const CourseProgressCharts = ({ courseId }: Props) => {
  const weekly = MOCK_WEEKLY_PROGRESS;
  const dist = MOCK_DISTRIBUTION;

  // Line Chart
  const lineData = {
    labels: weekly.labels,
    datasets: [
      {
        label: 'Tiến độ TB (%)',
        data: weekly.values,
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
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx: any) => `Tiến độ: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25,
          callback: (v: any) => `${v}%`,
          font: { size: 11 },
          color: '#94a3b8',
        },
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#64748b' },
        border: { display: false },
      },
    },
  };

  // Doughnut Chart
  const doughnutData = {
    labels: dist.labels,
    datasets: [
      {
        data: dist.values,
        backgroundColor: dist.colors,
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 12,
          font: { size: 11.5 },
          color: '#475569',
          usePointStyle: true,
          pointStyle: 'circle' as const,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
            return `${ctx.label}: ${ctx.parsed} HV (${pct}%)`;
          },
        },
      },
    },
  };

  const total = dist.values.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[14px] font-semibold text-slate-900">
          Biểu đồ tiến độ
        </span>
        <Tag color="orange" className="!m-0 !text-[10px] !leading-[16px]">
          MOCK
        </Tag>
        <Tooltip title="Dữ liệu đang là mock, sẽ thay bằng API khi BE sẵn sàng">
          <InfoCircleOutlined className="text-[12px] text-slate-400" />
        </Tooltip>
      </div>

      <Row gutter={[16, 16]} data-course-id={courseId}>
        <Col xs={24} lg={14}>
          <Card
            size="small"
            bordered
            style={{ borderRadius: 10, border: '1px solid #e2e8f0', height: '100%' }}
            title={<span style={{ fontSize: 13, fontWeight: 600 }}>Tiến độ trung bình theo tuần</span>}
            bodyStyle={{ padding: 14 }}
          >
            <div style={{ height: 260 }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            size="small"
            bordered
            style={{ borderRadius: 10, border: '1px solid #e2e8f0', height: '100%' }}
            title={
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 13, fontWeight: 600 }}>Phân bố học viên</span>
                <Text type="secondary" style={{ fontSize: 11.5 }}>
                  {total} HV
                </Text>
              </div>
            }
            bodyStyle={{ padding: 14 }}
          >
            <div style={{ height: 260 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CourseProgressCharts;