import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useUIStore } from '@/stores/uiStore';
const { Content } = Layout;
const StudentLayout = () => {
  const { sidebarCollapsed } = useUIStore();
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={sidebarCollapsed} />
      <Layout>
        <Header />
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}><Outlet /></Content>
      </Layout>
    </Layout>
  );
};
export default StudentLayout;