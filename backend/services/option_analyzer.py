import os
import math
import time
from datetime import datetime, date, timedelta
from typing import List, Optional, Tuple
from scipy.stats import norm

from models.schemas import OptionAnalysis, StockInfo, OptionType, Candlestick, CandlestickResponse, PeriodType

try:
    from longport.openapi import Config, QuoteContext, Period, AdjustType
    LONGPORT_AVAILABLE = True
except ImportError:
    LONGPORT_AVAILABLE = False
    print("Warning: longport SDK not installed. Please run: pip install longport")


class OptionAnalyzer:
    def __init__(self):
        self.risk_free_rate = 0.05
        self._cache = {}
        self._cache_time = {}
        self._ctx = None
        self._initialized = False
        self._init_error = None

    def _get_trading_session(self) -> str:
        """Determine current trading session based on US Eastern Time"""
        try:
            import zoneinfo
            utc_now = datetime.now(zoneinfo.ZoneInfo('UTC'))
            et_now = datetime.now(zoneinfo.ZoneInfo('America/New_York'))
            et_minutes = et_now.hour * 60 + et_now.minute
            # Pre: 04:00-09:30 ET, Intraday: 09:30-16:00 ET, Post: 16:00-20:00 ET
            if et_minutes < 570:  # before 9:30
                return "premarket"
            elif et_minutes < 960:  # before 16:00
                return "regular"
            elif et_minutes < 1200:  # before 20:00
                return "afterhours"
            else:
                return "24h"
        except Exception:
            return "regular"

    def _get_context(self) -> Optional[QuoteContext]:
        if self._ctx is not None:
            return self._ctx
            
        if not LONGPORT_AVAILABLE:
            self._init_error = "longport SDK not installed"
            return None
            
        try:
            config = Config.from_env()
            self._ctx = QuoteContext(config)
            self._initialized = True
            return self._ctx
        except Exception as e:
            self._init_error = f"Failed to initialize LongPort SDK: {e}"
            print(self._init_error)
            return None
    
    def _format_symbol(self, symbol: str) -> str:
        symbol = symbol.upper().strip()
        if "." in symbol:
            return symbol
        if symbol.isdigit() and len(symbol) <= 5:
            return f"{symbol}.HK"
        return f"{symbol}.US"
    
    def _get_with_cache(self, key, fetch_func, max_age=300):
        now = time.time()
        if key in self._cache and key in self._cache_time:
            if now - self._cache_time[key] < max_age:
                return self._cache[key]
        
        result = fetch_func()
        self._cache[key] = result
        self._cache_time[key] = now
        return result

    def get_stock_info(self, symbol: str) -> Optional[StockInfo]:
        ctx = self._get_context()
        if ctx is None:
            print(f"LongPort not initialized: {self._init_error}")
            return None

        formatted_symbol = self._format_symbol(symbol)

        try:
            quotes = ctx.quote([formatted_symbol])
            if not quotes:
                return None

            quote = quotes[0]
            prev_close = float(quote.prev_close) if quote.prev_close else 0

            # Determine trading session based on current US Eastern Time
            trading_session = self._get_trading_session()

            # 获取盘前盘后行情
            pre_market_quote = None
            post_market_quote = None

            if hasattr(quote, 'pre_market_quote') and quote.pre_market_quote:
                pm = quote.pre_market_quote
                ts = pm.timestamp
                if isinstance(ts, datetime):
                    ts = int(ts.timestamp())
                elif not isinstance(ts, int):
                    ts = 0
                pre_market_quote = {
                    "last_done": float(pm.last_done) if pm.last_done else 0,
                    "high": float(pm.high) if pm.high else 0,
                    "low": float(pm.low) if pm.low else 0,
                    "volume": int(pm.volume) if pm.volume else 0,
                    "turnover": float(pm.turnover) if pm.turnover else 0,
                    "timestamp": ts,
                }

            if hasattr(quote, 'post_market_quote') and quote.post_market_quote:
                pm = quote.post_market_quote
                ts = pm.timestamp
                if isinstance(ts, datetime):
                    ts = int(ts.timestamp())
                elif not isinstance(ts, int):
                    ts = 0
                post_market_quote = {
                    "last_done": float(pm.last_done) if pm.last_done else 0,
                    "high": float(pm.high) if pm.high else 0,
                    "low": float(pm.low) if pm.low else 0,
                    "volume": int(pm.volume) if pm.volume else 0,
                    "turnover": float(pm.turnover) if pm.turnover else 0,
                    "timestamp": ts,
                }

            # 根据交易时段确定当前价格
            if trading_session == "premarket" and pre_market_quote and pre_market_quote["last_done"] > 0:
                current_price = pre_market_quote["last_done"]
            elif trading_session == "afterhours" and post_market_quote and post_market_quote["last_done"] > 0:
                current_price = post_market_quote["last_done"]
            else:
                current_price = float(quote.last_done) if quote.last_done else 0

            return StockInfo(
                symbol=symbol.upper(),
                name=formatted_symbol,
                current_price=current_price,
                prev_close=prev_close,
                currency="USD" if ".US" in formatted_symbol else "HKD",
                exchange="US" if ".US" in formatted_symbol else "HK",
                trading_session=trading_session,
                pre_market_quote=pre_market_quote,
                post_market_quote=post_market_quote
            )
        except Exception as e:
            print(f"Error fetching stock info for {symbol}: {e}")
            return None

    def get_current_price(self, symbol: str) -> Optional[float]:
        ctx = self._get_context()
        if ctx is None:
            return None

        formatted_symbol = self._format_symbol(symbol)

        try:
            quotes = ctx.quote([formatted_symbol])
            if not quotes or not quotes[0].last_done:
                return None
            return float(quotes[0].last_done)
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return None

    def get_option_expiry_dates(self, symbol: str) -> List[str]:
        ctx = self._get_context()
        if ctx is None:
            return []

        formatted_symbol = self._format_symbol(symbol)

        try:
            expiry_dates = ctx.option_chain_expiry_date_list(formatted_symbol)
            # 转换为字符串格式 "YYYYMMDD"
            result = []
            for d in (expiry_dates or []):
                if isinstance(d, date):
                    result.append(d.strftime("%Y%m%d"))
                elif isinstance(d, str):
                    result.append(d.replace("-", ""))
                else:
                    result.append(str(d))
            return result
        except Exception as e:
            print(f"Error fetching option expiry dates for {symbol}: {e}")
            return []

    def get_option_chain_by_date(self, symbol: str, expiry_date: str) -> List[dict]:
        ctx = self._get_context()
        if ctx is None:
            return []
            
        formatted_symbol = self._format_symbol(symbol)
        
        try:
            year = int(expiry_date[:4])
            month = int(expiry_date[4:6])
            day = int(expiry_date[6:8])
            expiry = date(year, month, day)
            
            strike_info = ctx.option_chain_info_by_date(formatted_symbol, expiry)
            if not strike_info:
                return []
            
            result = []
            for info in strike_info:
                result.append({
                    "strike_price": float(info.price),
                    "call_symbol": info.call_symbol,
                    "put_symbol": info.put_symbol,
                    "standard": info.standard
                })
            return result
        except Exception as e:
            print(f"Error fetching option chain for {symbol} on {expiry_date}: {e}")
            return []

    def get_option_quotes(self, option_symbols: List[str]) -> dict:
        ctx = self._get_context()
        if ctx is None:
            return {}

        if not option_symbols:
            return {}

        try:
            quotes = ctx.option_quote(option_symbols)
            result = {}
            for quote in quotes:
                result[quote.symbol] = {
                    "last_done": float(quote.last_done) if quote.last_done else 0,
                    "prev_close": float(quote.prev_close) if quote.prev_close else 0,
                    "volume": quote.volume or 0,
                    "implied_volatility": float(quote.implied_volatility) if quote.implied_volatility else 0,
                    "open_interest": quote.open_interest if quote.open_interest else 0,
                    "strike_price": float(quote.strike_price) if quote.strike_price else 0,
                    "expiry_date": str(quote.expiry_date) if quote.expiry_date else "",
                    "direction": quote.direction if quote.direction else ""
                }
            return result
        except Exception as e:
            print(f"Error fetching option quotes: {e}")
            return {}

    def calculate_itm_probability(
        self, 
        current_price: float, 
        strike: float, 
        days_to_expiry: int, 
        volatility: float,
        option_type: str
    ) -> float:
        if days_to_expiry <= 0 or volatility <= 0 or current_price <= 0 or strike <= 0:
            return 0.0
        
        try:
            T = days_to_expiry / 365.0
            sigma = volatility
            
            d1 = (math.log(current_price / strike) + (self.risk_free_rate + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
            
            if option_type.lower() == "call":
                return norm.cdf(d1) * 100
            else:
                return norm.cdf(-d1) * 100
        except:
            return 0.0

    def calculate_annual_return(
        self, 
        premium: float, 
        strike: float, 
        days_to_expiry: int
    ) -> float:
        if days_to_expiry <= 0 or strike <= 0:
            return 0.0
        
        try:
            period_return = premium / strike
            annual_return = (1 + period_return) ** (365 / days_to_expiry) - 1
            return annual_return * 100
        except:
            return 0.0

    def calculate_price_diff_percent(
        self, 
        current_price: float, 
        strike: float
    ) -> float:
        if current_price <= 0:
            return 0.0
        
        diff = abs(current_price - strike)
        percent = (diff / current_price) * 100
        
        return percent

    def calculate_recommendation_score(
        self,
        annual_return: float,
        itm_probability: float,
        price_diff: float,
        volume: int,
        open_interest: int
    ) -> float:
        score = 0.0
        
        if annual_return > 0:
            if annual_return <= 20:
                score += annual_return * 2
            elif annual_return <= 50:
                score += 40 + (annual_return - 20)
            else:
                score += 70 + (annual_return - 50) * 0.5
        
        if 30 <= itm_probability <= 70:
            score += 20
        elif 20 <= itm_probability <= 80:
            score += 10
        
        if price_diff <= 5:
            score += 15
        elif price_diff <= 10:
            score += 10
        elif price_diff <= 15:
            score += 5
        
        if volume > 100:
            score += min(10, volume / 100)
        if open_interest > 50:
            score += min(5, open_interest / 100)
        
        return round(score, 2)

    def analyze_options(
        self,
        symbol: str,
        min_call_price_diff: float = 0.0,
        max_call_price_diff: float = 50.0,
        min_put_price_diff: float = 0.0,
        max_put_price_diff: float = 50.0,
        min_expiry_days: int = 0,
        max_expiry_days: int = 180,
        min_annual_return: float = 0.0,
        max_annual_return: float = 100.0,
        min_premium: float = 0.0,
        max_premium: float = 10000.0,
        min_volume: int = 0,
        max_results: int = 500
    ) -> Tuple[Optional[float], List[OptionAnalysis], bool]:

        ctx = self._get_context()
        if ctx is None:
            print(f"LongPort not initialized: {self._init_error}")
            return None, [], False

        try:
            current_price = self.get_current_price(symbol)

            if not current_price:
                print(f"Could not get current price for {symbol}")
                return None, [], False

            today = datetime.now().date()
            min_expiry = today + timedelta(days=min_expiry_days)
            max_expiry = today + timedelta(days=max_expiry_days)

            expiry_dates = self.get_option_expiry_dates(symbol)

            if not expiry_dates:
                print(f"No option expiry dates found for {symbol}")
                return current_price, [], False

            options_list = []

            for expiry_str in expiry_dates:
                try:
                    year = int(expiry_str[:4])
                    month = int(expiry_str[4:6])
                    day = int(expiry_str[6:8])
                    expiry_date = date(year, month, day)

                    if expiry_date < min_expiry or expiry_date > max_expiry:
                        continue

                    days_to_expiry = (expiry_date - today).days
                    if days_to_expiry <= 0:
                        continue

                    chain = self.get_option_chain_by_date(symbol, expiry_str)
                    if not chain:
                        continue

                    # 获取所有call和put的symbol
                    call_symbols = [item["call_symbol"] for item in chain if item.get("call_symbol")]
                    put_symbols = [item["put_symbol"] for item in chain if item.get("put_symbol")]

                    # 批量获取所有期权报价
                    all_symbols = call_symbols + put_symbols
                    if not all_symbols:
                        continue
                    option_quotes = self.get_option_quotes(all_symbols)

                    # 处理CALL期权
                    for item in chain:
                        call_symbol = item.get("call_symbol")
                        if not call_symbol or call_symbol not in option_quotes:
                            continue

                        quote = option_quotes[call_symbol]
                        premium = quote["last_done"]

                        if premium <= 0:
                            continue

                        strike = item["strike_price"]
                        price_diff = self.calculate_price_diff_percent(current_price, strike)

                        # 筛选CALL的价差
                        if price_diff < min_call_price_diff or price_diff > max_call_price_diff:
                            continue

                        iv = quote["implied_volatility"]
                        itm_prob = self.calculate_itm_probability(
                            current_price, strike, days_to_expiry, iv, "call"
                        )

                        annual_return = self.calculate_annual_return(premium, strike, days_to_expiry)

                        # 筛选年化收益和权利金
                        if annual_return < min_annual_return or annual_return > max_annual_return:
                            continue
                        if premium < min_premium or premium > max_premium:
                            continue

                        breakeven = strike + premium

                        volume = quote["volume"]
                        open_interest = quote["open_interest"]

                        # 筛选成交量
                        if volume < min_volume:
                            continue

                        rec_score = self.calculate_recommendation_score(
                            annual_return, itm_prob, price_diff, volume, open_interest
                        )

                        option = OptionAnalysis(
                            symbol=symbol.upper(),
                            option_type="call",
                            strike=round(strike, 2),
                            expiry_date=expiry_date,
                            days_to_expiry=days_to_expiry,
                            current_price=current_price,
                            premium=round(premium, 2),
                            annual_return=round(annual_return, 2),
                            price_diff_percent=round(price_diff, 2),
                            itm_probability=round(itm_prob, 2),
                            breakeven=round(breakeven, 2),
                            volume=volume,
                            open_interest=open_interest,
                            implied_volatility=round(iv * 100, 2),
                            recommendation_score=rec_score
                        )
                        options_list.append(option)

                    # 处理PUT期权
                    for item in chain:
                        put_symbol = item.get("put_symbol")
                        if not put_symbol or put_symbol not in option_quotes:
                            continue

                        quote = option_quotes[put_symbol]
                        premium = quote["last_done"]

                        if premium <= 0:
                            continue

                        strike = item["strike_price"]
                        price_diff = self.calculate_price_diff_percent(current_price, strike)

                        # 筛选PUT的价差
                        if price_diff < min_put_price_diff or price_diff > max_put_price_diff:
                            continue

                        iv = quote["implied_volatility"]
                        itm_prob = self.calculate_itm_probability(
                            current_price, strike, days_to_expiry, iv, "put"
                        )

                        annual_return = self.calculate_annual_return(premium, strike, days_to_expiry)

                        # 筛选年化收益和权利金
                        if annual_return < min_annual_return or annual_return > max_annual_return:
                            continue
                        if premium < min_premium or premium > max_premium:
                            continue

                        breakeven = strike - premium

                        volume = quote["volume"]
                        open_interest = quote["open_interest"]

                        # 筛选成交量
                        if volume < min_volume:
                            continue

                        rec_score = self.calculate_recommendation_score(
                            annual_return, itm_prob, price_diff, volume, open_interest
                        )

                        option = OptionAnalysis(
                            symbol=symbol.upper(),
                            option_type="put",
                            strike=round(strike, 2),
                            expiry_date=expiry_date,
                            days_to_expiry=days_to_expiry,
                            current_price=current_price,
                            premium=round(premium, 2),
                            annual_return=round(annual_return, 2),
                            price_diff_percent=round(price_diff, 2),
                            itm_probability=round(itm_prob, 2),
                            breakeven=round(breakeven, 2),
                            volume=volume,
                            open_interest=open_interest,
                            implied_volatility=round(iv * 100, 2),
                            recommendation_score=rec_score
                        )
                        options_list.append(option)

                except Exception as e:
                    print(f"Error processing expiry {expiry_str}: {e}")
                    continue

            # 按到期天数升序、推荐分数降序排序
            options_list.sort(key=lambda x: (x.days_to_expiry, -x.recommendation_score))

            # 如果超过max_results，按天数升序截取（保证日期就近优先）
            truncated = False
            if len(options_list) > max_results:
                truncated = True
                options_list = options_list[:max_results]

            return current_price, options_list, truncated

        except Exception as e:
            print(f"Error analyzing options for {symbol}: {e}")
            return None, [], False

    def _get_period(self, period_type: PeriodType) -> Period:
        period_map = {
            PeriodType.MIN1: Period.Min_1,
            PeriodType.MIN5: Period.Min_5,
            PeriodType.MIN15: Period.Min_15,
            PeriodType.MIN30: Period.Min_30,
            PeriodType.MIN60: Period.Min_60,
            PeriodType.DAY: Period.Day,
            PeriodType.WEEK: Period.Week,
            PeriodType.MONTH: Period.Month,
            PeriodType.YEAR: Period.Year,
        }
        return period_map.get(period_type, Period.Day)

    def get_candlesticks(
        self,
        symbol: str,
        period: PeriodType = PeriodType.DAY,
        count: int = 100,
        adjust_type: str = "no_adjust",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Optional[CandlestickResponse]:
        ctx = self._get_context()
        if ctx is None:
            print(f"LongPort not initialized: {self._init_error}")
            return None
        
        formatted_symbol = self._format_symbol(symbol)
        lp_period = self._get_period(period)
        
        adjust_map = {
            "no_adjust": AdjustType.NoAdjust,
            "forward": AdjustType.ForwardAdjust,
        }
        lp_adjust = adjust_map.get(adjust_type, AdjustType.NoAdjust)
        
        try:
            if start_date and end_date:
                candlesticks = ctx.history_candlesticks_by_date(
                    formatted_symbol, 
                    lp_period, 
                    lp_adjust,
                    start_date, 
                    end_date
                )
            else:
                candlesticks = ctx.candlesticks(
                    formatted_symbol,
                    lp_period,
                    min(count, 1000),
                    lp_adjust
                )
            
            if not candlesticks:
                return CandlestickResponse(
                    symbol=formatted_symbol,
                    period=period.value,
                    candlesticks=[]
                )
            
            result = []
            for c in candlesticks:
                try:
                    ts_str = c.timestamp
                    if isinstance(ts_str, datetime):
                        ts = ts_str
                    elif isinstance(ts_str, str):
                        ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    else:
                        ts = datetime.fromtimestamp(ts_str)
                    result.append(Candlestick(
                        timestamp=ts,
                        open=float(c.open) if c.open else 0,
                        high=float(c.high) if c.high else 0,
                        low=float(c.low) if c.low else 0,
                        close=float(c.close) if c.close else 0,
                        volume=int(c.volume) if c.volume else 0,
                        turnover=float(c.turnover) if c.turnover else 0,
                    ))
                except Exception as e:
                    print(f"Error parsing candlestick: {e}")
                    continue
            
            return CandlestickResponse(
                symbol=formatted_symbol,
                period=period.value,
                candlesticks=result
            )
            
        except Exception as e:
            print(f"Error fetching candlesticks for {symbol}: {e}")
            return None


option_analyzer = OptionAnalyzer()
