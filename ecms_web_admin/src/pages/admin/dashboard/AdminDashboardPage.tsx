import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, List, Tag, Typography, Spin, Empty } from 'antd';
import {
  TeamOutlined, BookOutlined, UserOutlined,
  SolutionOutlined, AuditOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import DateDisplay from '@/components/common/DateDisplay';
import { useTranslation } from '@/hooks/useTranslation';

import { adminUserApi, auditLogApi } from '@/services/api/admin';
import { courseApi } from '@/services/api/courses';
import type { AuditLogResponse } from '@/services/types/admin';

const { Text } = Typography;

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
}

const AdminDashboardPage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Parallel fetch — dùng size: 1 để lấy totalElements nhanh
      const [allUsers, admins, instructors, students, courses, logPage] =
        await Promise.all([
          adminUserApi.search({ page: 0, size: 1 }),
          adminUserApi.search({ page: 0, size: 1, roleCode: 'ADMIN' }),
          adminUserApi.search({ page: 0, size: 1, roleCode: 'INSTRUCTOR' }),
          adminUserApi.search({ page: 0, size: 1, roleCode: 'STUDENT' }),
          courseApi.search({ page: 0, size: 1 }),
          auditLogApi.search({ page: 0, size: 10 }).catch(() => ({
            content: [],
            totalElements: 0,
          }) as never),
        ]);

      setStats({
        totalUsers: allUsers.totalElements,
        totalAdmins: admins.totalElements,
        totalInstructors: instructors.totalElements,
        totalStudents: students.totalElements,
        totalCourses: courses.totalElements,
      });

      setLogs(logPage.content || []);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    toast.success('Đang làm mới...');
    fetchStats();
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            {t('common.refresh')}
          </Button>
        }
      />

      {loading && !stats ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('dashboard.totalUsers')}
                  value={stats?.totalUsers ?? 0}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('dashboard.totalInstructors')}
                  value={stats?.totalInstructors ?? 0}
                  prefix={<SolutionOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('dashboard.totalStudents')}
                  value={stats?.totalStudents ?? 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={t('dashboard.totalCourses')}
                  value={stats?.totalCourses ?? 0}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Card>
            </Col>
          </Row>

          {/* ── Chi tiết + Audit log ── */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title={t('dashboard.totalUsers')} style={{ height: '100%' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={t('dashboard.totalAdmins')}
                      value={stats?.totalAdmins ?? 0}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={t('dashboard.totalInstructors')}
                      value={stats?.totalInstructors ?? 0}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Statistic
                      title={t('dashboard.totalStudents')}
                      value={stats?.totalStudents ?? 0}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={t('common.all')}
                      value={(stats?.totalUsers ?? 0)
                        - (stats?.totalAdmins ?? 0)
                        - (stats?.totalInstructors ?? 0)
                        - (stats?.totalStudents ?? 0)}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <span>
                    <AuditOutlined /> {t('dashboard.recentActivity')}
                  </span>
                }
                style={{ height: '100%' }}
                bodyStyle={{ maxHeight: 320, overflow: 'auto' }}
              >
                {logs.length === 0 ? (
                  <Empty description={t('dashboard.noActivity')} />
                ) : (
                  <List
                    size="small"
                    dataSource={logs}
                    renderItem={(log) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Text style={{ fontSize: 13 }}>
                              <Tag color="blue">{log.action}</Tag>
                              <Text type="secondary"> {log.entityType}</Text>
                              {log.entityId ? ` #${log.entityId}` : ''}
                            </Text>
                          }
                          description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Actor #{log.actorId} ·{' '}
                              <DateDisplay value={log.createdAt} format="relative" />
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </PageContainer>
  );
};

export default AdminDashboardPage;