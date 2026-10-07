/**
 * WaterFlow OS — Integrity & Credibility Engine
 * 1. Citizen Credibility & Trust Scoring (Prevents false complaints, awards positive credits, maintains ledger)
 * 2. Driver & Tanker Integrity System (Tracks route adherence, GPS transponder status, customer grievances, blacklisting)
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// 1. CITIZEN CREDIBILITY & CIVIC CREDITS LEDGER
// ============================================================================

const citizenProfiles = new Map();

// Helper: Normalize phone numbers (e.g. +91 98200 12345 -> 9820012345)
function cleanPhone(phone) {
  if (!phone) return "9820012345";
  return String(phone).replace(/[^0-9]/g, "").slice(-10);
}

// Initial demo profile for default citizen (+91 98200 12345)
function initCitizenProfiles() {
  if (citizenProfiles.size === 0) {
    const defaultPhone = "9820012345";
    citizenProfiles.set(defaultPhone, {
      phone_number: "+91 98200 12345",
      clean_phone: defaultPhone,
      citizen_name: "Govandi Resident (Aarav Sharma)",
      ward_code: "M/E",
      credit_balance: 145,
      credibility_score: 92, // 92%
      tier: "Gold Civic Contributor",
      total_reports: 5,
      verified_reports: 4,
      flagged_false_reports: 0,
      fast_tracks_used: 1,
      history: [
        {
          id: "TX-CIT-101",
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          type: "CREDIT",
          amount: 25,
          reason: "Verified genuine dry pipe report #WF-24-811 by Ward Junior Engineer",
          balance_after: 145,
        },
        {
          id: "TX-CIT-102",
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
          type: "CREDIT",
          amount: 15,
          reason: "Delivery OTP #8312 confirmed on-site at Standpost #4",
          balance_after: 120,
        },
        {
          id: "TX-CIT-103",
          timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
          type: "DEBIT",
          amount: -20,
          reason: "Fast-Track Priority Boost applied to Ticket #WF-24-811",
          balance_after: 105,
        },
        {
          id: "TX-CIT-104",
          timestamp: new Date(Date.now() - 3600000 * 120).toISOString(),
          type: "CREDIT",
          amount: 125,
          reason: "Initial onboarding civic trust bonus & Aadhaar/OTP verification",
          balance_after: 125,
        },
      ],
    });
  }
}

function getCitizenProfile(phone) {
  initCitizenProfiles();
  const cPhone = cleanPhone(phone);
  if (!citizenProfiles.has(cPhone)) {
    // New citizen onboarding
    citizenProfiles.set(cPhone, {
      phone_number: phone || `+91 ${cPhone}`,
      clean_phone: cPhone,
      citizen_name: "Municipal Resident",
      ward_code: "M/E",
      credit_balance: 100,
      credibility_score: 80,
      tier: "Silver Civic Contributor",
      total_reports: 0,
      verified_reports: 0,
      flagged_false_reports: 0,
      fast_tracks_used: 0,
      history: [
        {
          id: `TX-CIT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "CREDIT",
          amount: 100,
          reason: "New resident registration bonus",
          balance_after: 100,
        },
      ],
    });
  }
  return citizenProfiles.get(cPhone);
}

function recalculateCitizenScore(profile) {
  const total = profile.verified_reports + profile.flagged_false_reports;
  if (total === 0) {
    profile.credibility_score = 80;
  } else {
    // False complaints severely drag score down
    const ratio = profile.verified_reports / (profile.verified_reports + profile.flagged_false_reports * 2.5);
    profile.credibility_score = Math.max(10, Math.min(100, Math.round(ratio * 100)));
  }

  if (profile.credit_balance >= 150 && profile.credibility_score >= 90) {
    profile.tier = "Platinum Civic Guardian";
  } else if (profile.credit_balance >= 100 && profile.credibility_score >= 75) {
    profile.tier = "Gold Civic Contributor";
  } else if (profile.credit_balance >= 50 && profile.credibility_score >= 50) {
    profile.tier = "Silver Civic Contributor";
  } else {
    profile.tier = "Probationary / High Alert Resident";
  }
}

function rewardVerifiedComplaint(phone, reportId = "UNKNOWN", reviewer = "Ward Engineer") {
  const profile = getCitizenProfile(phone);
  const award = 25;
  profile.credit_balance += award;
  profile.verified_reports += 1;
  recalculateCitizenScore(profile);

  const entry = {
    id: `TX-CIT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "CREDIT",
    amount: award,
    reason: `Verified genuine shortage report #${reportId} by ${reviewer}`,
    balance_after: profile.credit_balance,
  };
  profile.history.unshift(entry);
  return { profile, entry };
}

function downvoteFalseComplaint(phone, reportId = "UNKNOWN", reviewer = "Ward Engineer", reason = "Detected False Complaint") {
  const profile = getCitizenProfile(phone);
  const penalty = -40;
  profile.credit_balance = Math.max(0, profile.credit_balance + penalty);
  profile.flagged_false_reports += 1;
  recalculateCitizenScore(profile);

  const entry = {
    id: `TX-CIT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "DEBIT",
    amount: penalty,
    reason: `Downvoted: False complaint #${reportId} flagged by ${reviewer} (${reason})`,
    balance_after: profile.credit_balance,
  };
  profile.history.unshift(entry);
  return { profile, entry };
}

function rewardDeliveryOtpConfirmation(phone, missionId = "501") {
  const profile = getCitizenProfile(phone);
  const award = 15;
  profile.credit_balance += award;
  recalculateCitizenScore(profile);

  const entry = {
    id: `TX-CIT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "CREDIT",
    amount: award,
    reason: `Delivery verified via OTP for Tanker Mission #${missionId}`,
    balance_after: profile.credit_balance,
  };
  profile.history.unshift(entry);
  return { profile, entry };
}

function redeemFastTrackCredit(phone, reportId = "NEW") {
  const profile = getCitizenProfile(phone);
  const cost = 20;
  if (profile.credit_balance < cost) {
    return { success: false, error: "Insufficient civic credits for fast-track boost (Requires 20 Credits)." };
  }
  profile.credit_balance -= cost;
  profile.fast_tracks_used += 1;
  recalculateCitizenScore(profile);

  const entry = {
    id: `TX-CIT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "DEBIT",
    amount: -cost,
    reason: `Fast-Track Priority Boost redeemed for Ticket #${reportId}`,
    balance_after: profile.credit_balance,
  };
  profile.history.unshift(entry);
  return { success: true, profile, entry };
}

// ============================================================================
// 2. DRIVER & TANKER INTEGRITY ENGINE
// ============================================================================

const driverProfiles = new Map();

// Initialize 25 default municipal drivers
function initDriverProfiles() {
  if (driverProfiles.size === 0) {
    const rawDrivers = [
      { id: 1,  transponder_id: "T-01", plate: "MH-03-CB-1102", driver: "Sunil Shinde",     depot: "Bhandup Master Plant", credits: 110, status: "available" },
      { id: 2,  transponder_id: "T-02", plate: "MH-02-AL-4491", driver: "Mahesh Gaikwad",   depot: "Dadar Pumping Station", credits: 130, status: "dispensing" },
      { id: 3,  transponder_id: "T-03", plate: "MH-01-BK-9021", driver: "Anand Kamble",     depot: "Veravali Reservoir", credits: 105, status: "available" },
      { id: 4,  transponder_id: "T-04", plate: "MH-04-ED-3381", driver: "Ramesh Deshmukh",  depot: "Dadar Pumping Station", credits: 95, status: "loading" },
      { id: 5,  transponder_id: "T-05", plate: "MH-03-FA-5509", driver: "Vijay Mane",       depot: "Trombay Reservoir", credits: 115, status: "available" },
      { id: 6,  transponder_id: "T-06", plate: "MH-02-GH-8201", driver: "Santosh Kadam",    depot: "Bhandup Master Plant", credits: 125, status: "loading" },
      { id: 7,  transponder_id: "T-07", plate: "MH-03-BW-1928", driver: "Deepak Sawant",    depot: "Veravali Reservoir", credits: 100, status: "available" },
      { id: 8,  transponder_id: "T-08", plate: "MH-03-BW-7821", driver: "Rajesh Patil",     depot: "Trombay Reservoir", credits: 120, status: "en_route" },
      { id: 9,  transponder_id: "T-09", plate: "MH-01-DA-3042", driver: "Ganesh Jadhav",    depot: "Trombay Reservoir", credits: 110, status: "available" },
      { id: 10, transponder_id: "T-10", plate: "MH-02-KM-4920", driver: "Prakash More",     depot: "Bhandup Master Plant", credits: 105, status: "available" },
      { id: 11, transponder_id: "T-11", plate: "MH-04-NP-6712", driver: "Nitin Chavan",     depot: "Dadar Pumping Station", credits: 90, status: "available" },
      { id: 12, transponder_id: "T-12", plate: "MH-03-QR-8910", driver: "Hemant Bhoir",     depot: "Veravali Reservoir", credits: 115, status: "loading" },
      { id: 13, transponder_id: "T-13", plate: "MH-02-ST-1290", driver: "Sachin Salve",     depot: "Bhandup Master Plant", credits: 100, status: "available" },
      { id: 14, transponder_id: "T-14", plate: "MH-01-UV-4519", driver: "Dilip Wagh",       depot: "Dadar Pumping Station", credits: 95, status: "en_route" },
      { id: 15, transponder_id: "T-15", plate: "MH-03-WX-7721", driver: "Arun Ghuge",       depot: "Trombay Reservoir", credits: 110, status: "available" },
      { id: 16, transponder_id: "T-16", plate: "MH-02-YZ-9102", driver: "Kiran Rane",       depot: "Veravali Reservoir", credits: 120, status: "en_route" },
      { id: 17, transponder_id: "T-17", plate: "MH-04-AB-3310", driver: "Sanjay Tawde",     depot: "Bhandup Master Plant", credits: 100, status: "available" },
      { id: 18, transponder_id: "T-18", plate: "MH-01-CD-8841", driver: "Pradeep Joshi",    depot: "Dadar Pumping Station", credits: 85, status: "available" },
      { id: 19, transponder_id: "T-19", plate: "MH-03-EF-1193", driver: "Kishore Jagtap",   depot: "Trombay Reservoir", credits: 90, status: "returning" },
      { id: 20, transponder_id: "T-20", plate: "MH-02-GH-4091", driver: "Manoj Mhatre",     depot: "Bhandup Master Plant", credits: 105, status: "loading" },
      { id: 21, transponder_id: "T-21", plate: "MH-03-IJ-6623", driver: "Girish Mohite",    depot: "Veravali Reservoir", credits: 115, status: "available" },
      { id: 22, transponder_id: "T-22", plate: "MH-01-KL-9214", driver: "Amol Thombare",    depot: "Trombay Reservoir", credits: 100, status: "available" },
      { id: 23, transponder_id: "T-23", plate: "MH-04-MN-3810", driver: "Ravindra Tambe",   depot: "Dadar Pumping Station", credits: 80, status: "available" },
      // T-24 is initially blacklisted for demonstration of contract revocation!
      { id: 24, transponder_id: "T-24", plate: "MH-02-OP-5012", driver: "Siddhesh Gurav",   depot: "Bhandup Fleet Workshop", credits: 20, status: "blacklisted", is_blacklisted: true, blacklist_reason: "Critical route diversion and transponder cutoff; contract revoked by BMC." },
      { id: 25, transponder_id: "T-25", plate: "MH-03-QR-7740", driver: "Baban Shinde",     depot: "Bhandup Master Plant", credits: 100, status: "available" },
    ];

    for (const d of rawDrivers) {
      const isBlacklisted = d.is_blacklisted || d.credits < 30;
      driverProfiles.set(d.transponder_id, {
        tanker_id: d.id,
        transponder_id: d.transponder_id,
        plate: d.plate,
        license_plate: d.plate,
        driver_name: d.driver,
        depot: d.depot,
        credit_balance: d.credits,
        integrity_rating: Math.min(100, Math.round((d.credits / 130) * 100)),
        is_blacklisted: isBlacklisted,
        blacklist_reason: d.blacklist_reason || (isBlacklisted ? "Credit balance dropped below minimum threshold (30 Cr)." : null),
        is_preferred: d.credits >= 90 && !isBlacklisted,
        telemetry_status: isBlacklisted ? "offline" : "online",
        route_status: isBlacklisted ? "diverted" : "on_route",
        grievances_count: isBlacklisted ? 3 : 0,
        contracts_completed: isBlacklisted ? 12 : 45,
        infractions: isBlacklisted
          ? [
              {
                id: "INF-01",
                timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
                type: "ROUTE_DIVERSION",
                penalty: -25,
                details: "Diverted 2.1 km outside approved corridor in Kurla West",
              },
              {
                id: "INF-02",
                timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
                type: "GPS_TAMPERING",
                penalty: -35,
                details: "Transponder power cut for 45 minutes during transit",
              },
              {
                id: "INF-03",
                timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
                type: "CUSTOMER_GRIEVANCE",
                penalty: -30,
                details: "Consumer grievance: Suspected partial water discharge to private site",
              },
            ]
          : [],
        rewards: [
          {
            id: `REW-INIT`,
            timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
            type: "ON_TIME_DELIVERY",
            reward: 15,
            details: "Standard on-time municipal delivery completion",
          },
        ],
      });
    }
  }
}

function getDriverProfile(transponderId) {
  initDriverProfiles();
  const idStr = String(transponderId).toUpperCase();
  const found = driverProfiles.get(idStr) || Array.from(driverProfiles.values()).find(d => d.plate === idStr || String(d.tanker_id) === idStr);
  return found || driverProfiles.get("T-08");
}

function getAllDrivers() {
  initDriverProfiles();
  return Array.from(driverProfiles.values());
}

function recalculateDriverStanding(driver) {
  driver.integrity_rating = Math.max(0, Math.min(100, Math.round((driver.credit_balance / 130) * 100)));
  if (driver.credit_balance < 30) {
    driver.is_blacklisted = true;
    driver.is_preferred = false;
    if (!driver.blacklist_reason) {
      driver.blacklist_reason = `Integrity credits dropped to ${driver.credit_balance} (Below threshold of 30). Contract revoked for plate ${driver.plate}.`;
    }
  } else {
    driver.is_preferred = driver.credit_balance >= 90 && !driver.is_blacklisted;
  }
}

function recordDriverInfraction(transponderId, type, details = "") {
  const driver = getDriverProfile(transponderId);
  let penalty = -25;
  if (type === "GPS_TAMPERING") {
    penalty = -35;
    driver.telemetry_status = "gps_lost";
  } else if (type === "ROUTE_DIVERSION") {
    penalty = -25;
    driver.route_status = "diverted";
  } else if (type === "CUSTOMER_GRIEVANCE") {
    penalty = -30;
    driver.grievances_count += 1;
  } else if (type === "ILLEGAL_WATER_SALE") {
    penalty = -60;
  }

  driver.credit_balance = Math.max(0, driver.credit_balance + penalty);
  recalculateDriverStanding(driver);

  const infraction = {
    id: `INF-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    penalty,
    details: details || `Recorded infraction: ${type}`,
    balance_after: driver.credit_balance,
  };
  driver.infractions.unshift(infraction);
  return { driver, infraction };
}

function recordDriverReward(transponderId, type, details = "") {
  const driver = getDriverProfile(transponderId);
  if (driver.is_blacklisted) {
    return { driver, error: "Cannot award credits to blacklisted tanker. Restore contract first." };
  }
  let reward = 15;
  if (type === "CUSTOMER_PRAISE") reward = 10;
  if (type === "PERFECT_TELEMETRY") reward = 10;

  driver.credit_balance += reward;
  driver.contracts_completed += 1;
  driver.route_status = "on_route";
  driver.telemetry_status = "online";
  recalculateDriverStanding(driver);

  const rew = {
    id: `REW-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    reward,
    details: details || `Rewarded for ${type}`,
    balance_after: driver.credit_balance,
  };
  driver.rewards.unshift(rew);
  return { driver, reward: rew };
}

function setTankerBlacklist(transponderId, shouldBlacklist, reason = "") {
  const driver = getDriverProfile(transponderId);
  driver.is_blacklisted = Boolean(shouldBlacklist);
  if (driver.is_blacklisted) {
    driver.is_preferred = false;
    driver.blacklist_reason = reason || `Manual administrative contract revocation for plate ${driver.plate}.`;
    driver.telemetry_status = "offline";
  } else {
    driver.blacklist_reason = null;
    driver.credit_balance = Math.max(driver.credit_balance, 50); // Restore to nominal threshold
    driver.telemetry_status = "online";
    driver.route_status = "on_route";
    recalculateDriverStanding(driver);
  }
  return driver;
}

module.exports = {
  // Citizen Trust APIs
  getCitizenProfile,
  rewardVerifiedComplaint,
  downvoteFalseComplaint,
  rewardDeliveryOtpConfirmation,
  redeemFastTrackCredit,
  cleanPhone,

  // Driver Integrity APIs
  getDriverProfile,
  getDriverIntegrity: getDriverProfile,
  getAllDrivers,
  recordDriverInfraction,
  recordDriverReward,
  setTankerBlacklist,
};
