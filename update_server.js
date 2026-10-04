const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

function replaceFallback(method) {
  const regex = new RegExp(`(async function ${method}\\(\\) \\{[\\s\\S]*?catch \\(e\\) \\{)([\\s\\S]*?)(console\\.log\\("⚠️  DB query failed, using state fallback:", e\\.message\\);\\s*\\}\\s*\\}\\s*)`, 'g');
  content = content.replace(regex, (match, p1, p2, p3) => {
    return p1 + '\n      if (process.env.APP_MODE === "PRODUCTION") { throw new Error("503 DATABASE_UNAVAILABLE: " + e.message); }\n' + p2 + p3;
  });
  
  const endRegex = new RegExp(`(async function ${method}\\(\\) \\{[\\s\\S]*?\\}\\s*\\}\\s*)(return \\w+State;\\s*\\})`, 'g');
  content = content.replace(endRegex, (match, p1, p2) => {
    return p1 + '  if (process.env.APP_MODE === "PRODUCTION") { throw new Error("503 DATABASE_UNAVAILABLE"); }\n  ' + p2;
  });
}

replaceFallback('getWards');
replaceFallback('getTankers');
replaceFallback('getDepots');

// Rewrite getAlerts
const getAlertsRegex = /async function getAlerts\(\) \{[\s\S]*?return alertsState;\s*\}/;
const getAlertsNew = `async function getAlerts() {
  const wards = await getWards();
  const alerts = [];
  let id = 1;
  for (const w of wards) {
    if (w.dry_pipe_hours >= 48) {
      alerts.push({
        id: id++,
        title: \`Ward \${w.ward_number || w.ward_code || w.ward_id} - Severe Deficit Surge\`,
        description: \`\${w.name} pipe dry for \${w.dry_pipe_hours}h; urgent intervention required.\`,
        severity: "critical",
        ward_number: w.ward_number || w.ward_code || w.ward_id,
        badge_text: \`\${w.dry_pipe_hours}h Dry\`
      });
    } else if (w.vulnerability_index > 0.8) {
      alerts.push({
        id: id++,
        title: \`Ward \${w.ward_number || w.ward_code || w.ward_id} - High Vulnerability\`,
        description: \`\${w.name} shows high vulnerability index (\${w.vulnerability_index}).\`,
        severity: "warning",
        ward_number: w.ward_number || w.ward_code || w.ward_id,
        badge_text: \`Vuln \${(w.vulnerability_index * 100).toFixed(0)}%\`
      });
    }
  }
  return alerts;
}`;
content = content.replace(getAlertsRegex, getAlertsNew);

fs.writeFileSync('backend/server.js', content, 'utf8');
console.log('Updated server.js fallbacks and getAlerts');
