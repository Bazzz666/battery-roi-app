import Decimal from "decimal.js";
import { calculateBatteryROI, ROIInputs } from "./roi-calculator";

export interface SanityResult {
  pass: boolean;
  deltas: Record<string, number>;
  expected: Record<string, number>;
  actual: Record<string, number>;
  note: string;
}

/**
 * Run a sanity check against the ROI engine. Given user inputs and the actual
 * annual net and payback shown in the UI, compute the expected values using
 * the same calculation routine and compare them within defined tolerances.
 *
 * Tolerances:
 *  - ±10 % or ±5 000 SEK on annual net benefit (whichever is greater)
 *  - ±0.25 years on simple payback period
 */
export function runSanityCheck(
  inputs: ROIInputs,
  actualAnnualNet: number,
  actualPayback: number
): SanityResult {
  const res = calculateBatteryROI(inputs);
  const expAnnual = res.annual_net_sek.toNumber();
  const expPayback = res.payback ? res.payback.toNumber() : NaN;

  const tolAnnual = Math.max(5000, expAnnual * 0.10);
  const tolPayback = 0.25;

  const deltaAnnual = Math.abs(actualAnnualNet - expAnnual);
  const deltaPayback = Math.abs(actualPayback - expPayback);

  const pass = deltaAnnual <= tolAnnual && deltaPayback <= tolPayback;
  return {
    pass,
    deltas: { annual: deltaAnnual, payback: deltaPayback },
    expected: { annual: expAnnual, payback: expPayback },
    actual: { annual: actualAnnualNet, payback: actualPayback },
    note: pass
      ? "OK"
      : "Avvikelser över tolerans – kontrollera pris, peaks och exportcap.",
  };
}
