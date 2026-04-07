import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Spin } from 'antd';
import './index.css';

const Home = lazy(() => import('./components/Home'));
const OptionSeeker = lazy(() => import('./components/OptionSeeker'));
const Tools = lazy(() => import('./components/Tools'));
const Blog = lazy(() => import('./components/Blog'));

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spin size="large" />
  </div>
);

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
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/option-seeker" element={<OptionSeeker />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/blog" element={<Blog />} />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
