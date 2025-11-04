# Battery ROI App

This repository contains a simplified reference implementation of the battery
ROI engine and quote generator used by Solceller Syd AB. It provides
TypeScript code for calculating return on investment for a battery
installation, a sanity-check helper to verify UI results, and a
demonstration component that shows how to wire the calculation into a React
application. A simple PDF generator for creating customer quotes is also
included.

## Features

* **ROI calculation** – Implements the rules defined in the specification:
  usable energy, PV savings with priority, demand peak-shaving, arbitrage,
  annual O&M, degradation, discounted cash flows, NPV and simple payback.
* **Sanity check** – A helper that compares actual UI results against
  expected values within set tolerances.
* **PDF generation** – Uses `pdf-lib` to produce a basic quote document
  summarising ROI results. You can customise the layout and embed your own
  logo and appendix text.
* **React demo** – A minimal component demonstrates how the ROI engine and
  sanity-check helper could be used in a front-end.

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Build the TypeScript sources:

   ```sh
   npm run build
   ```

3. Run the demonstration (this will simply build the code; you need to
   integrate the functions into your app or write your own entry point).

## Structure

```
battery-roi-app
├── package.json        # Project manifest with dependencies
├── tsconfig.json       # TypeScript compiler configuration
├── README.md           # This file
├── src/
│   ├── lib/
│   │   ├── roi-calculator.ts  # Core ROI calculation logic
│   │   ├── roi-sanity.ts      # Sanity-check helper
│   │   └── pdf-generator.ts   # Offer PDF generator
│   └── pages/
│       └── BatteryROIResults.tsx  # Demo React component
└── public/
    └── logo.svg         # Placeholder for your logo
```

## Customising

* Replace `public/logo.svg` with your company logo. You can embed it in PDFs
  using `pdf-lib` in `pdf-generator.ts`.
* Provide the actual Lantbruk appendix text to `generateBatteryQuotePdf` via
  the `appendixText` parameter.
* Use your own UI and state management to feed real project data into the
  ROI calculation and sanity check.

## Disclaimer

This repository is a reference implementation intended to demonstrate how
the ROI logic could be structured in code. It is not a drop-in replacement
for the production Lovable app. You should adapt, extend and test it
according to your own requirements and quality standards.
