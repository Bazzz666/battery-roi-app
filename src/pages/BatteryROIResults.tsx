import React from "react";
import Decimal from "decimal.js";
import { runSanityCheck } from "../lib/roi-sanity";
import { calculateBatteryROI } from "../lib/roi-calculator";

/**
 * A simplified React component representing a result page for the battery ROI
 * calculator. It demonstrates how to run the sanity check in response to
 * user interaction. In a real application this component would receive the
 * project data and actual ROI results via props or context.
 */
export const BatteryROIResults: React.FC = () => {
  // Fake project data used to illustrate the call. These values should be
  // supplied from your application state.
  const inputs = {
    capex_cogs: new Decimal(1264000),
    price_ex_vat: new Decimal(0),
    grant_pct: new Decimal(0.65),
    capacity_kwh: new Decimal(261),
    inverter_kw: new Decimal(125),
    dod: new Decimal(0.9),
    efficiency: new Decimal(0.92),
    pv_cycles_per_year: new Decimal(220),
    arbitrage_cycles_per_year: new Decimal(80),
    annual_pv_kwh: new Decimal(38726),
    purchase_price_sek_per_kwh: new Decimal(1.56),
    demand_price_sek_per_kw_month: new Decimal(114.8),
    monthly_peaks_kw: Array(12).fill(new Decimal(75)),
    spread_sek_per_kwh: new Decimal(0.30),
    o_and_m: new Decimal(5220),
    wacc: new Decimal(0.08),
    degradation: new Decimal(0.02),
    years: 12,
  };

  // Compute ROI once for demonstration purposes.
  const roi = calculateBatteryROI(inputs);
  const actualAnnualNet = roi.annual_net_sek.toNumber();
  const actualPayback = roi.payback ? roi.payback.toNumber() : NaN;

  const handleSanityCheck = () => {
    const result = runSanityCheck(inputs, actualAnnualNet, actualPayback);
    // Here we simply log the result. In a real application you might show
    // a toast or notification. For example, using `sonner`:
    // toast(result.pass ? "Sanity-check: PASS" : "Sanity-check: FAIL", {
    //   description: `Årlig diff: ${Math.round(result.deltas.annual)} kr, Payback diff: ${result.deltas.payback.toFixed(2)} år`,
    // });
    console.log(result);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Battery ROI Results</h1>
      <p>Årlig besparing: {actualAnnualNet.toFixed(0)} kr</p>
      <p>Återbetalningstid: {actualPayback.toFixed(2)} år</p>
      <button onClick={handleSanityCheck}>Kör sanity-check</button>
    </div>
  );
};

export default BatteryROIResults;
