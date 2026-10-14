import { Button, Space, Popconfirm, Modal, Input, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  StopOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import { courseApi } from '@/services/api/courses';
import type { CourseDetailResponse } from '@/services/types/course';

const { Text } = Typography;

interface Props {
  course: CourseDetailResponse;
  onRefresh: () => void;
}

const CourseDetailHeader = ({ course, onRefresh }: Props) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

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

  // ══════════════════════════════════════════════════════════════
  // RENDER ACTIONS THEO STATUS
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
        </Button>
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
        </Button>
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
        </Popconfirm>
      );
    }

    if (['DRAFT', 'PUBLISHED', 'PENDING_REVIEW'].includes(course.status)) {
      buttons.push(
        <Button key="cancel" danger icon={<StopOutlined />} onClick={handleCancel}>
          Hủy khóa
        </Button>
      );
    }

    return buttons;
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
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
  );
};

export default CourseDetailHeader;