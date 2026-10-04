const { pool, getDbAvailable } = require("./db.js");

// These functions will execute SQL transactions when db is available.
// If db is not available, they will rely on the caller updating the in-memory array.

function enforceDbForProduction() {
  if (!getDbAvailable() && process.env.APP_MODE !== "DEMO") {
    const err = new Error("503 DATABASE_UNAVAILABLE");
    err.statusCode = 503;
    throw err;
  }
}

async function executeDispatchTransaction(tanker, ward, mission, decisionRecord, govDecision, auditRecord) {
  enforceDbForProduction();
  if (!getDbAvailable()) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update Tanker
    await client.query(`
      UPDATE tankers 
      SET status = $2, assigned_ward = $3, current_load = $4, eta_minutes = $5
      WHERE tanker_id = $1
    `, [tanker.transponder_id, "en_route", ward.ward_number, tanker.current_load, tanker.eta_minutes]);
    
    // Save Mission
    await client.query(`
      INSERT INTO missions (mission_id, ward_id, tanker_id, volume_liters, status, priority_tier, version)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (mission_id) DO UPDATE 
      SET status = EXCLUDED.status, version = EXCLUDED.version, updated_at = NOW()
    `, [mission.id, mission.ward_code, mission.tanker_id, mission.target_liters, mission.status, mission.priority_tier || 1, mission.version || 1]);
    
    // Save Decision
    const tierInt = typeof decisionRecord.governance_tier === 'string' ? parseInt(decisionRecord.governance_tier.match(/\d+/)?.[0] || "1") : (decisionRecord.governance_tier || 1);
    await client.query(`
      INSERT INTO operational_decisions (decision_id, ward_id, tanker_id, priority_score, tier, status, decision_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (decision_id) DO NOTHING
    `, [decisionRecord.decision_id, decisionRecord.ward_code, decisionRecord.tanker_id, decisionRecord.priority_score, tierInt, "EXECUTED", JSON.stringify(decisionRecord)]);
    
    // Save Gov Decision
    await client.query(`
      INSERT INTO governance_decisions (decision_id, status, action, ward_id, reason, tier)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (decision_id) DO NOTHING
    `, [govDecision.decision_id, govDecision.status, govDecision.decision_type, govDecision.ward_code, govDecision.justification, govDecision.governance_tier]);
    
    // Save Audit
    await client.query(`
      INSERT INTO governance_audit_log (event, decision_id, ward_id, action, actor, auth_mode, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [auditRecord.action, auditRecord.decision_id, auditRecord.ward_code, auditRecord.action, auditRecord.officer_name, auditRecord.pin_used ? "PIN" : "NONE", JSON.stringify(auditRecord)]);
    
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function executeVerificationTransaction(missionId, qty, ward_code, tanker_id, opId, payload) {
  enforceDbForProduction();
  if (!getDbAvailable()) return true;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check operation idempotency
    const opCheck = await client.query(`
      INSERT INTO field_operations (operation_id, mission_id, action, payload)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (operation_id) DO NOTHING
      RETURNING operation_id
    `, [opId, missionId, "VERIFY", JSON.stringify(payload)]);
    
    if (opCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return false; // duplicate
    }
    
    // Update Mission
    await client.query(`
      UPDATE missions 
      SET status = 'VERIFIED', version = version + 1, updated_at = NOW()
      WHERE mission_id = $1
    `, [missionId]);
    
    // Update Ward Deficit
    await client.query(`
      UPDATE wards 
      SET demand_liters = GREATEST(0, demand_liters - $2),
          water_deficit_pct = GREATEST(0, ((demand_liters - $2)::float / (demand_liters + 1)) * 100)
      WHERE ward_id = $1 OR ward_code = $1
    `, [ward_code, qty]);
    
    // Update Tanker
    await client.query(`
      UPDATE tankers 
      SET status = 'available', current_load = 0, assigned_ward = NULL
      WHERE tanker_id = $1
    `, [tanker_id]);
    
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}


async function saveMission(mission) {
  enforceDbForProduction();
  if (!getDbAvailable()) return;
  await pool.query(`
    INSERT INTO missions (mission_id, ward_id, tanker_id, volume_liters, status, priority_tier, version)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (mission_id) DO UPDATE 
    SET status = EXCLUDED.status, version = EXCLUDED.version, updated_at = NOW()
  `, [mission.id, mission.ward_code, mission.tanker_id, mission.target_liters, mission.status, mission.priority_tier || 1, mission.version || 1]);
}

async function updateTankerStatus(tanker_id, status, assigned_ward, current_load, eta_minutes = null) {
  enforceDbForProduction();
  if (!getDbAvailable()) return;
  await pool.query(`
    UPDATE tankers 
    SET status = $2, assigned_ward = $3, current_load = $4, eta_minutes = $5
    WHERE tanker_id = $1
  `, [tanker_id, status, assigned_ward, current_load, eta_minutes]);
}

async function saveGovernanceDecision(govDecision) {
  enforceDbForProduction();
  if (!getDbAvailable()) return;
  await pool.query(`
    INSERT INTO governance_decisions (decision_id, status, action, ward_id, reason, tier)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (decision_id) DO UPDATE SET status = EXCLUDED.status
  `, [govDecision.decision_id, govDecision.status, govDecision.action || govDecision.decision_type, govDecision.ward_code, govDecision.justification, govDecision.governance_tier]);
}

async function saveAuditLog(auditRecord) {
  enforceDbForProduction();
  if (!getDbAvailable()) return;
  await pool.query(`
    INSERT INTO governance_audit_log (event, decision_id, ward_id, action, actor, auth_mode, details)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [auditRecord.action, auditRecord.decision_id, auditRecord.ward_code, auditRecord.action, auditRecord.officer_name, auditRecord.pin_used ? "PIN" : "NONE", JSON.stringify(auditRecord)]);
}

async function recordFieldOperation(op) {
  enforceDbForProduction();
  if (!getDbAvailable()) return true; // Pretend it worked
  try {
    const res = await pool.query(`
      INSERT INTO field_operations (operation_id, mission_id, action, payload)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (operation_id) DO NOTHING
      RETURNING operation_id
    `, [op.operation_id, op.mission_id, op.action, JSON.stringify(op.payload || op)]);
    return res.rowCount > 0; // Returns true if inserted (not duplicate)
  } catch (e) {
    console.error("DB error recording field operation:", e);
    return false;
  }
}

async function getAllMissions() {
  enforceDbForProduction();
  if (!getDbAvailable()) return null;
  const res = await pool.query(`SELECT * FROM missions`);
  // Map back to JS object shape expected by frontend
  return res.rows.map(row => ({
    id: row.mission_id,
    ward_code: row.ward_id, // we stored ward_code in ward_id field in saveMission
    tanker_id: row.tanker_id,
    target_liters: row.volume_liters,
    status: row.status,
    priority_tier: row.priority_tier,
    version: row.version
  }));
}

module.exports = {
  executeDispatchTransaction,
  executeVerificationTransaction,
  saveMission,
  updateTankerStatus,
  saveGovernanceDecision,
  saveAuditLog,
  recordFieldOperation,
  getAllMissions
};
