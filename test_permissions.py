from longport.openapi import Config, QuoteContext, TradeContext
from datetime import date

config = Config.from_env()
quote_ctx = QuoteContext(config)

print("=" * 60)
print("LongPort API 权限检测")
print("=" * 60)

test_results = []

def test_api(name, func, success_check=None):
    try:
        result = func()
        if success_check and not success_check(result):
            test_results.append((name, "❌ 无数据", str(result)[:50]))
            return False
        test_results.append((name, "✅ 可用", ""))
        return True
    except Exception as e:
        err_msg = str(e)
        if "no quote access" in err_msg or "no access" in err_msg.lower():
            test_results.append((name, "❌ 无权限", err_msg[:50]))
        else:
            test_results.append((name, "❌ 错误", err_msg[:50]))
        return False

print("\n【行情接口测试】")

test_api("股票实时行情 (US)", lambda: quote_ctx.quote(["AAPL.US"]), lambda r: r and r[0].last_done)
test_api("股票实时行情 (HK)", lambda: quote_ctx.quote(["700.HK"]), lambda r: r and r[0].last_done)
test_api("期权实时行情", lambda: quote_ctx.option_quote(["AAPL260410C250000.US"]))
test_api("轮证实时行情", lambda: quote_ctx.warrant_quote(["700.HK"]))
test_api("期权链到期日", lambda: quote_ctx.option_chain_expiry_date_list("AAPL.US"), lambda r: r)
test_api("期权链标的列表", lambda: quote_ctx.option_chain_info_by_date("AAPL.US", date(2026, 4, 10)), lambda r: r)
test_api("标的基础信息", lambda: quote_ctx.static_info(["AAPL.US"]), lambda r: r)
test_api("标的盘口", lambda: quote_ctx.depth("AAPL.US"), lambda r: r)
test_api("经纪队列", lambda: quote_ctx.brokers("AAPL.US"), lambda r: r is not None)
test_api("成交明细", lambda: quote_ctx.trades("AAPL.US", 10), lambda r: r is not None)
test_api("分时数据", lambda: quote_ctx.intraday("AAPL.US"), lambda r: r)
test_api("K线数据", lambda: quote_ctx.candlesticks("AAPL.US", "1d", 10, date(2026, 1, 1), date(2026, 4, 1)), lambda r: r)
test_api("历史K线", lambda: quote_ctx.history_candlesticks("AAPL.US", "1d", 10, date(2025, 1, 1), date(2025, 12, 1)), lambda r: r)
test_api("交易日历", lambda: quote_ctx.trading_days("US"), lambda r: r)
test_api("交易时段", lambda: quote_ctx.market_trading_sessions(), lambda r: r)
test_api("资金流向", lambda: quote_ctx.capital_flow("AAPL.US"), lambda r: r)
test_api("资金分布", lambda: quote_ctx.capital_distribution("AAPL.US"), lambda r: r)
test_api("计算指标", lambda: quote_ctx.calc_indexes("AAPL.US", ["MA"]), lambda r: r)

print("\n【交易接口测试】")
try:
    trade_ctx = TradeContext(config)
    test_api("账户余额", lambda: trade_ctx.account_balance(), lambda r: r)
    test_api("股票持仓", lambda: trade_ctx.stock_positions(), lambda r: r is not None)
    test_api("基金持仓", lambda: trade_ctx.fund_positions(), lambda r: r is not None)
    test_api("资金流水", lambda: trade_ctx.fund_balance_history(), lambda r: r is not None)
    test_api("当日订单", lambda: trade_ctx.today_orders(), lambda r: r is not None)
    test_api("历史订单", lambda: trade_ctx.history_orders(), lambda r: r is not None)
    test_api("当日成交", lambda: trade_ctx.today_executions(), lambda r: r is not None)
    test_api("历史成交", lambda: trade_ctx.history_executions(), lambda r: r is not None)
except Exception as e:
    test_results.append(("交易接口初始化", "❌ 错误", str(e)[:50]))

print("\n" + "=" * 60)
print("测试结果汇总")
print("=" * 60)
print(f"{'接口名称':<25} {'状态':<10} {'备注'}")
print("-" * 60)
for name, status, note in test_results:
    print(f"{name:<25} {status:<10} {note}")

print("\n" + "=" * 60)
available = [r for r in test_results if "✅" in r[1]]
no_access = [r for r in test_results if "无权限" in r[1]]
errors = [r for r in test_results if "错误" in r[1] and "无权限" not in r[2]]

print(f"可用: {len(available)} 个")
print(f"无权限: {len(no_access)} 个")
print(f"其他错误: {len(errors)} 个")

if no_access:
    print("\n需要购买的行情权限:")
    for name, _, _ in no_access:
        print(f"  - {name}")
