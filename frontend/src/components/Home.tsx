import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Typography } from 'antd';
import { AppstoreOutlined, RightOutlined, FireOutlined, FundOutlined, ToolOutlined, ReadOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ProjectItem {
  name: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

const projects: ProjectItem[] = [
  {
    name: '浮光掠影',
    description: '用文字记录生活的温度，静守时光，温柔看待世界',
    path: '/blog',
    icon: <ReadOutlined />,
    color: 'from-pink-500 to-rose-600',
  },
  {
    name: 'Option Seeker',
    description: '美股期权分析工具，支持实时行情、Greeks 数据可视化和智能筛选',
    path: '/option-seeker',
    icon: <FundOutlined />,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    name: '工具集合',
    description: '各种实用小工具合集',
    path: '/tools',
    icon: <ToolOutlined />,
    color: 'from-cyan-500 to-blue-600',
  },
];

const Home: React.FC = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-950/50 to-purple-950/50">
        <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-indigo-400/30 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-3xl w-full">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 flex items-center justify-center">
                <AppstoreOutlined className="text-white text-4xl" />
              </div>
            </div>
            <Title
              level={1}
              className="!text-white !text-4xl !font-bold !mb-4"
              style={{
                textShadow: '0 0 40px rgba(139, 92, 246, 0.5)',
              }}
            >
              怜影的百宝箱
            </Title>
            <div
              className="flex justify-center items-baseline gap-2"
              style={{
                fontFamily: '"STXingkai", "STKaiti", "KaiTi", serif',
                fontSize: '22px',
                letterSpacing: '4px',
                color: '#e9d5ff',
                textShadow: '0 0 20px rgba(192, 132, 252, 0.5)',
              }}
            >
              <span>晚来天欲雪，能饮一杯无</span>
              <span style={{ fontSize: '20px', color: '#fcd34d', filter: 'drop-shadow(0 0 6px rgba(252, 211, 77, 0.5))' }}>
                <EditOutlined />
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <FireOutlined className="text-orange-400" />
              <Text className="text-gray-500 text-sm">持续更新中</Text>
            </div>
          </div>

          {/* Project Cards */}
          <div className="grid gap-6 mb-16">
            {projects.map((project) => (
              <Link key={project.path} to={project.path} className="block group !no-underline">
                <Card
                  hoverable
                  className="!bg-gray-900/80 !backdrop-blur-xl !border border-gray-700/50 !rounded-2xl transition-all duration-500 group-hover:!border-indigo-500/50 group-hover:shadow-xl group-hover:shadow-indigo-500/10"
                  bodyStyle={{ padding: '28px' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-white text-2xl">{project.icon}</span>
                      </div>
                      <div className="flex flex-col justify-center gap-0">
                        <span className="text-white text-xl font-semibold leading-tight">
                          {project.name}
                        </span>
                        <span className="text-gray-400 text-sm mt-1">
                          {project.description}
                        </span>
                      </div>
                    </div>
                    <RightOutlined className="text-indigo-400 text-lg opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center">
            <Text className="text-gray-600 text-sm">
              © {new Date().getFullYear()} 怜影的百宝箱 · 用热爱编织每一天
            </Text>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;
