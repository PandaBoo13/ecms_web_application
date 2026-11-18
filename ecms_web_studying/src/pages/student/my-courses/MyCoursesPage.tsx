import { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Form, Input, Modal, Progress, Row, Spin, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';

// 🆕 Cập nhật lại đường dẫn import API theo cấu trúc mới
import { progressApi } from '@/services/api/course';
// Nếu báo lỗi không tìm thấy, đổi thành: import { progressApi } from '@/services/api/course/progressApi';

import type { ProgressResponse } from '@/services/types/course';
import { enrollmentApi } from '@/services/api/enrollment';
import { requestApi } from '@/services/api/request';
import type { AttendanceRecordResponse, EnrollmentResponse } from '@/services/types/enrollment';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const enrollmentStatusLabel: Record<EnrollmentResponse['status'], string> = {
  PENDING: 'Chờ khai giảng',
  ACTIVE: 'Đang học',
  RESERVED: 'Bảo lưu',
  TERMINATED: 'Bỏ học',
  COMPLETED: 'Hoàn thành',
};

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProgressResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecordResponse[]>([]);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<AttendanceRecordResponse | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveForm] = Form.useForm();

  useEffect(() => {
    Promise.all([
      progressApi.getMyCourses({ page: 0, size: 50 }),
      enrollmentApi.myEnrollments({ page: 0, size: 100 }),
    ])
      .then(([progress, enrollmentPage]) => {
        setItems(progress.content || []);
        setEnrollments(enrollmentPage.content || []);
      })
      .catch((err) => {
        toast.error((err as { message?: string })?.message || 'Không thể tải danh sách khóa học');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalCourses = new Set([
    ...items.map((course) => course.courseId),
    ...enrollments.map((enrollment) => enrollment.courseId),
  ]).size;

  const submitLeaveRequest = async (values: { reason?: string }) => {
    if (!leaveTarget) return;
    const sessionLabel = leaveTarget.sessionTitle || `Buổi #${leaveTarget.sessionNumber ?? leaveTarget.sessionId}`;
    const reason = values.reason?.trim();
    setLeaveSubmitting(true);
    try {
      await requestApi.create({
        requestType: 'LEAVE_FEEDBACK',
        targetEntityId: leaveTarget.sessionId,
        title: `Xin nghỉ phép - ${sessionLabel}`,
        description: reason,
        payload: {
          sessionId: leaveTarget.sessionId,
          enrollmentId: leaveTarget.enrollmentId,
          sessionDate: leaveTarget.sessionDate,
          reason,
        },
      });
      toast.success('Đã gửi đơn xin nghỉ phép, chờ giảng viên phản hồi');
      setAttendance(await enrollmentApi.attendanceHistory(leaveTarget.enrollmentId));
      setLeaveTarget(null);
      leaveForm.resetFields();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message;
      toast.error(message || 'Gửi đơn xin nghỉ phép không thành công');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Khóa học của tôi" 
        subtitle={`Tổng cộng ${totalCourses} khóa học`}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : items.length === 0 && enrollments.length === 0 ? (
        <Empty 
          description="Bạn chưa đăng ký khóa học nào" 
          style={{ marginTop: 64 }}
        >
          <Button type="primary" onClick={() => navigate('/courses')}>
            Khám phá khóa học
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {items.map((p) => (
            <Col xs={24} sm={12} lg={8} key={p.id}>
              <Card 
                hoverable 
                onClick={() => navigate(`/student/courses/${p.courseId}/learn`)}
                style={{ height: '100%' }}
              >
                <Title level={5} ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                  {p.courseTitle || `Khóa học #${p.courseId}`}
                </Title>
                <div>
                  <Text type="secondary">
                    Mã khóa học: {enrollments.find((enrollment) => enrollment.courseId === p.courseId)?.courseCode || '—'}
                  </Text>
                </div>
                
                <Progress 
                  percent={Math.round(p.progressPercentage || 0)} 
                  status={p.progressPercentage === 100 ? 'success' : 'active'}
                />
                
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Trạng thái:
                  </Text>
                  <Tag color={p.status === 'COMPLETED' ? 'success' : 'processing'}>
                    {p.status}
                  </Tag>
                </div>
                {enrollments.filter((enrollment) => enrollment.courseId === p.courseId).map((enrollment) => (
                  <div
                    key={enrollment.enrollmentId}
                    className="mt-3 border-t pt-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Text type="secondary">Ghi danh: </Text>
                    <Tag color={enrollment.status === 'ACTIVE' ? 'green' : enrollment.status === 'COMPLETED' ? 'purple' : 'default'}>
                      {enrollment.status === 'COMPLETED' && enrollment.completionResult
                        ? `Hoàn thành (${enrollment.completionResult === 'PASSED' ? 'Đạt' : 'Không đạt'})`
                        : enrollmentStatusLabel[enrollment.status]}
                    </Tag>
                    <div>
                      <Text type="secondary">Điểm cuối khóa: </Text>
                      <Text>{enrollment.finalScore ?? '—'}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Ngày ghi danh: {dayjs(enrollment.enrolledAt).format('DD/MM/YYYY')}</Text>
                    </div>
                    <Button size="small" className="mt-2" onClick={async () => {
                      try {
                        setAttendance(await enrollmentApi.attendanceHistory(enrollment.enrollmentId));
                        setAttendanceOpen(true);
                      } catch {
                        toast.error('Không tải được lịch sử điểm danh');
                      }
                    }}>Xem điểm danh</Button>
                  </div>
                ))}
              </Card>
            </Col>
          ))}
          {enrollments
            .filter((enrollment) => !items.some((course) => course.courseId === enrollment.courseId))
            .map((enrollment) => (
              <Col xs={24} sm={12} lg={8} key={`enrollment-${enrollment.enrollmentId}`}>
                <Card style={{ height: '100%' }}>
                  <Title level={5} ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                    {enrollment.courseTitle || `Khóa học #${enrollment.courseId}`}
                  </Title>
                  <div>
                    <Text type="secondary">Mã khóa học: {enrollment.courseCode || '—'}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Tình trạng ghi danh: </Text>
                    <Tag color={enrollment.status === 'ACTIVE' ? 'green' : enrollment.status === 'COMPLETED' ? 'purple' : 'default'}>
                      {enrollment.status === 'COMPLETED' && enrollment.completionResult
                        ? `Hoàn thành (${enrollment.completionResult === 'PASSED' ? 'Đạt' : 'Không đạt'})`
                        : enrollmentStatusLabel[enrollment.status]}
                    </Tag>
                  </div>
                  <div>
                    <Text type="secondary">Điểm cuối khóa: </Text>
                    <Text>{enrollment.finalScore ?? '—'}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Ngày ghi danh: {dayjs(enrollment.enrolledAt).format('DD/MM/YYYY')}</Text>
                  </div>
                  <Button size="small" className="mt-2" onClick={async () => {
                    try {
                      setAttendance(await enrollmentApi.attendanceHistory(enrollment.enrollmentId));
                      setAttendanceOpen(true);
                    } catch {
                      toast.error('Không tải được lịch sử điểm danh');
                    }
                  }}>Xem điểm danh</Button>
                </Card>
              </Col>
            ))}
        </Row>
      )}
      <Modal title="Điểm danh theo buổi" open={attendanceOpen} footer={null} onCancel={() => setAttendanceOpen(false)} width={760}>
        <Table
          size="small"
          rowKey={(row) => row.attendanceId ?? `${row.enrollmentId}-${row.sessionId}`}
          dataSource={attendance}
          pagination={false}
          columns={[
            { title: 'Buổi học', render: (_, row) => row.sessionTitle || `Buổi #${row.sessionNumber ?? row.sessionId}` },
            { title: 'Ngày', dataIndex: 'sessionDate', render: (value: string | null) => value ? dayjs(value).format('DD/MM/YYYY') : '—' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => value === 'PRESENT' ? 'Có mặt' : value === 'ABSENT' ? 'Vắng' : value === 'EXCUSED' ? 'Vắng có phép' : 'Chưa điểm danh' },
            {
              title: 'Xin nghỉ phép',
              key: 'leave',
              width: 160,
              render: (_, row) => {
                const openForm = () => {
                  setLeaveTarget(row);
                  leaveForm.resetFields();
                };
                const reason = row.leaveRequestReason ?? undefined;
                if (row.leaveRequestStatus === 'PENDING') {
                  return <Tag color="orange" title={reason}>Chờ duyệt</Tag>;
                }
                if (row.leaveRequestStatus === 'APPROVED') {
                  return <Tag color="green" title={reason}>Đã duyệt</Tag>;
                }
                if (row.leaveRequestStatus === 'REJECTED') {
                  return (
                    <span>
                      <Tag color="red" title={reason}>Bị từ chối</Tag>
                      <Button size="small" type="link" onClick={openForm}>Gửi lại</Button>
                    </span>
                  );
                }
                return <Button size="small" onClick={openForm}>Tạo đơn</Button>;
              },
            },
          ]}
          locale={{ emptyText: 'Chưa có dữ liệu điểm danh.' }}
        />
      </Modal>
      <Modal
        title={`Xin nghỉ phép - ${leaveTarget?.sessionTitle || (leaveTarget ? `Buổi #${leaveTarget.sessionNumber ?? leaveTarget.sessionId}` : '')}`}
        open={!!leaveTarget}
        okText="Gửi đơn"
        confirmLoading={leaveSubmitting}
        onCancel={() => { setLeaveTarget(null); leaveForm.resetFields(); }}
        onOk={() => leaveForm.submit()}
        destroyOnClose
      >
        <Form form={leaveForm} layout="vertical" onFinish={submitLeaveRequest}>
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">
              Buổi học: {leaveTarget?.sessionTitle || (leaveTarget ? `Buổi #${leaveTarget.sessionNumber ?? leaveTarget.sessionId}` : '—')}
              {leaveTarget?.sessionDate ? ` · ${dayjs(leaveTarget.sessionDate).format('DD/MM/YYYY')}` : ''}
            </Text>
          </div>
          <Form.Item
            name="reason"
            label="Lý do xin nghỉ"
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do xin nghỉ' }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập lý do xin nghỉ phép cho buổi học này..." />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Đơn sẽ được gửi đến giảng viên phụ trách buổi học để xem xét. Mỗi buổi chỉ có thể có một đơn đang chờ duyệt.
          </Text>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default MyCoursesPage;
