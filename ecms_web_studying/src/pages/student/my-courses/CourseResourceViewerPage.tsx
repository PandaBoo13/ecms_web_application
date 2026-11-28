// src/pages/student/CourseResourceViewerPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Result, Space, Tag, Tooltip } from 'antd';
import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageLoading from '@/components/feedback/PageLoading';
import DocumentViewer from '@/components/course/DocumentViewer';
import { courseApi } from '@/services/api/course';
import type { CourseDetailResponse } from '@/services/types/course';

const CourseResourceViewerPage = () => {
  const { id, resourceId } = useParams<{ id: string; resourceId: string }>();
  const courseId = Number(id);
  const currentResourceId = Number(resourceId);
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    courseApi.getById(courseId)
      .then(setCourse)
      .catch(() => toast.error('Không thể tải dữ liệu khóa học'))
      .finally(() => setLoading(false));
  }, [courseId]);

  // Lấy danh sách phẳng các tài liệu (bỏ qua Chapter) để làm nút Next/Prev
  const flatResources = useMemo(() => {
    if (!course?.resources) return [];
    return [...course.resources]
      .filter((r) => r.resourceType !== 'CHAPTER' && r.resourceType !== 'QUIZ')
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [course?.resources]);

  const currentResource = useMemo(() => {
    return flatResources.find((r) => r.id === currentResourceId);
  }, [flatResources, currentResourceId]);

  const currentIndex = flatResources.findIndex((r) => r.id === currentResourceId);
  const prevResource = currentIndex > 0 ? flatResources[currentIndex - 1] : null;
  const nextResource = currentIndex < flatResources.length - 1 ? flatResources[currentIndex + 1] : null;

  // 🆕 Hàm điều hướng Bài trước / Bài tiếp
  const handleNavigate = (targetId: number) => {
    // Dùng { replace: true } để không làm rác lịch sử trình duyệt.
    // Khi bấm "Quay lại", nó sẽ về thẳng trang Tổng quan chứ không phải lùi từng bài một.
    navigate(`/student/courses/${courseId}/learn/${targetId}`, { replace: true });
  };

  // 🆕 Hàm Quay lại thông minh
  const handleBack = () => {
    // Nếu có lịch sử (ví dụ đi từ trang CourseLearnPage sang), thì lùi lại 1 bước
    // Giúp giữ nguyên tab "Nội dung", trạng thái mở rộng của các Chương
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // Nếu truy cập trực tiếp bằng link (không có lịch sử), fallback về trang khóa học
      navigate(`/student/courses/${courseId}`);
    }
  };

  // 🆕 Phím tắt (Mũi tên trái/phải để chuyển bài, ESC để quay lại)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevResource) handleNavigate(prevResource.id);
      if (e.key === 'ArrowRight' && nextResource) handleNavigate(nextResource.id);
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevResource, nextResource]);

  if (loading) return <PageLoading tip="Đang tải tài liệu..." />;
  
  if (!course || !currentResource) {
    return (
      <Result
        status="404"
        title="Không tìm thấy tài liệu"
        subTitle="Tài liệu này không tồn tại hoặc đã bị xóa khỏi khóa học."
        extra={<Button type="primary" onClick={() => navigate(`/student/courses/${courseId}`)}>Quay lại khóa học</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Tooltip title="Phím tắt: ESC">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack} // 🆕 Gọi hàm handleBack
              className="shrink-0 hover:bg-slate-100"
            >
              Quay lại
            </Button>
          </Tooltip>
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-800 truncate m-0">
              {currentResource.title}
            </h1>
            <p className="text-xs text-slate-500 m-0 truncate">
              Khóa học: {course.title}
            </p>
          </div>
        </div>

        {/* Nút điều hướng Next / Prev (Trên Desktop) */}
        <Space size={8} className="shrink-0 hidden sm:flex">
          <Tooltip title="Phím tắt: ←">
            <Button 
              icon={<LeftOutlined />} 
              disabled={!prevResource}
              onClick={() => prevResource && handleNavigate(prevResource.id)}
            >
              Bài trước
            </Button>
          </Tooltip>
          <Tooltip title="Phím tắt: →">
            <Button 
              disabled={!nextResource}
              onClick={() => nextResource && handleNavigate(nextResource.id)}
            >
              Bài tiếp <RightOutlined />
            </Button>
          </Tooltip>
        </Space>
      </header>

      {/* NỘI DUNG (Viewer) */}
      <main className="flex-1 overflow-hidden p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-4 pb-20 sm:pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Tag color="blue" className="!m-0 uppercase">{currentResource.resourceType}</Tag>
          {currentResource.description && (
            <span className="text-sm text-slate-500 line-clamp-1">{currentResource.description}</span>
          )}
        </div>

        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <DocumentViewer 
            fileUrl={currentResource.fileUrl || currentResource.url} 
            fileName={currentResource.title} 
            className="h-full"
          />
        </div>
      </main>

      {/* 🆕 Nút điều hướng dành riêng cho Mobile (Vì header bị ẩn nút trên đt) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-between gap-3 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button 
          className="flex-1"
          icon={<LeftOutlined />} 
          disabled={!prevResource}
          onClick={() => prevResource && handleNavigate(prevResource.id)}
        >
          Bài trước
        </Button>
        <Button 
          className="flex-1"
          type="primary"
          disabled={!nextResource}
          onClick={() => nextResource && handleNavigate(nextResource.id)}
        >
          Bài tiếp <RightOutlined />
        </Button>
      </div>
    </div>
  );
};

export default CourseResourceViewerPage;