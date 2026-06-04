const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    const s = await db.get(`SELECT * FROM fire_settings WHERE user_id=$1`, [req.user.id]);
    if (!s) return res.json({ settings: {}, projections: {} });
    res.json({ settings: s, projections: calcFIRE(s) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const existing = await db.get(`SELECT id FROM fire_settings WHERE user_id=$1`, [req.user.id]);
    if (existing) {
      await db.run(
        `UPDATE fire_settings SET current_age=$1, target_retirement_age=$2, annual_expenses=$3,
         current_portfolio=$4, monthly_contribution=$5, expected_return=$6, swr=$7, fire_variant=$8, updated_at=NOW()
         WHERE user_id=$9`,
        [+f.current_age||30, +f.target_retirement_age||55, +f.annual_expenses||60000,
         +f.current_portfolio||0, +f.monthly_contribution||2000, +f.expected_return||0.07,
         +f.swr||0.04, f.fire_variant||'standard', req.user.id]
      );
    } else {
      await db.run(
        `INSERT INTO fire_settings (id, user_id, current_age, target_retirement_age, annual_expenses, current_portfolio, monthly_contribution, expected_return, swr, fire_variant)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uuidv4(), req.user.id, +f.current_age||30, +f.target_retirement_age||55, +f.annual_expenses||60000,
         +f.current_portfolio||0, +f.monthly_contribution||2000, +f.expected_return||0.07, +f.swr||0.04, f.fire_variant||'standard']
      );
    }
    const s = await db.get(`SELECT * FROM fire_settings WHERE user_id=$1`, [req.user.id]);
    res.json({ settings: s, projections: calcFIRE(s) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function calcFIRE(s) {
  const current_age = +s.current_age||30, annual_expenses = +s.annual_expenses||60000;
  const current_portfolio = +s.current_portfolio||0, monthly_contribution = +s.monthly_contribution||2000;
  const expected_return = +s.expected_return||0.07, swr = +s.swr||0.04;
  const fire_variant = s.fire_variant||'standard';
  const swrMap = { standard: swr, lean: 0.035, coast: swr, 'fat-fire': 0.03 };
  const expMult = fire_variant==='lean'?0.7:fire_variant==='fat-fire'?1.5:1.0;
  const effectiveSWR = swrMap[fire_variant]||swr;
  const targetExpenses = annual_expenses*expMult;
  const fireNumber = targetExpenses/effectiveSWR;
  const r = expected_return/12;
  let months=0, portfolio=current_portfolio;
  while(portfolio<fireNumber && months<600){ portfolio=portfolio*(1+r)+monthly_contribution; months++; }
  const fireAge=Math.round(current_age+months/12);
  const yearsToFIRE=Math.round(months/12*10)/10;
  const progressPct=Math.min(100,Math.round((current_portfolio/fireNumber)*1000)/10);
  const coastFIRE=fireNumber/Math.pow(1+expected_return,65-current_age);
  const sensitivityTable=[0.5,0.75,1,1.25,1.5,2].map(mult=>{
    const pmt=monthly_contribution*mult; let m=0,p=current_portfolio;
    while(p<fireNumber&&m<600){p=p*(1+r)+pmt;m++;}
    return{contribution:Math.round(pmt),years:Math.round(m/12*10)/10,age:Math.round(current_age+m/12)};
  });
  const swrRange=[0.035,0.04,0.045].map(rate=>({rate:`${(rate*100).toFixed(1)}%`,fire_number:Math.round(targetExpenses/rate)}));
  const growthTimeline=[];let p2=current_portfolio;
  for(let i=0;i<=Math.min(yearsToFIRE+5,40);i++){growthTimeline.push({year:current_age+i,value:Math.round(p2)});p2=p2*(1+expected_return)+monthly_contribution*12;}
  return{fire_number:Math.round(fireNumber),target_expenses:Math.round(targetExpenses),fire_age:fireAge,years_to_fire:yearsToFIRE,progress_pct:progressPct,coast_fire:Math.round(coastFIRE),sensitivity_table:sensitivityTable,swr_range:swrRange,growth_timeline:growthTimeline};
}

module.exports = router;
module.exports.calcFIRE = calcFIRE;
