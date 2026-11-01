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
  // TODO: thay bằng hook/API thật khi có BE
  const s = MOCK_PROGRESS_STATS;

  const cards = [
    {
      key: 'total',
      title: 'Tổng học viên',
      value: s.totalStudents,
      icon: <TeamOutlined />,
      color: '#1677ff',
      bg: '#e6f4ff',
      suffix: undefined,
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
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[14px] font-semibold text-slate-900">
          Tiến độ học tập
        </span>
        <Tag color="orange" className="!m-0 !text-[10px] !leading-[16px]">
          MOCK
        </Tag>
        <Tooltip title="Dữ liệu đang là mock, sẽ thay bằng API khi BE sẵn sàng">
          <InfoCircleOutlined className="text-[12px] text-slate-400" />
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
              <div className="flex items-center gap-3">
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
                <div className="min-w-0">
                  <Statistic
                    title={<span className="text-[12px] text-slate-500">{c.title}</span>}
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