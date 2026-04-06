import React from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import OptionSeeker from './components/OptionSeeker';
import './index.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
      }}
    >
      <div className="dark min-h-screen bg-gray-900">
        <OptionSeeker />
      </div>
    </ConfigProvider>
  );
};

export default App;
