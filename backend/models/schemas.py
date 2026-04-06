from pydantic import BaseModel
from typing import Optional, List
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
    option_type: OptionType
    max_expiry_days: int = 60
    min_annual_return: float = 0.0
    max_annual_return: float = 100.0
    min_premium: float = 0.0
    max_premium: float = 10000.0
    min_price_diff: float = 0.0
    max_price_diff: float = 50.0


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


class StockInfo(BaseModel):
    symbol: str
    name: str
    current_price: float
    currency: str
    exchange: str


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
