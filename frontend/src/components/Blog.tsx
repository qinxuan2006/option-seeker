import React, { useState } from 'react';
import { Card, Typography, Button, Tag, Divider, List, Avatar } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, UserOutlined, TagOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

interface Article {
  id: string;
  title: string;
  date: string;
  readTime: string;
  tags: string[];
  excerpt: string;
  content: React.ReactNode;
}

const articles: Article[] = [
  {
    id: '1',
    title: '静守时光',
    date: '2026-04-07',
    readTime: '5 分钟',
    tags: ['随笔', '生活'],
    excerpt: '清晨的光透过窗帘缝隙洒进来，在地板上画出一道淡淡的金线。泡一杯热茶，看茶叶在水中缓缓舒展，如同打开一本尘封已久的书卷...',
    content: (
      <div className="space-y-6">
        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          清晨的光透过窗帘缝隙洒进来，在地板上画出一道淡淡的金线。
          泡一杯热茶，看茶叶在水中缓缓舒展，如同打开一本尘封已久的书卷。
        </Paragraph>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          这个世界很快，快到我们常常忘记了自己为什么出发。
          而我只想做一个旁观者，静静地看着日升月落，云卷云舒，
          用一颗温柔的心，去感受这世间的美好与哀愁。
        </Paragraph>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          时光不语，却在无声中教会我们许多。
          它让我们懂得，有些东西不必急于追赶，
          有些故事不必急于讲述，且让它们在岁月中慢慢沉淀，
          如同陈年的酒，愈久弥香。
        </Paragraph>

        <div className="!bg-gray-900/50 !border border-gray-800 rounded-xl p-8 my-8">
          <Text className="!text-gray-400 !text-xl italic block text-center leading-relaxed">
            「宠辱不惊，看庭前花开花落；
            <br />
            去留无意，望天空云卷云舒。」
          </Text>
        </div>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          我们都是时光的旅人，在各自的轨道上行走。
          有时候停下来，不是为了等待谁，
          而是给自己一个喘息的机会，
          听听内心的声音，看看沿途的风景。
        </Paragraph>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          温柔，不是软弱，而是一种力量。
          它是在看清了生活的真相之后，
          依然选择热爱这个世界；
          是在经历了许多不美好之后，
          依然相信美好的存在。
        </Paragraph>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          愿你我都能在这喧嚣的尘世中，
          保有一份属于自己的宁静。
          不急不躁，不慌不忙，
          用最柔软的姿态，拥抱这坚硬的世界。
        </Paragraph>
      </div>
    ),
  },
  {
    id: '2',
    title: '温柔看待世界',
    date: '2026-03-15',
    readTime: '4 分钟',
    tags: ['随笔', '感悟'],
    excerpt: '夜深了，城市的灯火依然璀璨。但我更怀念小时候的夜空，那时候星星很多，多到可以串成一条银河...',
    content: (
      <div className="space-y-6">
        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          夜深了，城市的灯火依然璀璨。
          但我更怀念小时候的夜空，那时候星星很多，
          多到可以串成一条银河。
          我们躺在院子里，数着星星，数着数着，就进入了梦乡。
        </Paragraph>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          成长的代价，是失去了一些童真，
          也得到了一些智慧。
          我们学会了用更宽广的视角去看待这个世界，
          学会了理解，学会了包容，学会了在复杂中寻找简单。
        </Paragraph>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          每一座城市都有它的故事，
          每一个清晨都承载着新的希望。
          当第一缕阳光穿透云层，
          整个世界都被镀上了一层温柔的金色。
          那时候你会觉得，一切都很美好，一切都可以重新开始。
        </Paragraph>

        <Paragraph className="!text-gray-300 !text-lg leading-loose">
          愿你被这世界温柔以待，
          愿你也能温柔地对待这世界。
          即使生活有时会让你失望，
          即使人心有时难以捉摸，
          也要相信，总有一些美好在等待着你。
        </Paragraph>
      </div>
    ),
  },
];

const allTags = ['随笔', '生活', '感悟'];

const BlogIndex: React.FC = () => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  if (selectedArticle) {
    return (
      <div className="max-w-3xl mx-auto">
        <article>
          <header className="mb-12">
            <Button
              type="text"
              icon={<ArrowLeftOutlined className="text-gray-400" />}
              className="!rounded-lg hover:!bg-indigo-500/20 group !mb-6"
              onClick={() => setSelectedArticle(null)}
            >
              <span className="text-gray-400 group-hover:!text-white ml-1 transition-colors">返回</span>
            </Button>

            <Title level={1} className="!text-white !text-4xl !mb-6">
              {selectedArticle.title}
            </Title>

            <div className="flex items-center gap-4 mb-8 flex-wrap">
              <span className="flex items-center gap-2 text-gray-400">
                <CalendarOutlined /> {selectedArticle.date}
              </span>
              <span className="flex items-center gap-2 text-gray-400">
                <ClockCircleOutlined /> {selectedArticle.readTime}
              </span>
              <div className="flex gap-2">
                {selectedArticle.tags.map((tag) => (
                  <Tag key={tag} className="!bg-indigo-500/20 !border-indigo-500/30 !text-indigo-300">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>

            <Divider className="!border-gray-800" />
          </header>

          <div className="blog-content">{selectedArticle.content}</div>
        </article>

        <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
          <Button size="large" className="!rounded-xl" onClick={() => setSelectedArticle(null)}>
            ← 返回文章列表
          </Button>
        </footer>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/">
          <Button
            type="text"
            icon={<ArrowLeftOutlined className="text-gray-400" />}
            className="!rounded-lg hover:!bg-indigo-500/20 group"
          >
            <span className="text-gray-400 group-hover:!text-white ml-1 transition-colors">返回</span>
          </Button>
        </Link>
        <div className="w-px h-6 bg-gray-700" />
        <span className="text-white text-2xl font-semibold">浮光掠影</span>
      </div>

      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
          <div className="space-y-6">
            {articles.map((article) => (
              <Card
                key={article.id}
                hoverable
                className="!bg-gray-900/80 !backdrop-blur-xl !border border-gray-700/50 !rounded-2xl transition-all duration-300 hover:!border-indigo-500/50 cursor-pointer"
                bodyStyle={{ padding: '28px' }}
                onClick={() => setSelectedArticle(article)}
              >
                <div className="flex items-start gap-5">
                  <div className="w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <span className="text-white text-xl font-semibold leading-tight mt-0.5">
                        {article.title}
                      </span>
                      <div className="flex gap-2">
                        {article.tags.map((tag) => (
                          <Tag key={tag} className="!bg-indigo-500/20 !border-indigo-500/30 !text-indigo-300">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>

                    <Paragraph className="!text-gray-400 !mb-4 line-clamp-2">
                      {article.excerpt}
                    </Paragraph>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarOutlined /> {article.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockCircleOutlined /> {article.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-6">
          {/* Author Card */}
          <Card className="!bg-gray-900/80 !border-gray-700/50 !rounded-2xl">
            <div className="flex flex-col items-center text-center">
              <Avatar size={80} icon={<UserOutlined />} className="!bg-gradient-to-br from-indigo-500 to-purple-500 mb-4" />
              <Title level={4} className="!text-white !mb-1">怜影</Title>
              <Text className="text-gray-400 text-sm mb-4">记录生活的点滴</Text>
              <div className="flex gap-2">
                {['随笔', '感悟', '生活'].map((tag) => (
                  <Tag key={tag} className="!bg-gray-800 !border-gray-700 !text-gray-400">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          </Card>

          {/* Tags */}
          <Card className="!bg-gray-900/80 !border-gray-700/50 !rounded-2xl" title={<span className="text-gray-300"><TagOutlined className="mr-2" />标签</span>}>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Tag
                  key={tag}
                  className="!bg-indigo-500/20 !border-indigo-500/30 !text-indigo-300 cursor-pointer hover:!bg-indigo-500/40 transition-colors"
                >
                  {tag}
                </Tag>
              ))}
            </div>
          </Card>

          {/* Recent Posts */}
          <Card className="!bg-gray-900/80 !border-gray-700/50 !rounded-2xl" title={<span className="text-gray-300">最新文章</span>}>
            <List
              dataSource={articles.slice(0, 3)}
              renderItem={(item) => (
                <List.Item
                  className="!border-gray-800 !cursor-pointer hover:!border-indigo-500/50 transition-colors rounded-lg px-2 py-3 -mx-2"
                  onClick={() => setSelectedArticle(item)}
                >
                  <div>
                    <Text className="text-gray-300 block hover:!text-indigo-400 transition-colors">{item.title}</Text>
                    <Text className="text-gray-500 text-xs">{item.date}</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

const Blog: React.FC = () => {
  return (
    <div className="min-h-screen p-6">
      <BlogIndex />
    </div>
  );
};

export default Blog;
