from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import date

from models.schemas import AnalysisRequest, AnalysisResponse, StockInfo, OptionAnalysis, CandlestickResponse, PeriodType
from services.option_analyzer import option_analyzer

router = APIRouter(prefix="/api", tags=["analysis"])


@router.get("/stock/{symbol}", response_model=StockInfo)
async def get_stock_info(symbol: str):
    stock_info = option_analyzer.get_stock_info(symbol.upper())
    if not stock_info:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
    return stock_info


@router.get("/candlesticks/{symbol}", response_model=CandlestickResponse)
async def get_candlesticks(
    symbol: str,
    period: PeriodType = Query(PeriodType.DAY, description="K线周期"),
    count: int = Query(100, ge=1, le=1000, description="数据数量"),
    adjust_type: str = Query("no_adjust", description="复权类型: no_adjust, forward, backward"),
    start_date: Optional[date] = Query(None, description="开始日期 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="结束日期 (YYYY-MM-DD)")
):
    result = option_analyzer.get_candlesticks(
        symbol=symbol.upper(),
        period=period,
        count=count,
        adjust_type=adjust_type,
        start_date=start_date,
        end_date=end_date
    )
    
    if result is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch candlesticks for {symbol}")
    
    return result


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_options(request: AnalysisRequest):
    current_price, options, truncated = option_analyzer.analyze_options(
        symbol=request.symbol.upper(),
        min_call_price_diff=request.min_call_price_diff,
        max_call_price_diff=request.max_call_price_diff,
        min_put_price_diff=request.min_put_price_diff,
        max_put_price_diff=request.max_put_price_diff,
        min_expiry_days=request.min_expiry_days,
        max_expiry_days=request.max_expiry_days,
        min_annual_return=request.min_annual_return,
        max_annual_return=request.max_annual_return,
        min_premium=request.min_premium,
        max_premium=request.max_premium,
        max_results=request.max_results
    )

    if current_price is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch data for {request.symbol}")

    total_count = len(options)

    return AnalysisResponse(
        symbol=request.symbol.upper(),
        current_price=current_price,
        options=options,
        total_count=total_count,
        filtered_count=len(options),
        truncated=truncated
    )


@router.get("/search/{query}", response_model=List[StockInfo])
async def search_stocks(query: str):
    results = []
    common_stocks = {
        "AAPL": "Apple Inc.",
        "GOOGL": "Alphabet Inc.",
        "MSFT": "Microsoft Corporation",
        "AMZN": "Amazon.com Inc.",
        "TSLA": "Tesla Inc.",
        "META": "Meta Platforms Inc.",
        "NVDA": "NVIDIA Corporation",
        "AMD": "Advanced Micro Devices",
        "NFLX": "Netflix Inc.",
        "DIS": "The Walt Disney Company",
        "BABA": "Alibaba Group",
        "JD": "JD.com Inc.",
        "PDD": "PDD Holdings",
        "NIO": "NIO Inc.",
        "BIDU": "Baidu Inc.",
        "TSM": "Taiwan Semiconductor",
        "INTC": "Intel Corporation",
        "BA": "Boeing Company",
        "JPM": "JPMorgan Chase",
        "V": "Visa Inc.",
    }
    
    query_upper = query.upper()
    for symbol, name in common_stocks.items():
        if query_upper in symbol or query_upper.lower() in name.lower():
            stock_info = option_analyzer.get_stock_info(symbol)
            if stock_info:
                results.append(stock_info)
    
    return results[:10]
