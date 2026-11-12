import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi } from '@/services/api/enrollment';
import type {
  AttendanceRecordResponse,
  EnrollmentResponse,
  EnrollmentStatusLogResponse,
} from '@/services/types/enrollment';

const enrollmentColors = { PENDING: 'gold', ACTIVE: 'green', RESERVED: 'blue', TERMINATED: 'default', COMPLETED: 'purple' } as const;
const attendanceLabels: Record<AttendanceRecordResponse['status'], string> = {
  NOT_MARKED: 'Chưa điểm danh', PRESENT: 'Có mặt đúng giờ', LATE: 'Đi trễ', ABSENT: 'Vắng', EXCUSED: 'Vắng có phép',
};
const attendanceColors: Record<AttendanceRecordResponse['status'], string> = {
  NOT_MARKED: 'default', PRESENT: 'green', LATE: 'orange', ABSENT: 'red', EXCUSED: 'blue',
};
const { Text } = Typography;

export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordResponse[]>([]);
  const [statusLogs, setStatusLogs] = useState<EnrollmentStatusLogResponse[]>([]);

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try { setEnrollments((await enrollmentApi.myEnrollments({ page: 0, size: 100 })).content ?? []); }
    catch { toast.error('Không tải được danh sách ghi danh'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadEnrollments(); }, [loadEnrollments]);

  const enrollmentColumns: ColumnsType<EnrollmentResponse> = [
    { title: 'Khóa học', dataIndex: 'courseId' },
    { title: 'Loại khóa', dataIndex: 'enrollmentType' },
    { title: 'Ngày ghi danh', dataIndex: 'enrolledAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY') },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: keyof typeof enrollmentColors) => <Tag color={enrollmentColors[value]}>{value}</Tag> },
    { title: 'Số buổi vắng', dataIndex: 'absences' },
    { title: 'Điểm cuối khóa', dataIndex: 'finalScore', render: (value?: number) => value ?? '—' },
    { title: 'Lịch sử', render: (_, row) => <Button size="small" onClick={async () => {
      try {
        const [attendanceRows, logRows] = await Promise.all([
          enrollmentApi.attendanceHistory(row.enrollmentId), enrollmentApi.statusHistory(row.enrollmentId),
        ]);
        setAttendanceRecords(attendanceRows); setStatusLogs(logRows); setHistoryOpen(true);
      } catch { toast.error('Không tải được lịch sử ghi danh'); }
    }}>Xem</Button> },
  ];

  return <PageContainer>
    <PageHeader title="Ghi danh" subtitle="Theo dõi tình trạng tham gia khóa học của bạn." />
    <div className="mb-4 flex justify-end">
      <Button onClick={() => void loadEnrollments()}>Tải lại</Button>
    </div>
    <Table rowKey="enrollmentId" columns={enrollmentColumns} dataSource={enrollments} loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 850 }} />
    <Modal title="Lịch sử ghi danh" open={historyOpen} footer={null} onCancel={() => setHistoryOpen(false)}>
      <Typography.Title level={5}>Lịch sử điểm danh</Typography.Title>
      {attendanceRecords.length ? attendanceRecords.map((item) => <div key={item.attendanceId} className="flex items-center justify-between gap-3 border-b py-2">
        <div>{item.sessionTitle || `Buổi #${item.sessionNumber ?? item.sessionId}`}
          <div><Text type="secondary">{item.sessionDate ? dayjs(item.sessionDate).format('DD/MM/YYYY') : 'Chưa có ngày học'}</Text></div>
          {item.note && <div><Text type="secondary">{item.note}</Text></div>}
        </div>
        <Tag color={attendanceColors[item.status]}>{attendanceLabels[item.status]}</Tag>
      </div>) : <Text type="secondary">Chưa có dữ liệu điểm danh.</Text>}
      <Typography.Title level={5} className="mt-5">Thay đổi trạng thái</Typography.Title>
      {statusLogs.length ? statusLogs.map((item) => <div key={item.id} className="border-b py-2">{item.oldStatus ?? 'Khởi tạo'} → {item.newStatus} · {dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}<div>{item.reason}</div></div>) : <Text type="secondary">Chưa có lịch sử trạng thái.</Text>}
    </Modal>
  </PageContainer>;
}
