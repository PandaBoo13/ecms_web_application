import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE } from '@/constants/roles';
import PageLoading from '@/components/feedback/PageLoading';

interface Props {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, isAuthenticated, initialized } = useAuth();
  const location = useLocation();

  // Chưa init xong → chờ
  if (!initialized) {
    return <PageLoading tip="Đang kiểm tra đăng nhập..." />;
  }

  // Chưa login → redirect login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Sai role → 403
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.roleCode;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/403" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

export const ADMIN_ROLES = [ROLE.ADMIN];
export const INSTRUCTOR_ROLES = [ROLE.ADMIN, ROLE.INSTRUCTOR];