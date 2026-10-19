import { Button, Space, Popconfirm, Modal, Input, Typography, Select } from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  StopOutlined,
  ReloadOutlined,
  UserSwitchOutlined,
  ThunderboltOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import { courseApi, sessionApi } from '@/services/api/courses';
import { adminUserApi } from '@/services/api/admin';
import type { CourseDetailResponse } from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';
import { useAuth } from '@/hooks/useAuth';

const { Text } = Typography;

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
}

const CourseDetailHeader = ({ course, onRefresh }: Props) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Đổi GV chính
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>();

  // Copy khóa
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyTitle, setCopyTitle] = useState('');
  const [copyDisplayCode, setCopyDisplayCode] = useState('');
  const [copySubmitting, setCopySubmitting] = useState(false);

  useEffect(() => {
    if (!teacherModalOpen) return;
    setLoadingInstructors(true);
    adminUserApi
      .search({ roleCode: 'INSTRUCTOR', isActive: true, page: 0, size: 200 })
      .then((res) => setInstructors(res.content))
      .catch(() => toast.error('Không tải được danh sách giảng viên'))
      .finally(() => setLoadingInstructors(false));
  }, [teacherModalOpen]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await courseApi.submitReview(course.id);
      toast.success('Đã gửi duyệt khóa học');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Gửi duyệt thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await courseApi.review(course.id, true);
      toast.success('Đã phê duyệt khóa học');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Phê duyệt thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    let reason = '';
    Modal.confirm({
      title: 'Từ chối khóa học',
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do từ chối..."
          onChange={(e) => (reason = e.target.value)}
        />
      ),
      okText: 'Từ chối',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        if (!reason.trim()) {
          toast.error('Vui lòng nhập lý do từ chối');
          return Promise.reject();
        }
        try {
          await courseApi.review(course.id, false, reason.trim());
          toast.success('Đã từ chối khóa học');
          onRefresh();
        } catch (err) {
          toast.error((err as { message?: string })?.message || 'Từ chối thất bại');
          return Promise.reject();
        }
      },
    });
  };

  const handleArchive = async () => {
    try {
      await courseApi.archive(course.id);
      toast.success('Đã lưu trữ khóa học');
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Lưu trữ thất bại');
    }
  };

  const handleCancel = () => {
    let reason = '';
    Modal.confirm({
      title: 'Hủy khóa học',
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do hủy..."
          onChange={(e) => (reason = e.target.value)}
        />
      ),
      okText: 'Hủy khóa học',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        if (!reason.trim()) {
          toast.error('Vui lòng nhập lý do hủy');
          return Promise.reject();
        }
        try {
          await courseApi.cancel(course.id, reason.trim());
          toast.success('Đã hủy khóa học');
          onRefresh();
        } catch (err) {
          toast.error((err as { message?: string })?.message || 'Hủy thất bại');
          return Promise.reject();
        }
      },
    });
  };

  const handleGenerateSessions = async () => {
    setGenerating(true);
    try {
      const res = await sessionApi.generate(course.id);
      toast.success(res.message, { duration: 5000 });
      if (res.skipped.length > 0) {
        Modal.info({
          title: 'Một số ngày bị bỏ qua',
          content: (
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {res.skipped.map((s, i) => (
                <div key={i} style={{ fontSize: 13, padding: '2px 0' }}>
                  <Text code>{s.date}</Text> — {s.reason}
                </div>
              ))}
            </div>
          ),
        });
      }
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Sinh session thất bại');
    } finally {
      setGenerating(false);
    }
  };

  const handleChangeTeacher = async () => {
    if (!selectedTeacherId) {
      toast.error('Vui lòng chọn giảng viên');
      return;
    }
    try {
      await courseApi.changeTeacher(course.id, selectedTeacherId);
      toast.success('Đã đổi GV chính của khóa');
      setTeacherModalOpen(false);
      setSelectedTeacherId(undefined);
      onRefresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Đổi GV thất bại');
    }
  };

  const openCopyModal = () => {
    setCopyTitle(`${course.title} (Copy)`);
    setCopyDisplayCode(`${course.displayCode}-COPY`);
    setCopyModalOpen(true);
  };

  const handleCopy = async () => {
    if (!copyTitle.trim() || !copyDisplayCode.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và display code');
      return;
    }
    setCopySubmitting(true);
    try {
      const newCourse = await courseApi.copy(course.id, {
        newTitle: copyTitle.trim(),
        newDisplayCode: copyDisplayCode.trim(),
        resetPrice: false,
      });
      toast.success(`Đã copy khóa học #${newCourse.id}`);
      setCopyModalOpen(false);
      navigate(`/admin/courses/${newCourse.id}`);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Copy thất bại');
    } finally {
      setCopySubmitting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER ACTIONS
  // ══════════════════════════════════════════════════════════════
  const renderActions = () => {
    const buttons: React.ReactNode[] = [];

    if (course.status === 'DRAFT') {
      buttons.push(
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={submitting}
          onClick={handleSubmitReview}
        >
          Gửi duyệt
        </Button>,
      );
    }

    if (course.status === 'PENDING_REVIEW') {
      buttons.push(
        <Button
          key="approve"
          type="primary"
          icon={<CheckOutlined />}
          loading={submitting}
          onClick={handleApprove}
        >
          Phê duyệt
        </Button>,
        <Button key="reject" danger icon={<CloseOutlined />} onClick={handleReject}>
          Từ chối
        </Button>,
      );
    }

    if (course.status === 'PUBLISHED') {
      buttons.push(
        <Popconfirm
          key="archive"
          title="Lưu trữ khóa học?"
          onConfirm={handleArchive}
          okText="Lưu trữ"
          cancelText="Hủy"
        >
          <Button icon={<InboxOutlined />}>Lưu trữ</Button>
        </Popconfirm>,
      );
    }

    // Sinh session — chỉ cho OFFLINE
    if (
      course.courseType === 'OFFLINE' &&
      ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'].includes(course.status)
    ) {
      buttons.push(
        <Button
          key="generate"
          icon={<ThunderboltOutlined />}
          loading={generating}
          onClick={handleGenerateSessions}
        >
          Sinh session
        </Button>,
      );
    }

    // Đổi GV chính — ADMIN + OFFLINE
    if (isAdmin() && course.courseType === 'OFFLINE') {
      buttons.push(
        <Button
          key="changeTeacher"
          icon={<UserSwitchOutlined />}
          onClick={() => setTeacherModalOpen(true)}
        >
          Đổi GV chính
        </Button>,
      );
    }

    // Copy khóa — DRAFT / PUBLISHED / ARCHIVED
    if (['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(course.status)) {
      buttons.push(
        <Button key="copy" icon={<CopyOutlined />} onClick={openCopyModal}>
          Copy
        </Button>,
      );
    }

    if (['DRAFT', 'PUBLISHED', 'PENDING_REVIEW'].includes(course.status)) {
      buttons.push(
        <Button key="cancel" danger icon={<StopOutlined />} onClick={handleCancel}>
          Hủy khóa
        </Button>,
      );
    }

    return buttons;
  };

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle={
          <Space size={8}>
            <Text type="secondary">{course.code}</Text>
            <StatusTag status={course.status} />
            <StatusTag status={course.courseType} />
          </Space>
        }
        backButton
        backTo="/admin/courses"
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              Làm mới
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/courses')}>
              Danh sách
            </Button>
            {renderActions()}
          </Space>
        }
      />

      {/* Modal đổi GV chính */}
      <Modal
        title="Đổi giảng viên chính của khóa"
        open={teacherModalOpen}
        onCancel={() => setTeacherModalOpen(false)}
        onOk={handleChangeTeacher}
        okText="Xác nhận"
        cancelText="Hủy"
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            Hệ thống sẽ sync GV mới xuống các buổi SCHEDULED chưa có GV dạy thay.
          </Text>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="Chọn giảng viên"
          loading={loadingInstructors}
          value={selectedTeacherId}
          onChange={setSelectedTeacherId}
          showSearch
          optionFilterProp="label"
          options={instructors.map((a) => ({
            value: a.accountId,
            label: `${a.fullName || a.email} (${a.email})`,
          }))}
        />
      </Modal>

      {/* Modal copy */}
      <Modal
        title="Copy khóa học"
        open={copyModalOpen}
        onCancel={() => setCopyModalOpen(false)}
        onOk={handleCopy}
        confirmLoading={copySubmitting}
        okText="Copy"
        cancelText="Hủy"
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Tiêu đề mới
            </div>
            <Input
              value={copyTitle}
              onChange={(e) => setCopyTitle(e.target.value)}
              placeholder="VD: Khóa học ABC (Copy)"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Display code mới
            </div>
            <Input
              value={copyDisplayCode}
              onChange={(e) => setCopyDisplayCode(e.target.value)}
              placeholder="VD: CRS-ONL-202610-COPY"
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Cây nội dung và ngân hàng câu hỏi sẽ được copy. Enrollment, session, progress không copy.
          </Text>
        </div>
      </Modal>
    </>
  );
};

export default CourseDetailHeader;