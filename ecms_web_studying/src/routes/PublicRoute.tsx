import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageLoading from '@/components/feedback/PageLoading';
const PublicRoute = ({ redirectIfAuthenticated = false, redirectTo = '/student/dashboard' }) => {
  const { isAuthenticated, initialized } = useAuth();
  if (!initialized) return <PageLoading tip="Đang kiểm tra..." />;
  if (redirectIfAuthenticated && isAuthenticated) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
};
export default PublicRoute;