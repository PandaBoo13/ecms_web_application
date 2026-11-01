import { useState } from 'react';
import { Alert, Button, Form, InputNumber, Select, Space, Typography } from 'antd';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi } from '@/services/api/tuition-enrollment';
import type { SessionAttendanceResponse } from '@/services/types/tuition-enrollment';

export default function InstructorAttendancePage() {
  const [form] = Form.useForm();
  const [attendance, setAttendance] = useState<SessionAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const openAttendance = async (values: { courseId: number; sessionId: number }) => {
    setLoading(true);
    try {
      const result = await enrollmentApi.sessionAttendance(Number(values.courseId), Number(values.sessionId));
      setAttendance(result);
      form.setFieldValue('absentEnrollmentIds', result.absentEnrollmentIds);
    } catch { toast.error('Không tải được danh sách điểm danh của buổi học'); }
    finally { setLoading(false); }
  };

  const saveAttendance = async (values: { courseId: number; sessionId: number; absentEnrollmentIds?: number[] }) => {
    setLoading(true);
    try {
      await enrollmentApi.recordAbsences(Number(values.courseId), Number(values.sessionId), values.absentEnrollmentIds ?? []);
      toast.success('Đã ghi nhận các trường hợp vắng mới');
      await openAttendance(values);
    } catch { toast.error('Không lưu được điểm danh'); }
    finally { setLoading(false); }
  };

  return <PageContainer>
    <PageHeader title="Điểm danh buổi học" subtitle="Chỉ cần đánh dấu học viên vắng; các trường hợp còn lại được xem là có mặt." />
    <Alert className="mb-5" type="info" showIcon message="Chỉ học viên có ghi danh OFFLINE ở trạng thái ACTIVE xuất hiện. Bản ghi vắng đã lưu sẽ được giữ nguyên." />
    <Form form={form} layout="vertical" onFinish={openAttendance}>
      <Space align="start" wrap>
        <Form.Item name="courseId" label="Mã khóa học" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
        <Form.Item name="sessionId" label="Mã buổi học" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
        <Form.Item label=" "><Button type="primary" htmlType="submit" loading={loading}>Tải danh sách</Button></Form.Item>
      </Space>
      {attendance && <>
        <Typography.Paragraph>Khóa #{attendance.courseId} · Buổi #{attendance.sessionId} · {attendance.activeEnrollmentIds.length} học viên ACTIVE</Typography.Paragraph>
        <Form.Item name="absentEnrollmentIds" label="Học viên vắng mặt">
          <Select mode="multiple" allowClear placeholder="Chọn mã ghi danh vắng" options={attendance.activeEnrollmentIds.map((id) => ({ value: id, label: `Ghi danh #${id}` }))} />
        </Form.Item>
        <Button type="primary" loading={loading} onClick={() => void form.validateFields().then(saveAttendance)}>Lưu điểm danh</Button>
      </>}
    </Form>
  </PageContainer>;
}
