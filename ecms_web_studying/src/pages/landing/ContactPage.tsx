import { Button, Card, Form, Input, Typography, message } from 'antd';
import { MailOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
const { Title, Paragraph } = Typography;
const ContactPage = () => {
  const [form] = Form.useForm();
  return (
    <div style={{ padding: '48px 24px', maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}>Liên hệ</Title>
      <Paragraph type="secondary" style={{ marginBottom: 32 }}>Gửi câu hỏi cho ECMS</Paragraph>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <Card><Form form={form} layout="vertical" onFinish={() => { message.success('Đã gửi!'); form.resetFields(); }}>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="message" label="Nội dung" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Gửi</Button>
        </Form></Card>
        <Card><Title level={4}>Thông tin</Title><div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}><div><EnvironmentOutlined /> 123 Đường ABC, TP.HCM</div><div><PhoneOutlined /> 028 1234 5678</div><div><MailOutlined /> contact@ecms.vn</div></div></Card>
      </div>
    </div>
  );
};
export default ContactPage;