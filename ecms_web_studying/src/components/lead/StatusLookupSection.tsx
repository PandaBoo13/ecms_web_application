import { useState } from 'react';
import { Card, Input, Button, Typography, Tag, Empty, Spin, Space, Alert } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  LoginOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadApi } from '@/services/api/leads';
import { studentApi } from '@/services/api/students';
import type { Lead } from '@/services/types/lead';
import type { Student } from '@/services/types/student';
import { normalizeEmail, normalizePhone } from '@/utils/leadValidators';
import { formatDate } from '@/utils/format';

const { Title, Paragraph, Text } = Typography;

interface StatusLookupSectionProps {
  onRegisterClick?: () => void;
}

export default function StatusLookupSection({ onRegisterClick }: StatusLookupSectionProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const handleSearch = async () => {
    const raw = query.trim();
    if (!raw) {
      toast.error('Vui lòng nhập Email hoặc Số điện thoại để tra cứu');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const cleanedPhone = normalizePhone(raw);
      const cleanedEmail = normalizeEmail(raw);

      // Tra cứu đồng thời cả Lead và Student
      const [leadsRes, studentsRes] = await Promise.allSettled([
        leadApi.search({ search: raw, size: 10 }),
        studentApi.search({ search: raw, size: 10 }),
      ]);

      const foundLeads: Lead[] = [];
      const foundStudents: Student[] = [];

      if (leadsRes.status === 'fulfilled' && leadsRes.value?.content) {
        // Lọc trùng theo email hoặc số điện thoại
        const matched = leadsRes.value.content.filter(
          (l) =>
            (l.email && normalizeEmail(l.email) === cleanedEmail) ||
            (l.phone && normalizePhone(l.phone) === cleanedPhone) ||
            l.fullName?.toLowerCase().includes(raw.toLowerCase())
        );
        foundLeads.push(...(matched.length > 0 ? matched : leadsRes.value.content));
      }

      if (studentsRes.status === 'fulfilled' && studentsRes.value?.content) {
        const matched = studentsRes.value.content.filter(
          (s) =>
            (s.email && normalizeEmail(s.email) === cleanedEmail) ||
            (s.phone && normalizePhone(s.phone) === cleanedPhone) ||
            s.studentCode === raw ||
            s.fullName?.toLowerCase().includes(raw.toLowerCase())
        );
        foundStudents.push(...(matched.length > 0 ? matched : studentsRes.value.content));
      }

      setLeads(foundLeads);
      setStudents(foundStudents);

      if (foundLeads.length === 0 && foundStudents.length === 0) {
        toast('Không tìm thấy hồ sơ nào khớp với thông tin', { icon: '🔍' });
      }
    } catch (err) {
      console.error('Lỗi khi tra cứu:', err);
      toast.error('Không thể tra cứu thông tin lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        borderRadius: 16,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Tag color="blue" style={{ padding: '4px 12px', borderRadius: 12, fontSize: 13, marginBottom: 8 }}>
          <SearchOutlined style={{ marginRight: 4 }} /> Tra cứu trực tuyến
        </Tag>
        <Title level={3} style={{ marginTop: 8, marginBottom: 8, color: '#0f172a' }}>
          Tra cứu hồ sơ tư vấn & Tình trạng học viên
        </Title>
        <Paragraph type="secondary" style={{ maxWidth: 640, margin: '0 auto', fontSize: 15 }}>
          Nhập số điện thoại hoặc email đã đăng ký để kiểm tra tiến độ tư vấn khóa học, lịch kiểm tra
          trình độ hoặc trạng thái kích hoạt tài khoản học viên.
        </Paragraph>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto 28px' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="Nhập số điện thoại hoặc email (vd: 0912345678 hoặc email@example.com)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
          />
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handleSearch}
            style={{ fontWeight: 600, paddingLeft: 24, paddingRight: 24 }}
          >
            Tra cứu
          </Button>
        </Space.Compact>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 12 }}>
            Đang tìm kiếm hồ sơ trong hệ thống...
          </Paragraph>
        </div>
      )}

      {!loading && searched && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Kết quả là Học viên chính thức (Student) */}
          {students.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669' }}>
                <IdcardOutlined /> Hồ sơ học viên chính thức
              </Title>
              {students.map((student) => (
                <Card
                  key={student.id}
                  style={{
                    marginBottom: 16,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div>
                      <Space size={8} wrap>
                        <Title level={5} style={{ margin: 0, color: '#166534' }}>
                          {student.fullName}
                        </Title>
                        <Tag color="purple" style={{ fontWeight: 600 }}>
                          Mã HV: {student.studentCode}
                        </Tag>
                        <Tag color={student.status === 'ACTIVE' ? 'success' : 'default'}>
                          {student.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng/Đã nghỉ'}
                        </Tag>
                      </Space>
                      <Paragraph style={{ margin: '8px 0 0', color: '#374151', fontSize: 14 }}>
                        Email: <strong>{student.email}</strong> | SĐT: <strong>{student.phone}</strong>
                      </Paragraph>
                      <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                        Ngày gia nhập: {formatDate(student.createdAt)}
                      </Paragraph>
                    </div>

                    <Button
                      type="primary"
                      icon={<LoginOutlined />}
                      style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      onClick={() => navigate('/login')}
                    >
                      Đăng nhập cổng học tập
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Kết quả là Khách tiềm năng (Lead) */}
          {leads.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1d4ed8' }}>
                <ClockCircleOutlined /> Hồ sơ đăng ký tư vấn (Khách tiềm năng)
              </Title>
              {leads.map((lead) => (
                <Card
                  key={lead.id}
                  style={{
                    marginBottom: 16,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div>
                      <Space size={8} wrap>
                        <Title level={5} style={{ margin: 0 }}>
                          {lead.fullName}
                        </Title>
                        <Tag color="blue">Mã Lead: #{lead.id}</Tag>
                        {lead.status === 'NEW' ? (
                          <Tag color="orange" icon={<ClockCircleOutlined />}>
                            Chờ tư vấn viên liên hệ
                          </Tag>
                        ) : (
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            Đã tư vấn
                          </Tag>
                        )}
                      </Space>
                      <Paragraph style={{ margin: '8px 0 0', color: '#475569', fontSize: 14 }}>
                        Email: <strong>{lead.email || '—'}</strong> | SĐT: <strong>{lead.phone || '—'}</strong>
                      </Paragraph>
                      {lead.note && (
                        <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                          <Text type="secondary">Nội dung quan tâm: </Text>
                          <Text italic>{lead.note}</Text>
                        </div>
                      )}
                      <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13 }}>
                        Đăng ký lúc: {formatDate(lead.createdAt)}
                      </Paragraph>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {lead.status === 'NEW' ? (
                        <Alert
                          message="Đang xử lý trong 24h"
                          description="Tư vấn viên sẽ gọi điện hỗ trợ bạn trong khung giờ hành chính."
                          type="info"
                          showIcon
                          style={{ maxWidth: 300, textAlign: 'left', fontSize: 12 }}
                        />
                      ) : (
                        <Alert
                          message="Đã được tư vấn"
                          description="Nếu bạn cần đổi lịch hoặc hỗ trợ thêm, vui lòng liên hệ hotline."
                          type="success"
                          showIcon
                          style={{ maxWidth: 300, textAlign: 'left', fontSize: 12 }}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Trường hợp không tìm thấy */}
          {students.length === 0 && leads.length === 0 && (
            <Empty
              description={
                <div style={{ padding: '8px 0' }}>
                  <Text strong style={{ fontSize: 16, color: '#334155' }}>
                    Chưa tìm thấy hồ sơ đăng ký nào khớp với "{query}"
                  </Text>
                  <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 16 }}>
                    Bạn có thể kiểm tra lại số điện thoại/email hoặc đăng ký nhận tư vấn lộ trình học
                    mới ngay bây giờ.
                  </Paragraph>
                  {onRegisterClick && (
                    <Button type="primary" onClick={onRegisterClick}>
                      Đăng ký nhận tư vấn ngay
                    </Button>
                  )}
                </div>
              }
            />
          )}
        </div>
      )}
    </Card>
  );
}
