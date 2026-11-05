import { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Typography, Spin, Empty } from 'antd';
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
import { studentApi } from '@/services/api/students';
import type { Student } from '@/services/types/student';

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

interface Props {
  courseId: number;
}

const CourseProgressCharts = ({ courseId }: Props) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await studentApi.search({ courseId, size: 200 });
        if (isMounted) {
          setStudents(res.content || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách học viên biểu đồ:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (courseId) {
      fetchStudents();
    }

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Tính toán xu hướng học viên tích lũy theo mốc thời gian đăng ký (createdAt)
  const lineChartData = useMemo(() => {
    if (students.length === 0) {
      return {
        labels: ['Không có dữ liệu'],
        values: [0],
      };
    }

    // Nhóm theo định dạng Tháng (YYYY-MM)
    const monthMap: Record<string, number> = {};
    const sorted = [...students].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((s) => {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        const key = `T${d.getMonth() + 1}/${d.getFullYear()}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    });

    const labels = Object.keys(monthMap);
    let runningTotal = 0;
    const values = labels.map((l) => {
      runningTotal += monthMap[l];
      return runningTotal;
    });

    return { labels, values };
  }, [students]);

  // Phân bố học viên theo trạng thái thực tế
  const distributionData = useMemo(() => {
    const activeCount = students.filter((s) => s.status === 'ACTIVE' && !s.isAccountLocked).length;
    const inactiveCount = students.filter((s) => s.status !== 'ACTIVE' && !s.isAccountLocked).length;
    const lockedCount = students.filter((s) => s.isAccountLocked).length;
    const noAccountCount = students.filter((s) => !s.hasAccount).length;

    return {
      labels: ['Đang học', 'Đã hoàn thành', 'Tài khoản khóa', 'Chưa kích hoạt'],
      values: [activeCount, inactiveCount, lockedCount, noAccountCount],
      colors: ['#1677ff', '#52c41a', '#faad14', '#94a3b8'],
    };
  }, [students]);

  // ═════ Line Chart Config ═════
  const lineData = {
    labels: lineChartData.labels,
    datasets: [
      {
        label: 'Học viên tích lũy',
        data: lineChartData.values,
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
          label: (ctx: any) => `Học viên: ${ctx.parsed.y} người`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2,
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

  // ═════ Doughnut Chart Config ═════
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
            const sum = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = sum > 0 ? Math.round((ctx.parsed / sum) * 100) : 0;
            return `${ctx.label}: ${ctx.parsed} HV (${pct}%)`;
          },
        },
      },
    },
  };

  const total = students.length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Biểu đồ theo dõi học viên
        </span>
      </div>

      <Spin spinning={loading}>
        {total === 0 && !loading ? (
          <Card bordered style={{ borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center', padding: '20px' }}>
            <Empty description="Chưa có học viên nào tham gia khóa học này" />
          </Card>
        ) : (
          <Row gutter={[16, 16]} data-course-id={courseId}>
            <Col xs={24} lg={14}>
              <Card
                size="small"
                bordered
                style={{ borderRadius: 10, border: '1px solid #e2e8f0', height: '100%' }}
                title={
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Học viên tích lũy theo thời gian
                  </span>
                }
                styles={{ body: { padding: 14 } }}
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Phân bố học viên
                    </span>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      {total} HV
                    </Text>
                  </div>
                }
                styles={{ body: { padding: 14 } }}
              >
                <div style={{ height: 260 }}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Spin>
    </div>
  );
};

export default CourseProgressCharts;
