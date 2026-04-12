import os
import math
import time
from datetime import datetime, date, timedelta
from typing import List, Optional, Tuple
from scipy.stats import norm

from models.schemas import OptionAnalysis, StockInfo, OptionType, Candlestick, CandlestickResponse, PeriodType

try:
    from longport.openapi import Config, QuoteContext, Period, AdjustType, TradeSession
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
        self._trading_days_cache = None
        self._trading_days_date = None
        self._trading_sessions_cache = None
        self._trading_sessions_date = None

    def _time_to_minutes(self, time_val) -> int:
        """Convert time string 'hh:mm:ss' or datetime.time to minutes since midnight"""
        if isinstance(time_val, str):
            parts = time_val.split(":")
            return int(parts[0]) * 60 + int(parts[1])
        else:
            # datetime.time object
            return time_val.hour * 60 + time_val.minute

    def _is_us_trading_day(self) -> bool:
        """Check if today is a US trading day, cached for the day"""
        from longport.openapi import Market

        today = date.today()
        if self._trading_days_cache and self._trading_days_date == today:
            return self._trading_days_cache

        ctx = self._get_context()
        if ctx is None:
            return True  # Assume trading day if API fails

        try:
            yesterday = today - timedelta(days=1)
            tomorrow = today + timedelta(days=1)
            result = ctx.trading_days(Market.US, yesterday, tomorrow)
            trading_days_str = [d.strftime('%y%m%d') for d in result.trading_days]
            today_str = today.strftime('%y%m%d')
            is_trading = today_str in trading_days_str
            # Cache for the day
            self._trading_days_cache = is_trading
            self._trading_days_date = today
            return is_trading
        except Exception as e:
            print(f"Error fetching trading days: {e}")
            return True  # Assume trading day if API fails

    def _get_us_trading_sessions(self) -> Optional[List[dict]]:
        """Fetch US trading sessions from API and cache for the day"""
        today = date.today()
        if self._trading_sessions_cache and self._trading_sessions_date == today:
            return self._trading_sessions_cache

        ctx = self._get_context()
        if ctx is None:
            return None

        try:
            sessions = ctx.trading_session()
            us_sessions = []
            for s in sessions:
                if str(s.market) == "Market.US":
                    for session in s.trade_sessions:
                        ts = session.trade_session
                        us_sessions.append({
                            "beg_minutes": self._time_to_minutes(session.begin_time),
                            "end_minutes": self._time_to_minutes(session.end_time),
                            "trade_session": ts
                        })
            # Cache until end of day
            self._trading_sessions_cache = us_sessions
            self._trading_sessions_date = today
            return us_sessions
        except Exception as e:
            print(f"Error fetching trading sessions: {e}")
            return None

    def _get_trading_session(self) -> str:
        """Determine current trading session based on US trading sessions from API"""
        # If today is not a trading day, return afterhours (use prev_close)
        if not self._is_us_trading_day():
            return "afterhours"

        try:
            import zoneinfo
            et_now = datetime.now(zoneinfo.ZoneInfo('America/New_York'))
            et_minutes = et_now.hour * 60 + et_now.minute

            sessions = self._get_us_trading_sessions()
            if sessions:
                for session in sessions:
                    beg = session["beg_minutes"]
                    end = session["end_minutes"]
                    session_type = session["trade_session"]
                    if beg <= et_minutes < end:
                        if session_type == TradeSession.Pre:
                            return "premarket"
                        elif session_type == TradeSession.Post:
                            return "afterhours"
                        elif session_type == TradeSession.Overnight:
                            return "24h"
                        else:
                            return "regular"
                # If time doesn't match any session, return 24h
                return "24h"
            else:
                # Fallback to time-based logic if API fails
                if et_minutes < 570:
                    return "premarket"
                elif et_minutes < 960:
                    return "regular"
                elif et_minutes < 1200:
                    return "afterhours"
                else:
                    return "24h"
        except Exception as e:
            print(f"Error determining trading session: {e}")
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

            # 获取夜盘行情
            overnight_quote = None
            if hasattr(quote, 'overnight_quote') and quote.overnight_quote:
                oq = quote.overnight_quote
                ts = oq.timestamp
                if isinstance(ts, datetime):
                    ts = int(ts.timestamp())
                elif not isinstance(ts, int):
                    ts = 0
                overnight_quote = {
                    "last_done": float(oq.last_done) if oq.last_done else 0,
                    "high": float(oq.high) if oq.high else 0,
                    "low": float(oq.low) if oq.low else 0,
                    "volume": int(oq.volume) if oq.volume else 0,
                    "turnover": float(oq.turnover) if oq.turnover else 0,
                    "timestamp": ts,
                }

            # 根据时间戳选择最新价格
            def get_quote_timestamp(q):
                if isinstance(q, dict):
                    return q.get("timestamp", 0)
                return 0

            # 收集所有有效报价及其信息
            all_quotes = []
            if quote.last_done:
                ts = quote.timestamp
                if isinstance(ts, datetime):
                    ts = int(ts.timestamp())
                elif not isinstance(ts, int):
                    ts = 0
                all_quotes.append(("regular", ts, float(quote.last_done), None))

            if pre_market_quote and pre_market_quote["last_done"] > 0:
                all_quotes.append(("premarket", pre_market_quote["timestamp"], pre_market_quote["last_done"], pre_market_quote))

            if post_market_quote and post_market_quote["last_done"] > 0:
                all_quotes.append(("afterhours", post_market_quote["timestamp"], post_market_quote["last_done"], post_market_quote))

            if overnight_quote and overnight_quote["last_done"] > 0:
                all_quotes.append(("24h", overnight_quote["timestamp"], overnight_quote["last_done"], overnight_quote))

            # 按时间戳排序，选择最新的
            if all_quotes:
                all_quotes.sort(key=lambda x: x[1], reverse=True)
                trading_session, _, current_price, latest_quote_data = all_quotes[0]
            else:
                current_price = prev_close
                latest_quote_data = None

            return StockInfo(
                symbol=symbol.upper(),
                name=formatted_symbol,
                current_price=current_price,
                prev_close=prev_close,
                currency="USD" if ".US" in formatted_symbol else "HKD",
                exchange="US" if ".US" in formatted_symbol else "HK",
                trading_session=trading_session,
                pre_market_quote=pre_market_quote,
                post_market_quote=post_market_quote,
                overnight_quote=overnight_quote,
                latest_quote=latest_quote_data
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
            # API返回格式为 "YYMMDD"（如 "260429" 表示 2026年4月29日）
            result = []
            for d in (expiry_dates or []):
                if isinstance(d, date):
                    result.append(d.strftime("%y%m%d"))
                elif isinstance(d, str):
                    # 直接使用字符串，确保是 YYMMDD 格式
                    result.append(d.replace("-", "").zfill(6))
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
            # expiry_date 格式为 "YYMMDD"（如 "260429"）
            year = 2000 + int(expiry_date[:2])
            month = int(expiry_date[2:4])
            day = int(expiry_date[4:6])
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
        strike: float,
        option_type: str
    ) -> float:
        if current_price <= 0:
            return 0.0

        # 有符号价差百分比
        # CALL: 负值=ITM（实值），正值=OTM（虚值）=> diff = strike - current_price
        # PUT:  正值=ITM（实值），负值=OTM（虚值）=> diff = current_price - strike
        if option_type.lower() == "put":
            diff = current_price - strike
        else:
            diff = strike - current_price
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
        min_price_diff: float = -50.0,
        max_price_diff: float = 50.0,
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
                    # expiry_str 格式为 "YYMMDD"（如 "260429"）
                    year = 2000 + int(expiry_str[:2])
                    month = int(expiry_str[2:4])
                    day = int(expiry_str[4:6])
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
                        price_diff = self.calculate_price_diff_percent(current_price, strike, "call")

                        # 筛选价差（统一过滤）
                        if price_diff < min_price_diff or price_diff > max_price_diff:
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
                        price_diff = self.calculate_price_diff_percent(current_price, strike, "put")

                        # 筛选价差（统一过滤）
                        if price_diff < min_price_diff or price_diff > max_price_diff:
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
