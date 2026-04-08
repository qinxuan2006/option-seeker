export interface OptionAnalysis {
  symbol: string;
  option_type: string;
  strike: number;
  expiry_date: string;
  days_to_expiry: number;
  current_price: number;
  premium: number;
  annual_return: number;
  price_diff_percent: number;
  itm_probability: number;
  breakeven: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  recommendation_score: number;
}

export interface AnalysisResponse {
  symbol: string;
  current_price: number;
  options: OptionAnalysis[];
  total_count: number;
  filtered_count: number;
  truncated?: boolean;
}

export interface StockInfo {
  symbol: string;
  name: string;
  current_price: number;
  prev_close: number;
  currency: string;
  exchange: string;
  trading_session: 'premarket' | 'afterhours' | 'regular' | '24h';
}

export interface AnalysisRequest {
  symbol: string;
  min_call_price_diff: number;
  max_call_price_diff: number;
  min_put_price_diff: number;
  max_put_price_diff: number;
  min_expiry_days: number;
  max_expiry_days: number;
  min_annual_return: number;
  max_annual_return: number;
  min_premium: number;
  max_premium: number;
  min_volume: number;
  max_results: number;
}

export interface FilterState {
  minAnnualReturn: number;
  maxAnnualReturn: number;
  minPremium: number;
  maxPremium: number;
  minPriceDiff: number;
  maxPriceDiff: number;
  minVolume: number;
}

export interface Candlestick {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

export interface CandlestickResponse {
  symbol: string;
  period: string;
  candlesticks: Candlestick[];
}

export type PeriodType = '1min' | '5min' | '15min' | '30min' | '60min' | 'day' | 'week' | 'month' | 'year';
