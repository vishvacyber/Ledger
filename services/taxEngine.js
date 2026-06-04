// 2024 IRS Tax Engine — 7 federal brackets + all 50 states + DC

const FEDERAL_BRACKETS = {
  single: [
    { min: 0,       max: 11600,   rate: 0.10 },
    { min: 11600,   max: 47150,   rate: 0.12 },
    { min: 47150,   max: 100525,  rate: 0.22 },
    { min: 100525,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243725,  rate: 0.32 },
    { min: 243725,  max: 609350,  rate: 0.35 },
    { min: 609350,  max: Infinity, rate: 0.37 },
  ],
  married_joint: [
    { min: 0,       max: 23200,   rate: 0.10 },
    { min: 23200,   max: 94300,   rate: 0.12 },
    { min: 94300,   max: 201050,  rate: 0.22 },
    { min: 201050,  max: 383900,  rate: 0.24 },
    { min: 383900,  max: 487450,  rate: 0.32 },
    { min: 487450,  max: 731200,  rate: 0.35 },
    { min: 731200,  max: Infinity, rate: 0.37 },
  ],
  married_separate: [
    { min: 0,       max: 11600,   rate: 0.10 },
    { min: 11600,   max: 47150,   rate: 0.12 },
    { min: 47150,   max: 100525,  rate: 0.22 },
    { min: 100525,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243725,  rate: 0.32 },
    { min: 243725,  max: 365600,  rate: 0.35 },
    { min: 365600,  max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0,       max: 16550,   rate: 0.10 },
    { min: 16550,   max: 63100,   rate: 0.12 },
    { min: 63100,   max: 100500,  rate: 0.22 },
    { min: 100500,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243700,  rate: 0.32 },
    { min: 243700,  max: 609350,  rate: 0.35 },
    { min: 609350,  max: Infinity, rate: 0.37 },
  ],
};

const STANDARD_DEDUCTION = {
  single: 14600,
  married_joint: 29200,
  married_separate: 14600,
  head_of_household: 21900,
};

// State flat/graduated rates (2024 estimates)
const STATE_RATES = {
  AL: { type: 'graduated', brackets: [[0,500,0.02],[500,3000,0.04],[3000,Infinity,0.05]] },
  AK: { type: 'none', rate: 0 },
  AZ: { type: 'flat', rate: 0.025 },
  AR: { type: 'graduated', brackets: [[0,4300,0.02],[4300,8500,0.04],[8500,Infinity,0.047]] },
  CA: { type: 'graduated', brackets: [[0,10099,0.01],[10099,23942,0.02],[23942,37788,0.04],[37788,52455,0.06],[52455,66295,0.08],[66295,338639,0.093],[338639,406364,0.103],[406364,677275,0.113],[677275,1000000,0.123],[1000000,Infinity,0.133]] },
  CO: { type: 'flat', rate: 0.044 },
  CT: { type: 'graduated', brackets: [[0,10000,0.03],[10000,50000,0.05],[50000,100000,0.055],[100000,200000,0.06],[200000,250000,0.065],[250000,500000,0.069],[500000,Infinity,0.0699]] },
  DE: { type: 'graduated', brackets: [[0,2000,0],[2000,5000,0.022],[5000,10000,0.039],[10000,20000,0.048],[20000,25000,0.052],[25000,60000,0.055],[60000,Infinity,0.066]] },
  FL: { type: 'none', rate: 0 },
  GA: { type: 'flat', rate: 0.055 },
  HI: { type: 'graduated', brackets: [[0,2400,0.014],[2400,4800,0.032],[4800,9600,0.055],[9600,14400,0.064],[14400,19200,0.068],[19200,24000,0.072],[24000,36000,0.076],[36000,48000,0.079],[48000,150000,0.0825],[150000,175000,0.09],[175000,200000,0.10],[200000,Infinity,0.11]] },
  ID: { type: 'flat', rate: 0.058 },
  IL: { type: 'flat', rate: 0.0495 },
  IN: { type: 'flat', rate: 0.0305 },
  IA: { type: 'flat', rate: 0.057 },
  KS: { type: 'graduated', brackets: [[0,15000,0.031],[15000,30000,0.0525],[30000,Infinity,0.057]] },
  KY: { type: 'flat', rate: 0.045 },
  LA: { type: 'graduated', brackets: [[0,12500,0.0185],[12500,50000,0.035],[50000,Infinity,0.0425]] },
  ME: { type: 'graduated', brackets: [[0,24500,0.058],[24500,58050,0.0675],[58050,Infinity,0.0715]] },
  MD: { type: 'graduated', brackets: [[0,1000,0.02],[1000,2000,0.03],[2000,3000,0.04],[3000,100000,0.0475],[100000,125000,0.05],[125000,150000,0.0525],[150000,250000,0.055],[250000,Infinity,0.0575]] },
  MA: { type: 'flat', rate: 0.09 },
  MI: { type: 'flat', rate: 0.0425 },
  MN: { type: 'graduated', brackets: [[0,30070,0.0535],[30070,98760,0.068],[98760,183340,0.0785],[183340,Infinity,0.0985]] },
  MS: { type: 'graduated', brackets: [[0,10000,0],[10000,Infinity,0.047]] },
  MO: { type: 'graduated', brackets: [[0,1121,0],[1121,2242,0.015],[2242,3363,0.02],[3363,4484,0.025],[4484,5605,0.03],[5605,6726,0.035],[6726,7847,0.04],[7847,8968,0.045],[8968,Infinity,0.049]] },
  MT: { type: 'graduated', brackets: [[0,3600,0.01],[3600,6300,0.02],[6300,9700,0.03],[9700,13000,0.04],[13000,16800,0.05],[16800,21600,0.06],[21600,Infinity,0.069]] },
  NE: { type: 'graduated', brackets: [[0,3700,0.0246],[3700,22170,0.0351],[22170,35730,0.0501],[35730,Infinity,0.0664]] },
  NV: { type: 'none', rate: 0 },
  NH: { type: 'none', rate: 0 },
  NJ: { type: 'graduated', brackets: [[0,20000,0.014],[20000,35000,0.0175],[35000,40000,0.035],[40000,75000,0.05525],[75000,500000,0.0637],[500000,1000000,0.0897],[1000000,Infinity,0.1075]] },
  NM: { type: 'graduated', brackets: [[0,5500,0.017],[5500,11000,0.032],[11000,16000,0.047],[16000,210000,0.049],[210000,Infinity,0.059]] },
  NY: { type: 'graduated', brackets: [[0,17150,0.04],[17150,23600,0.045],[23600,27900,0.0525],[27900,161550,0.055],[161550,323200,0.06],[323200,2155350,0.0685],[2155350,5000000,0.0965],[5000000,25000000,0.103],[25000000,Infinity,0.109]] },
  NC: { type: 'flat', rate: 0.0450 },
  ND: { type: 'graduated', brackets: [[0,44725,0.01],[44725,225975,0.0204],[225975,Infinity,0.029]] },
  OH: { type: 'graduated', brackets: [[0,26050,0],[26050,100000,0.0275],[100000,Infinity,0.035]] },
  OK: { type: 'graduated', brackets: [[0,1000,0.0025],[1000,2500,0.0075],[2500,3750,0.0175],[3750,4900,0.0275],[4900,7200,0.0375],[7200,Infinity,0.0475]] },
  OR: { type: 'graduated', brackets: [[0,4050,0.0475],[4050,10200,0.0675],[10200,125000,0.0875],[125000,Infinity,0.099]] },
  PA: { type: 'flat', rate: 0.0307 },
  RI: { type: 'graduated', brackets: [[0,73450,0.0375],[73450,166950,0.0475],[166950,Infinity,0.0599]] },
  SC: { type: 'graduated', brackets: [[0,3200,0],[3200,16040,0.03],[16040,Infinity,0.064]] },
  SD: { type: 'none', rate: 0 },
  TN: { type: 'none', rate: 0 },
  TX: { type: 'none', rate: 0 },
  UT: { type: 'flat', rate: 0.0485 },
  VT: { type: 'graduated', brackets: [[0,45400,0.0335],[45400,110050,0.066],[110050,229550,0.076],[229550,Infinity,0.0875]] },
  VA: { type: 'graduated', brackets: [[0,3000,0.02],[3000,5000,0.03],[5000,17000,0.05],[17000,Infinity,0.0575]] },
  WA: { type: 'none', rate: 0 },
  WV: { type: 'graduated', brackets: [[0,10000,0.03],[10000,25000,0.04],[25000,40000,0.045],[40000,60000,0.06],[60000,Infinity,0.065]] },
  WI: { type: 'graduated', brackets: [[0,13810,0.035],[13810,27630,0.044],[27630,304170,0.053],[304170,Infinity,0.0765]] },
  WY: { type: 'none', rate: 0 },
  DC: { type: 'graduated', brackets: [[0,10000,0.04],[10000,40000,0.06],[40000,60000,0.065],[60000,250000,0.085],[250000,500000,0.0925],[500000,1000000,0.0975],[1000000,Infinity,0.1075]] },
};

function calcBrackets(income, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max ?? b[1] ?? Infinity) - (b.min ?? b[0] ?? 0);
    tax += taxable * (b.rate ?? b[2] ?? 0);
  }
  return tax;
}

function calcFederal(taxableIncome, filingStatus) {
  const brackets = FEDERAL_BRACKETS[filingStatus] || FEDERAL_BRACKETS.single;
  return calcBrackets(taxableIncome, brackets);
}

function calcState(taxableIncome, state) {
  const s = STATE_RATES[state];
  if (!s || s.type === 'none') return 0;
  if (s.type === 'flat') return taxableIncome * s.rate;
  // graduated — brackets stored as [min, max, rate]
  let tax = 0;
  for (const [min, max, rate] of s.brackets) {
    if (taxableIncome <= min) break;
    tax += (Math.min(taxableIncome, max) - min) * rate;
  }
  return tax;
}

function computeTax(settings) {
  const {
    gross_salary = 0,
    pay_period = 'biweekly',
    filing_status = 'single',
    state = 'CA',
    fica_exempt = false,
    pretax_401k = 0,
    pretax_hsa = 0,
    pretax_fsa = 0,
  } = settings;

  const gross = parseFloat(gross_salary) || 0;
  const p401k = Math.min(parseFloat(pretax_401k) || 0, 23000); // 2024 limit
  const phsa  = Math.min(parseFloat(pretax_hsa)  || 0, 4150);
  const pfsa  = Math.min(parseFloat(pretax_fsa)  || 0, 3200);
  const preTaxDeductions = p401k + phsa + pfsa;

  const stdDeduction = STANDARD_DEDUCTION[filing_status] || STANDARD_DEDUCTION.single;
  const agiForFederal = Math.max(0, gross - preTaxDeductions);
  const federalTaxable = Math.max(0, agiForFederal - stdDeduction);

  const federalTax = calcFederal(federalTaxable, filing_status);
  const stateTax   = calcState(agiForFederal, state.toUpperCase());

  // FICA 2024: SS 6.2% up to $168,600 wage base; Medicare 1.45% + 0.9% over $200k
  let ficaTax = 0;
  if (!fica_exempt) {
    const ssWage = Math.min(gross, 168600);
    ficaTax = ssWage * 0.062;
    ficaTax += gross * 0.0145;
    if (gross > 200000) ficaTax += (gross - 200000) * 0.009;
  }

  const totalAnnualTax = federalTax + stateTax + ficaTax;
  const netAnnual = gross - preTaxDeductions - totalAnnualTax;

  const periodsMap = {
    weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, annual: 1,
  };
  const periods = periodsMap[pay_period] || 26;

  const effectiveRate = gross > 0 ? totalAnnualTax / gross : 0;
  const marginalRate = getMarginalRate(federalTaxable, filing_status);

  return {
    gross_annual: round2(gross),
    pretax_deductions: round2(preTaxDeductions),
    agi: round2(agiForFederal),
    federal_taxable: round2(federalTaxable),
    federal_tax: round2(federalTax),
    state_tax: round2(stateTax),
    fica_tax: round2(ficaTax),
    total_tax: round2(totalAnnualTax),
    net_annual: round2(netAnnual),
    net_per_period: round2(netAnnual / periods),
    effective_rate: round4(effectiveRate),
    marginal_rate: marginalRate,
    // breakdown for donut
    breakdown: {
      federal: round2(federalTax),
      state: round2(stateTax),
      fica: round2(ficaTax),
      pretax_deductions: round2(preTaxDeductions),
      net_take_home: round2(netAnnual),
    },
  };
}

function getMarginalRate(taxable, filingStatus) {
  const brackets = FEDERAL_BRACKETS[filingStatus] || FEDERAL_BRACKETS.single;
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxable > brackets[i].min) return brackets[i].rate;
  }
  return brackets[0].rate;
}

function round2(n) { return Math.round((n || 0) * 100) / 100; }
function round4(n) { return Math.round((n || 0) * 10000) / 10000; }

module.exports = { computeTax, STATE_RATES, FEDERAL_BRACKETS };
