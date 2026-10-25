import { Outlet } from 'react-router-dom';
import ProtectedRoute, { STUDENT_ROLES } from './ProtectedRoute';
const StudentRoute = () => (<ProtectedRoute allowedRoles={STUDENT_ROLES}><Outlet /></ProtectedRoute>);
export default StudentRoute;