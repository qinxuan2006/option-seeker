import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table,
  Input,
  InputNumber,
  Select,
  Button,
  Slider,
  Card,
  Tag,
  Spin,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Empty,
  Space,
  Checkbox,
} from 'antd';
import {
  SearchOutlined,
  StockOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  PercentageOutlined,
  LineChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { analysisApi, stockApi } from '../services/api';
import { OptionAnalysis, StockInfo, FilterState, Candlestick, PeriodType } from '../types';

const periodOptions = [
  { value: 'day', label: '日K' },
  { value: 'week', label: '周K' },
  { value: 'month', label: '月K' },
  { value: '60min', label: '60分钟' },
  { value: '30min', label: '30分钟' },
  { value: '15min', label: '15分钟' },
  { value: '5min', label: '5分钟' },
  { value: '1min', label: '1分钟' },
];

const formatVolume = (volume: number): string => {
  if (volume >= 1000000000) return (volume / 1000000000).toFixed(2) + 'B';
  if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
  if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
  return volume.toString();
};

const OptionSeeker: React.FC = () => {
  // 股票搜索 state
  const [symbol, setSymbol] = useState('');
  const [minExpiryDays, setMinExpiryDays] = useState(30);
  const [maxExpiryDays, setMaxExpiryDays] = useState(45);
  const [maxCallPriceDiff, setMaxCallPriceDiff] = useState(10);
  const [maxPutPriceDiff, setMaxPutPriceDiff] = useState(10);
  const [selectedOptionTypes, setSelectedOptionTypes] = useState<string[]>(['call', 'put']);
  const [selectedMoneyTypes, setSelectedMoneyTypes] = useState<string[]>(['itm', 'otm']);
  const [loading, setLoading] = useState(false);
  const [stockInfos, setStockInfos] = useState<StockInfo[]>([]);
  const [options, setOptions] = useState<OptionAnalysis[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [resultTruncated, setResultTruncated] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  // K线图 state
  const [candlesticks, setCandlesticks] = useState<Candlestick[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('day');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    minAnnualReturn: 0,
    maxAnnualReturn: 100,
    minPremium: 0,
    maxPremium: 10000,
    minPriceDiff: 0,
    maxPriceDiff: 50,
    minVolume: 1,
  });

  // 滑块边界范围（与当前值分开）
  const [sliderRanges, setSliderRanges] = useState({
    annualReturn: { min: 0, max: 100 },
    premium: { min: 0, max: 10000 },
    priceDiff: { min: 0, max: 50 },
  });

  // 期权数据变化时自动更新筛选范围和滑块边界
  useEffect(() => {
    if (options.length > 0) {
      const annualReturns = options.map(o => o.annual_return);
      const premiums = options.map(o => o.premium);
      const priceDiffs = options.map(o => o.price_diff_percent);
      const minAR = Math.floor(Math.min(...annualReturns));
      const maxAR = Math.ceil(Math.max(...annualReturns));
      const maxP = Math.ceil(Math.max(...premiums));
      const minPD = Math.floor(Math.min(...priceDiffs));
      const maxPD = Math.ceil(Math.max(...priceDiffs));
      // 滑块边界比数据范围稍大
      setSliderRanges({
        annualReturn: { min: Math.max(0, minAR - 20), max: maxAR + 20 },
        premium: { min: 0, max: Math.ceil(maxP * 1.5) },
        priceDiff: { min: Math.max(0, minPD - 5), max: maxPD + 5 },
      });
      // 初始值位于滑块两端
      setFilters((prev) => ({
        minAnnualReturn: Math.max(0, minAR - 20),
        maxAnnualReturn: maxAR + 20,
        minPremium: 0,
        maxPremium: Math.ceil(maxP * 1.5),
        minPriceDiff: Math.max(0, minPD - 5),
        maxPriceDiff: maxPD + 5,
        minVolume: prev.minVolume,
      }));
    }
  }, [options]);

  const filteredOptions = useMemo(() => {
    const { minAnnualReturn, maxAnnualReturn, minPremium, maxPremium, minPriceDiff, maxPriceDiff, minVolume } = filters;
    return options.filter((opt) => {
      // 期权类型筛选
      if (!selectedOptionTypes.includes(opt.option_type.toLowerCase())) return false;
      // ITM/OTM 筛选
      const isITM = opt.option_type.toLowerCase() === 'call'
        ? opt.strike < opt.current_price
        : opt.strike > opt.current_price;
      if (!selectedMoneyTypes.includes(isITM ? 'itm' : 'otm')) return false;
      // 成交量筛选
      if (minVolume > 0 && opt.volume < minVolume) return false;
      // 其他筛选
      if (opt.annual_return < minAnnualReturn || opt.annual_return > maxAnnualReturn) return false;
      if (opt.premium < minPremium || opt.premium > maxPremium) return false;
      if (opt.price_diff_percent < minPriceDiff || opt.price_diff_percent > maxPriceDiff) return false;
      return true;
    });
  }, [options, filters, selectedOptionTypes, selectedMoneyTypes]);

  // 选中的期权行权价 - 用于在K线图上显示
  const [selectedStrikes, setSelectedStrikes] = useState<number[]>([]);

  // 行权价颜色映射
  const strikeColors = ['#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981'];

  // 获取K线数据
  const fetchCandlesticks = async (sym: string) => {
    if (!sym) return;
    setChartLoading(true);
    try {
      const response = await stockApi.getCandlesticks(sym, period, 100);
      const data = response.candlesticks || [];
      data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setCandlesticks(data);
    } catch (err) {
      console.error('Failed to fetch candlesticks:', err);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (stockInfos.length > 0) {
      fetchCandlesticks(stockInfos[0].symbol);
    }
  }, [period, stockInfos]);

  // K线数据加载后滚动到右侧
  const chartScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chartScrollRef.current && candlesticks.length > 0) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
    }
  }, [candlesticks]);

  const handleAnalyze = async () => {
    if (!symbol.trim()) {
      message.warning('请输入股票代码');
      return;
    }

    setLoading(true);
    setOptions([]);
    setStockInfos([]);
    setResultTruncated(false);
    setSelectedStrikes([]);
    setTablePage(1);
    try {
      // 获取股票信息
      const stock = await stockApi.getStockInfo(symbol);
      setStockInfos([stock]);

      // 获取K线数据
      await fetchCandlesticks(symbol.toUpperCase());

      // 获取期权数据
      const response = await analysisApi.analyzeOptions({
        symbol: symbol.toUpperCase(),
        min_call_price_diff: 0,
        max_call_price_diff: maxCallPriceDiff,
        min_put_price_diff: 0,
        max_put_price_diff: maxPutPriceDiff,
        min_expiry_days: minExpiryDays,
        max_expiry_days: maxExpiryDays,
        min_annual_return: 0,
        max_annual_return: 999,
        min_premium: 0,
        max_premium: 99999,
        max_results: 500,
      });

      setOptions(response.options);
      setResultTruncated(response.truncated || false);
      if (response.options.length > 0) {
        setCurrentPrice(response.current_price);
      }

      message.success(`找到 ${response.options.length} 个期权合约${response.truncated ? '（已截断）' : ''}`);
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

  // K线图绘制
  const chartData = useMemo(() => {
    if (candlesticks.length === 0) return null;
    const prices = candlesticks.flatMap(c => [c.high, c.low]);
    const volumes = candlesticks.map(c => c.volume);
    // 将选中的行权价也纳入价格范围
    if (selectedStrikes.length > 0) {
      prices.push(...selectedStrikes);
    }
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const maxVolume = Math.max(...volumes);
    const priceRange = maxPrice - minPrice || 1;
    return { minPrice, maxPrice, maxVolume, priceRange };
  }, [candlesticks, selectedStrikes]);

  const latestCandle = candlesticks[candlesticks.length - 1];
  const prevCandle = candlesticks[candlesticks.length - 2];
  const priceChange = latestCandle && prevCandle ? latestCandle.close - prevCandle.close : 0;
  const priceChangePercent = latestCandle && prevCandle
    ? ((latestCandle.close - prevCandle.close) / prevCandle.close * 100).toFixed(2) : '0.00';

  const chartHeight = 180;
  const volumeHeight = 30;
  const yAxisWidth = 60;
  const xAxisHeight = 24;

  const layout = useMemo(() => {
    if (candlesticks.length === 0) return { candleWidth: 10, needsScroll: false, totalWidth: 0 };
    const gap = 1;
    // 固定蜡烛宽度为10px，间距1px
    const candleWidth = 10;
    const totalWidth = candlesticks.length * (candleWidth + gap);
    return { candleWidth, needsScroll: true, totalWidth, gap };
  }, [candlesticks.length]);

  // 计算X轴刻度 - 根据宽度自动调整密度，月份不重复
  const xAxisTicks = useMemo(() => {
    if (candlesticks.length === 0) return [];
    const gap = layout.gap || 1;
    const chartWidth = layout.totalWidth;
    const minTickSpacing = 60; // 最小刻度间距
    const maxTicks = Math.floor(chartWidth / minTickSpacing);
    const tickInterval = Math.max(1, Math.floor(candlesticks.length / maxTicks));
    const ticks: { index: number; label: string; position: number }[] = [];
    let lastMonth = '';
    for (let i = 0; i < candlesticks.length; i += tickInterval) {
      const month = dayjs(candlesticks[i].timestamp).format('YYYY-MM');
      // 只在同一月份的第一个显示
      if (ticks.length === 0 || month !== lastMonth) {
        const position = i * (layout.candleWidth + gap);
        ticks.push({ index: i, label: month, position });
        lastMonth = month;
      }
    }
    // 确保最后一个刻度显示
    const lastIndex = candlesticks.length - 1;
    const lastMonth2 = dayjs(candlesticks[lastIndex].timestamp).format('YYYY-MM');
    if (ticks[ticks.length - 1]?.index !== lastIndex) {
      const position = lastIndex * (layout.candleWidth + gap);
      ticks.push({ index: lastIndex, label: lastMonth2, position });
    }
    return ticks;
  }, [candlesticks, layout]);

  const getCandlePosition = (index: number) => {
    const gap = layout.gap || 1;
    return index * (layout.candleWidth + gap);
  };

  const getCandleWidthStyle = () => {
    return { width: layout.candleWidth };
  };

  const columns: ColumnsType<OptionAnalysis> = [
    {
      title: '附加',
      key: 'attach',
      width: 60,
      render: (_: any, record: OptionAnalysis) => {
        const idx = selectedStrikes.indexOf(record.strike);
        const colorIdx = filteredOptions.findIndex(o => o.strike === record.strike);
        const color = strikeColors[colorIdx % strikeColors.length];
        const isSelected = idx !== -1;
        return (
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedStrikes([...selectedStrikes, record.strike]);
              } else {
                setSelectedStrikes(selectedStrikes.filter(s => s !== record.strike));
              }
            }}
            style={{ color: isSelected ? color : undefined }}
          />
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'option_type',
      key: 'option_type',
      width: 70,
      render: (type: string) => (
        <Tag color={type === 'call' ? 'green' : 'red'}>
          {type === 'call' ? '看涨' : '看跌'}
        </Tag>
      ),
    },
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
        <span className="font-semibold text-blue-400">${strike.toFixed(2)}</span>
      ),
      sorter: (a, b) => a.strike - b.strike,
    },
    {
      title: '权利金',
      dataIndex: 'premium',
      key: 'premium',
      width: 100,
      render: (premium: number) => (
        <span className="font-semibold text-green-400">${premium.toFixed(2)}</span>
      ),
      sorter: (a, b) => a.premium - b.premium,
    },
    {
      title: (
        <Tooltip title="卖方年化收益率 = ((1 + 权利金/行权价) ^ (365/天数) - 1) × 100%">
          卖方年化 <InfoCircleOutlined className="ml-1" />
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
      render: (value: number, record: OptionAnalysis) => {
        const signedValue = record.strike < record.current_price ? -value : value;
        return (
          <span className={Math.abs(signedValue) <= 5 ? 'positive' : Math.abs(signedValue) <= 10 ? 'text-orange-400' : 'text-gray-400'}>
            {signedValue >= 0 ? '+' : ''}{signedValue.toFixed(2)}%
          </span>
        );
      },
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
          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(value, 100)}%` }} />
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
      render: (value: number) => (
        <div>
          <div className="font-medium">${value.toFixed(2)}</div>
        </div>
      ),
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      width: 90,
      render: (volume: number) => (
        <span className="text-sm">{formatVolume(volume)}</span>
      ),
      sorter: (a, b) => a.volume - b.volume,
    },
    {
      title: '隐含波动率',
      dataIndex: 'implied_volatility',
      key: 'implied_volatility',
      width: 100,
      render: (value: number) => (
        <span className={value > 50 ? 'text-red-400' : value > 30 ? 'text-orange-400' : 'text-green-400'}>
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
    <div className="min-h-screen">
      {/* 导航栏 */}
      <header className="navbar px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <LineChartOutlined className="text-2xl text-blue-400" />
            <h1 className="text-xl font-bold text-white">Option Seeker</h1>
            <Tag color="blue" className="ml-2">美股</Tag>
          </div>
          <Space>
            <Tooltip title="设置">
              <Button type="text" icon={<SettingOutlined className="text-gray-400" />} />
            </Tooltip>
            <Tooltip title="帮助">
              <Button type="text" icon={<InfoCircleOutlined className="text-gray-400" />} />
            </Tooltip>
          </Space>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* 左右布局: 左侧+右侧K线 */}
        <Row gutter={[16, 16]} className="mb-4">
          {/* 左侧 - 股票搜索 */}
          <Col xs={24}>
            <Card
              className="glass-card"
              title={
                <span className="flex items-center text-gray-200">
                  <StockOutlined className="mr-2" />
                  分析条件
                </span>
              }
            >
              <div className="space-y-4">
                <Row gutter={[12, 12]} align="middle">
                  <Col xs={24} sm={6} md={6}>
                    <div className="text-xs text-gray-400 mb-1">股票代码</div>
                    <Input
                      size="large"
                      placeholder="输入股票代码 (如: AAPL)"
                      prefix={<StockOutlined className="text-gray-400" />}
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      onPressEnter={handleAnalyze}
                    />
                  </Col>
                  <Col xs={24} sm={6} md={6}>
                    <div className="text-xs text-gray-400 mb-1">期权类型</div>
                    <Checkbox.Group
                      value={selectedOptionTypes}
                      onChange={(values) => setSelectedOptionTypes(values as string[])}
                    >
                      <Space size="middle">
                        <Checkbox value="call">
                          <span className="text-gray-200">CALL</span>
                        </Checkbox>
                        <Checkbox value="put">
                          <span className="text-gray-200">PUT</span>
                        </Checkbox>
                      </Space>
                    </Checkbox.Group>
                  </Col>
                  <Col xs={24} sm={6} md={6}>
                    <div className="text-xs text-gray-400 mb-1">价值状态</div>
                    <Checkbox.Group
                      value={selectedMoneyTypes}
                      onChange={(values) => setSelectedMoneyTypes(values as string[])}
                    >
                      <Space size="middle">
                        <Checkbox value="itm">
                          <span className="text-gray-200">ITM</span>
                        </Checkbox>
                        <Checkbox value="otm">
                          <span className="text-gray-200">OTM</span>
                        </Checkbox>
                      </Space>
                    </Checkbox.Group>
                  </Col>
                  <Col xs={24} sm={6} md={6}>
                    <div className="text-xs text-gray-400 mb-1">成交量</div>
                    <Checkbox
                      checked={filters.minVolume > 0}
                      onChange={(e) => setFilters({ ...filters, minVolume: e.target.checked ? 1 : 0 })}
                    >
                      <span className="text-gray-200">仅显示有成交</span>
                    </Checkbox>
                  </Col>
                </Row>
                <Row gutter={[12, 12]} align="middle">
                  <Col xs={6} sm={4}>
                    <div className="text-xs text-gray-400 mb-1">PUT价差%</div>
                    <InputNumber
                      size="large"
                      min={0}
                      max={100}
                      value={maxPutPriceDiff}
                      onChange={(v) => setMaxPutPriceDiff(v || 0)}
                      addonAfter="%"
                      className="w-full"
                    />
                  </Col>
                  <Col xs={6} sm={4}>
                    <div className="text-xs text-gray-400 mb-1">CALL价差%</div>
                    <InputNumber
                      size="large"
                      min={0}
                      max={100}
                      value={maxCallPriceDiff}
                      onChange={(v) => setMaxCallPriceDiff(v || 0)}
                      addonAfter="%"
                      className="w-full"
                    />
                  </Col>
                  <Col xs={6} sm={4}>
                    <div className="text-xs text-gray-400 mb-1">最短天数</div>
                    <InputNumber
                      size="large"
                      min={0}
                      max={365}
                      value={minExpiryDays}
                      onChange={(v) => setMinExpiryDays(v || 0)}
                      addonAfter="天"
                      className="w-full"
                    />
                  </Col>
                  <Col xs={6} sm={4}>
                    <div className="text-xs text-gray-400 mb-1">最长天数</div>
                    <InputNumber
                      size="large"
                      min={1}
                      max={365}
                      value={maxExpiryDays}
                      onChange={(v) => setMaxExpiryDays(v || 180)}
                      addonAfter="天"
                      className="w-full"
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="text-xs text-gray-400 mb-1">&nbsp;</div>
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
              </div>
            </Card>
          </Col>
        </Row>

        {/* 股票信息 - 左右结构 */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24}>
            <Card
              className="glass-card"
              title={
                <span className="flex items-center text-gray-200">
                  <LineChartOutlined className="mr-2" />
                  股票信息
                </span>
              }
              extra={
                <Select
                  size="small"
                  value={period}
                  onChange={setPeriod}
                  options={periodOptions}
                  style={{ width: 100 }}
                />
              }
            >
              {chartLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Spin size="large" />
                </div>
              ) : candlesticks.length > 0 && chartData ? (
                <Row gutter={16}>
                  {/* 左侧 - 股票数据 */}
                  <Col xs={24} md={10}>
                    <Row gutter={[8, 8]}>
                      <Col xs={12}>
                        <Statistic
                          title="股票代码"
                          value={stockInfos.map(s => s.symbol).join(', ') || '-'}
                          valueStyle={{ fontSize: '16px', color: '#667eea' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title={
                            <span>
                              当前价格
                              {stockInfos[0]?.trading_session && (
                                <Tag
                                  className="ml-2"
                                  color={
                                    stockInfos[0].trading_session === 'premarket' ? 'orange' :
                                    stockInfos[0].trading_session === 'afterhours' ? 'purple' :
                                    stockInfos[0].trading_session === '24h' ? 'cyan' : 'green'
                                  }
                                >
                                  {stockInfos[0].trading_session === 'premarket' ? '盘前' :
                                   stockInfos[0].trading_session === 'afterhours' ? '盘后' :
                                   stockInfos[0].trading_session === '24h' ? '24h' : '实时'}
                                </Tag>
                              )}
                            </span>
                          }
                          value={stockInfos[0]?.current_price || currentPrice}
                          prefix="$"
                          precision={2}
                          valueStyle={{ color: '#22c55e', fontSize: '16px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="交易所"
                          value={stockInfos.map(s => s.exchange).join(', ') || '-'}
                          valueStyle={{ fontSize: '14px', color: '#a0a0a0' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="涨跌幅"
                          value={parseFloat(priceChangePercent)}
                          suffix="%"
                          precision={2}
                          valueStyle={{ color: priceChange >= 0 ? '#ef4444' : '#22c55e', fontSize: '16px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="开盘"
                          value={latestCandle?.open || 0}
                          prefix="$"
                          precision={2}
                          valueStyle={{ fontSize: '14px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="最高"
                          value={
                            stockInfos[0]?.trading_session === 'premarket' && stockInfos[0]?.pre_market_quote
                              ? stockInfos[0].pre_market_quote.high
                              : stockInfos[0]?.trading_session === 'afterhours' && stockInfos[0]?.post_market_quote
                              ? stockInfos[0].post_market_quote.high
                              : latestCandle?.high || 0
                          }
                          prefix="$"
                          precision={2}
                          valueStyle={{ color: '#ef4444', fontSize: '14px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="最低"
                          value={
                            stockInfos[0]?.trading_session === 'premarket' && stockInfos[0]?.pre_market_quote
                              ? stockInfos[0].pre_market_quote.low
                              : stockInfos[0]?.trading_session === 'afterhours' && stockInfos[0]?.post_market_quote
                              ? stockInfos[0].post_market_quote.low
                              : latestCandle?.low || 0
                          }
                          prefix="$"
                          precision={2}
                          valueStyle={{ color: '#22c55e', fontSize: '14px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="成交量"
                          value={
                            stockInfos[0]?.trading_session === 'premarket' && stockInfos[0]?.pre_market_quote
                              ? stockInfos[0].pre_market_quote.volume
                              : stockInfos[0]?.trading_session === 'afterhours' && stockInfos[0]?.post_market_quote
                              ? stockInfos[0].post_market_quote.volume
                              : latestCandle?.volume || 0
                          }
                          formatter={(val) => formatVolume(Number(val))}
                          valueStyle={{ fontSize: '14px' }}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="昨日收盘"
                          value={stockInfos[0]?.prev_close || 0}
                          prefix="$"
                          precision={2}
                          valueStyle={{ fontSize: '14px', color: '#a0a0a0' }}
                        />
                      </Col>
                    </Row>
                  </Col>
                  {/* 右侧 - K线图表 */}
                  <Col xs={24} md={14}>
                    <div ref={chartContainerRef} className="chart-container p-2" style={{ height: chartHeight + volumeHeight + xAxisHeight + 20 }}>
                      <div className="flex">
                        {/* Y轴标签 - 与网格线对齐 */}
                        <div className="flex-shrink-0 relative text-xs text-gray-500 pr-2" style={{ width: yAxisWidth, height: chartHeight }}>
                          {[...Array(5)].map((_, i) => {
                            const price = chartData.maxPrice - (chartData.priceRange / 4) * i;
                            return <div key={i} className="absolute right-2 text-right font-mono" style={{ top: (chartHeight / 4) * i }}>{price.toFixed(0)}</div>;
                          })}
                          {/* 期权行权价标签 */}
                          {selectedStrikes.map((strike, idx) => {
                            const { maxPrice, priceRange } = chartData;
                            const topPx = ((maxPrice - strike) / priceRange) * chartHeight;
                            if (topPx < 0 || topPx > chartHeight) return null;
                            const color = strikeColors[idx % strikeColors.length];
                            return (
                              <div
                                key={strike}
                                className="absolute right-2 text-right font-mono"
                                style={{ top: topPx, color: color, fontWeight: 600 }}
                              >
                                ${strike.toFixed(2)}
                              </div>
                            );
                          })}
                        </div>
                        {/* 图表区域 */}
                        <div
                          ref={chartScrollRef}
                          className="flex-1 overflow-x-auto"
                          style={{ minWidth: 0 }}
                        >
                          <div
                            className="relative"
                            style={{ width: layout.needsScroll ? layout.totalWidth : '100%' }}
                          >
                            {/* 价格网格线 */}
                            <div className="absolute left-0 right-0 pointer-events-none" style={{ height: chartHeight }}>
                              {[...Array(5)].map((_, i) => {
                                const topPx = (chartHeight / 4) * i;
                                return (
                                  <div
                                    key={i}
                                    className="absolute left-0 right-0"
                                    style={{ top: topPx, height: 1, backgroundColor: 'rgba(102, 126, 234, 0.1)' }}
                                  />
                                );
                              })}
                              {/* 期权行权价线 */}
                              {selectedStrikes.map((strike, idx) => {
                                const { maxPrice, priceRange } = chartData;
                                const topPx = ((maxPrice - strike) / priceRange) * chartHeight;
                                if (topPx < 0 || topPx > chartHeight) return null;
                                const color = strikeColors[idx % strikeColors.length];
                                return (
                                  <div key={strike} className="absolute left-0 right-0 flex items-center" style={{ top: topPx }}>
                                    <div className="flex-1 h-px" style={{ backgroundColor: color }} />
                                    <div
                                      className="absolute px-1 text-xs font-mono rounded"
                                      style={{
                                        right: 4,
                                        backgroundColor: `${color}33`,
                                        color: color,
                                        transform: 'translateY(-50%)'
                                      }}
                                    >
                                      ${strike.toFixed(2)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* K线 */}
                            <div className="relative" style={{ height: chartHeight }}>
                              {candlesticks.map((candle, index) => {
                                const { maxPrice, priceRange } = chartData;
                                const isUp = candle.close >= candle.open;
                                const color = isUp ? '#ef4444' : '#22c55e';
                                const bodyTop = Math.max(candle.open, candle.close);
                                const bodyBottom = Math.min(candle.open, candle.close);
                                const bodyHeight = Math.max(((bodyTop - bodyBottom) / priceRange) * chartHeight, 1);
                                const bodyTopPos = ((maxPrice - bodyTop) / priceRange) * chartHeight;
                                const upperShadow = ((candle.high - bodyTop) / priceRange) * chartHeight;
                                const lowerShadow = ((bodyBottom - candle.low) / priceRange) * chartHeight;
                                const position = getCandlePosition(index);
                                const widthStyle = getCandleWidthStyle();
                                return (
                                  <Tooltip key={index} title={
                                    <div className="text-xs">
                                      <div className="font-bold mb-1">{dayjs(candle.timestamp).format('YYYY-MM-DD HH:mm')}</div>
                                      <div>开: {candle.open.toFixed(2)}</div>
                                      <div>收: <span style={{ color }}>{candle.close.toFixed(2)}</span></div>
                                      <div>高: {candle.high.toFixed(2)}</div>
                                      <div>低: {candle.low.toFixed(2)}</div>
                                    </div>
                                  } placement="top">
                                    <div
                                      className="absolute cursor-pointer"
                                      style={{ left: position, ...widthStyle, height: '100%' }}
                                    >
                                      {/* K线蜡烛 */}
                                      <div className="absolute left-1/2" style={{ top: bodyTopPos, width: 1, height: upperShadow, backgroundColor: color, transform: 'translateX(-50%)' }} />
                                      <div
                                        className="absolute left-1/2"
                                        style={{
                                          top: bodyTopPos,
                                          width: 'calc(100% - 2px)',
                                          minWidth: 2,
                                          height: bodyHeight,
                                          backgroundColor: isUp ? 'transparent' : color,
                                          border: `1px solid ${color}`,
                                          transform: 'translateX(-50%)'
                                        }}
                                      />
                                      <div className="absolute left-1/2" style={{ top: bodyTopPos + bodyHeight, width: 1, height: lowerShadow, backgroundColor: color, transform: 'translateX(-50%)' }} />
                                    </div>
                                  </Tooltip>
                                );
                              })}
                            </div>
                            {/* 成交量柱 */}
                            <div className="relative" style={{ height: volumeHeight }}>
                              {candlesticks.map((candle, index) => {
                                const { maxVolume } = chartData;
                                const isUp = candle.close >= candle.open;
                                const color = isUp ? '#ef4444' : '#22c55e';
                                const volumeH = (candle.volume / maxVolume) * volumeHeight;
                                const position = getCandlePosition(index);
                                const widthStyle = getCandleWidthStyle();
                                return (
                                  <div
                                    key={index}
                                    className="absolute opacity-40"
                                    style={{ left: position, ...widthStyle, height: volumeH, backgroundColor: color, bottom: 0 }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          {/* X轴刻度 */}
                          <div
                            className="relative text-xs text-gray-500 mt-1"
                            style={{ height: xAxisHeight }}
                          >
                            {xAxisTicks.map((tick, i) => (
                              <div
                                key={i}
                                className="absolute text-center font-mono"
                                style={{
                                  left: tick.position,
                                  transform: 'translateX(-50%)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {tick.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {candlesticks.length} 条数据 | {periodOptions.find(p => p.value === period)?.label}
                    </div>
                  </Col>
                </Row>
              ) : (
                <div className="flex justify-center items-center h-48 text-gray-500">
                  输入股票代码查看股票信息
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 筛选条件 - 只在有数据时显示 */}
        {options.length > 0 && (
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24}>
              <Card className="glass-card" title={
                <span className="flex items-center text-gray-200">
                  <PercentageOutlined className="mr-2" />
                  筛选条件
                </span>
              }>
                <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                  <Col xs={24} md={8}>
                    <div className="mb-2 font-medium text-gray-300">
                      期权类型
                    </div>
                    <Checkbox.Group
                      value={selectedOptionTypes}
                      onChange={(values) => setSelectedOptionTypes(values as string[])}
                    >
                      <Space size="middle">
                        <Checkbox value="call">
                          <span className="text-gray-200">CALL</span>
                        </Checkbox>
                        <Checkbox value="put">
                          <span className="text-gray-200">PUT</span>
                        </Checkbox>
                      </Space>
                    </Checkbox.Group>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="mb-2 font-medium text-gray-300">
                      价值状态
                    </div>
                    <Checkbox.Group
                      value={selectedMoneyTypes}
                      onChange={(values) => setSelectedMoneyTypes(values as string[])}
                    >
                      <Space size="middle">
                        <Checkbox value="itm">
                          <span className="text-gray-200">ITM</span>
                        </Checkbox>
                        <Checkbox value="otm">
                          <span className="text-gray-200">OTM</span>
                        </Checkbox>
                      </Space>
                    </Checkbox.Group>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="mb-2 font-medium text-gray-300">
                      成交量
                    </div>
                    <Checkbox
                      checked={filters.minVolume > 0}
                      onChange={(e) => setFilters({ ...filters, minVolume: e.target.checked ? 1 : 0 })}
                    >
                      <span className="text-gray-200">仅显示有成交</span>
                    </Checkbox>
                  </Col>
                </Row>
                <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                  <Col xs={24} md={8}>
                    <div className="mb-2 font-medium text-gray-300">
                      年化收益: {filters.minAnnualReturn}% - {filters.maxAnnualReturn}%
                    </div>
                    <Slider
                      range
                      min={sliderRanges.annualReturn.min}
                      max={sliderRanges.annualReturn.max}
                      step={5}
                      value={[filters.minAnnualReturn, filters.maxAnnualReturn]}
                      onChange={([min, max]) => setFilters({ ...filters, minAnnualReturn: min, maxAnnualReturn: max })}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="mb-2 font-medium text-gray-300">
                      <DollarOutlined className="mr-1" />
                      权利金: ${filters.minPremium.toFixed(1)} - ${filters.maxPremium.toFixed(1)}
                    </div>
                    <Slider
                      range
                      min={sliderRanges.premium.min}
                      max={sliderRanges.premium.max}
                      step={0.1}
                      value={[filters.minPremium, filters.maxPremium]}
                      onChange={([min, max]) => setFilters({ ...filters, minPremium: min, maxPremium: max })}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="mb-2 font-medium text-gray-300">
                      价差百分比: {filters.minPriceDiff}% - {filters.maxPriceDiff}%
                    </div>
                    <Slider
                      range
                      min={sliderRanges.priceDiff.min}
                      max={sliderRanges.priceDiff.max}
                      step={1}
                      value={[filters.minPriceDiff, filters.maxPriceDiff]}
                      onChange={([min, max]) => setFilters({ ...filters, minPriceDiff: min, maxPriceDiff: max })}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}

        {/* 期权表格 */}
        <Card className="glass-card">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spin size="large" />
            </div>
          ) : options.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-gray-400">
                显示 {filteredOptions.length} / {options.length} 个期权合约
                {resultTruncated && <span className="text-yellow-400 ml-2">（结果已截断500条，按日期就近排序）</span>}
                <Tooltip title="由于券商API频率限制，部分远期期权合约可能未返回。请缩小筛选范围">
                  <InfoCircleOutlined className="ml-2 text-yellow-500 cursor-pointer" />
                </Tooltip>
              </div>
              <Table
                key={options.length + filteredOptions.length}
                columns={columns}
                dataSource={filteredOptions}
                rowKey={(record) => `${record.symbol}-${record.option_type}-${record.strike}-${record.expiry_date}`}
                scroll={{ x: 1200 }}
                pagination={{
                  pageSize: 20,
                  current: tablePage,
                  onChange: (page) => setTablePage(page),
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条`,
                  responsive: true,
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
