// src/components/course/DocumentViewer.tsx
import { useMemo } from 'react';
import { Button, Empty, Typography } from 'antd';
import { 
  DownloadOutlined, 
  FileTextOutlined, 
  FileWordOutlined 
} from '@ant-design/icons';

const { Title } = Typography;

interface Props {
  fileUrl?: string | null;
  fileName?: string;
  className?: string;
}

// Hàm lấy extension từ URL (bỏ qua query params)
const getExtension = (url: string) => {
  const cleanUrl = url.split('?')[0];
  const parts = cleanUrl.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() : '';
};

const DocumentViewer = ({ fileUrl, fileName, className = '' }: Props) => {
  // Chuyển đổi URL tương đối (/uploads/...) thành URL tuyệt đối
  // Cần thiết cho Office Viewer vì nó yêu cầu URL tuyệt đối
  const absoluteUrl = useMemo(() => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${window.location.origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  }, [fileUrl]);

  const ext = useMemo(() => (fileUrl ? getExtension(fileUrl) : ''), [fileUrl]);

  if (!fileUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-10 bg-slate-50 h-full min-h-[400px] ${className}`}>
        <Empty description="Chưa có tài liệu đính kèm hoặc file không hợp lệ" />
      </div>
    );
  }

  // ==========================================
  // 1. RENDER PDF
  // ==========================================
  if (ext === 'pdf') {
    return (
      <div className={`w-full h-full min-h-[600px] bg-slate-100 ${className}`}>
        <iframe
          src={`${fileUrl}#toolbar=0`} // #toolbar=0 để ẩn thanh công cụ nếu cần
          title={fileName || 'PDF Document'}
          width="100%"
          height="100%"
          className="border-0"
        />
      </div>
    );
  }

  // ==========================================
  // 2. RENDER VIDEO (MP4, WEBM)
  // ==========================================
  if (['mp4', 'webm', 'mov'].includes(ext)) {
    return (
      <div className={`w-full h-full min-h-[400px] bg-black flex items-center justify-center ${className}`}>
        <video
          src={fileUrl}
          controls
          controlsList="nodownload" // Chặn tải xuống
          className="w-full max-h-[80vh]"
          preload="metadata"
        >
          Trình duyệt của bạn không hỗ trợ thẻ video.
        </video>
      </div>
    );
  }

  // ==========================================
  // 3. RENDER WORD (.doc, .docx)
  // ==========================================
  if (['doc', 'docx'].includes(ext)) {
    // Sử dụng Microsoft Office Web Viewer
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;

    return (
      <div className={`w-full h-full min-h-[600px] flex flex-col bg-white ${className}`}>
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-blue-800 font-medium">
            <FileWordOutlined /> Đang xem tài liệu Word (Yêu cầu Internet)
          </div>
          <Button 
            type="link" 
            href={fileUrl} 
            target="_blank" 
            className="text-blue-600 p-0"
          >
            Tải xuống
          </Button>
        </div>
        <iframe
          src={officeViewerUrl}
          title={fileName || 'Word Document'}
          width="100%"
          height="100%"
          className="border-0 flex-1"
        />
      </div>
    );
  }

  // ==========================================
  // 4. CÁC ĐỊNH DẠNG KHÁC (XLS, PPT, ZIP...) -> Chỉ cho tải về
  // ==========================================
  return (
    <div className={`flex flex-col items-center justify-center p-10 bg-slate-50 h-full min-h-[400px] ${className}`}>
      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
        <FileTextOutlined className="text-3xl text-slate-400" />
      </div>
      <Title level={5} className="!mb-2">Không hỗ trợ xem trước</Title>
      <p className="text-slate-500 mb-6 text-center max-w-md">
        Định dạng <b>.{ext}</b> không được hỗ trợ xem trực tiếp trên trình duyệt.
      </p>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        href={fileUrl}
        target="_blank"
        className="!rounded-lg"
      >
        Tải xuống tài liệu
      </Button>
    </div>
  );
};

export default DocumentViewer;