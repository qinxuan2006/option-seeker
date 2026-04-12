from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum


class OptionType(str, Enum):
    CALL = "call"
    PUT = "put"


class PeriodType(str, Enum):
    MIN1 = "1min"
    MIN5 = "5min"
    MIN15 = "15min"
    MIN30 = "30min"
    MIN60 = "60min"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class AnalysisRequest(BaseModel):
    symbol: str
    min_price_diff: float = -50.0  # 支持负值（实值）
    max_price_diff: float = 50.0
    min_expiry_days: int = 0
    max_expiry_days: int = 180
    min_annual_return: float = 0.0
    max_annual_return: float = 100.0
    min_premium: float = 0.0
    max_premium: float = 10000.0
    min_volume: int = 0  # 最小成交量，0表示显示所有
    max_results: int = 500


class OptionAnalysis(BaseModel):
    symbol: str
    option_type: str
    strike: float
    expiry_date: date
    days_to_expiry: int
    current_price: float
    premium: float
    annual_return: float
    price_diff_percent: float
    itm_probability: float
    breakeven: float
    volume: int
    open_interest: int
    implied_volatility: float
    recommendation_score: float


class AnalysisResponse(BaseModel):
    symbol: str
    current_price: float
    options: List[OptionAnalysis]
    total_count: int
    filtered_count: int
    truncated: bool = False


class StockInfo(BaseModel):
    symbol: str
    name: str
    current_price: float
    prev_close: float
    currency: str
    exchange: str
    trading_session: str  # premarket / afterhours / regular / 24h
    # 盘前盘后详细行情
    pre_market_quote: Optional[Dict[str, Any]] = None
    post_market_quote: Optional[Dict[str, Any]] = None
    # 夜盘行情
    overnight_quote: Optional[Dict[str, Any]] = None
    # 最新报价（用于显示high/low/vol）
    latest_quote: Optional[Dict[str, Any]] = None


class Candlestick(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    turnover: float


class CandlestickResponse(BaseModel):
    symbol: str
    period: str
    candlesticks: List[Candlestick]


class CandlestickRequest(BaseModel):
    symbol: str
    period: PeriodType = PeriodType.DAY
    count: int = 100
    adjust_type: str = "no_adjust"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PreMarketInfo(BaseModel):
    symbol: str
    name: str
    last_done: float
    prev_close: float
    open: float
    high: float
    low: float
    volume: int
    turnover: float
    change: float
    change_rate: float
    timestamp: datetime
    trading_session: str
