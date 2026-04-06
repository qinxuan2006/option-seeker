from longport.openapi import Config, QuoteContext, CalcIndex, Period, AdjustType
from datetime import date, timedelta

config = Config.from_env()
ctx = QuoteContext(config)

print("测试期权K线数据...")
print()

option_symbol = "AAPL260410C250000.US"

print(f"1. 测试期权K线: {option_symbol}")
try:
    result = ctx.candlesticks(option_symbol, Period.Day, 10, AdjustType.NoAdjust)
    print(f"   返回数量: {len(result) if result else 0}")
    if result:
        for r in result[:3]:
            print(f"   {r}")
except Exception as e:
    print(f"   错误: {e}")

print()
print("2. 测试股票K线 (AAPL.US):")
try:
    result = ctx.candlesticks("AAPL.US", Period.Day, 10, AdjustType.NoAdjust)
    print(f"   返回数量: {len(result) if result else 0}")
    if result:
        for r in result[:3]:
            print(f"   {r}")
except Exception as e:
    print(f"   错误: {e}")

print()
print("3. 测试期权分时数据:")
try:
    result = ctx.intraday(option_symbol)
    print(f"   返回: {result}")
except Exception as e:
    print(f"   错误: {e}")
