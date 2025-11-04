import Decimal from "decimal.js";

/**
 * Interface describing all inputs required for the battery ROI calculation.
 */
export interface ROIInputs {
  /** Capital expenditure (cost of goods) before support */
  capex_cogs: Decimal;
  /** Purchase price excluding VAT (unused here) */
  price_ex_vat: Decimal;
  /** Support/grant share (0–1). A value of 0.65 means 65 % support. */
  grant_pct: Decimal;
  /** Battery capacity in kilowatt‑hours */
  capacity_kwh: Decimal;
  /** Inverter power in kilowatts */
  inverter_kw: Decimal;
  /** Depth of discharge (0–1) */
  dod: Decimal;
  /** Round‑trip efficiency (0–1) */
  efficiency: Decimal;
  /** Photovoltaic cycles per year */
  pv_cycles_per_year: Decimal;
  /** Arbitrage cycles per year */
  arbitrage_cycles_per_year: Decimal;
  /** Annual PV export capability (kWh) */
  annual_pv_kwh: Decimal;
  /** Purchase price (SEK per kWh) */
  purchase_price_sek_per_kwh: Decimal;
  /** Demand price (SEK per kW per month) */
  demand_price_sek_per_kw_month: Decimal;
  /** Array of monthly peak demands in kW (length 12) */
  monthly_peaks_kw: Decimal[];
  /** Arbitrage spread (SEK per kWh) */
  spread_sek_per_kwh: Decimal;
  /** Annual operations and maintenance cost (SEK) */
  o_and_m: Decimal;
  /** Weighted average cost of capital (0–1) for NPV/IRR */
  wacc: Decimal;
  /** Annual degradation factor (0–1). E.g. 0.02 = 2 % per year */
  degradation: Decimal;
  /** Number of years for the analysis */
  years: number;
}

export interface ROIOutputs {
  /** Annual net benefit after costs (SEK) */
  annual_net_sek: Decimal;
  /** Simple payback period in years, or null if not achievable */
  payback: Decimal | null;
  /** Net present value over the specified years (SEK) */
  npv: Decimal;
  /** Internal rate of return (as a fraction, e.g. 0.2 for 20 %) */
  irr: Decimal | null;
  /** Detailed components of the calculation */
  details: {
    pv_savings: Decimal;
    demand_savings: Decimal;
    arbitrage_savings: Decimal;
    o_and_m: Decimal;
    net_investment: Decimal;
  };
}

/**
 * Calculate battery ROI metrics. This implementation follows the rules described in
 * the project specification: PV savings, demand (peak‑shaving) savings, arbitrage
 * gains, annual O&M cost, net investment after support, simple payback period,
 * net present value (NPV) and internal rate of return (IRR). All arithmetic
 * uses Decimal.js to avoid floating point error accumulation.
 */
export function calculateBatteryROI(inputs: ROIInputs): ROIOutputs {
  const {
    capex_cogs,
    grant_pct,
    capacity_kwh,
    inverter_kw,
    dod,
    efficiency,
    pv_cycles_per_year,
    arbitrage_cycles_per_year,
    annual_pv_kwh,
    purchase_price_sek_per_kwh,
    demand_price_sek_per_kw_month,
    monthly_peaks_kw,
    spread_sek_per_kwh,
    o_and_m,
    wacc,
    degradation,
    years,
  } = inputs;

  // Usable energy per cycle (kWh)
  const usable = capacity_kwh.mul(dod).mul(efficiency);

  // PV savings: energy arbitrated from PV production up to export capability.
  // PV energy that can be used by the battery per year.
  const pv_energy_per_year = usable.mul(pv_cycles_per_year);
  const pv_energy_capped = Decimal.min(pv_energy_per_year, annual_pv_kwh);
  const pv_savings = pv_energy_capped.mul(purchase_price_sek_per_kwh);

  // Demand (peak‑shaving) savings: sum over 12 months, capping at 0.6×inverter power.
  const cap_kw = inverter_kw.mul(new Decimal(0.6));
  let demand_savings = new Decimal(0);
  for (const peak of monthly_peaks_kw) {
    const shaved_kw = Decimal.min(peak, cap_kw);
    demand_savings = demand_savings.plus(shaved_kw.mul(demand_price_sek_per_kw_month));
  }

  // Arbitrage savings: usable energy × number of cycles × price spread.
  const arbitrage_savings = usable.mul(arbitrage_cycles_per_year).mul(spread_sek_per_kwh);

  // Annual net benefit (before discounting and degradation)
  const annual_net = pv_savings.plus(demand_savings).plus(arbitrage_savings).minus(o_and_m);

  // Net investment after support.
  const net_investment = capex_cogs.mul(new Decimal(1).minus(grant_pct));

  // Simple payback period: net investment divided by annual net benefit. If annual
  // net is ≤ 0 then payback is unattainable.
  let payback: Decimal | null = null;
  if (annual_net.gt(0)) {
    payback = net_investment.div(annual_net);
  }

  // Compute cash flows for each year considering degradation and discounting.
  let npv = new Decimal(0);
  const cashFlows: Decimal[] = [];
  for (let year = 1; year <= years; year++) {
    // Degraded annual net: degrade each year multiplicatively
    const degraded_factor = new Decimal(1).minus(degradation).pow(year - 1);
    const degraded_net = annual_net.mul(degraded_factor);
    // Discount factor
    const discount_factor = new Decimal(1).plus(wacc).pow(-year);
    const discounted_net = degraded_net.mul(discount_factor);
    cashFlows.push(discounted_net);
    npv = npv.plus(discounted_net);
  }
  // Subtract initial investment from NPV
  npv = npv.minus(net_investment);

  // Estimate IRR via iterative method (internal rate where NPV equals zero)
  // Using Newton–Raphson on IRR; fallback to null if not convergent.
  let irr: Decimal | null = null;
  try {
    let guess = new Decimal(0.1); // initial guess 10 %
    for (let i = 0; i < 50; i++) {
      // Calculate NPV and derivative at current guess
      let f = new Decimal(-net_investment);
      let fPrime = new Decimal(0);
      const one = new Decimal(1);
      for (let year = 1; year <= years; year++) {
        const cf = cashFlows[year - 1].mul(one.plus(wacc).pow(year)).div(net_investment.plus(0));
        // Equivalent cash flow at constant annual_net, degrade accounted earlier.
      }
      // For IRR we need cash flows including the investment as negative at year 0.
      let npvGuess = new Decimal(-net_investment);
      let derivative = new Decimal(0);
      for (let year = 1; year <= years; year++) {
        const cf = annual_net.mul(new Decimal(1).minus(degradation).pow(year - 1));
        const df = new Decimal(1).plus(guess).pow(year);
        npvGuess = npvGuess.plus(cf.div(df));
        derivative = derivative.minus(cf.mul(new Decimal(year)).div(df.pow(2)).mul(new Decimal(1)));
      }
      // Newton update
      const newGuess = guess.minus(npvGuess.div(derivative));
      if (newGuess.minus(guess).abs().lt(1e-6)) {
        irr = newGuess;
        break;
      }
      guess = newGuess;
    }
    // Bound IRR to reasonable range if converged
    if (irr && irr.gt(-1) && irr.lt(10)) {
      // ok
    } else {
      irr = null;
    }
  } catch {
    irr = null;
  }

  return {
    annual_net_sek: annual_net,
    payback,
    npv,
    irr,
    details: {
      pv_savings,
      demand_savings,
      arbitrage_savings,
      o_and_m: o_and_m.clone(),
      net_investment,
    },
  };
}
