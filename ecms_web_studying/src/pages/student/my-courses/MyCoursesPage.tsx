import { useEffect, useState } from 'react';
import { 
  Button, 
  Card, 
  Col, 
  Empty, 
  Form,
  Modal,
  Popconfirm,
  Progress, 
  Row, 
  Spin, 
  Table,
  Typography, 
  Tag, 
  Input,
  Pagination,
  Tooltip
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, PlayCircleOutlined, BookOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { courseApi } from '@/services/api/course'; // 🆕 Dùng courseApi thay vì progressApi
import { enrollmentApi } from '@/services/api/enrollment';
import { requestApi } from '@/services/api/request';
import type { EnrolledCourseResponse } from '@/services/types/course';
import type { AttendanceRecordResponse } from '@/services/types/enrollment';

const { Title, Text } = Typography;

// Helper map trạng thái Đăng ký sang tiếng Việt
const getEnrollmentStatusTag = (status: string) => {
  switch (status) {
    case 'COMPLETED': return <Tag color="success">Hoàn thành</Tag>;
    case 'ACTIVE': return <Tag color="processing">Đang học</Tag>;
    case 'PENDING': return <Tag color="warning">Chờ xử lý</Tag>;
    case 'RESERVED': return <Tag color="purple">Bảo lưu</Tag>;
    case 'TERMINATED': return <Tag color="error">Đã nghỉ</Tag>;
    default: return <Tag color="default">{status}</Tag>;
  }
};

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<EnrolledCourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [attendance, setAttendance] = useState<AttendanceRecordResponse[]>([]);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<AttendanceRecordResponse | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [cancellingLeaveId, setCancellingLeaveId] = useState<number | null>(null);
  const [leaveForm] = Form.useForm();

  useEffect(() => {
    setLoading(true);
    // 🆕 Gọi API mới
    courseApi.getMyEnrolledCourses()
      .then((res) => {
        setItems(res || []);
      })
      .catch((err) => {
        toast.error((err as { message?: string })?.message || 'Không thể tải danh sách khóa học');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 1. Lọc theo từ khóa (Client-side)
  const filteredItems = items.filter((p) => 
    (p.courseTitle || '').toLowerCase().includes(keyword.toLowerCase())
  );

  // 2. Phân trang (Client-side)
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);
  const total = filteredItems.length;

  const openAttendance = async (enrollmentId: number) => {
    try {
      setAttendance(await enrollmentApi.attendanceHistory(enrollmentId));
      setAttendanceOpen(true);
    } catch {
      toast.error('Không tải được lịch sử điểm danh');
    }
  };

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

  const cancelLeave = async (row: AttendanceRecordResponse) => {
    if (row.leaveRequestId == null) return;
    setCancellingLeaveId(row.leaveRequestId);
    try {
      await requestApi.cancel(row.leaveRequestId);
      toast.success('Đã thu hồi đơn xin nghỉ phép');
      setAttendance(await enrollmentApi.attendanceHistory(row.enrollmentId));
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message;
      toast.error(message || 'Thu hồi đơn xin nghỉ không thành công');
    } finally {
      setCancellingLeaveId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Khóa học của tôi" 
        subtitle={`Bạn đã đăng ký ${items.length} khóa học`}
        extra={
          <Input 
            placeholder="Tìm kiếm khóa học..." 
            prefix={<SearchOutlined className="text-slate-400" />}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1); // Reset về trang 1 khi tìm kiếm
            }}
            allowClear
            style={{ width: 250 }}
          />
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" description="Đang tải khóa học..." />
        </div>
      ) : items.length === 0 ? (
        <Empty description="Bạn chưa đăng ký khóa học nào" style={{ marginTop: 64 }}>
          <Button type="primary" onClick={() => navigate('/courses')}>
            Khám phá khóa học ngay
          </Button>
        </Empty>
      ) : filteredItems.length === 0 ? (
        <Empty description="Không tìm thấy khóa học nào phù hợp" style={{ marginTop: 64 }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {paginatedItems.map((p) => {
              const percent = Math.round(p.progressPercentage || 0);
              const isDone = percent === 100;
              // Chỉ cho phép vào học nếu đã kích hoạt hoặc đã hoàn thành
              const canLearn = p.enrollmentStatus === 'ACTIVE' || p.enrollmentStatus === 'COMPLETED';

              return (
                <Col xs={24} sm={12} lg={8} key={p.enrollmentId}>
                  <Card 
                    hoverable 
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' } }}
                    className="group"
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        {getEnrollmentStatusTag(p.enrollmentStatus)}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Đăng ký: {dayjs(p.enrolledAt).format('DD/MM/YYYY')}
                        </Text>
                      </div>

                      <Title 
                        level={5} 
                        ellipsis={{ rows: 2 }} 
                        style={{ minHeight: 44, marginTop: 0, marginBottom: 16 }}
                        title={p.courseTitle}
                      >
                        {p.courseTitle || `Khóa học #${p.courseId}`}
                      </Title>
                      
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Tiến độ</Text>
                          <Text strong style={{ fontSize: 12, color: isDone ? '#52c41a' : '#1677ff' }}>{percent}%</Text>
                        </div>
                        <Progress 
                          percent={percent} 
                          status={isDone ? 'success' : 'active'}
                          showInfo={false}
                          strokeColor={isDone ? '#52c41a' : { from: '#1677ff', to: '#36cfc9' }}
                        />
                      </div>
                    </div>

                    <Button 
                      type={isDone ? 'default' : 'primary'} 
                      block 
                      icon={percent === 0 ? <BookOutlined /> : <PlayCircleOutlined />}
                      onClick={() => navigate(`/student/courses/${p.courseId}/learn`)}
                      disabled={!canLearn}
                    >
                      {!canLearn 
                        ? 'Chưa thể vào học'
                        : percent === 0 
                          ? 'Bắt đầu học' 
                          : isDone 
                            ? 'Xem lại bài học' 
                            : 'Học tiếp'}
                    </Button>
                    <Button
                      block
                      size="small"
                      style={{ marginTop: 8 }}
                      onClick={() => void openAttendance(p.enrollmentId)}
                    >
                      Xem điểm danh
                    </Button>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {total > pageSize && (
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, s) => {
                  setPage(p);
                  setPageSize(s);
                }}
                showSizeChanger
                showTotal={(t) => `Tổng ${t} khóa học`}
              />
            </div>
          )}
        </>
      )}

      <Modal
        title="Điểm danh theo buổi"
        open={attendanceOpen}
        footer={null}
        onCancel={() => setAttendanceOpen(false)}
        width={760}
        destroyOnHidden
      >
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
                const sessionEnded = row.sessionEndTime
                  ? dayjs(row.sessionEndTime).isBefore(dayjs())
                  : false;
                if (row.leaveRequestStatus === 'PENDING') {
                  return (
                    <span>
                      <Tag color="orange" title={reason}>Chờ duyệt</Tag>
                      <Popconfirm
                        title="Thu hồi đơn xin nghỉ?"
                        description="Đơn sẽ bị hủy và giảng viên sẽ không còn thấy đơn này để duyệt."
                        okText="Thu hồi"
                        cancelText="Không"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => void cancelLeave(row)}
                      >
                        <Button
                          size="small"
                          type="link"
                          danger
                          loading={cancellingLeaveId === row.leaveRequestId}
                        >Thu hồi</Button>
                      </Popconfirm>
                    </span>
                  );
                }
                if (row.leaveRequestStatus === 'APPROVED') {
                  return <Tag color="green" title={reason}>Đã duyệt</Tag>;
                }
                if (row.leaveRequestStatus === 'REJECTED') {
                  return (
                    <span>
                      <Tag color="red" title={reason}>Bị từ chối</Tag>
                      {sessionEnded ? (
                        <Tooltip title="Buổi học đã kết thúc — không thể gửi lại đơn xin nghỉ">
                          <Button size="small" type="link" disabled>Gửi lại</Button>
                        </Tooltip>
                      ) : (
                        <Button size="small" type="link" onClick={openForm}>Gửi lại</Button>
                      )}
                    </span>
                  );
                }
                if (sessionEnded) {
                  return (
                    <Tooltip title="Buổi học đã kết thúc — không thể tạo đơn xin nghỉ">
                      <Button size="small" disabled>Tạo đơn</Button>
                    </Tooltip>
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
        destroyOnHidden
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
            Đơn sẽ được gửi đến giảng viên phụ trách buổi học để xem xét.
          </Text>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default MyCoursesPage;