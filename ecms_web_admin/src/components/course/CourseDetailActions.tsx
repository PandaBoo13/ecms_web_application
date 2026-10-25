import { Button, Space, Popconfirm, Modal, Input, Typography, Select, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  StopOutlined,
  ReloadOutlined,
  UserSwitchOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

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

/**
 * Action buttons cho admin (Duyệt/Từ chối/Lưu trữ/Huỷ/Copy/Đổi GV/Sinh session).
 * Render gọn vào PageHeader.extra — giống layout instructor.
 */
const CourseDetailActions = ({ course, onRefresh }: Props) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>();

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

  // ── HANDLERS ──
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

  // ── BUILD MENU ITEMS ──
  const menuItems: MenuProps['items'] = [];

  if (course.status === 'DRAFT') {
    menuItems.push({
      key: 'submit',
      icon: <SendOutlined />,
      label: 'Gửi duyệt',
      onClick: handleSubmitReview,
    });
  }

  if (course.status === 'PENDING_REVIEW') {
    menuItems.push(
      {
        key: 'approve',
        icon: <CheckOutlined style={{ color: '#16a34a' }} />,
        label: 'Phê duyệt',
        onClick: handleApprove,
      },
      {
        key: 'reject',
        icon: <CloseOutlined style={{ color: '#dc2626' }} />,
        label: 'Từ chối',
        danger: true,
        onClick: handleReject,
      },
    );
  }

  if (course.status === 'PUBLISHED') {
    menuItems.push({
      key: 'archive',
      icon: <InboxOutlined />,
      label: 'Lưu trữ',
      onClick: handleArchive,
    });
  }

  if (
    course.courseType === 'OFFLINE' &&
    ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'].includes(course.status)
  ) {
    menuItems.push({
      key: 'generate',
      icon: <ThunderboltOutlined />,
      label: 'Sinh session',
      onClick: handleGenerateSessions,
    });
  }

  if (isAdmin() && course.courseType === 'OFFLINE') {
    menuItems.push({
      key: 'changeTeacher',
      icon: <UserSwitchOutlined />,
      label: 'Đổi GV chính',
      onClick: () => setTeacherModalOpen(true),
    });
  }

  if (['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(course.status)) {
    menuItems.push({
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy khóa học',
      onClick: openCopyModal,
    });
  }

  if (['DRAFT', 'PUBLISHED', 'PENDING_REVIEW'].includes(course.status)) {
    menuItems.push({
      key: 'cancel',
      icon: <StopOutlined style={{ color: '#dc2626' }} />,
      label: 'Hủy khóa',
      danger: true,
      onClick: handleCancel,
    });
  }

  return (
    <>
      <Space wrap>
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          Làm mới
        </Button>
        {menuItems.length > 0 && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <Button type="primary">
              Thao tác <DownOutlined />
            </Button>
          </Dropdown>
        )}
      </Space>

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
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tiêu đề mới</div>
            <Input value={copyTitle} onChange={(e) => setCopyTitle(e.target.value)} placeholder="VD: Khóa học ABC (Copy)" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Display code mới</div>
            <Input value={copyDisplayCode} onChange={(e) => setCopyDisplayCode(e.target.value)} placeholder="VD: CRS-ONL-202610-COPY" />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Cây nội dung và ngân hàng câu hỏi sẽ được copy. Enrollment, session, progress không copy.
          </Text>
        </div>
      </Modal>
    </>
  );
};

export default CourseDetailActions;