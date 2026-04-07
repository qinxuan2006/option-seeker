import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Home from './components/Home';
import OptionSeeker from './components/OptionSeeker';
import Tools from './components/Tools';
import Blog from './components/Blog';
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
      <BrowserRouter>
        <div className="dark min-h-screen bg-gray-900">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/option-seeker" element={<OptionSeeker />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/blog" element={<Blog />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
