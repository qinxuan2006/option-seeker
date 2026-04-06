import React, { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Slider,
  Card,
  Tag,
  Space,
  Spin,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  StockOutlined,
  RiseOutlined,
  FallOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { analysisApi, stockApi } from '../services/api';
import { OptionAnalysis, StockInfo, FilterState } from '../types';

const { Option } = Select;

const OptionSeeker: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [maxExpiryDays, setMaxExpiryDays] = useState(60);
  const [loading, setLoading] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [options, setOptions] = useState<OptionAnalysis[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const [filters, setFilters] = useState<FilterState>({
    minAnnualReturn: 0,
    maxAnnualReturn: 100,
    minPremium: 0,
    maxPremium: 10000,
    minPriceDiff: 0,
    maxPriceDiff: 50,
  });

  const filteredOptions = useMemo(() => {
    return options.filter((opt) => {
      return (
        opt.annual_return >= filters.minAnnualReturn &&
        opt.annual_return <= filters.maxAnnualReturn &&
        opt.premium >= filters.minPremium &&
        opt.premium <= filters.maxPremium &&
        opt.price_diff_percent >= filters.minPriceDiff &&
        opt.price_diff_percent <= filters.maxPriceDiff
      );
    });
  }, [options, filters]);

  const handleAnalyze = async () => {
    if (!symbol.trim()) {
      message.warning('请输入股票代码');
      return;
    }

    setLoading(true);
    try {
      const stock = await stockApi.getStockInfo(symbol);
      setStockInfo(stock);

      const response = await analysisApi.analyzeOptions({
        symbol: symbol.toUpperCase(),
        option_type: optionType,
        max_expiry_days: maxExpiryDays,
        min_annual_return: 0,
        max_annual_return: 100,
        min_premium: 0,
        max_premium: 10000,
        min_price_diff: 0,
        max_price_diff: 50,
      });

      setCurrentPrice(response.current_price);
      setOptions(response.options);
      message.success(`找到 ${response.options.length} 个期权合约`);
    } catch (error: any) {
      message.error(error.response?.data?.detail || '分析失败，请检查股票代码是否正确');
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return <span className="score-badge score-high">{score.toFixed(1)}</span>;
    } else if (score >= 40) {
      return <span className="score-badge score-medium">{score.toFixed(1)}</span>;
    }
    return <span className="score-badge score-low">{score.toFixed(1)}</span>;
  };

  const columns: ColumnsType<OptionAnalysis> = [
    {
      title: '到期日',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      width: 110,
      render: (date: string, record) => (
        <div>
          <div className="font-medium">{dayjs(date).format('YYYY-MM-DD')}</div>
          <Tag color={record.days_to_expiry <= 7 ? 'red' : record.days_to_expiry <= 30 ? 'orange' : 'green'}>
            {record.days_to_expiry}天
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.days_to_expiry - b.days_to_expiry,
    },
    {
      title: '行权价',
      dataIndex: 'strike',
      key: 'strike',
      width: 100,
      render: (strike: number) => (
        <span className="font-semibold text-blue-600">${strike.toFixed(2)}</span>
      ),
      sorter: (a, b) => a.strike - b.strike,
    },
    {
      title: '权利金',
      dataIndex: 'premium',
      key: 'premium',
      width: 100,
      render: (premium: number) => (
        <span className="font-semibold text-green-600">${premium.toFixed(2)}</span>
      ),
      sorter: (a, b) => a.premium - b.premium,
    },
    {
      title: (
        <Tooltip title="年化收益率 = (权利金/行权价) ^ (365/天数) - 1">
          年化收益 <InfoCircleOutlined className="ml-1" />
        </Tooltip>
      ),
      dataIndex: 'annual_return',
      key: 'annual_return',
      width: 110,
      render: (value: number) => (
        <span className={value > 20 ? 'positive font-bold' : 'font-medium'}>
          {value.toFixed(2)}%
        </span>
      ),
      sorter: (a, b) => a.annual_return - b.annual_return,
    },
    {
      title: (
        <Tooltip title="当前股价与行权价的差距百分比">
          价差% <InfoCircleOutlined className="ml-1" />
        </Tooltip>
      ),
      dataIndex: 'price_diff_percent',
      key: 'price_diff_percent',
      width: 90,
      render: (value: number) => (
        <span className={value <= 5 ? 'positive' : value <= 10 ? 'text-orange-500' : 'text-gray-600'}>
          {value.toFixed(2)}%
        </span>
      ),
      sorter: (a, b) => a.price_diff_percent - b.price_diff_percent,
    },
    {
      title: (
        <Tooltip title="期权到期时处于价内的概率">
          行权概率 <InfoCircleOutlined className="ml-1" />
        </Tooltip>
      ),
      dataIndex: 'itm_probability',
      key: 'itm_probability',
      width: 100,
      render: (value: number) => (
        <div className="w-full">
          <div className="text-sm font-medium">{value.toFixed(1)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        </div>
      ),
      sorter: (a, b) => a.itm_probability - b.itm_probability,
    },
    {
      title: '盈亏平衡',
      dataIndex: 'breakeven',
      key: 'breakeven',
      width: 100,
      render: (value: number, record) => {
        const diff = value - currentPrice;
        const percent = ((value - currentPrice) / currentPrice) * 100;
        return (
          <div>
            <div className="font-medium">${value.toFixed(2)}</div>
            <div className={diff >= 0 ? 'text-xs text-red-500' : 'text-xs text-green-500'}>
              {diff >= 0 ? '+' : ''}{percent.toFixed(1)}%
            </div>
          </div>
        );
      },
    },
    {
      title: '成交量/持仓',
      dataIndex: 'volume',
      key: 'volume',
      width: 110,
      render: (_: any, record) => (
        <div className="text-xs">
          <div>量: {record.volume.toLocaleString()}</div>
          <div className="text-gray-500">仓: {record.open_interest.toLocaleString()}</div>
        </div>
      ),
      sorter: (a, b) => a.volume - b.volume,
    },
    {
      title: '隐含波动率',
      dataIndex: 'implied_volatility',
      key: 'implied_volatility',
      width: 100,
      render: (value: number) => (
        <span className={value > 50 ? 'text-red-500' : value > 30 ? 'text-orange-500' : 'text-green-500'}>
          {value.toFixed(1)}%
        </span>
      ),
      sorter: (a, b) => a.implied_volatility - b.implied_volatility,
    },
    {
      title: '推荐值',
      dataIndex: 'recommendation_score',
      key: 'recommendation_score',
      width: 90,
      fixed: 'right',
      render: (score: number) => getScoreBadge(score),
      sorter: (a, b) => a.recommendation_score - b.recommendation_score,
      defaultSortOrder: 'descend',
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            Option Seeker
          </h1>
          <p className="text-gray-600">港美股期权智能分析平台</p>
        </div>

        <Card className="glass-card mb-6">
          <div className="space-y-6">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={8} md={6}>
                <Input
                  size="large"
                  placeholder="输入股票代码 (如: AAPL)"
                  prefix={<StockOutlined className="text-gray-400" />}
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onPressEnter={handleAnalyze}
                />
              </Col>
              <Col xs={24} sm={8} md={4}>
                <Select
                  size="large"
                  value={optionType}
                  onChange={setOptionType}
                  className="w-full"
                >
                  <Option value="call">
                    <RiseOutlined className="text-green-500 mr-2" />
                    看涨期权
                  </Option>
                  <Option value="put">
                    <FallOutlined className="text-red-500 mr-2" />
                    看跌期权
                  </Option>
                </Select>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <div className="text-sm text-gray-600 mb-1">最远到期日: {maxExpiryDays}天</div>
                <Slider
                  min={7}
                  max={180}
                  value={maxExpiryDays}
                  onChange={setMaxExpiryDays}
                  marks={{ 7: '1周', 30: '1月', 90: '3月', 180: '6月' }}
                />
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Button
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={handleAnalyze}
                  loading={loading}
                  block
                  className="h-12"
                >
                  开始分析
                </Button>
              </Col>
            </Row>

            {stockInfo && (
              <Row gutter={16} className="mt-4">
                <Col xs={12} sm={6}>
                  <Statistic
                    title="股票名称"
                    value={stockInfo.name}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="当前价格"
                    value={currentPrice}
                    prefix="$"
                    precision={2}
                    valueStyle={{ color: '#3b82f6' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="期权数量"
                    value={options.length}
                    suffix="个"
                    valueStyle={{ color: '#10b981' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="交易所"
                    value={stockInfo.exchange}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>
            )}
          </div>
        </Card>

        {options.length > 0 && (
          <Card className="glass-card mb-6" title={
            <span className="flex items-center">
              <PercentageOutlined className="mr-2" />
              筛选条件
            </span>
          }>
            <Row gutter={[24, 16]}>
              <Col xs={24} md={8}>
                <div className="mb-2 font-medium text-gray-700">
                  年化收益范围: {filters.minAnnualReturn}% - {filters.maxAnnualReturn}%
                </div>
                <Slider
                  range
                  min={0}
                  max={100}
                  value={[filters.minAnnualReturn, filters.maxAnnualReturn]}
                  onChange={([min, max]) => setFilters({ ...filters, minAnnualReturn: min, maxAnnualReturn: max })}
                />
              </Col>
              <Col xs={24} md={8}>
                <div className="mb-2 font-medium text-gray-700">
                  <DollarOutlined className="mr-1" />
                  权利金范围: ${filters.minPremium} - ${filters.maxPremium}
                </div>
                <Slider
                  range
                  min={0}
                  max={Math.max(1000, ...options.map(o => o.premium))}
                  value={[filters.minPremium, filters.maxPremium]}
                  onChange={([min, max]) => setFilters({ ...filters, minPremium: min, maxPremium: max })}
                />
              </Col>
              <Col xs={24} md={8}>
                <div className="mb-2 font-medium text-gray-700">
                  价差百分比: {filters.minPriceDiff}% - {filters.maxPriceDiff}%
                </div>
                <Slider
                  range
                  min={0}
                  max={50}
                  value={[filters.minPriceDiff, filters.maxPriceDiff]}
                  onChange={([min, max]) => setFilters({ ...filters, minPriceDiff: min, maxPriceDiff: max })}
                />
              </Col>
            </Row>
          </Card>
        )}

        <Card className="glass-card">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spin size="large" tip="正在分析期权数据..." />
            </div>
          ) : options.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-gray-500">
                显示 {filteredOptions.length} / {options.length} 个期权合约
              </div>
              <Table
                columns={columns}
                dataSource={filteredOptions}
                rowKey={(record) => `${record.symbol}-${record.strike}-${record.expiry_date}`}
                scroll={{ x: 1200 }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条`,
                }}
                rowClassName="option-row"
                size="middle"
              />
            </>
          ) : (
            <Empty
              description={
                <span className="text-gray-400">
                  输入股票代码并点击"开始分析"查看期权数据
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>所有数据分析均不构成投资建议，仅供参考</p>
        </div>
      </div>
    </div>
  );
};

export default OptionSeeker;
