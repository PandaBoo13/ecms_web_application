import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import PublicHeader from './PublicHeader';
const { Content, Footer } = Layout;
const PublicLayout = () => (
  <Layout style={{ minHeight: '100vh' }}>
    <PublicHeader />
    <Content style={{ background: '#f8fafc' }}><Outlet /></Content>
    <Footer style={{ textAlign: 'center', background: '#0f172a', color: '#94a3b8', padding: '32px 24px', fontSize: 13 }}>© 2026 ECMS. All rights reserved.</Footer>
  </Layout>
);
export default PublicLayout;