import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import {
  TeamOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { studentApi } from '@/services/api/students';

interface Props {
  courseId: number;
}

interface StatsData {
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
}

const CourseProgressStats = ({ courseId }: Props) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<StatsData>({
    totalStudents: 0,
    activeStudents: 0,
    completedStudents: 0,
    averageProgress: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await studentApi.search({ courseId, size: 200 });
        if (!isMounted) return;

        const total = res.totalElements || 0;
        const students = res.content || [];
        const active = students.filter((s) => s.status === 'ACTIVE' && !s.isAccountLocked).length;
        const completed = students.filter((s) => s.status !== 'ACTIVE' || s.isAccountLocked).length;
        const avg = total > 0 ? Math.round(((active * 75 + completed * 100) / (total * 100)) * 100) : 0;

        setStats({
          totalStudents: total,
          activeStudents: active,
          completedStudents: completed,
          averageProgress: avg,
        });
      } catch (err) {
        console.error('Lỗi khi tải tiến độ học viên của khóa học:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (courseId) {
      fetchStats();
    }

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const cards = [
    {
      key: 'total',
      title: 'Tổng học viên',
      value: stats.totalStudents,
      icon: <TeamOutlined />,
      color: '#1677ff',
      bg: '#e6f4ff',
      suffix: undefined,
    },
    {
      key: 'active',
      title: 'Đang học',
      value: stats.activeStudents,
      icon: <PlayCircleOutlined />,
      color: '#10b981',
      bg: '#ecfdf5',
      suffix: undefined,
    },
    {
      key: 'completed',
      title: 'Đã hoàn thành',
      value: stats.completedStudents,
      icon: <CheckCircleOutlined />,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      suffix: undefined,
    },
    {
      key: 'avg',
      title: 'Tiến độ trung bình',
      value: stats.averageProgress,
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
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {cards.map((c) => (
            <Col key={c.key} xs={12} md={6}>
              <Card
                size="small"
                bordered
                style={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
                styles={{ body: { padding: '14px 16px' } }}
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
      </Spin>
    </div>
  );
};

export default CourseProgressStats;
