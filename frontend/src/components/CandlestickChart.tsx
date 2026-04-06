import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Select, InputNumber, Button, Spin, Empty, Space, Row, Col, Statistic, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { stockApi } from '../services/api';
import { Candlestick, PeriodType } from '../types';
import dayjs from 'dayjs';

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

const formatTurnover = (turnover: number): string => {
  if (turnover >= 1000000000) return (turnover / 1000000000).toFixed(2) + 'B';
  if (turnover >= 1000000) return (turnover / 1000000).toFixed(2) + 'M';
  if (turnover >= 1000) return (turnover / 1000).toFixed(2) + 'K';
  return turnover.toFixed(0);
};

const CandlestickChart: React.FC = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [period, setPeriod] = useState<PeriodType>('day');
  const [count, setCount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [candlesticks, setCandlesticks] = useState<Candlestick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const fetchData = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const response = await stockApi.getCandlesticks(symbol, period, count);
      const data = response.candlesticks || [];
      data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setCandlesticks(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '获取数据失败');
      setCandlesticks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, count]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (scrollRef.current && candlesticks.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [candlesticks]);

  const chartData = useMemo(() => {
    if (candlesticks.length === 0) return null;

    const prices = candlesticks.flatMap(c => [c.high, c.low]);
    const volumes = candlesticks.map(c => c.volume);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const maxVolume = Math.max(...volumes);
    const priceRange = maxPrice - minPrice || 1;
    
    const gridCount = 5;
    const priceStep = priceRange / gridCount;
    const priceGridLines: number[] = [];
    for (let i = 0; i <= gridCount; i++) {
      priceGridLines.push(maxPrice - priceStep * i);
    }

    return { minPrice, maxPrice, maxVolume, priceRange, priceGridLines };
  }, [candlesticks]);

  const latestCandle = candlesticks[candlesticks.length - 1];
  const prevCandle = candlesticks[candlesticks.length - 2];
  const priceChange = latestCandle && prevCandle ? latestCandle.close - prevCandle.close : 0;
  const priceChangePercent = latestCandle && prevCandle 
    ? ((latestCandle.close - prevCandle.close) / prevCandle.close * 100).toFixed(2) : '0.00';

  const chartHeight = 300;
  const volumeHeight = 50;
  const yAxisWidth = 70;
  const xAxisHeight = 30;
  const minCandleWidth = 4;
  const maxCandleWidth = 30;

  const layout = useMemo(() => {
    if (candlesticks.length === 0) {
      return { candleWidth: minCandleWidth, needsScroll: false, totalWidth: 0 };
    }
    
    const availableWidth = containerWidth - yAxisWidth;
    const gap = 1;
    const totalGaps = (candlesticks.length - 1) * gap;
    const idealWidth = (availableWidth - totalGaps) / candlesticks.length;
    
    if (idealWidth >= minCandleWidth) {
      const width = Math.min(maxCandleWidth, idealWidth);
      const actualTotalWidth = candlesticks.length * width + totalGaps;
      return { 
        candleWidth: width, 
        needsScroll: false, 
        totalWidth: actualTotalWidth 
      };
    } else {
      const width = minCandleWidth;
      const actualTotalWidth = candlesticks.length * width + totalGaps;
      return { 
        candleWidth: width, 
        needsScroll: true, 
        totalWidth: actualTotalWidth 
      };
    }
  }, [containerWidth, candlesticks.length]);

  const monthLabels = useMemo(() => {
    if (candlesticks.length === 0) return [];
    const labels: { index: number; label: string }[] = [];
    let lastMonth = '';
    
    candlesticks.forEach((candle, index) => {
      const month = dayjs(candle.timestamp).format('YYYY-MM');
      if (month !== lastMonth) {
        labels.push({
          index,
          label: dayjs(candle.timestamp).format('MM月')
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [candlesticks]);

  const getCandlePosition = (index: number) => {
    if (layout.needsScroll) {
      const gap = 1;
      return index * (layout.candleWidth + gap);
    } else {
      return (index / candlesticks.length) * 100;
    }
  };

  const getCandleWidthStyle = () => {
    if (layout.needsScroll) {
      return { width: layout.candleWidth };
    } else {
      const gapPercent = (1 / (layout.totalWidth || 1)) * 100;
      return { width: `calc(${100 / candlesticks.length}% - ${gapPercent}px)` };
    }
  };

  const renderCandlestick = (candle: Candlestick, index: number) => {
    if (!chartData) return null;

    const { maxPrice, maxVolume, priceRange } = chartData;
    const isUp = candle.close >= candle.open;
    const color = isUp ? '#ef4444' : '#22c55e';
    
    const bodyTop = Math.max(candle.open, candle.close);
    const bodyBottom = Math.min(candle.open, candle.close);
    
    const bodyHeight = Math.max(((bodyTop - bodyBottom) / priceRange) * chartHeight, 1);
    const bodyTopPos = ((maxPrice - bodyTop) / priceRange) * chartHeight;
    
    const upperShadow = ((candle.high - bodyTop) / priceRange) * chartHeight;
    const lowerShadow = ((bodyBottom - candle.low) / priceRange) * chartHeight;
    
    const volumeH = (candle.volume / maxVolume) * volumeHeight;

    const tooltipContent = (
      <div className="text-xs">
        <div className="font-bold mb-1">{dayjs(candle.timestamp).format('YYYY-MM-DD HH:mm')}</div>
        <div>开: {candle.open.toFixed(2)}</div>
        <div>收: <span style={{ color }}>{candle.close.toFixed(2)}</span></div>
        <div>高: {candle.high.toFixed(2)}</div>
        <div>低: {candle.low.toFixed(2)}</div>
        <div>量: {formatVolume(candle.volume)}</div>
        <div>额: {formatTurnover(candle.turnover)}</div>
      </div>
    );

    const position = getCandlePosition(index);
    const widthStyle = getCandleWidthStyle();

    return (
      <Tooltip key={index} title={tooltipContent} placement="top">
        <div 
          className="absolute cursor-pointer" 
          style={{ 
            left: layout.needsScroll ? position : `${position}%`,
            ...widthStyle
          }}
        >
          <div className="relative" style={{ height: chartHeight }}>
            <div className="absolute left-1/2" style={{ top: bodyTopPos, width: 1, height: upperShadow, backgroundColor: color, transform: 'translateX(-50%)' }} />
            <div className="absolute left-1/2" style={{ top: bodyTopPos, width: 'calc(100% - 2px)', minWidth: 2, height: bodyHeight, backgroundColor: isUp ? 'transparent' : color, border: `1px solid ${color}`, transform: 'translateX(-50%)' }} />
            <div className="absolute left-1/2" style={{ top: bodyTopPos + bodyHeight, width: 1, height: lowerShadow, backgroundColor: color, transform: 'translateX(-50%)' }} />
          </div>
          <div className="opacity-40" style={{ height: volumeH, backgroundColor: color, marginTop: 4 }} />
        </div>
      </Tooltip>
    );
  };

  const renderMonthGridLine = (label: { index: number; label: string }, i: number) => {
    const position = getCandlePosition(label.index);
    return (
      <div 
        key={i} 
        className="absolute top-0" 
        style={{ 
          left: layout.needsScroll ? position : `${position}%`,
          width: 1, 
          height: chartHeight, 
          backgroundColor: '#e8e8e8' 
        }} 
      />
    );
  };

  const renderMonthLabel = (label: { index: number; label: string }, i: number) => {
    const position = getCandlePosition(label.index);
    return (
      <div 
        key={i} 
        className="absolute text-xs text-gray-500 whitespace-nowrap" 
        style={{ 
          left: layout.needsScroll ? position : `${position}%`,
          top: 8, 
          transform: 'translateX(-50%)' 
        }}
      >
        {label.label}
      </div>
    );
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <Space wrap size="middle">
          <Space.Compact>
            <InputNumber value={count} onChange={(v) => setCount(v || 100)} min={10} max={1000} step={10} style={{ width: 100 }} />
            <Select value={period} onChange={setPeriod} options={periodOptions} style={{ width: 100 }} />
          </Space.Compact>
          <Space.Compact>
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && fetchData()} placeholder="股票代码" className="px-3 py-1 border rounded-l" style={{ width: 120 }} />
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>查询</Button>
          </Space.Compact>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      </Card>

      {loading && <div className="flex justify-center py-20"><Spin size="large" /></div>}
      {error && <Card><Empty description={error} /></Card>}

      {!loading && !error && candlesticks.length > 0 && chartData && (
        <>
          <Card className="mb-4">
            <Row gutter={16}>
              <Col span={4}>
                <Statistic title="最新价" value={latestCandle?.close.toFixed(2)} valueStyle={{ color: priceChange >= 0 ? '#ef4444' : '#22c55e' }} suffix={priceChange >= 0 ? <span className="text-red-500 text-sm">+{priceChange.toFixed(2)} (+{priceChangePercent}%)</span> : <span className="text-green-500 text-sm">{priceChange.toFixed(2)} ({priceChangePercent}%)</span>} />
              </Col>
              <Col span={4}><Statistic title="开盘" value={latestCandle?.open.toFixed(2)} /></Col>
              <Col span={4}><Statistic title="最高" value={latestCandle?.high.toFixed(2)} /></Col>
              <Col span={4}><Statistic title="最低" value={latestCandle?.low.toFixed(2)} /></Col>
              <Col span={4}><Statistic title="成交量" value={formatVolume(latestCandle?.volume || 0)} /></Col>
              <Col span={4}><Statistic title="成交额" value={formatTurnover(latestCandle?.turnover || 0)} /></Col>
            </Row>
          </Card>

          <Card>
            <div ref={containerRef} className="flex w-full">
              <div className="flex flex-col flex-shrink-0 bg-white" style={{ width: yAxisWidth }}>
                <div className="flex flex-col justify-between" style={{ height: chartHeight }}>
                  {chartData.priceGridLines.map((price, i) => (
                    <div key={i} className="text-xs text-gray-500 text-right pr-2 font-mono">{price.toFixed(2)}</div>
                  ))}
                </div>
                <div style={{ height: volumeHeight + xAxisHeight }} />
              </div>
              
              <div 
                ref={scrollRef} 
                className="flex-1"
                style={{ 
                  minWidth: 0,
                  overflowX: layout.needsScroll ? 'auto' : 'hidden'
                }}
              >
                <div 
                  className="relative" 
                  style={{ 
                    width: layout.needsScroll ? layout.totalWidth : '100%',
                    height: chartHeight + volumeHeight + xAxisHeight + 4
                  }}
                >
                  <div className="absolute inset-0">
                    {chartData.priceGridLines.map((_, i) => (
                      <div key={i} className="absolute left-0 right-0" style={{ top: `${i * 20}%`, height: 1, backgroundColor: i === 0 ? '#d9d9d9' : '#f0f0f0' }} />
                    ))}
                  </div>
                  
                  {monthLabels.map((label, i) => renderMonthGridLine(label, i))}
                  
                  <div className="absolute inset-0">
                    {candlesticks.map((candle, index) => renderCandlestick(candle, index))}
                  </div>
                  
                  <div className="absolute left-0 right-0" style={{ top: chartHeight + 4, height: volumeHeight + xAxisHeight }}>
                    <div className="absolute" style={{ top: volumeHeight, left: 0, right: 0, height: xAxisHeight }}>
                      {monthLabels.map((label, i) => renderMonthLabel(label, i))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-gray-500" style={{ marginLeft: yAxisWidth }}>
              <span>数据: {candlesticks.length} 条</span>
              <span>周期: {periodOptions.find(p => p.value === period)?.label}</span>
            </div>
          </Card>
        </>
      )}

      {!loading && !error && candlesticks.length === 0 && (
        <Card><Empty description="暂无数据，请输入股票代码查询" /></Card>
      )}
    </div>
  );
};

export default CandlestickChart;
