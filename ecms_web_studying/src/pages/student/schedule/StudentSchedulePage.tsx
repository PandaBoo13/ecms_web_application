import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Badge, Card, Space, Typography, Tooltip, Button, Select, Spin, DatePicker, Divider } from 'antd';
import type { CalendarProps } from 'antd';
import { 
  LeftOutlined, 
  RightOutlined, 
  CalendarOutlined,
  UserOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import PageHeader from '@/components/common/PageHeader';
import { sessionApi } from '@/services/api/course';
import type { SessionResponse } from '@/services/types/course';
import { SCHEDULE_TEMPLATES } from '@/constants/schedule-templates';

dayjs.locale('vi');

const { Text } = Typography;

// Helper: Lấy tên Ca dựa vào giờ bắt đầu và kết thúc
const getShiftName = (startTime: string, endTime: string) => {
  const start = dayjs(startTime).format('HH:mm');
  const end = dayjs(endTime).format('HH:mm');

  const found = Object.values(SCHEDULE_TEMPLATES).find(
    (tpl) => tpl.start === start && tpl.end === end
  );
  return found ? found.label : `Ca ${start} - ${end}`;
};

const StudentSchedulePage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Load dữ liệu lịch học theo tháng
  const fetchSchedule = useCallback(async (date: Dayjs) => {
    setLoading(true);
    try {
      const from = date.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
      const to = date.endOf('month').add(7, 'day').format('YYYY-MM-DD');
      
      const res = await sessionApi.getMySchedule({ from, to });
      setSessions((res as SessionResponse[]) || []);
    } catch (error) {
      toast.error('Không thể tải lịch học');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(currentDate);
  }, [currentDate, fetchSchedule]);

  // Lọc dữ liệu theo trạng thái
  const filteredSessions = useMemo(() => {
    if (!statusFilter) return sessions;
    // 🆕 Ép kiểu String ở đây để tránh lỗi TS
    return sessions.filter(s => String(s.status) === statusFilter);
  }, [sessions, statusFilter]);

  // Hàm render từng ô ngày trên lịch
  const cellRender: CalendarProps<Dayjs>['cellRender'] = (date, info) => {
    if (info.type !== 'date') return info.originNode;

    // Lấy các ca học trong ngày (chỉ lấy các session có startTime hợp lệ)
    const daySessions = filteredSessions.filter(s => 
      s.startTime && dayjs(s.startTime).isSame(date, 'day')
    );

    if (daySessions.length === 0) return null;

    // Sắp xếp theo giờ
    daySessions.sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {daySessions.map((session) => {
          const shiftName = getShiftName(session.startTime, session.endTime);
          
          // 🆕 Ép kiểu về string để so sánh (Bypass mọi lỗi TypeScript)
          const statusStr = session.status as string;

          // Xác định Style dựa trên trạng thái
          let bgColor = '#e6f4ff'; // Xanh nhạt (Mặc định - Sắp tới)
          let borderColor = '#1677ff'; // Xanh đậm
          let textColor = '#1677ff'; 
          let isStrikethrough = false;

          if (statusStr === 'ONGOING') {
            bgColor = '#f6ffed'; // Xanh lá nhạt
            borderColor = '#52c41a';
            textColor = '#389e0d';
          } else if (statusStr === 'COMPLETED') {
            bgColor = '#f5f5f5'; // Xám nhạt
            borderColor = '#bfbfbf';
            textColor = '#595959';
          } else if (statusStr === 'CANCELLED') {
            bgColor = '#fff1f0'; // Đỏ nhạt
            borderColor = '#ff4d4f';
            textColor = '#cf1322';
            isStrikethrough = true;
          }

          return (
            <Tooltip 
              key={session.id}
              title={
                <div style={{ padding: '4px 0' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{session.title}</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CalendarOutlined /> 
                    {dayjs(session.startTime).format('dddd, DD/MM/YYYY')} ({shiftName})
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <UserOutlined /> 
                    Giảng viên: {session.effectiveTeacherName || session.teacherName || 'Đang cập nhật'}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <EnvironmentOutlined /> 
                    Phòng: {session.effectiveRoomName || session.roomName || 'Online'}
                  </div>

                  {session.note && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <i>* Ghi chú: {session.note}</i>
                    </div>
                  )}
                </div>
              }
            >
              <div 
                style={{
                  padding: '4px 6px',
                  borderRadius: 4,
                  fontSize: 12,
                  backgroundColor: bgColor, 
                  borderLeft: `3px solid ${borderColor}`,
                  color: textColor,
                  textDecoration: isStrikethrough ? 'line-through' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  // Chỉ cho phép vào học nếu chưa bị hủy
                  if (statusStr !== 'CANCELLED') {
                    navigate(`/student/courses/${session.courseId}/learn`);
                  }
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {dayjs(session.startTime).format('HH:mm')} - {shiftName}
                </div>
                <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 500 }}>
                  {session.title}
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Lịch học của tôi"
        subtitle="Theo dõi lịch học và ca học của bạn theo tháng"
        extra={
          <Space wrap>
            <Select
              placeholder="Lọc trạng thái"
              allowClear
              style={{ width: 160 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'SCHEDULED', label: 'Sắp diễn ra' },
                { value: 'ONGOING', label: 'Đang diễn ra' },
                { value: 'COMPLETED', label: 'Đã học xong' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ]}
            />
            
            <Space.Compact>
              <Button icon={<LeftOutlined />} onClick={() => setCurrentDate(prev => prev.subtract(1, 'month'))} />
              <Button onClick={() => setCurrentDate(dayjs())}>Hôm nay</Button>
              <Button icon={<RightOutlined />} onClick={() => setCurrentDate(prev => prev.add(1, 'month'))} />
            </Space.Compact>

            <DatePicker 
              value={currentDate}
              onChange={(date) => {
                if (date) setCurrentDate(date);
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              suffixIcon={<CalendarOutlined />}
              placeholder="Chọn ngày"
              style={{ width: 150 }}
            />
          </Space>
        }
      />

      <Card variant="borderless" style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(255,255,255,0.7)', 
            zIndex: 10, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 8
          }}>
            <Spin size="large" description="Đang tải lịch học..." />
          </div>
        )}
        
        {/* Chú thích màu */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 13, color: '#64748b' }}>
            <InfoCircleOutlined className="mr-1" /> Chú thích:
          </Text>
          <Space><Badge color="#1677ff" text="Sắp diễn ra" /></Space>
          <Space><Badge color="#52c41a" text="Đang diễn ra" /></Space>
          <Space><Badge color="#bfbfbf" text="Đã học" /></Space>
          <Space><Badge color="#ff4d4f" text="Đã hủy" /></Space>
        </div>
        
        <Divider style={{ margin: '0 0 16px 0' }} />

        <Calendar
          value={currentDate}
          cellRender={cellRender}
          onPanelChange={(val) => setCurrentDate(val)}
          onSelect={(date) => setCurrentDate(date)}
          headerRender={() => null} // Ẩn header mặc định của Calendar
        />
      </Card>
    </PageContainer>
  );
};

export default StudentSchedulePage;