import { Empty, Typography } from 'antd';
const { Title, Paragraph } = Typography;
const BlogPage = () => (<div style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}><Title level={2}>Tin tức</Title><Paragraph type="secondary">Cập nhật kiến thức từ ECMS</Paragraph><Empty description="Đang cập nhật" style={{ marginTop: 64 }} /></div>);
export default BlogPage;