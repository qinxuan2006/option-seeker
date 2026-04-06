import axios from 'axios';
import { AnalysisRequest, AnalysisResponse, StockInfo, CandlestickResponse, PeriodType } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const stockApi = {
  getStockInfo: async (symbol: string): Promise<StockInfo> => {
    const response = await api.get(`/stock/${symbol}`);
    return response.data;
  },

  searchStocks: async (query: string): Promise<StockInfo[]> => {
    const response = await api.get(`/search/${query}`);
    return response.data;
  },

  getCandlesticks: async (
    symbol: string,
    period: PeriodType = 'day',
    count: number = 100,
    adjustType: string = 'no_adjust',
    startDate?: string,
    endDate?: string
  ): Promise<CandlestickResponse> => {
    const params = new URLSearchParams();
    params.append('period', period);
    params.append('count', count.toString());
    params.append('adjust_type', adjustType);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/candlesticks/${symbol}?${params.toString()}`);
    return response.data;
  },
};

export const analysisApi = {
  analyzeOptions: async (request: AnalysisRequest): Promise<AnalysisResponse> => {
    const response = await api.post('/analyze', request);
    return response.data;
  },
};

export default api;
