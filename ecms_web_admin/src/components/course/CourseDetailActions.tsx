// src/components/course/CourseDetailActions.tsx
import { Button, Space, Modal, Input, Typography, Select, Dropdown } from 'antd';
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
  CalendarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { courseApi, sessionApi } from '@/services/api/course';
import { adminUserApi } from '@/services/api/admin';
import type { CourseDetailResponse } from '@/services/types/course';
import type { AccountResponse } from '@/services/types/user';
import { useAuth } from '@/hooks/useAuth';

const { Text } = Typography;

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
}

const extractErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.message || fallback;
};

const CourseDetailActions = ({ course, onRefresh }: Props) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Đổi GV chính
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [instructors, setInstructors] = useState<AccountResponse[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<
    number | undefined
  >();
  const [changingTeacher, setChangingTeacher] = useState(false);

  // Copy khóa học
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
  // HANDLERS (Đều yêu cầu xác nhận trước khi thực hiện)
  // ══════════════════════════════════════════════════════════════
  const handleSubmitReview = () => {
    Modal.confirm({
      title: 'Xác nhận gửi duyệt khóa học',
      icon: <ExclamationCircleOutlined className="text-blue-600" />,
      width: 460,
      content: (
        <div className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-600">
          <p className="m-0">
            Bạn có chắc chắn muốn gửi duyệt khóa học{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>
            ?
          </p>
          <p className="m-0 text-xs text-slate-500">
            Trong thời gian chờ quản trị viên phê duyệt, nội dung giáo trình và
            học liệu sẽ tạm khóa chỉnh sửa.
          </p>
        </div>
      ),
      okText: 'Gửi duyệt',
      okButtonProps: { icon: <SendOutlined /> },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await courseApi.submitReview(course.id);
          toast.success('Đã gửi duyệt khóa học');
          onRefresh();
        } catch (err) {
          toast.error(extractErrorMessage(err, 'Gửi duyệt thất bại'));
          return Promise.reject();
        }
      },
    });
  };

  const handleApprove = () => {
    const isOffline = course.courseType === 'OFFLINE';

    Modal.confirm({
      title: isOffline
        ? 'Xác nhận duyệt nội dung khóa học'
        : 'Xác nhận phê duyệt & xuất bản',
      icon: <CheckOutlined className="text-emerald-600" />,
      width: 470,
      content: (
        <div className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-600">
          <p className="m-0">
            Xác nhận phê duyệt khóa học{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>
            ?
          </p>
          <p className="m-0 text-xs text-slate-500">
            {isOffline
              ? 'Khóa học OFFLINE sẽ chuyển sang trạng thái PLANNED để cấu hình lịch học, phòng học và giảng viên trước khi xuất bản.'
              : 'Khóa học ONLINE sẽ chuyển sang trạng thái PUBLISHED và mở cổng tuyển sinh ngay lập tức.'}
          </p>
        </div>
      ),
      okText: isOffline ? 'Duyệt nội dung' : 'Phê duyệt & Xuất bản',
      okButtonProps: { icon: <CheckOutlined /> },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await courseApi.review(course.id, true);
          toast.success(
            isOffline
              ? 'Đã duyệt nội dung khóa học'
              : 'Đã phê duyệt và xuất bản khóa học',
          );
          onRefresh();
        } catch (err) {
          toast.error(extractErrorMessage(err, 'Phê duyệt thất bại'));
          return Promise.reject();
        }
      },
    });
  };

  // Chốt lịch (PLANNED -> PUBLISHED)
  const handleFinalize = () => {
    Modal.confirm({
      title: 'Xác nhận chốt lịch & xuất bản',
      icon: <CalendarOutlined className="text-emerald-600" />,
      width: 480,
      content: (
        <div className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-600">
          <p className="m-0">
            Xác nhận chốt lịch và xuất bản chính thức khóa học{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>
            ?
          </p>
          <p className="m-0 text-xs text-slate-500">
            Hệ thống sẽ kiểm tra xung đột lịch giảng viên/phòng học, chuyển các
            buổi học sang trạng thái SCHEDULED và mở đăng ký cho học viên.
          </p>
        </div>
      ),
      okText: 'Chốt lịch & Xuất bản',
      okButtonProps: { icon: <CalendarOutlined /> },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await courseApi.finalizeSchedule(course.id);
          toast.success('Đã chốt lịch và xuất bản khóa học chính thức');
          onRefresh();
        } catch (err) {
          const msg = extractErrorMessage(err, 'Chốt lịch thất bại');
          Modal.error({
            title: 'Chưa thể chốt lịch & xuất bản',
            width: 520,
            content: (
              <div className="whitespace-pre-line leading-relaxed text-slate-700">
                {msg}
              </div>
            ),
          });
          return Promise.reject();
        }
      },
    });
  };

  const handleReject = () => {
    const isRevokeApproval = course.status === 'PLANNED';
    let reason = '';

    Modal.confirm({
      title: isRevokeApproval
        ? 'Xác nhận hủy duyệt khóa học'
        : 'Xác nhận từ chối khóa học',
      icon: <ExclamationCircleOutlined className="text-rose-600" />,
      width: 460,
      content: (
        <div className="space-y-2.5 pt-1">
          <p className="m-0 text-[13px] text-slate-600">
            {isRevokeApproval
              ? `Khóa học "${course.title}" sẽ được trả về trạng thái nháp để điều chỉnh. Vui lòng nhập lý do:`
              : `Vui lòng nhập lý do từ chối khóa học "${course.title}":`}
          </p>
          <Input.TextArea
            rows={3}
            placeholder="Nhập lý do..."
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: isRevokeApproval ? 'Hủy duyệt' : 'Từ chối',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        if (!reason.trim()) {
          toast.error('Vui lòng nhập lý do');
          return Promise.reject();
        }
        try {
          await courseApi.review(course.id, false, reason.trim());
          toast.success(
            isRevokeApproval ? 'Đã hủy duyệt khóa học' : 'Đã từ chối khóa học',
          );
          onRefresh();
        } catch (err) {
          toast.error(extractErrorMessage(err, 'Thao tác thất bại'));
          return Promise.reject();
        }
      },
    });
  };

  const handleArchive = () => {
    Modal.confirm({
      title: 'Xác nhận lưu trữ khóa học',
      icon: <InboxOutlined className="text-amber-600" />,
      width: 460,
      content: (
        <div className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-600">
          <p className="m-0">
            Bạn có chắc chắn muốn chuyển khóa học{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>{' '}
            sang trạng thái lưu trữ?
          </p>
          <p className="m-0 text-xs text-slate-500">
            Khóa học lưu trữ sẽ ngừng tuyển sinh mới và ẩn khỏi danh sách khóa
            học đang mở.
          </p>
        </div>
      ),
      okText: 'Xác nhận lưu trữ',
      okButtonProps: { icon: <InboxOutlined /> },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await courseApi.archive(course.id);
          toast.success('Đã lưu trữ khóa học');
          onRefresh();
        } catch (err) {
          toast.error(extractErrorMessage(err, 'Lưu trữ thất bại'));
          return Promise.reject();
        }
      },
    });
  };

  const handleCancel = () => {
    let reason = '';
    Modal.confirm({
      title: 'Xác nhận hủy khóa học',
      icon: <ExclamationCircleOutlined className="text-rose-600" />,
      width: 460,
      content: (
        <div className="space-y-2.5 pt-1">
          <p className="m-0 text-[13px] text-slate-600">
            Hành động này sẽ hủy khóa học{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>{' '}
            và không thể hoàn tác. Vui lòng nhập lý do hủy:
          </p>
          <Input.TextArea
            rows={3}
            placeholder="Nhập lý do hủy khóa học..."
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: 'Xác nhận hủy khóa',
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
          toast.error(extractErrorMessage(err, 'Hủy khóa học thất bại'));
          return Promise.reject();
        }
      },
    });
  };

  const handleGenerateSessions = () => {
    Modal.confirm({
      title: 'Xác nhận sinh danh sách buổi học',
      icon: <ThunderboltOutlined className="text-blue-600" />,
      width: 470,
      content: (
        <div className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-600">
          <p className="m-0">
            Hệ thống sẽ tự động tạo các buổi học cho khóa{' '}
            <span className="font-semibold text-slate-900">{course.title}</span>{' '}
            dựa trên khung lịch đã cấu hình.
          </p>
          <p className="m-0 text-xs text-slate-500">
            Các ngày nghỉ lễ hoặc ngày không hợp lệ sẽ được hệ thống tự động bỏ
            qua và báo cáo chi tiết sau khi chạy xong.
          </p>
        </div>
      ),
      okText: 'Sinh buổi học',
      okButtonProps: { icon: <ThunderboltOutlined /> },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await sessionApi.generate(course.id);
          toast.success(res.message, { duration: 5000 });
          if (res.skipped.length > 0) {
            Modal.info({
              title: 'Một số ngày bị bỏ qua',
              width: 480,
              content: (
                <div className="max-h-72 overflow-y-auto space-y-1 pt-1">
                  {res.skipped.map((s, i) => (
                    <div key={i} className="text-[13px] py-0.5 text-slate-700">
                      <Text code>{s.date}</Text> — {s.reason}
                    </div>
                  ))}
                </div>
              ),
            });
          }
          onRefresh();
        } catch (err) {
          toast.error(extractErrorMessage(err, 'Sinh session thất bại'));
          return Promise.reject();
        }
      },
    });
  };

  const handleChangeTeacher = async () => {
    if (!selectedTeacherId) {
      toast.error('Vui lòng chọn giảng viên');
      return;
    }
    setChangingTeacher(true);
    try {
      await courseApi.changeTeacher(course.id, selectedTeacherId);
      toast.success('Đã đổi giảng viên chính của khóa học');
      setTeacherModalOpen(false);
      setSelectedTeacherId(undefined);
      onRefresh();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Đổi giảng viên thất bại'));
    } finally {
      setChangingTeacher(false);
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
      toast.success(`Đã sao chép khóa học #${newCourse.id}`);
      setCopyModalOpen(false);
      const basePath = isAdmin() ? '/admin/courses' : '/instructor/courses';
      const detailPath = isAdmin()
        ? `${basePath}/${newCourse.id}`
        : `${basePath}/${newCourse.id}/edit`;
      navigate(detailPath);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Sao chép khóa học thất bại'));
    } finally {
      setCopySubmitting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // BUILD MENU ITEMS
  // ══════════════════════════════════════════════════════════════
  const menuItems: MenuProps['items'] = [];

  if (course.status === 'DRAFT') {
    menuItems.push({
      key: 'submit',
      icon: <SendOutlined />,
      label: 'Gửi duyệt',
      onClick: handleSubmitReview,
    });
  }

  if (course.status === 'PENDING_REVIEW' && isAdmin()) {
    menuItems.push(
      {
        key: 'approve',
        icon: <CheckOutlined style={{ color: '#16a34a' }} />,
        label:
          course.courseType === 'OFFLINE'
            ? 'Duyệt nội dung'
            : 'Phê duyệt & Xuất bản',
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

  if (course.status === 'PLANNED' && isAdmin()) {
    menuItems.push(
      {
        key: 'finalize',
        icon: <CalendarOutlined style={{ color: '#16a34a' }} />,
        label: 'Chốt lịch & Xuất bản',
        onClick: handleFinalize,
      },
      {
        key: 'reject',
        icon: <CloseOutlined style={{ color: '#dc2626' }} />,
        label: 'Hủy duyệt',
        danger: true,
        onClick: handleReject,
      },
    );
  }

  if (
    course.courseType === 'OFFLINE' &&
    ['DRAFT', 'PENDING_REVIEW', 'PLANNED', 'PUBLISHED', 'ONGOING'].includes(
      course.status,
    )
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

  if (
    [
      'DRAFT',
      'PLANNED',
      'PUBLISHED',
      'ONGOING',
      'FINISHED',
      'ARCHIVED',
      'CANCELLED',
    ].includes(course.status)
  ) {
    menuItems.push({
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy khóa học',
      onClick: openCopyModal,
    });
  }

  if (
    ['DRAFT', 'PENDING_REVIEW', 'PLANNED', 'PUBLISHED', 'ONGOING'].includes(
      course.status,
    )
  ) {
    menuItems.push({
      key: 'cancel',
      icon: <StopOutlined style={{ color: '#dc2626' }} />,
      label: 'Hủy khóa',
      danger: true,
      onClick: handleCancel,
    });
  }

  if (
    isAdmin() &&
    ['PUBLISHED', 'ONGOING', 'FINISHED', 'CANCELLED'].includes(course.status)
  ) {
    menuItems.push({
      key: 'archive',
      icon: <InboxOutlined />,
      label: 'Lưu trữ',
      onClick: handleArchive,
    });
  }

  return (
    <>
      <Space wrap>
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          className="!rounded-lg"
        >
          Làm mới
        </Button>
        {menuItems.length > 0 && (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="primary"
              loading={copySubmitting || changingTeacher}
              className="!rounded-lg !font-medium"
            >
              Thao tác <DownOutlined />
            </Button>
          </Dropdown>
        )}
      </Space>

      {/* Modal xác nhận đổi GV chính */}
      <Modal
        title="Xác nhận đổi giảng viên chính"
        open={teacherModalOpen}
        onCancel={() => {
          setTeacherModalOpen(false);
          setSelectedTeacherId(undefined);
        }}
        onOk={handleChangeTeacher}
        confirmLoading={changingTeacher}
        okText="Xác nhận đổi GV"
        cancelText="Hủy"
        destroyOnClose
      >
        <div className="space-y-3 pt-1">
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 leading-relaxed">
            Sau khi xác nhận, hệ thống sẽ cập nhật giảng viên chính mới cho
            khóa học và đồng bộ xuống toàn bộ các buổi học{' '}
            <span className="font-semibold">SCHEDULED</span> chưa có giảng viên
            dạy thay.
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              Chọn giảng viên mới
            </div>
            <Select
              className="w-full"
              placeholder="Tìm theo tên hoặc email giảng viên"
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
          </div>
        </div>
      </Modal>

      {/* Modal xác nhận copy khóa học */}
      <Modal
        title="Xác nhận sao chép khóa học"
        open={copyModalOpen}
        onCancel={() => setCopyModalOpen(false)}
        onOk={handleCopy}
        confirmLoading={copySubmitting}
        okText="Xác nhận copy"
        cancelText="Hủy"
        destroyOnClose
      >
        <div className="flex flex-col gap-3 pt-1">
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề khóa học mới
            </div>
            <Input
              value={copyTitle}
              onChange={(e) => setCopyTitle(e.target.value)}
              placeholder="VD: Khóa học ABC (Copy)"
              className="!rounded-lg"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1">
              Display code mới
            </div>
            <Input
              value={copyDisplayCode}
              onChange={(e) => setCopyDisplayCode(e.target.value)}
              placeholder="VD: CRS-ONL-202610-COPY"
              className="!rounded-lg"
            />
          </div>
          <div className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-600 leading-relaxed">
            Toàn bộ cây nội dung học liệu và ngân hàng câu hỏi sẽ được sao chép
            sang khóa mới (ở trạng thái nháp). Danh sách học viên, buổi học và
            tiến độ học tập sẽ không được sao chép.
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CourseDetailActions;