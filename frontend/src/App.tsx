import React, { useState } from 'react';
import { ConfigProvider, Tabs, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import OptionSeeker from './components/OptionSeeker';
import CandlestickChart from './components/CandlestickChart';
import './index.css';

type TabKey = 'options' | 'candlestick';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('candlestick');

  const items = [
    {
      key: 'candlestick',
      label: '股票K线',
      children: <CandlestickChart />,
    },
    {
      key: 'options',
      label: '期权筛选',
      children: <OptionSeeker />,
    },
  ];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={items}
          size="large"
          className="px-4 pt-4"
        />
      </div>
    </ConfigProvider>
  );
};

export default App;
