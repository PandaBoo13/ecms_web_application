import { Card, Row, Col, Statistic, Tag, Tooltip } from 'antd';
import {
  TeamOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

// ═══════════════════════════════════════════════════════════════
// ⚠️ MOCK DATA — thay bằng API thật khi BE sẵn sàng
// ═══════════════════════════════════════════════════════════════
const MOCK_PROGRESS_STATS = {
  totalStudents: 42,
  activeStudents: 35,
  completedStudents: 12,
  averageProgress: 68,
};

interface Props {
  courseId: number;
}

const CourseProgressStats = ({ courseId }: Props) => {
  // TODO: thay bằng hook/API thật
  // const { data } = useProgress(courseId);
  const s = MOCK_PROGRESS_STATS;

  const cards = [
    {
      key: 'total',
      title: 'Tổng học viên',
      value: s.totalStudents,
      icon: <TeamOutlined />,
      color: '#1677ff',
      bg: '#e6f4ff',
      suffix: undefined as string | undefined,
    },
    {
      key: 'active',
      title: 'Đang học',
      value: s.activeStudents,
      icon: <PlayCircleOutlined />,
      color: '#10b981',
      bg: '#ecfdf5',
      suffix: undefined,
    },
    {
      key: 'completed',
      title: 'Đã hoàn thành',
      value: s.completedStudents,
      icon: <CheckCircleOutlined />,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      suffix: undefined,
    },
    {
      key: 'avg',
      title: 'Tiến độ trung bình',
      value: s.averageProgress,
      icon: <RiseOutlined />,
      color: '#f59e0b',
      bg: '#fffbeb',
      suffix: '%',
    },
  ];

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
          Tiến độ học tập
        </span>
        <Tag color="orange" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>
          MOCK
        </Tag>
        <Tooltip title="Dữ liệu đang là mock, sẽ thay bằng API khi BE sẵn sàng">
          <InfoCircleOutlined style={{ fontSize: 12, color: '#94a3b8' }} />
        </Tooltip>
      </div>

      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col key={c.key} xs={12} md={6}>
            <Card
              size="small"
              bordered
              style={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
              bodyStyle={{ padding: '14px 16px' }}
              data-course-id={courseId}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: c.bg,
                    color: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {c.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Statistic
                    title={
                      <span style={{ fontSize: 12, color: '#64748b' }}>{c.title}</span>
                    }
                    value={c.value}
                    suffix={c.suffix}
                    valueStyle={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: c.color,
                      lineHeight: 1.2,
                    }}
                  />
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