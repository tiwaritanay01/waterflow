="PRODUCTION"
="postgresql://postgres.nlisngjqhrshrbxxiulg:WaterFlowOSop@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

node tests/persistence_integration.test.js
if ( -ne 0) { exit  }
node tests/deployment_smoke.test.js
if ( -ne 0) { exit  }
node tests/day1_core_problem.test.js
if ( -ne 0) { exit  }
node tests/day2_operational_trust.test.js
if ( -ne 0) { exit  }
node tests/day3_network_resilience.test.js
if ( -ne 0) { exit  }
node tests/resilience_offline_autonomy.test.js
if ( -ne 0) { exit  }
node tests/offline_field_operations.test.js
if ( -ne 0) { exit  }
node tests/e2e_field_acceptance.test.js
if ( -ne 0) { exit  }
node tests/day4_reset.test.js
if ( -ne 0) { exit  }
node tests/check_priority_consistency.js
if ( -ne 0) { exit  }
pytest
if ( -ne 0) { exit  }
npm --prefix frontend run build
if ( -ne 0) { exit  }
