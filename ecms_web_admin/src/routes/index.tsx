import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute, { ADMIN_ROLES, INSTRUCTOR_ROLES } from './ProtectedRoute';

// ─── Layouts ───
import AdminLayout from '@/components/layout/AdminLayout';
import InstructorLayout from '@/components/layout/InstructorLayout';

// ─── Auth ───
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

// ─── Error pages ───
import NotFoundPage from '@/pages/NotFoundPage';
import ForbiddenPage from '@/pages/ForbiddenPage';

// ─── Admin pages ───
import AdminDashboardPage from '@/pages/admin/dashboard/AdminDashboardPage';
import UserListPage from '@/pages/admin/users/UserListPage';
import UserCreatePage from '@/pages/admin/users/UserCreatePage';
import UserDetailPage from '@/pages/admin/users/UserDetailPage';
import CourseListPage from '@/pages/admin/courses/CourseListPage';
import CourseDetailPage from '@/pages/admin/courses/CourseDetailPage';
import RoleManagePage from '@/pages/admin/system/RoleManagePage';
import PermissionListPage from '@/pages/admin/system/PermissionListPage';
import SystemLogPage from '@/pages/admin/system/SystemLogPage';
import ReportsPage from '@/pages/admin/reports/ReportsPage';
import SettingsPage from '@/pages/admin/settings/SettingsPage';
import LeadListPage from '@/pages/admin/leads/LeadListPage';
import StudentListPage from '@/pages/admin/students/StudentListPage';
import CategoryListPage from '@/pages/admin/categories/CategoryListPage';

// ─── Instructor pages ───
import InstructorDashboardPage from '@/pages/instructor/dashboard/InstructorDashboardPage';
import MyCoursesPage from '@/pages/instructor/my-courses/MyCoursesPage';
import CourseCreatePage from '@/pages/instructor/my-courses/CourseCreatePage';
import CourseEditPage from '@/pages/instructor/my-courses/CourseEditPage';
import MyStudentsPage from '@/pages/instructor/students/MyStudentsPage';
import StudentDetailPage from '@/pages/instructor/students/StudentDetailPage';
import AssignmentListPage from '@/pages/instructor/assignments/AssignmentListPage';
import ProfilePage from '@/pages/ProfilePage';

export default function AppRouter() {
  return (
    <Routes>
      {/* ══════════════════════════════════════════════════════════
          PUBLIC
          ══════════════════════════════════════════════════════════ */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ══════════════════════════════════════════════════════════
          ADMIN
          ══════════════════════════════════════════════════════════ */}
      <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

          <Route path="/admin/users" element={<UserListPage />} />
          <Route path="/admin/users/create" element={<UserCreatePage />} />
          <Route path="/admin/users/:id" element={<UserDetailPage />} />

          <Route path="/admin/leads" element={<LeadListPage />} />
          <Route path="/admin/students" element={<StudentListPage />} />
          <Route path="/admin/categories" element={<CategoryListPage />} />

          <Route path="/admin/courses" element={<CourseListPage />} />
          <Route path="/admin/courses/:id" element={<CourseDetailPage />} />

          <Route path="/admin/roles" element={<RoleManagePage />} />
          <Route path="/admin/permissions" element={<PermissionListPage />} />
          <Route path="/admin/audit-logs" element={<SystemLogPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ══════════════════════════════════════════════════════════
          INSTRUCTOR
          ══════════════════════════════════════════════════════════ */}
      <Route element={<ProtectedRoute allowedRoles={INSTRUCTOR_ROLES} />}>
        <Route element={<InstructorLayout />}>
          <Route path="/instructor" element={<Navigate to="/instructor/dashboard" replace />} />
          <Route path="/instructor/dashboard" element={<InstructorDashboardPage />} />

          <Route path="/instructor/courses" element={<MyCoursesPage />} />
          <Route path="/instructor/courses/create" element={<CourseCreatePage />} />
          <Route path="/instructor/courses/:id/edit" element={<CourseEditPage />} />

          <Route path="/instructor/students" element={<MyStudentsPage />} />
          <Route path="/instructor/students/:id" element={<StudentDetailPage />} />

          <Route path="/instructor/assignments" element={<AssignmentListPage />} />
          <Route path="/instructor/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ══════════════════════════════════════════════════════════
          ERROR
          ══════════════════════════════════════════════════════════ */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}