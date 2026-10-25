import { Empty, Typography } from 'antd';
import PageContainer from './PageContainer';
import PageHeader from './PageHeader';

const { Text } = Typography;

interface Props {
  title: string;
  description?: string;
}

const PlaceholderPage = ({ title, description }: Props) => (
  <PageContainer>
    <PageHeader title={title} subtitle={description} />
    <div
      style={{
        background: '#fff',
        padding: 48,
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <Empty
        description={
          <Text type="secondary">
            Trang đang được phát triển
          </Text>
        }
      />
    </div>
  </PageContainer>
);

export default PlaceholderPage;