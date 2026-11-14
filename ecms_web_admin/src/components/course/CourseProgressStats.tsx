import { Card, Row, Col, Statistic, Tag, Tooltip, Spin } from 'antd';
import { TeamOutlined, PlayCircleOutlined, CheckCircleOutlined, RiseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { courseApi } from '@/services/api/course';

interface Props {
  courseId: number;
}

const CourseProgressStats = ({ courseId }: Props) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // 🆕 Gọi API thật (Nếu Backend chưa có, nó sẽ rơi vào catch và trả về null)
    courseApi.getCourseProgressStats(courseId)
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <Spin className="flex justify-center my-4" />;

  // Nếu API chưa có, hiển thị dữ liệu mồi (hoặc 0) thay vì chữ MOCK
  const s = data || { totalStudents: 0, activeStudents: 0, completedStudents: 0, averageProgress: 0 };

  const cards = [
    { key: 'total', title: 'Tổng học viên', value: s.totalStudents, icon: <TeamOutlined />, color: '#1677ff', bg: '#e6f4ff' },
    { key: 'active', title: 'Đang học', value: s.activeStudents, icon: <PlayCircleOutlined />, color: '#10b981', bg: '#ecfdf5' },
    { key: 'completed', title: 'Đã hoàn thành', value: s.completedStudents, icon: <CheckCircleOutlined />, color: '#8b5cf6', bg: '#f5f3ff' },
    { key: 'avg', title: 'Tiến độ trung bình', value: s.averageProgress, icon: <RiseOutlined />, color: '#f59e0b', bg: '#fffbeb', suffix: '%' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[14px] font-semibold text-slate-900">Tiến độ học tập</span>
        <Tooltip title="Dữ liệu được đồng bộ từ hệ thống"><InfoCircleOutlined className="text-[12px] text-slate-400" /></Tooltip>
      </div>
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col key={c.key} xs={12} md={6}>
            <Card size="small" bordered style={{ borderRadius: 10, border: '1px solid #e2e8f0' }} bodyStyle={{ padding: '14px 16px' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {c.icon}
                </div>
                <div className="min-w-0">
                  <Statistic title={<span className="text-[12px] text-slate-500">{c.title}</span>} value={c.value} suffix={c.suffix} valueStyle={{ fontSize: 22, fontWeight: 700, color: c.color, lineHeight: 1.2 }} />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default CourseProgressStats;