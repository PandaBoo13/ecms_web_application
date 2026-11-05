import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE } from '@/constants/roles';

const ForbiddenPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isInstructor, isConsultant } = useAuth();

  const handleGoHome = () => {
    if (isAdmin()) {
      navigate('/admin/dashboard', { replace: true });
    } else if (isInstructor()) {
      navigate('/instructor/dashboard', { replace: true });
    } else if (isConsultant() || user?.roleCode === ROLE.LEAD || user?.roleCode === ROLE.CONSULTANT) {
      navigate('/admin/leads', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập trang này."
        extra={
          <Button type="primary" onClick={handleGoHome}>
            Về trang chủ
          </Button>
        }
      />
    </div>
  );
};

export default ForbiddenPage;