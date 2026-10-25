import { Spin } from 'antd';

interface Props {
  tip?: string;
}

const PageLoading = ({ tip = 'Đang tải...' }: Props) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
    }}
  >
    <Spin size="large" tip={tip}>
      <div style={{ padding: 40 }} />
    </Spin>
  </div>
);

export default PageLoading;