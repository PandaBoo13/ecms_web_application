import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { enrollmentApi } from '@/services/api/enrollment';
import type {
  AttendanceAbsenceResponse,
  EnrollmentResponse,
  EnrollmentStatusLogResponse,
} from '@/services/types/enrollment';

const enrollmentColors = { PENDING: 'gold', ACTIVE: 'green', RESERVED: 'blue', TERMINATED: 'default', COMPLETED: 'purple' } as const;
const { Text } = Typography;

export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [absences, setAbsences] = useState<AttendanceAbsenceResponse[]>([]);
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
        const [absenceRows, logRows] = await Promise.all([
          enrollmentApi.attendanceHistory(row.enrollmentId), enrollmentApi.statusHistory(row.enrollmentId),
        ]);
        setAbsences(absenceRows); setStatusLogs(logRows); setHistoryOpen(true);
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
      <Typography.Title level={5}>Vắng mặt</Typography.Title>
      {absences.length ? absences.map((item) => <div key={item.attendanceId} className="border-b py-2">Buổi #{item.sessionId} · {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}</div>) : <Text type="secondary">Chưa có lượt vắng được ghi nhận.</Text>}
      <Typography.Title level={5} className="mt-5">Thay đổi trạng thái</Typography.Title>
      {statusLogs.length ? statusLogs.map((item) => <div key={item.id} className="border-b py-2">{item.oldStatus ?? 'Khởi tạo'} → {item.newStatus} · {dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}<div>{item.reason}</div></div>) : <Text type="secondary">Chưa có lịch sử trạng thái.</Text>}
    </Modal>
  </PageContainer>;
}
