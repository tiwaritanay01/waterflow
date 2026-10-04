const fs = require('fs');
let content = fs.readFileSync('backend/db_adapters.js', 'utf8');

const target = 'await client.query(\n      UPDATE tankers \n      SET status = \\, assigned_ward = \\, current_load = \\, eta_minutes = \\\n      WHERE tanker_id = \\\n    , \\[tanker.transponder_id, "en_route", ward.ward_number, tanker.current_load, tanker.eta_minutes\\]);';

const replacement = const res = await client.query(\
      UPDATE tankers 
      SET status = , assigned_ward = , current_load = , eta_minutes = 
      WHERE tanker_id =  AND status = 'available'
    \, [tanker.transponder_id, "en_route", ward.ward_number, tanker.current_load, tanker.eta_minutes]);
    if (res.rowCount === 0) {
      throw new Error("Concurrency Error: Tanker is no longer available.");
    };

content = content.replace(new RegExp(target), replacement);
fs.writeFileSync('backend/db_adapters.js', content, 'utf8');
console.log('Fixed concurrency issue');
