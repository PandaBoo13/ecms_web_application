import { useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi } from '@/services/api/enrollment';
import type { AttendanceRecordResponse, AttendanceStatus, SessionAttendanceResponse } from '@/services/types/enrollment';

const statusLabels: Record<AttendanceStatus, string> = {
  NOT_MARKED: 'Chưa điểm danh', PRESENT: 'Có mặt đúng giờ', LATE: 'Đi trễ',
  ABSENT: 'Vắng', EXCUSED: 'Vắng có phép',
};
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

export default function InstructorAttendancePage() {
  const [form] = Form.useForm();
  const [attendance, setAttendance] = useState<SessionAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const openAttendance = async (values: { courseId: number; sessionId: number }) => {
    setLoading(true);
    try {
      const result = await enrollmentApi.sessionAttendance(Number(values.courseId), Number(values.sessionId));
      setAttendance(result);
    } catch { toast.error('Không tải được danh sách điểm danh của buổi học'); }
    finally { setLoading(false); }
  };

  const saveAttendance = async () => {
    if (!attendance) return;
    setLoading(true);
    try {
      const saved = await enrollmentApi.saveSessionAttendance(attendance.courseId, attendance.sessionId,
        attendance.records.map(({ enrollmentId, status, checkInAt, note }) => ({ enrollmentId, status, checkInAt, note })));
      setAttendance(saved);
      toast.success('Đã lưu trạng thái điểm danh');
    } catch { toast.error('Không lưu được điểm danh'); }
    finally { setLoading(false); }
  };

  const updateRecord = (enrollmentId: number, update: Partial<AttendanceRecordResponse>) => {
    setAttendance((current) => current ? ({
      ...current,
      records: current.records.map((record) => record.enrollmentId === enrollmentId
        ? { ...record, ...update } : record),
    }) : current);
  };

  const columns: ColumnsType<AttendanceRecordResponse> = [
    { title: 'Học viên', dataIndex: 'studentName', render: (name, row) => <div>
      <Typography.Text strong>{name || `Ghi danh #${row.enrollmentId}`}</Typography.Text>
      {row.studentCode && <div><Typography.Text type="secondary">{row.studentCode}</Typography.Text></div>}
    </div> },
    { title: 'Trạng thái', dataIndex: 'status', width: 210, render: (status: AttendanceStatus, row) =>
      <Select value={status} options={statusOptions} className="w-full"
        onChange={(value: AttendanceStatus) => updateRecord(row.enrollmentId, {
          status: value,
          ...(value === 'PRESENT' || value === 'LATE' ? {} : { checkInAt: null }),
        })} /> },
    { title: 'Giờ đến lớp', dataIndex: 'checkInAt', width: 190, render: (value: string | null, row) =>
      <DatePicker showTime format="DD/MM/YYYY HH:mm" value={value ? dayjs(value) : null}
        placeholder="Chọn giờ đến" onChange={(date) => updateRecord(row.enrollmentId, {
          checkInAt: date ? date.format('YYYY-MM-DDTHH:mm:ss') : null,
        })} /> },
    { title: 'Ghi chú', dataIndex: 'note', render: (note: string | null, row) =>
      <Input value={note ?? ''} maxLength={2000} placeholder="Ghi chú (nếu có)"
        onChange={(event) => updateRecord(row.enrollmentId, { note: event.target.value || null })} /> },
  ];

  const unmarkedCount = attendance?.records.filter((record) => record.status === 'NOT_MARKED').length ?? 0;

  return <PageContainer>
    <PageHeader title="Điểm danh buổi học" subtitle="Ghi nhận trạng thái của từng học viên trong từng buổi học." />
    <Alert className="mb-5" type="info" showIcon message="Mỗi học viên có trạng thái riêng. Nếu nhập giờ đến, hệ thống tự xác định đi trễ khi sau giờ bắt đầu quá 10 phút. Chưa điểm danh không đồng nghĩa với có mặt hoặc vắng." />
    <Form form={form} layout="vertical" onFinish={openAttendance}>
      <Space align="start" wrap>
        <Form.Item name="courseId" label="Mã khóa học" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
        <Form.Item name="sessionId" label="Mã buổi học" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
        <Form.Item label=" "><Button type="primary" htmlType="submit" loading={loading}>Tải danh sách</Button></Form.Item>
      </Space>
      {attendance && <>
        <Space className="mb-3" wrap>
          <Typography.Text strong>{attendance.records[0]?.sessionTitle || `Buổi #${attendance.sessionId}`}</Typography.Text>
          <Tag color="blue">{attendance.records.length} học viên</Tag>
          {unmarkedCount > 0 && <Tag color="gold">Chưa điểm danh: {unmarkedCount}</Tag>}
        </Space>
        <Table rowKey="enrollmentId" columns={columns} dataSource={attendance.records} pagination={false} scroll={{ x: 700 }} />
        <Button className="mt-4" type="primary" loading={loading} onClick={() => void saveAttendance()}>Lưu điểm danh</Button>
      </>}
    </Form>
  </PageContainer>;
}
