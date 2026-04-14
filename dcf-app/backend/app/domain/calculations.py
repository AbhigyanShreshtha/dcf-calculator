from collections.abc import Callable, Sequence

import numpy as np
from numpy.typing import NDArray


FloatArray = NDArray[np.float64]


def _as_float_array(values: Sequence[float]) -> FloatArray:
    return np.asarray(values, dtype=np.float64)


def project_revenue(current_revenue: float, growth_rates: Sequence[float]) -> FloatArray:
    growth_array = _as_float_array(growth_rates)
    revenues = np.empty_like(growth_array)
    running_revenue = np.float64(current_revenue)
    for index, rate in enumerate(growth_array):
        running_revenue = running_revenue * (1.0 + rate)
        revenues[index] = running_revenue
    return revenues


def project_ebit(revenues: Sequence[float], margins: Sequence[float]) -> FloatArray:
    return _as_float_array(revenues) * _as_float_array(margins)


def project_nopat(
    ebit_values: Sequence[float],
    tax_rate: float,
    net_operating_losses: float = 0.0,
) -> dict[str, FloatArray]:
    ebit_array = _as_float_array(ebit_values)
    nopat = np.zeros_like(ebit_array)
    cash_taxes = np.zeros_like(ebit_array)
    remaining_nol = np.zeros_like(ebit_array)
    nol_balance = np.float64(net_operating_losses)

    for index, ebit in enumerate(ebit_array):
        if ebit < 0:
            nol_balance += abs(ebit)
            nopat[index] = ebit
            cash_taxes[index] = 0.0
            remaining_nol[index] = nol_balance
            continue

        nol_applied = min(nol_balance, ebit)
        taxable_income = ebit - nol_applied
        tax_payment = taxable_income * tax_rate
        nol_balance -= nol_applied

        cash_taxes[index] = tax_payment
        nopat[index] = ebit - tax_payment
        remaining_nol[index] = nol_balance

    return {
        "nopat": nopat,
        "cash_taxes": cash_taxes,
        "remaining_nol": remaining_nol,
    }


def project_dna(
    revenues: Sequence[float],
    mode: str = "percent",
    percent_of_revenue: float | None = None,
    explicit_values: Sequence[float] | None = None,
) -> FloatArray:
    revenue_array = _as_float_array(revenues)
    if mode == "explicit":
        if explicit_values is None:
            raise ValueError("Explicit D&A projection requires yearly values.")
        return _as_float_array(explicit_values)
    if percent_of_revenue is None:
        raise ValueError("Percent-of-revenue D&A projection requires a percentage.")
    return revenue_array * np.float64(percent_of_revenue)


def project_capex(
    revenues: Sequence[float],
    mode: str = "percent",
    percent_of_revenue: float | None = None,
    explicit_values: Sequence[float] | None = None,
) -> FloatArray:
    revenue_array = _as_float_array(revenues)
    if mode == "explicit":
        if explicit_values is None:
            raise ValueError("Explicit capex projection requires yearly values.")
        return _as_float_array(explicit_values)
    if percent_of_revenue is None:
        raise ValueError("Percent-of-revenue capex projection requires a percentage.")
    return revenue_array * np.float64(percent_of_revenue)


def project_nwc(
    revenues: Sequence[float],
    current_revenue: float,
    mode: str = "percent",
    percent_of_incremental_revenue: float | None = None,
    explicit_values: Sequence[float] | None = None,
) -> FloatArray:
    revenue_array = _as_float_array(revenues)
    if mode == "explicit":
        if explicit_values is None:
            raise ValueError("Explicit NWC projection requires yearly values.")
        return _as_float_array(explicit_values)
    if percent_of_incremental_revenue is None:
        raise ValueError("Percent-of-incremental-revenue NWC projection requires a percentage.")

    prior_revenues = np.concatenate(([np.float64(current_revenue)], revenue_array[:-1]))
    incremental_revenue = revenue_array - prior_revenues
    return incremental_revenue * np.float64(percent_of_incremental_revenue)


def project_fcff(
    nopat: Sequence[float],
    dna: Sequence[float],
    capex: Sequence[float],
    change_in_nwc: Sequence[float],
    stock_based_compensation: Sequence[float] | None = None,
) -> FloatArray:
    stock_based_compensation_array = (
        _as_float_array(stock_based_compensation)
        if stock_based_compensation is not None
        else np.zeros_like(_as_float_array(nopat))
    )
    return (
        _as_float_array(nopat)
        + _as_float_array(dna)
        + stock_based_compensation_array
        - _as_float_array(capex)
        - _as_float_array(change_in_nwc)
    )


def project_fcfe(fcff: Sequence[float], net_borrowing: Sequence[float] | None = None) -> FloatArray:
    net_borrowing_array = (
        _as_float_array(net_borrowing) if net_borrowing is not None else np.zeros_like(_as_float_array(fcff))
    )
    return _as_float_array(fcff) + net_borrowing_array


def discount_cash_flows(
    cash_flows: Sequence[float],
    discount_rate: float,
    mid_year_discounting: bool = False,
    start_period: int = 1,
) -> dict[str, FloatArray]:
    cash_flow_array = _as_float_array(cash_flows)
    periods = np.arange(start_period, start_period + len(cash_flow_array), dtype=np.float64)
    if mid_year_discounting:
        periods = periods - 0.5

    discount_factors = np.power(1.0 + np.float64(discount_rate), -periods)
    present_values = cash_flow_array * discount_factors
    return {
        "periods": periods,
        "discount_factors": discount_factors,
        "present_values": present_values,
    }


def calculate_terminal_value_gordon(final_cash_flow: float, discount_rate: float, terminal_growth_rate: float) -> float:
    if terminal_growth_rate >= discount_rate:
        raise ValueError("Terminal growth rate must be less than the discount rate.")
    next_year_cash_flow = np.float64(final_cash_flow) * (1.0 + np.float64(terminal_growth_rate))
    return float(next_year_cash_flow / (np.float64(discount_rate) - np.float64(terminal_growth_rate)))


def calculate_terminal_value_exit_multiple(terminal_ebitda: float, exit_multiple: float) -> float:
    return float(np.float64(terminal_ebitda) * np.float64(exit_multiple))


def calculate_enterprise_value(pv_forecast_cash_flows: float, pv_terminal_value: float) -> float:
    return float(np.float64(pv_forecast_cash_flows) + np.float64(pv_terminal_value))


def calculate_equity_value(
    enterprise_value: float,
    cash: float,
    debt: float,
    preferred_equity: float = 0.0,
    minority_interest: float = 0.0,
) -> float:
    return float(
        np.float64(enterprise_value)
        + np.float64(cash)
        - np.float64(debt)
        - np.float64(preferred_equity)
        - np.float64(minority_interest)
    )


def calculate_intrinsic_value_per_share(equity_value: float, diluted_shares_outstanding: float) -> float:
    if diluted_shares_outstanding <= 0:
        raise ValueError("Diluted shares outstanding must be greater than zero.")
    return float(np.float64(equity_value) / np.float64(diluted_shares_outstanding))


def calculate_upside_downside(intrinsic_value_per_share: float, current_market_price_per_share: float | None) -> float | None:
    if current_market_price_per_share is None or current_market_price_per_share <= 0:
        return None
    return float((np.float64(intrinsic_value_per_share) / np.float64(current_market_price_per_share) - 1.0) * 100.0)


def build_sensitivity_matrix(
    row_values: Sequence[float],
    column_values: Sequence[float],
    calculator: Callable[[float, float], float],
) -> FloatArray:
    matrix = np.zeros((len(row_values), len(column_values)), dtype=np.float64)
    for row_index, row_value in enumerate(row_values):
        for column_index, column_value in enumerate(column_values):
            matrix[row_index, column_index] = np.float64(calculator(row_value, column_value))
    return matrix
