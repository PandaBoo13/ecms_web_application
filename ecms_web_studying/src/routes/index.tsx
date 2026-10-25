import { Routes, Route, Navigate } from 'react-router-dom';
import PublicRoute from './PublicRoute';
import StudentRoute from './StudentRoute';
import PublicLayout from '@/components/layout/PublicLayout';
import StudentLayout from '@/components/layout/StudentLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ForbiddenPage from '@/pages/ForbiddenPage';
import HomePage from '@/pages/landing/HomePage';
import CourseCatalogPage from '@/pages/landing/CourseCatalogPage';
import PricingPage from '@/pages/landing/PricingPage';
import BlogPage from '@/pages/landing/BlogPage';
import AboutPage from '@/pages/landing/AboutPage';
import ContactPage from '@/pages/landing/ContactPage';
import StudentDashboardPage from '@/pages/student/dashboard/StudentDashboardPage';
import MyCoursesPage from '@/pages/student/my-courses/MyCoursesPage';
import CourseLearnPage from '@/pages/student/my-courses/CourseLearnPage';
import AssignmentListPage from '@/pages/student/assignments/AssignmentListPage';
import AssignmentDetailPage from '@/pages/student/assignments/AssignmentDetailPage';
import GradesPage from '@/pages/student/grades/GradesPage';
import ProfilePage from '@/pages/ProfilePage';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CourseCatalogPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>
      <Route element={<PublicRoute redirectIfAuthenticated />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<StudentRoute />}>
        <Route element={<StudentLayout />}>
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/student/courses" element={<MyCoursesPage />} />
          <Route path="/student/courses/:id/learn" element={<CourseLearnPage />} />
          <Route path="/student/assignments" element={<AssignmentListPage />} />
          <Route path="/student/assignments/:id" element={<AssignmentDetailPage />} />
          <Route path="/student/grades" element={<GradesPage />} />
          <Route path="/student/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}