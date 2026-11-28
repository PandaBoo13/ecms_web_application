import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Table, Tag, Space, Empty, Select, Button, Popconfirm, Tooltip, Input,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  CheckCircleOutlined, CheckSquareOutlined, QuestionCircleOutlined,
  FileTextOutlined, SearchOutlined, TagOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import toast from 'react-hot-toast';

import StatusTag from '@/components/common/StatusTag';
import QuestionFormModal from './QuestionFormModal';
import { questionApi, resourceApi } from '@/services/api/course';
import type { QuestionResponse, QuestionType, CourseResourceResponse } from '@/services/types/course';

interface Props {
  courseId: number;
  readOnly?: boolean;
}

const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  SINGLE_CHOICE: {
    label: 'Một đáp án',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: <CheckCircleOutlined />,
  },
  MULTIPLE_CHOICE: {
    label: 'Nhiều đáp án',
    color: '#7c3aed',
    bg: '#f5f3ff',
    icon: <CheckSquareOutlined />,
  },
  TRUE_FALSE: {
    label: 'Đúng / Sai',
    color: '#0891b2',
    bg: '#ecfeff',
    icon: <QuestionCircleOutlined />,
  },
  SHORT_ANSWER: {
    label: 'Trả lời ngắn',
    color: '#d97706',
    bg: '#fffbeb',
    icon: <FileTextOutlined />,
  },
};

const CourseQuestionList = ({ courseId, readOnly = false }: Props) => {
  const [data, setData] = useState<QuestionResponse[]>([]);
  const [resources, setResources] = useState<CourseResourceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<QuestionType | undefined>();
  const [keyword, setKeyword] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, size };
      if (typeFilter) params.questionType = typeFilter;
      if (keyword.trim()) params.keyword = keyword.trim();
      const res = await questionApi.search(courseId, params);
      setData(res.content || []);
      setTotal(res.totalElements || 0);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được câu hỏi');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, page, size, typeFilter, keyword]);

  useEffect(() => {
    resourceApi
      .getTree(courseId)
      .then((tree) => {
        const flat: CourseResourceResponse[] = [];
        const walk = (nodes: CourseResourceResponse[]) => {
          nodes.forEach((n) => {
            flat.push(n);
            if (n.children) walk(n.children as unknown as CourseResourceResponse[]);
          });
        };
        walk(tree as unknown as CourseResourceResponse[]);
        setResources(flat);
      })
      .catch(() => {});
  }, [courseId]);

  const lessonLabelMap = useMemo(() => {
    const chapterMap = new Map(
      resources.filter((r) => r.resourceType === 'CHAPTER').map((c) => [c.id, c.title]),
    );
    const map = new Map<number, string>();
    resources
      .filter((r) => r.resourceType === 'LESSON')
      .forEach((l) => {
        const ch = l.parentId ? chapterMap.get(l.parentId) : undefined;
        map.set(l.id, ch ? `${ch} › ${l.title}` : l.title);
      });
    return map;
  }, [resources]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter, keyword]);

  const handleDelete = async (id: number) => {
    try {
      await questionApi.delete(courseId, id);
      toast.success('Đã xóa câu hỏi');
      fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa thất bại');
    }
  };

  const openCreate = () => {
    if (readOnly) return;
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (q: QuestionResponse) => {
    if (readOnly) return;
    setEditing(q);
    setModalOpen(true);
  };

  const columns: ColumnsType<QuestionResponse> = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 68,
      align: 'center',
      render: (id: number) => <span className="text-slate-400 text-[12px] tabular-nums">#{id}</span>,
    },
    {
      title: 'Nội dung câu hỏi',
      dataIndex: 'content',
      key: 'content',
      render: (content: string, record) => {
        const optionCount = Array.isArray(record.options) ? record.options.length : 0;
        const lessonName =
          record.lessonTitle || (record.lessonId ? lessonLabelMap.get(record.lessonId) : undefined);

        return (
          <div className="flex flex-col gap-1.5 py-0.5 max-w-[540px]">
            <div className="text-[13.5px] font-medium text-slate-800 leading-snug line-clamp-2">
              {content}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {record.hashtag && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/70">
                  <TagOutlined className="text-[10px]" />
                  {record.hashtag}
                </span>
              )}

              {lessonName ? (
                <span
                  title={lessonName}
                  className="inline-flex items-center gap-1 max-w-[260px] truncate text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                >
                  <FileTextOutlined className="text-[10px] shrink-0" />
                  <span className="truncate">{lessonName}</span>
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Kho chung khóa học
                </span>
              )}

              {optionCount > 0 && (
                <span className="text-[11px] text-slate-400 tabular-nums">
                  • {optionCount} lựa chọn
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Phân loại',
      dataIndex: 'questionType',
      key: 'questionType',
      width: 150,
      render: (t: QuestionType) => {
        const meta = QUESTION_TYPE_META[t] || QUESTION_TYPE_META.SINGLE_CHOICE;
        return (
          <span
            style={{ color: meta.color, backgroundColor: meta.bg }}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-md"
          >
            {meta.icon}
            <span>{meta.label}</span>
          </span>
        );
      },
    },
    {
      title: 'Điểm',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'center',
      render: (p: number) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[12.5px] tabular-nums">
          {p}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 125,
      align: 'center',
      render: (s: string) => <StatusTag status={s} />,
    },
    ...(!readOnly
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            width: 96,
            align: 'center' as const,
            fixed: 'right' as const,
            render: (_: unknown, record: QuestionResponse) => (
              <Space size={2}>
                <Tooltip title="Chỉnh sửa">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(record)}
                    className="!text-slate-500 hover:!text-blue-600"
                  />
                </Tooltip>
                <Popconfirm
                  title="Xóa câu hỏi này?"
                  description="Thao tác này không thể hoàn tác"
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Tooltip title="Xóa">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Card
        className="!rounded-xl border-slate-200 shadow-none"
        styles={{ body: { padding: '16px 20px' } }}
        title={
          <div className="flex items-center gap-2">
            <QuestionCircleOutlined className="text-indigo-600" />
            <span className="font-semibold text-slate-800 text-[15px]">Ngân hàng câu hỏi</span>
            <Tag color="geekblue" className="!m-0 !rounded-full !text-[11.5px] font-semibold tabular-nums">
              {total}
            </Tag>
          </div>
        }
        extra={
          <Space size={8} wrap>
            <Input
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm nội dung, hashtag..."
              className="w-[200px]"
            />
            <Select
              placeholder="Tất cả loại câu hỏi"
              allowClear
              className="w-[175px]"
              value={typeFilter}
              onChange={setTypeFilter}
              options={Object.entries(QUESTION_TYPE_META).map(([value, meta]) => ({
                value,
                label: (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                    <span style={{ color: meta.color }}>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </span>
                ),
              }))}
            />
            <Tooltip title="Làm mới danh sách">
              <Button icon={<ReloadOutlined />} onClick={fetchData} />
            </Tooltip>
            {!readOnly && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Tạo câu hỏi
              </Button>
            )}
          </Space>
        }
      >
        {!loading && data.length === 0 ? (
          <div className="py-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-slate-400">
                  {typeFilter || keyword.trim()
                    ? 'Không tìm thấy câu hỏi phù hợp với bộ lọc'
                    : 'Chưa có câu hỏi nào trong ngân hàng của khóa học'}
                </span>
              }
            >
              {!readOnly && !typeFilter && !keyword.trim() && (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  Tạo câu hỏi đầu tiên
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <Table<QuestionResponse>
            columns={columns}
            dataSource={data}
            loading={loading}
            rowKey="id"
            size="middle"
            scroll={{ x: 'max-content' }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total,
              showSizeChanger: true,
              showTotal: (t) => <span className="text-slate-500 text-[12.5px]">Tổng {t} câu hỏi</span>,
              onChange: (p, s) => {
                setPage(p - 1);
                setSize(s);
              },
            }}
          />
        )}
      </Card>

      {!readOnly && (
        <QuestionFormModal
          courseId={courseId}
          open={modalOpen}
          question={editing}
          lessons={resources}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchData}
        />
      )}
    </>
  );
};

export default CourseQuestionList;