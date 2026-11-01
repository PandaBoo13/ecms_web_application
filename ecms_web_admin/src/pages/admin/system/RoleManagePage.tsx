import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Checkbox,
  Tooltip,
  Popconfirm,
  Spin,
  Empty,
  Form,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
  CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

import PageContainer from '@/components/common/PageContainer';
import {
  adminRoleApi,
  adminPermissionApi,
  adminRolePermissionApi,
} from '@/services/api/admin';
import type { Permission, Role, AccountPermissionResponse } from '@/services/types/user';

const { Option } = Select;

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Format permission to action and tagCode (e.g. `courses-view`, `students-create`, `worksheets-approve`)
 * exactly matching Image 1 and Image 2.
 */
export const getPermissionAction = (
  p: Permission | AccountPermissionResponse
): { action: string; tagCode: string } => {
  const method = (p.method || '').toUpperCase();
  const path = p.endpointPattern || '';
  const mod = (p.module || 'general').toLowerCase();

  let action = 'view';
  if (path.includes('convert-lead')) action = 'convert';
  else if (path.includes('submit-review')) action = 'submit-review';
  else if (path.includes('review')) action = 'review';
  else if (path.includes('archive')) action = 'archive';
  else if (path.includes('cancel')) action = 'cancel';
  else if (path.includes('copy')) action = 'copy';
  else if (path.includes('offline-info')) action = 'offline-info';
  else if (path.includes('hard')) action = 'hard-delete';
  else if (path.includes('substitute-teacher')) action = 'substitute-teacher';
  else if (path.includes('substitute')) action = 'substitute';
  else if (path.includes('assistant')) action = 'assistant';
  else if (path.includes('generate')) action = 'generate';
  else if (path.includes('guardians')) {
    action = method === 'POST' ? 'guardians-add' : method === 'DELETE' ? 'guardians-delete' : 'guardians-view';
  } else if (path.includes('interactions')) {
    action = method === 'POST' ? 'interactions-add' : 'interactions-view';
  } else if (path.includes('placement-tests')) {
    action = method === 'POST' ? 'placement-add' : 'placement-view';
  } else if (path.includes('academic-histories')) action = 'academic-histories';
  else if (path.includes('detail')) action = 'details';
  else if (path.includes('status')) action = 'status';
  else if (path.includes('assign')) action = 'assign';
  else if (path.includes('teacher')) action = 'teacher';
  else if (path.includes('tree')) action = 'tree';
  else if (method === 'GET') {
    action = path.includes('{id}') || path.includes('{code}') || path.includes('{studentCode}') ? 'details' : 'view';
  } else if (method === 'POST') action = 'create';
  else if (method === 'PUT') action = 'edit';
  else if (method === 'PATCH') action = 'update';
  else if (method === 'DELETE') action = 'delete';

  const pluralMod = mod.endsWith('s') ? mod : `${mod}s`;
  return {
    action,
    tagCode: `${pluralMod}-${action}`,
  };
};

/**
 * Get display guard for a role
 */
export const getRoleGuard = (role: Role): string => {
  const code = (role.code || '').toUpperCase();
  const desc = (role.description || '').toLowerCase();
  if (desc.includes('guard:')) {
    const match = desc.match(/guard:([a-z0-9_]+)/i);
    if (match?.[1]) return match[1].toLowerCase();
  }
  if (code.includes('ADMIN')) return 'admin';
  if (code.includes('STUDENT') || code.includes('CLIENT')) return 'client_api';
  return 'candidate_api';
};

const GUARD_OPTIONS = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'CLIENT_API', label: 'CLIENT_API' },
  { value: 'CANDIDATE_API', label: 'CANDIDATE_API' },
];

const RoleManagePage = () => {
  // ── View mode: 'list' | 'create' | 'edit' ──
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');

  // ── Data ──
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [rolePermsMap, setRolePermsMap] = useState<Record<number, AccountPermissionResponse[]>>({});

  // ── Edit/Create form state ──
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [selectedGuard, setSelectedGuard] = useState<string>('ADMIN');
  const [selectedTab, setSelectedTab] = useState<string>('ADMIN');
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // FETCH ROLES & PERMISSIONS
  // ══════════════════════════════════════════════════════════════

  const fetchRolePerms = useCallback(async (roleList: Role[]) => {
    const map: Record<number, AccountPermissionResponse[]> = {};
    await Promise.all(
      roleList.map(async (r) => {
        try {
          const list = await adminRolePermissionApi.list(r.id);
          map[r.id] = (list as unknown as AccountPermissionResponse[]) || [];
        } catch {
          map[r.id] = [];
        }
      })
    );
    setRolePermsMap(map);
  }, []);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const list = await adminRoleApi.list();
      setRoles(list || []);
      if (list && list.length > 0) {
        fetchRolePerms(list);
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được danh sách vai trò');
    } finally {
      setRolesLoading(false);
    }
  }, [fetchRolePerms]);

  const fetchPermissions = useCallback(async () => {
    setPermsLoading(true);
    try {
      const list = await adminPermissionApi.listAll();
      setAllPerms(list || []);
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Không tải được danh sách quyền');
    } finally {
      setPermsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // ══════════════════════════════════════════════════════════════
  // GROUPING PERMISSIONS BY MODULE
  // ══════════════════════════════════════════════════════════════

  const groupedByModule = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPerms) {
      const mod = (p.module || 'GENERAL').toUpperCase();
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPerms]);

  // ══════════════════════════════════════════════════════════════
  // SWITCH VIEWS
  // ══════════════════════════════════════════════════════════════

  const handleOpenCreate = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({
      code: '',
      guard: 'ADMIN',
      prefix: '',
      description: '',
    });
    setSelectedGuard('ADMIN');
    setSelectedTab('ADMIN');
    setSelectedPermIds(new Set());
    setView('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = async (role: Role) => {
    setEditingRole(role);
    form.resetFields();

    const guardVal = getRoleGuard(role).toUpperCase();
    form.setFieldsValue({
      code: role.code,
      guard: guardVal,
      prefix: '',
      description: role.description || '',
    });
    setSelectedGuard(guardVal);
    setSelectedTab(guardVal);

    // Load active permissions for this role
    let activeIds = new Set<number>();
    try {
      const list = (await adminRolePermissionApi.list(role.id)) as unknown as AccountPermissionResponse[];
      activeIds = new Set(
        list
          .filter((item) => item.isEnabled !== false)
          .map((item) => item.permissionId || (item as unknown as { id: number }).id)
          .filter(Boolean)
      );
    } catch {
      activeIds = new Set();
    }
    setSelectedPermIds(activeIds);
    setView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setView('list');
    setEditingRole(null);
  };

  // ══════════════════════════════════════════════════════════════
  // PERMISSION SELECTION IN MATRIX
  // ══════════════════════════════════════════════════════════════

  const togglePermission = (permId: number) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModulePermissions = (modulePerms: Permission[]) => {
    const allSelected = modulePerms.every((p) => selectedPermIds.has(p.id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modulePerms.forEach((p) => next.delete(p.id));
      } else {
        modulePerms.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const selectAllPermissions = () => {
    setSelectedPermIds(new Set(allPerms.map((p) => p.id)));
  };

  const deselectAllPermissions = () => {
    setSelectedPermIds(new Set());
  };

  // ══════════════════════════════════════════════════════════════
  // SUBMIT ROLE (CREATE / EDIT)
  // ══════════════════════════════════════════════════════════════

  const handleSaveRole = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const code = values.code.trim().toUpperCase();
      const desc = values.description?.trim() || `guard:${values.guard.toLowerCase()}`;

      let targetRole: Role;
      if (editingRole) {
        // Update role info
        targetRole = await adminRoleApi.update(editingRole.id, {
          code,
          description: desc,
        });
        toast.success(`Cập nhật vai trò ${code} thành công`);
      } else {
        // Create new role
        targetRole = await adminRoleApi.create({
          code,
          description: desc,
        });
        toast.success(`Tạo vai trò ${code} thành công`);
      }

      // Sync permissions
      const permIdsToAssign = Array.from(selectedPermIds);
      if (targetRole && targetRole.id) {
        try {
          if (editingRole) {
            // Remove existing & assign new batch for clean sync
            try {
              await adminRolePermissionApi.removeAll(targetRole.id);
            } catch {
              // ignore if empty
            }
          }
          if (permIdsToAssign.length > 0) {
            await adminRolePermissionApi.assignBatch(targetRole.id, permIdsToAssign);
          }
        } catch (syncErr) {
          console.warn('Sync permissions partial/fail:', syncErr);
        }
      }

      await fetchRoles();
      setView('list');
      setEditingRole(null);
    } catch (err) {
      const e = err as { message?: string; errorFields?: unknown };
      if (!e.errorFields) toast.error(e?.message || 'Lưu vai trò thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // DELETE ROLE
  // ══════════════════════════════════════════════════════════════

  const handleDeleteRole = async (role: Role) => {
    try {
      await adminRoleApi.delete(role.id);
      toast.success(`Đã xóa vai trò ${role.code}`);
      fetchRoles();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Xóa vai trò thất bại');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER: VIEW 1 — ROLE MANAGEMENT LIST (Image 1)
  // ══════════════════════════════════════════════════════════════

  if (view === 'list') {
    return (
      <PageContainer>
        <div className="max-w-[1400px] mx-auto py-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <h1 className="text-xl font-bold text-slate-800 m-0">Role Management</h1>
            <div className="flex items-center gap-2.5">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchRoles();
                  fetchPermissions();
                  toast.success('Đã làm mới dữ liệu');
                }}
                className="!h-9 !rounded-lg text-slate-600 hover:border-blue-500"
              >
                Làm mới
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                className="!h-9 !rounded-lg !bg-[#0090ff] hover:!bg-blue-600 !font-semibold !px-4 shadow-sm"
              >
                + Create New Role
              </Button>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            {rolesLoading && roles.length === 0 ? (
              <div className="p-16 text-center">
                <Spin size="large" />
                <div className="text-xs text-slate-400 mt-3">Đang tải danh sách vai trò...</div>
              </div>
            ) : roles.length === 0 ? (
              <div className="p-16 text-center">
                <Empty description="Chưa có vai trò nào trong hệ thống" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white">
                      <th className="py-3 px-4 text-xs font-bold text-slate-700 w-14 text-center">#</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-700 w-44">
                        Role Name<br />(code)
                      </th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-700 w-40">Guard (scope)</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-700">Permissions</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-700 w-28 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roles.map((role, idx) => {
                      const guard = getRoleGuard(role);
                      const perms = rolePermsMap[role.id] || [];
                      const activePerms = perms.filter((p) => p.isEnabled !== false);

                      return (
                        <tr key={role.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* # */}
                          <td className="py-4 px-4 text-xs font-medium text-slate-500 text-center align-top">
                            {idx + 1}
                          </td>

                          {/* Role Name (code) */}
                          <td className="py-4 px-4 align-top">
                            <span className="inline-block bg-[#e0f2fe] text-[#0369a1] font-bold text-xs uppercase px-3 py-1 rounded tracking-wide border border-[#bae6fd]">
                              {role.code}
                            </span>
                          </td>

                          {/* Guard (scope) */}
                          <td className="py-4 px-4 align-top">
                            <span className="inline-block bg-[#ffe4e6] text-[#be123c] font-semibold text-xs px-2.5 py-0.5 rounded tracking-normal border border-[#fecdd3]">
                              {guard}
                            </span>
                          </td>

                          {/* Permissions */}
                          <td className="py-4 px-4 align-top">
                            {permsLoading || (rolesLoading && perms.length === 0) ? (
                              <span className="text-xs text-slate-400 italic">Đang tải quyền...</span>
                            ) : activePerms.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Chưa được gán quyền</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {activePerms.map((p) => {
                                  const { tagCode } = getPermissionAction(p);
                                  return (
                                    <Tooltip
                                      key={p.permissionId || p.endpointPattern}
                                      title={
                                        <div className="text-xs">
                                          <div className="font-bold text-emerald-300">
                                            {p.method} {p.endpointPattern}
                                          </div>
                                          <div>{p.description || p.module}</div>
                                        </div>
                                      }
                                      placement="top"
                                    >
                                      <span className="bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] rounded-md px-2 py-0.5 text-[11px] font-mono font-medium hover:bg-[#d1fae5] transition-colors cursor-default select-none">
                                        {tagCode}
                                      </span>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 align-top text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Button */}
                              <Tooltip title="Chỉnh sửa vai trò & phân quyền">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(role)}
                                  className="w-8 h-8 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer border-none"
                                >
                                  <EditOutlined className="text-sm" />
                                </button>
                              </Tooltip>

                              {/* Delete Button */}
                              <Popconfirm
                                title={`Xóa vai trò ${role.code}?`}
                                description="Các tài khoản đang gán vai trò này sẽ mất quyền tương ứng."
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleDeleteRole(role)}
                              >
                                <Tooltip title="Xóa vai trò">
                                  <button
                                    type="button"
                                    className="w-8 h-8 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer border-none"
                                  >
                                    <DeleteOutlined className="text-sm" />
                                  </button>
                                </Tooltip>
                              </Popconfirm>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer (matching Image 1) */}
          <div className="text-center py-8 text-xs text-slate-400">
            <div>© 2026 Tinovation. All rights reserved.</div>
            <div className="mt-1 text-[11px] text-slate-400/80">v1.0.0</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: VIEW 2 — CREATE / EDIT ROLE WITH MATRIX (Image 2)
  // ══════════════════════════════════════════════════════════════

  return (
    <PageContainer>
      <div className="max-w-[1400px] mx-auto py-2">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-bold text-slate-800 text-base">Role Management</span>
            <span className="text-slate-300">/</span>
            <span
              onClick={handleBackToList}
              className="hover:text-blue-600 cursor-pointer flex items-center gap-1"
            >
              <HomeOutlined className="text-xs" /> Home
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-blue-600 font-medium">Role Management</span>
          </div>

          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToList}
            className="!h-9 !rounded-lg text-slate-600 hover:border-blue-500"
          >
            Quay lại danh sách
          </Button>
        </div>

        {/* Form Container Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-6">
            {editingRole ? `Edit Role: ${editingRole.code}` : 'Create New Role'}
          </h2>

          <Form form={form} layout="vertical">
            {/* Row 1: Role Name & Guard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Role Name (code) */}
              <div>
                <Form.Item
                  name="code"
                  label={
                    <span className="text-xs font-bold text-slate-700">
                      Role Name (code) <span className="text-red-500">*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên vai trò' },
                    { pattern: /^[A-Z0-9_]+$/, message: 'Chữ in hoa, số và dấu gạch dưới (VD: HR_MANAGER)' },
                  ]}
                  className="!mb-1"
                >
                  <Input
                    placeholder="Enter role name (e.g., hr_manager)"
                    size="large"
                    className="!rounded-lg !border-slate-300 text-sm"
                    onChange={(e) => {
                      form.setFieldsValue({ code: e.target.value.toUpperCase() });
                    }}
                  />
                </Form.Item>
              </div>

              {/* Guard (scope) */}
              <div>
                <Form.Item
                  name="guard"
                  label={<span className="text-xs font-bold text-slate-700">Guard (scope)</span>}
                  className="!mb-1"
                >
                  <Select
                    size="large"
                    value={selectedGuard}
                    onChange={(val) => {
                      setSelectedGuard(val);
                      setSelectedTab(val);
                    }}
                    className="!rounded-lg text-sm"
                  >
                    {GUARD_OPTIONS.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <div className="text-[11px] text-slate-400 mt-1">
                  Guard will automatically change when you switch tabs below
                </div>
              </div>
            </div>

            {/* Row 2: Staff code prefix / Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Form.Item
                  name="prefix"
                  label={<span className="text-xs font-bold text-slate-700">Staff code prefix</span>}
                  className="!mb-1"
                >
                  <Input placeholder="FS" size="large" className="!rounded-lg !border-slate-300 text-sm" />
                </Form.Item>
                <div className="text-[11px] text-slate-400 mt-1">
                  Used to build the staff code, e.g. FS -&gt; FS-0001. Optional.
                </div>
              </div>

              <div>
                <Form.Item
                  name="description"
                  label={<span className="text-xs font-bold text-slate-700">Mô tả vai trò</span>}
                  className="!mb-1"
                >
                  <Input
                    placeholder="Mô tả phạm vi quyền hạn của vai trò này"
                    size="large"
                    className="!rounded-lg !border-slate-300 text-sm"
                  />
                </Form.Item>
                <div className="text-[11px] text-slate-400 mt-1">
                  Mô tả ngắn gọn mục đích sử dụng trong hệ thống
                </div>
              </div>
            </div>

            {/* Scope Tabs (matching Image 2) */}
            <div className="border-b border-slate-200 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {GUARD_OPTIONS.map((tab) => {
                  const isActive = selectedTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setSelectedTab(tab.value);
                        setSelectedGuard(tab.value);
                        form.setFieldsValue({ guard: tab.value });
                      }}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-[1px] cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 ${
                        isActive
                          ? 'border-[#0090ff] text-[#0090ff] bg-blue-50/50 rounded-t-lg'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-3 pb-2">
                <span className="text-xs text-slate-500 font-medium">
                  Đã chọn: <b className="text-blue-600">{selectedPermIds.size}</b> / {allPerms.length} quyền
                </span>
                <Button
                  size="small"
                  icon={<CheckSquareOutlined />}
                  onClick={selectAllPermissions}
                  className="!text-xs !rounded"
                >
                  Chọn tất cả
                </Button>
                <Button
                  size="small"
                  icon={<BorderOutlined />}
                  onClick={deselectAllPermissions}
                  className="!text-xs !rounded"
                >
                  Bỏ chọn tất cả
                </Button>
              </div>
            </div>

            {/* Matrix Table: Module | Permissions (matching Image 2) */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200">
                    <th className="py-3 px-5 text-xs font-bold text-slate-700 w-56 uppercase">Module</th>
                    <th className="py-3 px-5 text-xs font-bold text-slate-700 uppercase">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permsLoading ? (
                    <tr>
                      <td colSpan={2} className="py-12 text-center">
                        <Spin />
                        <div className="text-xs text-slate-400 mt-2">Đang tải danh sách permissions...</div>
                      </td>
                    </tr>
                  ) : groupedByModule.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-xs text-slate-400">
                        Không có dữ liệu permission
                      </td>
                    </tr>
                  ) : (
                    groupedByModule.map(([moduleName, permsInModule]) => {
                      const allModuleSelected = permsInModule.every((p) => selectedPermIds.has(p.id));
                      const someModuleSelected =
                        permsInModule.some((p) => selectedPermIds.has(p.id)) && !allModuleSelected;

                      return (
                        <tr key={moduleName} className="hover:bg-slate-50/50 transition-colors">
                          {/* Module Column (Blue bold uppercase) */}
                          <td className="py-4 px-5 align-top">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allModuleSelected}
                                indeterminate={someModuleSelected}
                                onChange={() => toggleModulePermissions(permsInModule)}
                              />
                              <span
                                onClick={() => toggleModulePermissions(permsInModule)}
                                className="text-[#0090ff] font-bold text-xs tracking-wider uppercase cursor-pointer hover:underline"
                              >
                                {moduleName}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-6 mt-0.5">
                              {permsInModule.filter((p) => selectedPermIds.has(p.id)).length}/
                              {permsInModule.length} quyền
                            </div>
                          </td>

                          {/* Permissions Checkbox Grid */}
                          <td className="py-4 px-5 align-middle">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-2.5 gap-x-4">
                              {permsInModule.map((p) => {
                                const { action } = getPermissionAction(p);
                                const isChecked = selectedPermIds.has(p.id);

                                return (
                                  <Tooltip
                                    key={p.id}
                                    title={
                                      <div className="text-xs">
                                        <div className="font-bold text-emerald-300">
                                          {p.method} {p.endpointPattern}
                                        </div>
                                        <div>{p.description || p.module}</div>
                                      </div>
                                    }
                                    placement="topLeft"
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 hover:text-slate-900 transition-colors">
                                      <Checkbox
                                        checked={isChecked}
                                        onChange={() => togglePermission(p.id)}
                                      />
                                      <span className={isChecked ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                                        {action}
                                      </span>
                                    </label>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                size="large"
                onClick={handleBackToList}
                className="!h-10 !rounded-lg text-slate-600 px-5"
              >
                Hủy bỏ
              </Button>
              <Button
                type="primary"
                size="large"
                loading={saving}
                icon={<SaveOutlined />}
                onClick={handleSaveRole}
                className="!h-10 !rounded-lg !bg-[#0090ff] hover:!bg-blue-600 !font-semibold px-6 shadow-sm"
              >
                {editingRole ? 'Lưu thay đổi' : 'Tạo vai trò mới'}
              </Button>
            </div>
          </Form>
        </div>

        {/* Footer (matching Image 2) */}
        <div className="text-center py-6 text-xs text-slate-400">
          <div>© 2026 Tinovation. All rights reserved.</div>
          <div className="mt-1 text-[11px] text-slate-400/80">v1.0.0</div>
        </div>
      </div>
    </PageContainer>
  );
};

export default RoleManagePage;
