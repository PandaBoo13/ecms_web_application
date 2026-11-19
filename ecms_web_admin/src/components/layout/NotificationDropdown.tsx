import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Dropdown, Empty, List, Tabs, Tag, Tooltip, Typography } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { notificationApi } from '@/services/api/notification';
import { leadApi } from '@/services/api/leads';
import type { NotificationResponse } from '@/services/types/notification';

const { Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'default',
  NORMAL: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe } = useWebSocket();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const mountedRef = useRef(true);

  // ═══ Load unread count ═══
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      if (mountedRef.current) setUnreadCount(count);
    } catch {
      /* silent */
    }
  }, []);

  // ═══ Load inbox ═══
  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getMyInbox({
        page: 0,
        size: 20,
        isRead: tab === 'unread' ? false : undefined,
      });
      if (mountedRef.current) setNotifications(res.content);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Không tải được thông báo');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [tab]);

  // ═══ Init + subscribe WS + Polling fallback ═══
  useEffect(() => {
    mountedRef.current = true;
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 15000);
    const onFocus = () => fetchUnreadCount();
    window.addEventListener('focus', onFocus);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchInbox();
  }, [open, tab, fetchInbox]);

  useEffect(() => {
    if (!user?.accountId) return;

    const unsub = subscribe(
      `/topic/user/${user.accountId}/notifications`,
      (payload: any) => {
        // Message có thể là notification mới HOẶC sự kiện read/mark
        if (payload?.action === 'MARKED_READ') {
          setNotifications((prev) =>
            prev.map((n) => (n.notificationId === payload.notificationId ? { ...n, isRead: true } : n))
          );
          setUnreadCount((c) => Math.max(0, c - 1));
          return;
        }
        if (payload?.action === 'MARKED_ALL_READ') {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          setUnreadCount(0);
          return;
        }

        // Notification mới
        const newNotif: NotificationResponse = {
          id: payload.id ?? payload.notificationId ?? 0,
          notificationId: payload.notificationId ?? 0,
          senderAccountId: payload.senderAccountId,
          senderName: payload.senderName,
          notificationType: payload.notificationType ?? 'SYSTEM',
          title: payload.title ?? '',
          content: payload.content,
          referenceType: payload.referenceType,
          referenceId: payload.referenceId,
          extraData: payload.extraData,
          priority: payload.priority ?? 'NORMAL',
          createdAt: payload.createdAt ?? new Date().toISOString(),
          isRead: false,
        };

        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((c) => c + 1);
        toast.success(`🔔 ${newNotif.title}`, { duration: 4000 });
      }
    );

    return () => unsub();
  }, [subscribe, user?.accountId]);

  useEffect(() => {
    // Lắng nghe sự kiện khách hàng đã được TVV nhận -> lập tức biến mất khỏi chuông của các TVV khác
    const unsub = subscribe('/topic/leads/fast-claim', (payload: any) => {
      if (!payload || payload.type !== 'LEAD_CLAIMED') return;

      const claimedLeadId = Number(payload.leadId);
      const isOtherConsultant =
        user?.accountId !== payload.claimedById &&
        (user?.roleCode === 'LEAD' || user?.roleCode === 'CONSULTANT');

      if (isOtherConsultant) {
        setNotifications((prev) => {
          const target = prev.find(
            (n) =>
              (n.referenceType?.toUpperCase() === 'LEAD' && Number(n.referenceId) === claimedLeadId) ||
              (n.extraData &&
                typeof n.extraData === 'object' &&
                Number((n.extraData as any).leadId) === claimedLeadId)
          );
          if (target && !target.isRead) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter(
            (n) =>
              !(
                (n.referenceType?.toUpperCase() === 'LEAD' && Number(n.referenceId) === claimedLeadId) ||
                (n.extraData &&
                  typeof n.extraData === 'object' &&
                  Number((n.extraData as any).leadId) === claimedLeadId)
              )
          );
        });
      }
    });

    return () => unsub();
  }, [subscribe, user?.accountId, user?.roleCode]);

  // ═══ Actions ═══
  const handleMarkRead = async (n: NotificationResponse) => {
    if (n.isRead) return;
    try {
      await notificationApi.markAsRead(n.notificationId);
      setNotifications((prev) =>
        prev.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Thao tác thất bại');
    }
  };

  const handleItemClick = async (n: NotificationResponse) => {
    if (!n.isRead) {
      await handleMarkRead(n);
    }
    setOpen(false);

    // Deep link navigation theo extraData
    if (n.extraData && typeof n.extraData === 'object' && 'url' in n.extraData && typeof n.extraData.url === 'string') {
      navigate(n.extraData.url);
      return;
    }

    const type = (n.notificationType || '').toUpperCase();
    const refType = (n.referenceType || '').toUpperCase();

    // Điều hướng theo loại thông báo
    if (type === 'LEAD' || refType === 'LEAD') {
      if (n.referenceId) {
        navigate(`/admin/leads?leadId=${n.referenceId}`);
      } else {
        navigate('/admin/leads');
      }
      return;
    }

    if (type === 'REQUEST' || refType === 'REQUEST') {
      navigate('/admin/requests');
      return;
    }

    if (type === 'COURSE' || refType === 'COURSE') {
      navigate(n.referenceId ? `/admin/courses/${n.referenceId}` : '/admin/courses');
      return;
    }

    if (type === 'ORDER' || type === 'INVOICE' || refType === 'INVOICE') {
      navigate('/admin/tuition');
      return;
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả đã đọc');
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Thao tác thất bại');
    }
  };

  const handleDelete = async (e: React.MouseEvent, n: NotificationResponse) => {
    e.stopPropagation();
    try {
      await notificationApi.delete(n.notificationId);
      setNotifications((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
      if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      toast.success('Đã xóa thông báo');
    } catch (err) {
      const e2 = err as { message?: string };
      toast.error(e2?.message || 'Xóa thất bại');
    }
  };

  const handleQuickClaim = async (e: React.MouseEvent, n: NotificationResponse) => {
    e.stopPropagation();
    const leadId =
      n.referenceId ||
      (n.extraData && typeof n.extraData === 'object' && 'leadId' in n.extraData
        ? Number(n.extraData.leadId)
        : null);
    if (!leadId) {
      toast.error('Không tìm thấy mã khách hàng');
      return;
    }
    try {
      await leadApi.claim(leadId);
      toast.success('🎉 Tiếp nhận khách hàng thành công!');
      await handleMarkRead(n);
      setOpen(false);
      navigate(`/admin/leads?leadId=${leadId}`);
    } catch (err) {
      const e2 = err as { message?: string };
      toast.error(e2?.message || 'Khách hàng này đã được nhân viên khác tiếp nhận');
    }
  };

  const formatRelative = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    return `${d} ngày trước`;
  };

  // ═══ Content ═══
  const content = (
    <div
      style={{
        width: 380,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.15), 0 2px 6px -1px rgba(15, 23, 42, 0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafbff',
        }}
      >
        <Text strong style={{ fontSize: 15 }}>
          Thông báo
        </Text>
        <Button
          type="link"
          size="small"
          icon={<CheckOutlined />}
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          style={{ fontSize: 12 }}
        >
          Đọc tất cả
        </Button>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'all' | 'unread')}
        size="small"
        style={{ padding: '0 8px' }}
        items={[
          { key: 'all', label: 'Tất cả' },
          { key: 'unread', label: `Chưa đọc${unreadCount ? ` (${unreadCount})` : ''}` },
        ]}
      />

      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có thông báo"
            style={{ padding: 32 }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                onClick={() => handleItemClick(item)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: item.isRead ? '#fff' : '#f0f7ff',
                  borderBottom: '1px solid #f8fafc',
                  transition: 'background 0.15s',
                }}
                actions={[
                  ((item.notificationType || '').toUpperCase() === 'LEAD' ||
                    (item.referenceType || '').toUpperCase() === 'LEAD') && (
                    <Tooltip key="claim" title="Tiếp nhận khách hàng này ngay">
                      <Button
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        style={{ fontSize: 11, height: 24, padding: '0 8px' }}
                        onClick={(e) => handleQuickClaim(e, item)}
                      >
                        Nhận
                      </Button>
                    </Tooltip>
                  ),
                  <Tooltip key="del" title="Xóa">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDelete(e, item)}
                    />
                  </Tooltip>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {!item.isRead && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#1677ff',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      <Text strong={!item.isRead} style={{ fontSize: 13 }}>
                        {item.title}
                      </Text>
                      <Tag
                        color={PRIORITY_COLOR[item.priority] || 'default'}
                        style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}
                      >
                        {item.priority}
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 2 }}>
                      {item.content && (
                        <Text
                          type="secondary"
                          style={{ fontSize: 12, display: 'block' }}
                          ellipsis
                        >
                          {item.content}
                        </Text>
                      )}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatRelative(item.createdAt)}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => content}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" overflowCount={99} offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ width: 40, height: 40 }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationDropdown;