/**
 * Target Seed 42 Priority Consistency Check Script
 * Validates mathematical score conservation invariant for Seed 42 baseline wards.
 */
(async () => {
  const server = require('../backend/server.js');
  const wards = await server.getWards();

  console.log('========================================================');
  console.log('Priority consistency check (Seed 42 Baseline)');
  console.log('========================================================');

  const targetWards = [
    { code: 'M/E', label: 'Ward M/E (Govandi / Mankhurd)' },
    { code: 'L',   label: 'Ward L (Kurla)' },
    { code: 'P/N', label: 'Ward P/N (Malad)' }
  ];

  let allPassed = true;

  for (const tw of targetWards) {
    const ward = wards.find(w => (w.ward_code === tw.code || w.name.includes(tw.code) || (tw.code === 'M/E' && w.name.includes('Govandi')) || (tw.code === 'L' && w.name.includes('Kurla')) || (tw.code === 'P/N' && w.name.includes('Malad'))));
    if (!ward) continue;

    const p = server.computePriorityLocal(ward);
    const sumContrib = p.priority_factors.reduce((acc, f) => acc + f.weighted_contribution, 0);
    const diff = Math.abs(p.total_score - sumContrib);
    const pass = diff < 0.01;
    if (!pass) allPassed = false;

    console.log(`\nWard:              ${tw.label}`);
    console.log(`Score:              ${p.total_score.toFixed(2)}`);
    console.log(`Contribution sum:   ${sumContrib.toFixed(2)}`);
    console.log(`Difference:         ${diff.toFixed(2)}`);
    console.log(`Result:              ${pass ? 'PASS' : 'FAIL'}`);
    console.log('Factors:');
    p.priority_factors.forEach(f => {
      console.log(`  - ${f.factor_name.padEnd(28)} : +${f.weighted_contribution.toFixed(1).padStart(5)} pts (weight ${f.weight.toFixed(2)}, raw ${f.raw_value})`);
    });
  }

  console.log('\n========================================================');
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL PASS (CONSERVATION INVARIANT HOLDS)' : 'FAIL'}`);
  console.log('========================================================\n');

  if (!allPassed) process.exit(1);
  process.exit(0);
})();
