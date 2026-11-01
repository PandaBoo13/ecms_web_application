import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi } from '@/services/api/tuition-enrollment';
import type {
  EnrollmentResponse, EnrollmentStatus, EnrollmentStatusLogResponse, SessionAttendanceResponse,
} from '@/services/types/tuition-enrollment';

type EnrollmentAction = 'reserve' | 'terminate' | 'score' | null;
const { Text } = Typography;

const enrollmentColor: Record<EnrollmentStatus, string> = {
  PENDING: 'gold', ACTIVE: 'green', RESERVED: 'blue', TERMINATED: 'default', COMPLETED: 'purple',
};

export default function EnrollmentPage() {
  const [enrollmentRows, setEnrollmentRows] = useState<EnrollmentResponse[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | undefined>();
  const [enrollmentAction, setEnrollmentAction] = useState<EnrollmentAction>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentResponse | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendance, setAttendance] = useState<SessionAttendanceResponse | null>(null);
  const [history, setHistory] = useState<EnrollmentStatusLogResponse[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enrollmentForm] = Form.useForm();
  const [attendanceSearchForm] = Form.useForm();
  const [attendanceMarkForm] = Form.useForm();

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const page = await enrollmentApi.search({ page: 0, size: 100, status: enrollmentStatus });
      setEnrollmentRows(page.content ?? []);
    } catch {
      toast.error('Không tải được danh sách ghi danh');
    } finally {
      setLoadingEnrollments(false);
    }
  }, [enrollmentStatus]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const updateEnrollment = async (
    values?: Record<string, unknown>,
    target: EnrollmentResponse | null = selectedEnrollment,
    action: EnrollmentAction | 'resume' | 'complete' = enrollmentAction,
  ) => {
    if (!target) return;
    setBusy(true);
    try {
      if (action === 'reserve') {
        await enrollmentApi.reserve(target.enrollmentId, {
          reason: String(values?.reason),
          startDate: dayjs(values?.startDate as dayjs.ConfigType).format('YYYY-MM-DD'),
          endDate: dayjs(values?.endDate as dayjs.ConfigType).format('YYYY-MM-DD'),
        });
      } else if (action === 'terminate') {
        await enrollmentApi.terminate(target.enrollmentId, { reason: String(values?.reason) });
      } else if (action === 'score') {
        await enrollmentApi.recordFinalScore(target.enrollmentId, { finalScore: Number(values?.finalScore) });
      } else if (action === 'resume') {
        await enrollmentApi.resume(target.enrollmentId);
      } else if (action === 'complete') {
        await enrollmentApi.complete(target.enrollmentId);
      }
      toast.success('Đã cập nhật trạng thái ghi danh thành công');
      setEnrollmentAction(null);
      setSelectedEnrollment(null);
      enrollmentForm.resetFields();
      await loadEnrollments();
    } catch {
      toast.error('Thao tác ghi danh không thành công');
    } finally {
      setBusy(false);
    }
  };

  const showEnrollmentAction = (action: EnrollmentAction, enrollment: EnrollmentResponse) => {
    setSelectedEnrollment(enrollment);
    setEnrollmentAction(action);
    enrollmentForm.resetFields();
  };

  const enrollmentColumns: ColumnsType<EnrollmentResponse> = [
    { title: 'ID', dataIndex: 'enrollmentId', width: 80 },
    { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Học viên / tài khoản', render: (_, r) => r.studentId ?? r.accountId ?? '—' },
    { title: 'Hóa đơn', dataIndex: 'invoiceId' },
    { title: 'Loại', dataIndex: 'enrollmentType' },
    { title: 'Số buổi vắng', dataIndex: 'absences' },
    { title: 'Điểm cuối khóa', dataIndex: 'finalScore', render: (v?: number) => v ?? '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: EnrollmentStatus) => <Tag color={enrollmentColor[v]}>{v}</Tag> },
    {
      title: 'Thao tác',
      fixed: 'right',
      render: (_, r) => (
        <Space wrap>
          {r.status === 'ACTIVE' && r.enrollmentType === 'OFFLINE' && (
            <Button size="small" onClick={() => showEnrollmentAction('reserve', r)}>
              Bảo lưu
            </Button>
          )}
          {r.status === 'RESERVED' && (
            <Button size="small" onClick={() => void updateEnrollment(undefined, r, 'resume')}>
              Tiếp tục học
            </Button>
          )}
          {r.status === 'ACTIVE' && (
            <Button size="small" onClick={() => showEnrollmentAction('score', r)}>
              Ghi điểm
            </Button>
          )}
          {r.status === 'ACTIVE' && (
            <Button size="small" type="primary" onClick={() => void updateEnrollment(undefined, r, 'complete')}>
              Hoàn thành
            </Button>
          )}
          {r.status !== 'TERMINATED' && r.status !== 'COMPLETED' && (
            <Button size="small" danger onClick={() => showEnrollmentAction('terminate', r)}>
              Kết thúc
            </Button>
          )}
          <Button
            size="small"
            onClick={async () => {
              try {
                setHistory(await enrollmentApi.statusHistory(r.enrollmentId));
                setHistoryOpen(true);
              } catch {
                toast.error('Không tải được lịch sử trạng thái');
              }
            }}
          >
            Lịch sử
          </Button>
        </Space>
      ),
    },
  ];

  const loadAttendance = async (values: { courseId: number; sessionId: number }) => {
    try {
      const data = await enrollmentApi.sessionAttendance(Number(values.courseId), Number(values.sessionId));
      setAttendance(data);
      setAttendanceOpen(true);
      attendanceMarkForm.setFieldsValue({ absentEnrollmentIds: data.absentEnrollmentIds });
    } catch {
      toast.error('Không tải được danh sách điểm danh cho buổi học này');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý Ghi danh & Điểm danh"
        subtitle="Quản lý tình trạng ghi danh khóa học, bảo lưu, hoàn thành và điểm danh buổi học."
      />
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Ghi danh OFFLINE PENDING sẽ được hệ thống tự động kích hoạt sang ACTIVE lúc 01:05 AM vào ngày khai giảng khóa học."
      />

      <Tabs
        defaultActiveKey="enrollments"
        items={[
          {
            key: 'enrollments',
            label: 'Danh sách ghi danh',
            children: (
              <>
                <Space className="mb-4" wrap>
                  <Select
                    allowClear
                    placeholder="Lọc trạng thái"
                    style={{ width: 180 }}
                    value={enrollmentStatus}
                    onChange={setEnrollmentStatus}
                    options={Object.keys(enrollmentColor).map((v) => ({ value: v, label: v }))}
                  />
                  <Button onClick={() => void loadEnrollments()}>Tải lại</Button>
                </Space>
                <Table
                  rowKey="enrollmentId"
                  columns={enrollmentColumns}
                  dataSource={enrollmentRows}
                  loading={loadingEnrollments}
                  scroll={{ x: 1450 }}
                  pagination={{ pageSize: 10 }}
                />
              </>
            ),
          },
          {
            key: 'attendance',
            label: 'Điểm danh buổi học',
            children: (
              <>
                <Alert
                  className="mb-4"
                  type="info"
                  showIcon
                  message="Nhập mã khóa học và mã buổi học để điểm danh. Hệ thống chỉ nạp các ghi danh OFFLINE đang ACTIVE; các bản ghi vắng trước đó sẽ không bị mất."
                />
                <Form form={attendanceSearchForm} layout="inline" onFinish={loadAttendance}>
                  <Form.Item name="courseId" rules={[{ required: true, message: 'Nhập mã khóa' }]}>
                    <InputNumber placeholder="Mã khóa học" min={1} style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item name="sessionId" rules={[{ required: true, message: 'Nhập mã buổi' }]}>
                    <InputNumber placeholder="Mã buổi học" min={1} style={{ width: 160 }} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    Mở điểm danh
                  </Button>
                </Form>
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Cập nhật ghi danh"
        open={enrollmentAction === 'reserve' || enrollmentAction === 'terminate' || enrollmentAction === 'score'}
        confirmLoading={busy}
        onCancel={() => {
          setEnrollmentAction(null);
          setSelectedEnrollment(null);
        }}
        onOk={() => enrollmentForm.submit()}
        destroyOnClose
      >
        <Form form={enrollmentForm} layout="vertical" onFinish={updateEnrollment}>
          {enrollmentAction === 'reserve' && (
            <>
              <Form.Item name="reason" label="Lý do bảo lưu" rules={[{ required: true }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
              <Form.Item name="endDate" label="Đến ngày" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </>
          )}
          {enrollmentAction === 'terminate' && (
            <Form.Item name="reason" label="Lý do kết thúc ghi danh" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
          {enrollmentAction === 'score' && (
            <Form.Item name="finalScore" label="Điểm cuối khóa (0–100)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.01} className="w-full" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Điểm danh buổi học"
        open={attendanceOpen}
        onCancel={() => setAttendanceOpen(false)}
        onOk={async () => {
          try {
            await enrollmentApi.recordAbsences(
              attendance!.courseId,
              attendance!.sessionId,
              attendanceMarkForm.getFieldValue('absentEnrollmentIds') ?? [],
            );
            toast.success('Đã ghi nhận danh sách vắng học thành công');
            setAttendanceOpen(false);
          } catch {
            toast.error('Không lưu được điểm danh');
          }
        }}
      >
        <Text type="secondary">
          Tích chọn các học viên vắng mặt trong buổi học này. Lượt vắng đã lưu trước đó vẫn được giữ lại.
        </Text>
        <Form form={attendanceMarkForm} layout="vertical" className="mt-4">
          <Form.Item
            name="absentEnrollmentIds"
            label={`Danh sách vắng mặt (${attendance?.activeEnrollmentIds.length ?? 0} học viên ACTIVE)`}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Chọn học viên vắng"
              options={(attendance?.activeEnrollmentIds ?? []).map((id) => ({
                value: id,
                label: `Ghi danh #${id}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Lịch sử trạng thái ghi danh"
        open={historyOpen}
        footer={null}
        onCancel={() => setHistoryOpen(false)}
      >
        {history.length === 0 ? (
          <Text type="secondary">Chưa có lịch sử trạng thái</Text>
        ) : (
          history.map((item) => (
            <div key={item.id} className="border-b py-2">
              <Tag>{item.oldStatus ?? 'Mới'}</Tag> → <Tag color={enrollmentColor[item.newStatus]}>{item.newStatus}</Tag>
              <div className="text-sm my-1">{item.reason}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}
              </Text>
            </div>
          ))
        )}
      </Modal>
    </PageContainer>
  );
}
