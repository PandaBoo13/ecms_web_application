import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  padding?: number | string;
  maxWidth?: number;
}

const PageContainer = ({ children, padding = 24, maxWidth }: Props) => (
  <div
    style={{
      padding,
      maxWidth,
      margin: '0 auto',
      width: '100%',
    }}
  >
    {children}
  </div>
);

export default PageContainer;