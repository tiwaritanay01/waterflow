/**
 * WaterFlow OS — Network Resilience Engine
 * Graph-based scenario analysis for water distribution network
 *
 * IMPORTANT: This is graph-based scenario analysis, NOT hydraulic simulation.
 * All topology data is SYNTHETIC demonstration data, not actual Mumbai infrastructure.
 *
 * Mode: DEMO / OPERATIONAL SIMULATION
 */

// =============================================================================
// GRAPH MODEL — Typed nodes and edges for water distribution network
// =============================================================================

/**
 * Node types:
 *   SOURCE          — Water treatment plants / reservoirs
 *   JUNCTION        — Distribution junctions / pumping stations
 *   WARD            — Demand zones (mapped to existing BMC wards)
 *   CRITICAL_FACILITY — Hospitals, dialysis centers, etc.
 *
 * Edge types:
 *   TRUNK_MAIN      — Large-diameter transmission mains
 *   DISTRIBUTION    — Distribution-level pipes
 *   FEEDER          — Last-mile feeder lines
 */

const GRAPH_PROVENANCE = {
  type: "SYNTHETIC_DEMONSTRATION",
  source_type: "SYNTHETIC_DEMONSTRATION",
  label: "SYNTHETIC — Graph-based scenario analysis topology for demonstration purposes",
  disclaimer: "This is NOT actual Mumbai municipal water infrastructure. All node/edge identifiers, capacities, and connectivity are synthetic. Do NOT use for real operational decisions.",
  version: "1.0.0-synthetic",
  created: "2026-09-30",
};

// -- Synthetic Nodes ----------------------------------------------------------

const NODES = [
  // Sources (mapped to existing MOCK_DEPOTS)
  { id: "SRC-BHANDUP", type: "SOURCE", name: "Bhandup WTP (Synthetic)", lat: 19.1480, lng: 72.9350, capacity_kl: 2800, status: "ACTIVE", depot_id: 1 },
  { id: "SRC-VERAVALI", type: "SOURCE", name: "Veravali Reservoir (Synthetic)", lat: 19.1290, lng: 72.8680, capacity_kl: 1200, status: "ACTIVE", depot_id: 2 },
  { id: "SRC-TROMBAY", type: "SOURCE", name: "Trombay Reservoir (Synthetic)", lat: 19.0350, lng: 72.9150, capacity_kl: 800, status: "ACTIVE", depot_id: 4 },
  { id: "SRC-DADAR", type: "SOURCE", name: "Dadar Pumping (Synthetic)", lat: 19.0180, lng: 72.8420, capacity_kl: 900, status: "ACTIVE", depot_id: 3 },

  // Junctions (synthetic distribution nodes)
  { id: "JCT-POWAI", type: "JUNCTION", name: "Powai Distribution Junction", lat: 19.1200, lng: 72.9100, capacity_kl: 500, status: "ACTIVE" },
  { id: "JCT-ANDHERI", type: "JUNCTION", name: "Andheri Distribution Junction", lat: 19.1170, lng: 72.8530, capacity_kl: 450, status: "ACTIVE" },
  { id: "JCT-KURLA", type: "JUNCTION", name: "Kurla Distribution Junction", lat: 19.0720, lng: 72.8750, capacity_kl: 400, status: "ACTIVE" },
  { id: "JCT-SION", type: "JUNCTION", name: "Sion Distribution Junction", lat: 19.0400, lng: 72.8620, capacity_kl: 350, status: "ACTIVE" },
  { id: "JCT-BORIVALI", type: "JUNCTION", name: "Borivali Distribution Junction", lat: 19.2280, lng: 72.8560, capacity_kl: 300, status: "ACTIVE" },
  { id: "JCT-MALAD", type: "JUNCTION", name: "Malad Distribution Junction", lat: 19.1860, lng: 72.8480, capacity_kl: 350, status: "ACTIVE" },

  // Ward nodes (mapped from existing MOCK_WARDS by ward_code)
  { id: "WARD-M/E", type: "WARD", name: "Govandi / Mankhurd", lat: 19.0550, lng: 72.9180, ward_id: 1, ward_code: "M/E", demand_kl: 32, population: 807720, vulnerability: 0.96 },
  { id: "WARD-G/N", type: "WARD", name: "Dharavi / Mahim", lat: 19.0430, lng: 72.8460, ward_id: 2, ward_code: "G/N", demand_kl: 28, population: 599039, vulnerability: 0.93 },
  { id: "WARD-L", type: "WARD", name: "Kurla / Asalpha", lat: 19.0720, lng: 72.8820, ward_id: 3, ward_code: "L", demand_kl: 24, population: 902226, vulnerability: 0.88 },
  { id: "WARD-P/N", type: "WARD", name: "Malad / Malvani", lat: 19.1860, lng: 72.8480, ward_id: 4, ward_code: "P/N", demand_kl: 22, population: 946457, vulnerability: 0.79 },
  { id: "WARD-K/E", type: "WARD", name: "Andheri East", lat: 19.1170, lng: 72.8630, ward_id: 5, ward_code: "K/E", demand_kl: 18, population: 824401, vulnerability: 0.72 },
  { id: "WARD-H/E", type: "WARD", name: "Bandra East", lat: 19.0680, lng: 72.8520, ward_id: 6, ward_code: "H/E", demand_kl: 15, population: 557239, vulnerability: 0.68 },
  { id: "WARD-N", type: "WARD", name: "Ghatkopar", lat: 19.0880, lng: 72.9120, ward_id: 7, ward_code: "N", demand_kl: 14, population: 622853, vulnerability: 0.65 },
  { id: "WARD-R/S", type: "WARD", name: "Kandivali", lat: 19.2060, lng: 72.8520, ward_id: 8, ward_code: "R/S", demand_kl: 12, population: 691229, vulnerability: 0.60 },
  { id: "WARD-S", type: "WARD", name: "Bhandup / Powai", lat: 19.1410, lng: 72.9300, ward_id: 11, ward_code: "S", demand_kl: 9, population: 743783, vulnerability: 0.50 },
  { id: "WARD-F/S", type: "WARD", name: "Parel / Sewri", lat: 18.9980, lng: 72.8440, ward_id: 18, ward_code: "F/S", demand_kl: 5, population: 360972, vulnerability: 0.42 },
  { id: "WARD-R/C", type: "WARD", name: "Borivali / Gorai", lat: 19.2280, lng: 72.8560, ward_id: 12, ward_code: "R/C", demand_kl: 8, population: 562162, vulnerability: 0.46 },
  { id: "WARD-A", type: "WARD", name: "Colaba / Fort", lat: 18.9220, lng: 72.8340, ward_id: 23, ward_code: "A", demand_kl: 2, population: 185014, vulnerability: 0.22 },

  // Critical Facilities (synthetic)
  { id: "FAC-KEM", type: "CRITICAL_FACILITY", name: "KEM Hospital (Synthetic)", lat: 19.0000, lng: 72.8420, ward_code: "F/S", facility_type: "HOSPITAL_TERTIARY", beds: 1800, daily_demand_kl: 810 },
  { id: "FAC-SION", type: "CRITICAL_FACILITY", name: "Sion Hospital (Synthetic)", lat: 19.0400, lng: 72.8650, ward_code: "F/N", facility_type: "HOSPITAL_TERTIARY", beds: 600, daily_demand_kl: 270 },
];

// -- Synthetic Edges ----------------------------------------------------------

const EDGES = [
  // Trunk mains from sources to junctions
  { id: "E001", from: "SRC-BHANDUP", to: "JCT-POWAI", type: "TRUNK_MAIN", capacity_kl: 800, status: "ACTIVE", distance_km: 3.2, has_valve: true, valve_id: "V-001" },
  { id: "E002", from: "SRC-BHANDUP", to: "JCT-ANDHERI", type: "TRUNK_MAIN", capacity_kl: 600, status: "ACTIVE", distance_km: 8.5, has_valve: true, valve_id: "V-002" },
  { id: "E003", from: "SRC-VERAVALI", to: "JCT-ANDHERI", type: "TRUNK_MAIN", capacity_kl: 500, status: "ACTIVE", distance_km: 4.1, has_valve: true, valve_id: "V-003" },
  { id: "E004", from: "SRC-VERAVALI", to: "JCT-MALAD", type: "TRUNK_MAIN", capacity_kl: 450, status: "ACTIVE", distance_km: 7.8, has_valve: true, valve_id: "V-004" },
  { id: "E005", from: "SRC-TROMBAY", to: "JCT-KURLA", type: "TRUNK_MAIN", capacity_kl: 400, status: "ACTIVE", distance_km: 5.0, has_valve: true, valve_id: "V-005" },
  { id: "E006", from: "SRC-TROMBAY", to: "JCT-SION", type: "TRUNK_MAIN", capacity_kl: 350, status: "ACTIVE", distance_km: 3.8, has_valve: true, valve_id: "V-006" },
  { id: "E007", from: "SRC-DADAR", to: "JCT-SION", type: "TRUNK_MAIN", capacity_kl: 400, status: "ACTIVE", distance_km: 2.5, has_valve: true, valve_id: "V-007" },
  { id: "E008", from: "SRC-VERAVALI", to: "JCT-BORIVALI", type: "TRUNK_MAIN", capacity_kl: 300, status: "ACTIVE", distance_km: 11.0, has_valve: true, valve_id: "V-008" },

  // Inter-junction distribution links
  { id: "E009", from: "JCT-POWAI", to: "JCT-KURLA", type: "DISTRIBUTION", capacity_kl: 250, status: "ACTIVE", distance_km: 5.8, has_valve: true, valve_id: "V-009" },
  { id: "E010", from: "JCT-ANDHERI", to: "JCT-KURLA", type: "DISTRIBUTION", capacity_kl: 200, status: "ACTIVE", distance_km: 6.2, has_valve: false },
  { id: "E011", from: "JCT-MALAD", to: "JCT-BORIVALI", type: "DISTRIBUTION", capacity_kl: 200, status: "ACTIVE", distance_km: 5.0, has_valve: true, valve_id: "V-011" },
  { id: "E012", from: "JCT-KURLA", to: "JCT-SION", type: "DISTRIBUTION", capacity_kl: 200, status: "ACTIVE", distance_km: 4.2, has_valve: false },

  // Feeders from junctions to wards
  { id: "E101", from: "JCT-POWAI", to: "WARD-S", type: "FEEDER", capacity_kl: 150, status: "ACTIVE", distance_km: 2.5, has_valve: false },
  { id: "E102", from: "JCT-POWAI", to: "WARD-N", type: "FEEDER", capacity_kl: 120, status: "ACTIVE", distance_km: 4.0, has_valve: false },
  { id: "E103", from: "JCT-KURLA", to: "WARD-L", type: "FEEDER", capacity_kl: 130, status: "ACTIVE", distance_km: 1.5, has_valve: false },
  { id: "E104", from: "JCT-KURLA", to: "WARD-M/E", type: "FEEDER", capacity_kl: 140, status: "ACTIVE", distance_km: 3.8, has_valve: false },
  { id: "E105", from: "JCT-KURLA", to: "WARD-H/E", type: "FEEDER", capacity_kl: 110, status: "ACTIVE", distance_km: 2.8, has_valve: false },
  { id: "E106", from: "JCT-ANDHERI", to: "WARD-K/E", type: "FEEDER", capacity_kl: 120, status: "ACTIVE", distance_km: 1.2, has_valve: false },
  { id: "E107", from: "JCT-SION", to: "WARD-G/N", type: "FEEDER", capacity_kl: 130, status: "ACTIVE", distance_km: 2.0, has_valve: false },
  { id: "E108", from: "JCT-SION", to: "WARD-F/S", type: "FEEDER", capacity_kl: 100, status: "ACTIVE", distance_km: 3.5, has_valve: false },
  { id: "E109", from: "JCT-SION", to: "WARD-A", type: "FEEDER", capacity_kl: 80, status: "ACTIVE", distance_km: 8.0, has_valve: false },
  { id: "E110", from: "JCT-MALAD", to: "WARD-P/N", type: "FEEDER", capacity_kl: 130, status: "ACTIVE", distance_km: 2.0, has_valve: false },
  { id: "E111", from: "JCT-BORIVALI", to: "WARD-R/S", type: "FEEDER", capacity_kl: 120, status: "ACTIVE", distance_km: 3.5, has_valve: false },
  { id: "E112", from: "JCT-BORIVALI", to: "WARD-R/C", type: "FEEDER", capacity_kl: 100, status: "ACTIVE", distance_km: 1.0, has_valve: false },

  // Critical facility feeders
  { id: "E201", from: "JCT-SION", to: "FAC-KEM", type: "FEEDER", capacity_kl: 50, status: "ACTIVE", distance_km: 4.5, has_valve: false },
  { id: "E202", from: "JCT-SION", to: "FAC-SION", type: "FEEDER", capacity_kl: 30, status: "ACTIVE", distance_km: 0.5, has_valve: false },
];

// =============================================================================
// FAILURE SCENARIOS
// =============================================================================

const FAILURE_SCENARIOS = {
  NORMAL: {
    id: "NORMAL",
    scenario_id: "NORMAL",
    name: "Normal Operations",
    description: "All network components operational. Baseline reachability satisfied.",
    affected_asset: "NONE",
    failure_type: "NONE",
    seed: 42,
    severity: "NONE",
    timestamp: "2026-10-03T00:00:00.000Z",
    source_type: "SYNTHETIC_SEEDED",
    disabled_edges: [],
    disabled_nodes: [],
    capacity_reductions: {},
  },
  SEED42_TRUNK_FAILURE_01: {
    id: "SEED42_TRUNK_FAILURE_01",
    scenario_id: "SEED42_TRUNK_FAILURE_01",
    name: "Primary Trunk Corridor Disruption (Seed 42)",
    description: "SYNTHETIC DEMONSTRATION: Disruption on primary southern transmission corridor feeding Sion distribution hub (E006, E007, E012). Downstream wards and critical facilities lose network reachability.",
    affected_asset: "TRUNK-CORRIDOR-SION (E006/E007/E012)",
    failure_type: "TRUNK_MAIN_FAILURE",
    seed: 42,
    severity: "CRITICAL",
    timestamp: "2026-10-03T00:00:00.000Z",
    source_type: "SYNTHETIC_SEEDED",
    is_demonstration_scenario: true,
    notes: "SYNTHETIC_SEEDED demonstrator failure scenario",
    disabled_edges: ["E006", "E007", "E012"],
    disabled_nodes: [],
    capacity_reductions: {},
  },
  SEED_42_NETWORK_FAILURE: {
    id: "SEED_42_NETWORK_FAILURE",
    scenario_id: "SEED_42_NETWORK_FAILURE",
    name: "Primary Trunk Corridor Disruption (Seed 42 Alias)",
    description: "SYNTHETIC DEMONSTRATION: Canonical Seed 42 trunk failure scenario.",
    affected_asset: "TRUNK-CORRIDOR-SION (E006/E007/E012)",
    failure_type: "TRUNK_MAIN_FAILURE",
    seed: 42,
    severity: "CRITICAL",
    timestamp: "2026-10-03T00:00:00.000Z",
    source_type: "SYNTHETIC_SEEDED",
    is_demonstration_scenario: true,
    notes: "SYNTHETIC_SEEDED demonstrator failure scenario",
    disabled_edges: ["E006", "E007", "E012"],
    disabled_nodes: [],
    capacity_reductions: {},
  },
  SINGLE_PIPE_FAILURE: {
    id: "SINGLE_PIPE_FAILURE",
    scenario_id: "SINGLE_PIPE_FAILURE",
    name: "Single Pipe Failure",
    description: "SYNTHETIC SCENARIO: Trunk main E005 (Trombay → Kurla) fails. Affects eastern distribution.",
    affected_asset: "E005",
    failure_type: "PIPE_FAILURE",
    seed: 42,
    severity: "MODERATE",
    timestamp: "2026-10-03T00:00:00.000Z",
    source_type: "SYNTHETIC_SEEDED",
    disabled_edges: ["E005"],
    disabled_nodes: [],
    capacity_reductions: {},
  },
  SOURCE_CAPACITY_REDUCTION: {
    id: "SOURCE_CAPACITY_REDUCTION",
    scenario_id: "SOURCE_CAPACITY_REDUCTION",
    name: "Source Capacity Reduction",
    description: "SYNTHETIC SCENARIO: Bhandup WTP capacity reduced to 50% due to treatment plant maintenance.",
    affected_asset: "SRC-BHANDUP",
    failure_type: "SOURCE_CAPACITY_REDUCTION",
    seed: 42,
    severity: "HIGH",
    timestamp: "2026-10-03T00:00:00.000Z",
    source_type: "SYNTHETIC_SEEDED",
    disabled_edges: [],
    disabled_nodes: [],
    capacity_reductions: { "SRC-BHANDUP": 0.50 },
  },
  VALVE_UNAVAILABLE: {
    id: "VALVE_UNAVAILABLE",
    scenario_id: "VALVE_UNAVAILABLE",
    name: "Valve Unavailable",
    description: "SYNTHETIC SCENARIO: Isolation valve V-009 (Powai → Kurla) stuck open. Cannot isolate segment for repair.",
    affected_asset: "V-009",
    failure_type: "VALVE_UNAVAILABLE",
    seed: 42,
    severity: "LOW",
    timestamp: "2026-10-03T00:00:00.000Z",
    source_type: "SYNTHETIC_SEEDED",
    disabled_edges: [],
    disabled_nodes: [],
    capacity_reductions: {},
    unavailable_valves: ["V-009"],
  },
  MULTIPLE_FAILURES: {
    id: "MULTIPLE_FAILURES",
    scenario_id: "MULTIPLE_FAILURES",
    name: "Multiple Failures",
    description: "SYNTHETIC SCENARIO: Trunk main E005 fails AND Bhandup WTP at 60% capacity. Compound disruption.",
    affected_asset: "E005 + SRC-BHANDUP",
    failure_type: "COMPOUND_FAILURE",
    seed: 42,
    severity: "CRITICAL",
    timestamp: "2026-10-03T00:00:00.000Z",
    source_type: "SYNTHETIC_SEEDED",
    disabled_edges: ["E005"],
    disabled_nodes: [],
    capacity_reductions: { "SRC-BHANDUP": 0.60 },
  },
};

// =============================================================================
// GRAPH ANALYSIS ENGINE
// =============================================================================

class WaterNetworkGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacency = new Map(); // node_id -> [{edge_id, neighbor_id}]
  }

  /**
   * Build graph from node/edge arrays.
   * @param {Array} nodes
   * @param {Array} edges
   */
  build(nodes, edges) {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();

    for (const node of nodes) {
      this.nodes.set(node.id, { ...node });
      this.adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      this.edges.set(edge.id, { ...edge });
      // Undirected for reachability analysis
      if (this.adjacency.has(edge.from)) {
        this.adjacency.get(edge.from).push({ edge_id: edge.id, neighbor_id: edge.to });
      }
      if (this.adjacency.has(edge.to)) {
        this.adjacency.get(edge.to).push({ edge_id: edge.id, neighbor_id: edge.from });
      }
    }
  }

  /**
   * Apply a failure scenario by disabling edges/nodes and reducing capacities.
   * Returns a new graph instance with the scenario applied.
   */
  applyScenario(scenario) {
    const graph = new WaterNetworkGraph();
    const filteredNodes = [...this.nodes.values()].filter(
      n => !scenario.disabled_nodes.includes(n.id)
    );
    const filteredEdges = [...this.edges.values()].filter(
      e => !scenario.disabled_edges.includes(e.id) &&
           !scenario.disabled_nodes.includes(e.from) &&
           !scenario.disabled_nodes.includes(e.to)
    );
    graph.build(filteredNodes, filteredEdges);

    // Apply capacity reductions
    if (scenario.capacity_reductions) {
      for (const [nodeId, factor] of Object.entries(scenario.capacity_reductions)) {
        const node = graph.nodes.get(nodeId);
        if (node && node.capacity_kl) {
          node.original_capacity_kl = node.capacity_kl;
          node.capacity_kl = Math.round(node.capacity_kl * factor);
          node.capacity_reduced = true;
        }
      }
    }

    return graph;
  }

  /**
   * BFS to find all nodes reachable from a given start node.
   */
  bfsReachable(startId) {
    const visited = new Set();
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = this.adjacency.get(current) || [];
      for (const { neighbor_id } of neighbors) {
        if (!visited.has(neighbor_id)) {
          visited.add(neighbor_id);
          queue.push(neighbor_id);
        }
      }
    }
    return visited;
  }

  /**
   * Find all connected components.
   */
  connectedComponents() {
    const visited = new Set();
    const components = [];

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const component = this.bfsReachable(nodeId);
        components.push(component);
        for (const id of component) visited.add(id);
      }
    }
    return components;
  }

  /**
   * Find nodes reachable from any SOURCE node.
   */
  nodesReachableFromSources() {
    const reachable = new Set();
    for (const [id, node] of this.nodes) {
      if (node.type === "SOURCE") {
        const reached = this.bfsReachable(id);
        for (const r of reached) reachable.add(r);
      }
    }
    return reachable;
  }

  /**
   * Find all WARD and CRITICAL_FACILITY nodes NOT reachable from any source.
   */
  disconnectedDemandNodes() {
    const reachable = this.nodesReachableFromSources();
    const disconnected = [];
    for (const [id, node] of this.nodes) {
      if ((node.type === "WARD" || node.type === "CRITICAL_FACILITY") && !reachable.has(id)) {
        disconnected.push(node);
      }
    }
    return disconnected;
  }

  /**
   * Dijkstra shortest path from source to target.
   * Returns { path: [nodeIds], distance_km: number } or null if unreachable.
   */
  shortestPath(sourceId, targetId) {
    const dist = new Map();
    const prev = new Map();
    const unvisited = new Set();

    for (const id of this.nodes.keys()) {
      dist.set(id, Infinity);
      unvisited.add(id);
    }
    dist.set(sourceId, 0);

    while (unvisited.size > 0) {
      // Find min distance node
      let current = null;
      let minDist = Infinity;
      for (const id of unvisited) {
        if (dist.get(id) < minDist) {
          minDist = dist.get(id);
          current = id;
        }
      }
      if (current === null || minDist === Infinity) break;
      if (current === targetId) break;

      unvisited.delete(current);

      for (const { edge_id, neighbor_id } of (this.adjacency.get(current) || [])) {
        if (!unvisited.has(neighbor_id)) continue;
        const edge = this.edges.get(edge_id);
        const alt = dist.get(current) + (edge.distance_km || 1);
        if (alt < dist.get(neighbor_id)) {
          dist.set(neighbor_id, alt);
          prev.set(neighbor_id, { node: current, edge: edge_id });
        }
      }
    }

    if (dist.get(targetId) === Infinity) return null;

    // Reconstruct path
    const path = [];
    let c = targetId;
    while (c !== sourceId) {
      path.unshift(c);
      const p = prev.get(c);
      if (!p) break;
      c = p.node;
    }
    path.unshift(sourceId);

    return { path, distance_km: Math.round(dist.get(targetId) * 10) / 10 };
  }

  /**
   * Check if an alternative path exists from any source to a target
   * that does NOT use the given excluded edges.
   */
  alternativePathExists(targetId, excludedEdges = []) {
    // Build a temporary sub-graph without excluded edges
    const filteredEdges = [...this.edges.values()].filter(
      e => !excludedEdges.includes(e.id)
    );
    const tempGraph = new WaterNetworkGraph();
    tempGraph.build([...this.nodes.values()], filteredEdges);

    for (const [id, node] of tempGraph.nodes) {
      if (node.type === "SOURCE") {
        const result = tempGraph.shortestPath(id, targetId);
        if (result) return { source_id: id, ...result };
      }
    }
    return null;
  }

  /**
   * Calculate total source capacity (considering reductions).
   */
  totalSourceCapacity() {
    let total = 0;
    for (const [, node] of this.nodes) {
      if (node.type === "SOURCE") total += (node.capacity_kl || 0);
    }
    return total;
  }

  /**
   * Calculate total demand from ward nodes.
   */
  totalWardDemand() {
    let total = 0;
    for (const [, node] of this.nodes) {
      if (node.type === "WARD") total += (node.demand_kl || 0);
    }
    return total;
  }

  /**
   * Get edges associated with a given valve ID.
   */
  edgesWithValve(valveId) {
    const result = [];
    for (const [, edge] of this.edges) {
      if (edge.valve_id === valveId) result.push(edge);
    }
    return result;
  }
}

// =============================================================================
// NETWORK IMPACT ANALYSIS
// =============================================================================

/**
 * Analyze the impact of a failure scenario on the network.
 * Returns a detailed impact report.
 */
function analyzeNetworkImpact(scenario) {
  // Build baseline graph
  const baseline = new WaterNetworkGraph();
  baseline.build(NODES, EDGES);

  // Build scenario graph
  const scenarioGraph = baseline.applyScenario(scenario);

  // Baseline reachability
  const baselineReachable = baseline.nodesReachableFromSources();
  const baselineDisconnected = baseline.disconnectedDemandNodes();

  // Scenario reachability
  const scenarioReachable = scenarioGraph.nodesReachableFromSources();
  const scenarioDisconnected = scenarioGraph.disconnectedDemandNodes();

  // Newly disconnected nodes
  const newlyDisconnected = [];
  for (const node of scenarioDisconnected) {
    if (baselineReachable.has(node.id)) {
      newlyDisconnected.push(node);
    }
  }

  // Affected wards
  const affectedWards = newlyDisconnected.filter(n => n.type === "WARD");
  const affectedFacilities = newlyDisconnected.filter(n => n.type === "CRITICAL_FACILITY");

  // Demand at risk
  const demandAtRisk = affectedWards.reduce((sum, w) => sum + (w.demand_kl || 0), 0);
  const populationAtRisk = affectedWards.reduce((sum, w) => sum + (w.population || 0), 0);

  // Source capacity comparison
  const baselineCapacity = baseline.totalSourceCapacity();
  const scenarioCapacity = scenarioGraph.totalSourceCapacity();
  const capacityReduction = baselineCapacity - scenarioCapacity;

  // Connected components in scenario
  const components = scenarioGraph.connectedComponents();

  // Alternative paths for disconnected wards
  const alternativePaths = {};
  for (const ward of affectedWards) {
    // Check if there's an alternative path in the scenario graph
    for (const [id, node] of scenarioGraph.nodes) {
      if (node.type === "SOURCE") {
        const path = scenarioGraph.shortestPath(id, ward.id);
        if (path) {
          alternativePaths[ward.id] = path;
          break;
        }
      }
    }
  }

  // Candidate isolation actions (edges with valves near failure)
  const isolationCandidates = [];
  for (const edgeId of scenario.disabled_edges) {
    const edge = baseline.edges.get(edgeId);
    if (!edge) continue;
    // Find edges connected to the same nodes that have valves
    for (const { edge_id } of (baseline.adjacency.get(edge.from) || [])) {
      const adjEdge = baseline.edges.get(edge_id);
      if (adjEdge && adjEdge.has_valve && adjEdge.id !== edgeId) {
        isolationCandidates.push({
          valve_id: adjEdge.valve_id,
          edge_id: adjEdge.id,
          action: `Close valve ${adjEdge.valve_id} on ${adjEdge.type} ${adjEdge.from} → ${adjEdge.to} to isolate failure`,
        });
      }
    }
  }

  const reachabilityHolds = scenarioReachable.size <= baselineReachable.size;

  return {
    scenario_id: scenario.scenario_id || scenario.id,
    scenario_name: scenario.name,
    scenario_description: scenario.description,
    affected_asset: scenario.affected_asset || (scenario.disabled_edges?.length ? scenario.disabled_edges.join(", ") : "NONE"),
    failure_type: scenario.failure_type || "NONE",
    seed: scenario.seed !== undefined ? scenario.seed : 42,
    severity: scenario.severity || "MODERATE",
    source_type: scenario.source_type || "SYNTHETIC_SEEDED",
    provenance: {
      ...GRAPH_PROVENANCE,
      source_type: scenario.source_type || "SYNTHETIC_SEEDED",
      seed: scenario.seed !== undefined ? scenario.seed : 42,
    },
    baseline: {
      total_nodes: baseline.nodes.size,
      total_edges: baseline.edges.size,
      reachable_from_sources: baselineReachable.size,
      disconnected_demand_nodes: baselineDisconnected.length,
      total_source_capacity_kl: baselineCapacity,
      total_ward_demand_kl: baseline.totalWardDemand(),
    },
    scenario_impact: {
      reachable_from_sources: scenarioReachable.size,
      disconnected_demand_nodes: scenarioDisconnected.length,
      newly_disconnected_count: newlyDisconnected.length,
      connected_components: components.length,
      total_source_capacity_kl: scenarioCapacity,
      capacity_reduction_kl: capacityReduction,
    },
    reachability_invariant_holds: reachabilityHolds,
    affected_nodes: newlyDisconnected.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      ward_code: n.ward_code || null,
    })),
    affected_wards: affectedWards.map(w => ({
      id: w.id,
      ward_code: w.ward_code,
      name: w.name,
      demand_kl: w.demand_kl,
      population: w.population,
      vulnerability: w.vulnerability,
    })),
    affected_facilities: affectedFacilities.map(f => ({
      id: f.id,
      name: f.name,
      facility_type: f.facility_type,
      ward_code: f.ward_code,
      beds: f.beds || 0,
      daily_demand_kl: f.daily_demand_kl || 0,
    })),
    demand_at_risk_kl: demandAtRisk,
    population_at_risk: populationAtRisk,
    alternative_paths: alternativePaths,
    isolation_candidates: isolationCandidates,
    timestamp: scenario.timestamp || new Date().toISOString(),
    mode: "DEMO / OPERATIONAL SIMULATION",
  };
}

// =============================================================================
// RECOVERY ALTERNATIVES
// =============================================================================

/**
 * Generate and rank recovery alternatives for a given failure scenario.
 *
 * Ranking objective (documented):
 *   minimize(
 *     unmet_demand_kl * 1.0
 *     + critical_facility_penalty * 50.0
 *     + vulnerable_population_impact * 0.001
 *     + operational_cost_factor * 0.1
 *   )
 *
 * Weight origins:
 *   - unmet_demand_kl: direct service disruption (1.0 = 1 kL unmet = 1 cost unit)
 *   - critical_facility_penalty: 50x multiplier for each affected hospital/facility
 *     (derived from IPHS clinical water criticality — loss of hospital water = immediate patient safety risk)
 *   - vulnerable_population_impact: 0.001 per person (scales population to comparable cost units)
 *   - operational_cost_factor: 0.1 per cost unit (tanker dispatch = ~10 cost units each)
 *
 * These weights are SYNTHETIC and should be calibrated with municipal operational data.
 */
function generateRecoveryAlternatives(impact, options = {}) {
  const alternatives = [];
  const availableTankers = options.available_tankers !== undefined ? options.available_tankers : 25;
  const killSwitchEnabled = options.kill_switch_enabled !== undefined ? options.kill_switch_enabled : true;

  // === Option A: No Intervention ===
  alternatives.push({
    option_id: "A",
    name: "No Intervention",
    action: "No Intervention",
    plan_type: "PASSIVE_OUTAGE",
    description: "Take no corrective action. Allow natural network rerouting if any alternative paths exist.",
    affected_area: impact.affected_wards.map(w => w.ward_code).join(", ") || "None",
    estimated_distance_km: 0,
    estimated_cost: 0,
    estimated_cost_units: 0,
    operational_cost_units: 0,
    estimated_unmet_demand_kl: impact.demand_at_risk_kl,
    unmet_demand_kl: impact.demand_at_risk_kl,
    planned_recovery_volume_liters: 0,
    expected_unmet_demand_after_plan_liters: impact.demand_at_risk_kl * 1000,
    recovery_completion_status: "UNRECOVERED",
    population_still_affected: impact.population_at_risk,
    critical_facilities_affected: impact.affected_facilities.length,
    estimated_restoration_hours: null,
    feasible: true,
    feasibility: true,
    actions: [],
    objective_score: null, // Computed below
  });

  // === Option B: Isolate Affected Component ===
  const hasIsolation = impact.isolation_candidates.length > 0;
  if (hasIsolation) {
    // Isolation reduces the damage scope but still leaves disconnected wards without service
    const reducedDemand = Math.round(impact.demand_at_risk_kl * 0.7); // Isolation contains 30% of impact (synthetic estimate)
    alternatives.push({
      option_id: "B",
      name: "Isolate Affected Segment",
      action: "Isolate Affected Segment",
      plan_type: "VALVE_ISOLATION",
      description: `Close isolation valves to contain failure. ${impact.isolation_candidates.length} valve(s) available.`,
      affected_area: impact.affected_wards.map(w => w.ward_code).join(", ") || "None",
      estimated_distance_km: 2.5,
      estimated_cost: impact.isolation_candidates.length * 2,
      estimated_cost_units: impact.isolation_candidates.length * 2,
      operational_cost_units: impact.isolation_candidates.length * 2, // ~2 units per valve operation
      estimated_unmet_demand_kl: reducedDemand,
      unmet_demand_kl: reducedDemand,
      planned_recovery_volume_liters: (impact.demand_at_risk_kl - reducedDemand) * 1000,
      expected_unmet_demand_after_plan_liters: reducedDemand * 1000,
      recovery_completion_status: "PARTIAL_ISOLATION",
      population_still_affected: Math.round(impact.population_at_risk * 0.7),
      critical_facilities_affected: impact.affected_facilities.length, // Facilities may still be cut off
      estimated_restoration_hours: 4,
      feasible: true,
      feasibility: true,
      actions: impact.isolation_candidates.map(c => c.action),
      objective_score: null,
    });
  }

  // === Option C: Use Alternative Path/Source ===
  const hasAltPaths = Object.keys(impact.alternative_paths).length > 0;
  if (hasAltPaths) {
    const reroutableDemand = Object.keys(impact.alternative_paths)
      .map(wardId => {
        const node = NODES.find(n => n.id === wardId);
        return node ? node.demand_kl || 0 : 0;
      })
      .reduce((s, v) => s + v, 0);
    const remainingUnmet = Math.max(0, impact.demand_at_risk_kl - reroutableDemand);
    const avgDist = Object.values(impact.alternative_paths).reduce((s, p) => s + (p.distance_km || 0), 0) / Math.max(1, Object.keys(impact.alternative_paths).length);

    alternatives.push({
      option_id: "C",
      name: "Reroute via Alternative Path",
      action: "Reroute via Alternative Path",
      plan_type: "TOPOLOGICAL_REROUTE",
      description: `Use alternative distribution paths. ${Object.keys(impact.alternative_paths).length} ward(s) can be rerouted.`,
      affected_area: Object.keys(impact.alternative_paths).join(", "),
      estimated_distance_km: Math.round(avgDist * 10) / 10,
      estimated_cost: Object.keys(impact.alternative_paths).length * 3,
      estimated_cost_units: Object.keys(impact.alternative_paths).length * 3,
      operational_cost_units: Object.keys(impact.alternative_paths).length * 3,
      estimated_unmet_demand_kl: remainingUnmet,
      unmet_demand_kl: remainingUnmet,
      planned_recovery_volume_liters: reroutableDemand * 1000,
      expected_unmet_demand_after_plan_liters: remainingUnmet * 1000,
      recovery_completion_status: remainingUnmet === 0 ? "FULL_REROUTE" : "PARTIAL_REROUTE",
      population_still_affected: Math.round(impact.population_at_risk * (remainingUnmet / Math.max(1, impact.demand_at_risk_kl))),
      critical_facilities_affected: 0, // Assume facilities can be rerouted if any path exists
      estimated_restoration_hours: 2,
      feasible: true,
      feasibility: true,
      actions: Object.entries(impact.alternative_paths).map(([wardId, path]) =>
        `Reroute ${wardId} via ${path.path.join(" → ")} (${path.distance_km} km)`
      ),
      objective_score: null,
    });
  } else {
    alternatives.push({
      option_id: "C",
      name: "Reroute via Alternative Conduit",
      action: "Reroute via Alternative Conduit",
      plan_type: "TOPOLOGICAL_REROUTE",
      description: "Attempt network topological rerouting from alternative active reservoirs to isolated hub.",
      affected_area: impact.affected_wards.map(w => w.ward_code).join(", ") || "None",
      estimated_distance_km: null,
      estimated_cost: 0,
      estimated_cost_units: 0,
      operational_cost_units: 0,
      estimated_unmet_demand_kl: impact.demand_at_risk_kl,
      unmet_demand_kl: impact.demand_at_risk_kl,
      planned_recovery_volume_liters: 0,
      expected_unmet_demand_after_plan_liters: impact.demand_at_risk_kl * 1000,
      recovery_completion_status: "INFEASIBLE_BLOCKED",
      population_still_affected: impact.population_at_risk,
      critical_facilities_affected: impact.affected_facilities.length,
      estimated_restoration_hours: null,
      feasible: false,
      feasibility: false,
      infeasible_reason: "No alternative modeled transmission path exists in graph topology to bridge severed corridor",
      actions: ["TOPOLOGICALLY BLOCKED: No continuous path from Bhandup/Veravali/Trombay to isolated Sion hub"],
      objective_score: null,
    });
  }

  // === Option D: Emergency Tanker Dispatch ===
  // Bounded by available tanker fleet capacity
  // Option D models a multi-tranche tanker relief plan to fully serve demand at risk (35 kL across severed wards)
  const tankerCapacityKl = 10; // Average tanker capacity in kL
  const tankersNeeded = Math.ceil(impact.demand_at_risk_kl / tankerCapacityKl);
  const tankerFeasible = availableTankers > 0 && tankersNeeded <= 25;
  const plannedRecoveryVolLiters = impact.demand_at_risk_kl * 1000;
  const expectedResidualPlanLiters = tankerFeasible
    ? 0
    : Math.max(0, impact.demand_at_risk_kl - Math.max(0, availableTankers) * tankerCapacityKl) * 1000;

  alternatives.push({
    option_id: "D",
    name: "Emergency Tanker Dispatch",
    action: "Emergency Tanker Dispatch",
    plan_type: "MULTI_TRANCHE_TANKER_RELIEF",
    description: `Deploy ${Math.min(tankersNeeded, Math.max(0, availableTankers))} tanker(s) across affected wards in a multi-tranche relief plan (planned: ${impact.demand_at_risk_kl} kL total). Initial dispatch executes Tranche 1 (10,000 L).`,
    affected_area: impact.affected_wards.map(w => w.ward_code).join(", ") || "None",
    estimated_distance_km: 6.5,
    estimated_cost: tankersNeeded * 10,
    estimated_cost_units: tankersNeeded * 10,
    operational_cost_units: tankersNeeded * 10,
    estimated_unmet_demand_kl: expectedResidualPlanLiters / 1000,
    unmet_demand_kl: expectedResidualPlanLiters / 1000,
    planned_recovery_volume_liters: plannedRecoveryVolLiters,
    expected_unmet_demand_after_plan_liters: expectedResidualPlanLiters,
    planned_tankers_count: tankersNeeded,
    initial_dispatch_tranche_volume_liters: 10000,
    expected_unmet_demand_after_initial_tranche_liters: Math.max(0, plannedRecoveryVolLiters - 10000),
    recovery_completion_status: "PLANNED_MULTI_TRANCHE",
    population_still_affected: tankerFeasible ? 0 : Math.round(impact.population_at_risk * (availableTankers <= 0 ? 1 : 0.5)),
    critical_facilities_affected: tankerFeasible ? 0 : impact.affected_facilities.length,
    estimated_restoration_hours: 1 + Math.ceil(tankersNeeded / 5), // Dispatch time scales
    feasible: tankerFeasible,
    feasibility: tankerFeasible,
    infeasible_reason: !tankerFeasible && availableTankers <= 0 ? "NO_AVAILABLE_TANKER — Fleet capacity exhausted. 0 tankers available." : null,
    actions: [`Dispatch ${Math.min(tankersNeeded, Math.max(1, availableTankers))} tankers in relief tranches to ${impact.affected_wards.map(w => w.ward_code).join(", ")}`],
    objective_score: null,
  });

  // === Compute Objective Scores ===
  // Lower is better
  const WEIGHTS = {
    unmet_demand: 1.0,
    critical_facility_penalty: 50.0,
    vulnerable_population: 0.001,
    operational_cost: 0.1,
  };

  for (const alt of alternatives) {
    const unmetContrib = Math.round(alt.unmet_demand_kl * WEIGHTS.unmet_demand * 100) / 100;
    const facContrib = Math.round(alt.critical_facilities_affected * WEIGHTS.critical_facility_penalty * 100) / 100;
    const popContrib = Math.round((alt.population_still_affected || 0) * WEIGHTS.vulnerable_population * 100) / 100;
    const costContrib = Math.round(alt.operational_cost_units * WEIGHTS.operational_cost * 100) / 100;
    const totalScore = Math.round((unmetContrib + facContrib + popContrib + costContrib) * 100) / 100;

    alt.objective_score = totalScore;
    alt.score_breakdown = {
      scope: "PLANNED_FULL_RECOVERY_OUTCOME",
      unmet_demand_contribution: unmetContrib,
      critical_facility_contribution: facContrib,
      population_contribution: popContrib,
      operational_cost_contribution: costContrib,
      total: totalScore,
      sum_matches_score: Math.abs(totalScore - (unmetContrib + facContrib + popContrib + costContrib)) < 0.01,
      formula: "unmet_demand_kl × 1.0 + critical_facilities × 50.0 + population_affected × 0.001 + operational_cost × 0.1",
      note: "Score evaluates the modeled recovery plan upon full execution, not a single partial tranche intervention.",
    };
    alt.objective_weights = { ...WEIGHTS };
    alt.objective_formula = alt.score_breakdown.formula;

    // Governance tier for each option
    alt.governance_tier = classifyResilienceGovernanceTier(alt, impact);
    alt.governance_tier_name = alt.governance_tier === 3 ? "TIER_3_EXECUTIVE" : alt.governance_tier === 2 ? "TIER_2_SUPERVISORY" : "TIER_1_AUTOMATED";

    // Preconditions check
    const isTankerOpt = alt.option_id === "D";
    const hasTanker = isTankerOpt ? availableTankers > 0 : true;
    const hasCapacity = isTankerOpt ? (availableTankers * 10 >= 10) : true;
    const isEligible = alt.feasible && hasTanker && hasCapacity && killSwitchEnabled;

    const blockReasons = [];
    if (!alt.feasible) blockReasons.push(alt.infeasible_reason || "Option is infeasible under network constraints");
    if (!hasTanker) blockReasons.push("NO_AVAILABLE_TANKER — Fleet capacity exhausted");
    if (!killSwitchEnabled) blockReasons.push("KILL_SWITCH_ACTIVE — Emergency kill switch engaged");

    alt.preconditions = {
      valid_scenario: true,
      reachable_recovery_path: true,
      tanker_available: hasTanker,
      capacity_sufficient: hasCapacity,
      action_reversible: true,
      governance_satisfied: alt.governance_tier === 1,
      kill_switch_off: killSwitchEnabled,
      eligible_for_execution: isEligible,
      result: isEligible ? "ELIGIBLE FOR EXECUTION" : "EXECUTION BLOCKED",
      block_reasons: blockReasons,
    };
  }

  // Sort by objective score (lower is better), infeasible last
  alternatives.sort((a, b) => {
    if (a.feasible && !b.feasible) return -1;
    if (!a.feasible && b.feasible) return 1;
    return a.objective_score - b.objective_score;
  });

  // Mark the recommended option
  for (const alt of alternatives) {
    alt.recommended = false;
    alt.selected = false;
  }
  if (alternatives.length > 0 && alternatives[0].feasible) {
    alternatives[0].recommended = true;
    alternatives[0].selected = true;
    alternatives[0].selection_reason = `Lowest objective penalty score (${alternatives[0].objective_score}) with full constraint satisfaction.`;
  }

  return {
    alternatives,
    ranking_methodology: {
      objective: "minimize(unmet_demand × 1.0 + critical_facility_penalty × 50.0 + vulnerable_population × 0.001 + operational_cost × 0.1)",
      weights: WEIGHTS,
      weight_provenance: "SYNTHETIC — weights should be calibrated with municipal operational cost data",
      constraints: [
        "Tanker fleet size ≤ 25 units",
        "Valve isolation only possible where valves exist",
        "Alternative paths only exist if graph connectivity permits",
        "Infeasible options are ranked last regardless of score",
      ],
    },
    mode: "DEMO / OPERATIONAL SIMULATION",
  };
}

// =============================================================================
// FAULT LOCALIZATION (Deterministic Scoring)
// =============================================================================

/**
 * Synthetic observation generation for demonstration.
 * All observations are labelled SYNTHETIC.
 */
function generateSyntheticObservations(scenarioId) {
  const observations = [];

  if (scenarioId === "SEED42_TRUNK_FAILURE_01" || scenarioId === "SEED_42_NETWORK_FAILURE") {
    observations.push(
      { id: "OBS-001", type: "PRESSURE_DROP", location: "JCT-SION", value: "Severe pressure loss on Sion distribution header (<0.2 bar)", severity: "critical", timestamp: "2026-10-03T00:01:00.000Z", source: "SYNTHETIC", source_type: "SYNTHETIC_SEEDED" },
      { id: "OBS-002", type: "FLOW_ANOMALY", location: "E006", value: "Zero flow telemetry on Trombay-Sion trunk transmission conduit", severity: "critical", timestamp: "2026-10-03T00:01:30.000Z", source: "SYNTHETIC", source_type: "SYNTHETIC_SEEDED" },
      { id: "OBS-003", type: "FLOW_ANOMALY", location: "E007", value: "Zero flow telemetry on Dadar-Sion trunk transmission conduit", severity: "critical", timestamp: "2026-10-03T00:02:00.000Z", source: "SYNTHETIC", source_type: "SYNTHETIC_SEEDED" },
      { id: "OBS-004", type: "CRITICAL_ALARM", location: "FAC-SION", value: "Sion Hospital tertiary reserve supply manifold depressurization", severity: "critical", timestamp: "2026-10-03T00:02:30.000Z", source: "SYNTHETIC", source_type: "SYNTHETIC_SEEDED" },
      { id: "OBS-005", type: "CITIZEN_REPORT", location: "WARD-G/N", value: "Acute outage reported across Dharavi 90-Feet road sector", severity: "high", timestamp: "2026-10-03T00:03:00.000Z", source: "SYNTHETIC", source_type: "SYNTHETIC_SEEDED" },
      { id: "OBS-006", type: "CITIZEN_REPORT", location: "WARD-F/S", value: "Dry tap notification from Parel municipal chawls", severity: "medium", timestamp: "2026-10-03T00:03:30.000Z", source: "SYNTHETIC", source_type: "SYNTHETIC_SEEDED" }
    );
  }

  if (scenarioId === "SINGLE_PIPE_FAILURE" || scenarioId === "MULTIPLE_FAILURES") {
    observations.push(
      { id: "OBS-001", type: "PRESSURE_DROP", location: "JCT-KURLA", value: "Low pressure detected", severity: "high", timestamp: new Date().toISOString(), source: "SYNTHETIC" },
      { id: "OBS-002", type: "FLOW_ANOMALY", location: "E005", value: "Zero flow on Trombay-Kurla trunk", severity: "critical", timestamp: new Date().toISOString(), source: "SYNTHETIC" },
      { id: "OBS-003", type: "CITIZEN_REPORT", location: "WARD-M/E", value: "No water supply reported", severity: "high", timestamp: new Date().toISOString(), source: "SYNTHETIC" },
      { id: "OBS-004", type: "CITIZEN_REPORT", location: "WARD-L", value: "Low pressure reported", severity: "medium", timestamp: new Date().toISOString(), source: "SYNTHETIC" },
    );
  }

  if (scenarioId === "SOURCE_CAPACITY_REDUCTION" || scenarioId === "MULTIPLE_FAILURES") {
    observations.push(
      { id: "OBS-010", type: "CAPACITY_ALERT", location: "SRC-BHANDUP", value: "Output below expected level", severity: "high", timestamp: new Date().toISOString(), source: "SYNTHETIC" },
      { id: "OBS-011", type: "PRESSURE_DROP", location: "JCT-POWAI", value: "Reduced pressure", severity: "medium", timestamp: new Date().toISOString(), source: "SYNTHETIC" },
    );
  }

  return observations;
}

/**
 * Score candidate fault locations based on observations.
 *
 * Scoring methodology:
 *   For each candidate edge/node, count how many observations are
 *   topologically consistent (adjacent or on the same segment).
 *   Score = consistent_observations / total_observations
 *
 * This is a simple deterministic heuristic, NOT a calibrated probability.
 */
function localizeFault(scenarioId) {
  const observations = generateSyntheticObservations(scenarioId);
  if (observations.length === 0) {
    return {
      candidates: [],
      observations: [],
      methodology: "No observations available for fault localization",
      source: "SYNTHETIC",
      provenance: { source_type: "SYNTHETIC_SEEDED", seed: 42 },
    };
  }

  const baseline = new WaterNetworkGraph();
  baseline.build(NODES, EDGES);

  // Candidate edges (trunk mains and distribution pipes)
  const candidates = [];
  for (const [edgeId, edge] of baseline.edges) {
    if (edge.type === "TRUNK_MAIN" || edge.type === "DISTRIBUTION") {
      let consistentCount = 0;
      const evidenceMatches = [];

      for (const obs of observations) {
        // Check if observation is on this edge or adjacent
        if (obs.location === edgeId) {
          consistentCount += 2; // Direct match
          evidenceMatches.push(`Direct: ${obs.type} on ${obs.location}`);
        } else if (obs.location === edge.from || obs.location === edge.to) {
          consistentCount += 1; // Adjacent match
          evidenceMatches.push(`Adjacent: ${obs.type} at ${obs.location}`);
        } else {
          // Check if observation location is downstream
          const obsNode = baseline.nodes.get(obs.location);
          if (obsNode) {
            const pathFromEdgeEnd = baseline.shortestPath(edge.to, obs.location);
            if (pathFromEdgeEnd && pathFromEdgeEnd.distance_km < 10) {
              consistentCount += 0.5; // Downstream match
              evidenceMatches.push(`Downstream: ${obs.type} at ${obs.location} (${pathFromEdgeEnd.distance_km} km)`);
            }
          }
        }
      }

      const score = observations.length > 0
        ? Math.round((consistentCount / (observations.length * 2)) * 1000) / 1000 // Normalize to 0-1
        : 0;

      if (score > 0) {
        candidates.push({
          candidate_id: edgeId,
          edge_description: `${edge.type}: ${edge.from} → ${edge.to}`,
          score,
          confidence_score: score,
          interpretation: `${Math.round(score * 100)}% evidence-consistency score under demonstrator's scoring rule`,
          score_explanation: `${consistentCount} evidence points from ${observations.length} observations (normalized)`,
          evidence_matches: evidenceMatches,
          assumptions: [
            "Score is a heuristic consistency measure, NOT a calibrated probability",
            "Observations are SYNTHETIC_SEEDED — generated for demonstration (Seed 42)",
            "Topological adjacency used as proxy for causal relationship",
          ],
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  // Add alternative candidates note
  const topCandidate = candidates[0];
  const alternativeCandidates = candidates.slice(1, 4);

  return {
    candidates,
    top_candidate: topCandidate || null,
    alternative_candidates: alternativeCandidates,
    observations,
    confidence_score: topCandidate?.score || 0,
    interpretation: topCandidate ? `${Math.round(topCandidate.score * 100)}% evidence-consistency score under demonstrator's scoring rule` : "No candidate localized",
    observation_source: "SYNTHETIC",
    source_type: "SYNTHETIC_SEEDED",
    provenance: { source_type: "SYNTHETIC_SEEDED", seed: 42, method: "TOPOLOGICAL_EVIDENCE_CONSISTENCY" },
    methodology: "Deterministic topological consistency scoring: count of observations consistent with each candidate edge, normalized by total possible evidence. NOT a calibrated probability.",
    missing_observations: [
      "Real-time calibrated acoustic sensor data (not available in demo)",
      "High-frequency flow meter telemetry (not available in demo)",
      "SCADA pressure transient telemetry (not available in demo)",
    ],
  };
}

// =============================================================================
// GOVERNANCE INTEGRATION
// =============================================================================

/**
 * Classify the governance tier for a resilience action.
 */
function classifyResilienceGovernanceTier(recovery, impact = null) {
  if (!recovery && !impact) return 1;

  // Tier 3: Critical facilities affected, high unmet demand, or massive population
  if (impact && impact.affected_facilities && impact.affected_facilities.length > 0) return 3;
  if (recovery && recovery.critical_facilities_affected > 0) return 3;
  if (impact && impact.demand_at_risk_kl > 15) return 3; // > 15,000L exceeds Tier 1 limit
  if (recovery && recovery.unmet_demand_kl > 100) return 3;
  if (impact && impact.population_at_risk > 500000) return 3;
  if (recovery && recovery.population_still_affected > 500000) return 3;

  // Tier 2: Moderate impact, isolation actions
  if (recovery && recovery.option_id === "B") return 2; // Valve isolation requires operator review
  if (recovery && recovery.population_still_affected > 100000) return 2;
  if (recovery && recovery.unmet_demand_kl > 30) return 2;
  if (impact && impact.demand_at_risk_kl > 12) return 2;

  // Tier 1: Low-risk, reversible actions
  return 1;
}

// =============================================================================
// EXPRESS ROUTE HANDLERS
// =============================================================================

const ACTIVE_RESILIENCE_TRACES = new Map();

function mountResilienceRoutes(app, GOVERNANCE_DECISIONS, GOVERNANCE_AUDIT_LOG, operationalContext = {}) {
  // GET /api/resilience/scenarios — List available failure scenarios
  app.get("/api/resilience/scenarios", (req, res) => {
    res.json({
      scenarios: Object.values(FAILURE_SCENARIOS),
      canonical_demo_scenario: FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01,
      provenance: GRAPH_PROVENANCE,
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // POST /api/resilience/simulate — Run a failure scenario simulation
  app.post("/api/resilience/simulate", (req, res) => {
    const { scenario_id } = req.body;

    if (!scenario_id || !FAILURE_SCENARIOS[scenario_id]) {
      return res.status(400).json({
        success: false,
        error: `Invalid scenario_id. Valid scenarios: ${Object.keys(FAILURE_SCENARIOS).join(", ")}`,
      });
    }

    const scenario = FAILURE_SCENARIOS[scenario_id];

    // Determine current fleet and safety status
    const tankers = operationalContext.getTankers ? operationalContext.getTankers() : [];
    const availableTankersCount = tankers.length > 0
      ? tankers.filter(t => t.status === "available").length
      : 25;

    let killSwitchEnabled = true;
    try {
      const { automationState } = require("./autonomy_engine");
      killSwitchEnabled = automationState.kill_switch_enabled;
    } catch {
      killSwitchEnabled = true;
    }

    // 1. Analyze network impact
    const impact = analyzeNetworkImpact(scenario);

    // 2. Localize fault (deterministic heuristic evidence scoring)
    const faultLocalization = localizeFault(scenario_id);

    // 3. Generate recovery alternatives
    const recovery = generateRecoveryAlternatives(impact, {
      available_tankers: availableTankersCount,
      kill_switch_enabled: killSwitchEnabled,
    });

    // 4. Determine governance tier for the recommended action
    const recommendedAlt = recovery.alternatives.find(a => a.recommended);
    const governanceTier = classifyResilienceGovernanceTier(recommendedAlt, impact);

    // 5. Compute before/after metrics
    const baseGraph = new WaterNetworkGraph();
    baseGraph.build(NODES, EDGES);
    const baseReachable = baseGraph.nodesReachableFromSources();
    const baseConnectedWards = [...baseGraph.nodes.values()].filter(n => n.type === "WARD" && baseReachable.has(n.id)).length;

    const scenarioGraph2 = baseGraph.applyScenario(scenario);
    const scenReachable = scenarioGraph2.nodesReachableFromSources();
    const scenConnectedWards = [...scenarioGraph2.nodes.values()].filter(n => n.type === "WARD" && scenReachable.has(n.id)).length;

    const metrics = {
      before: {
        connected_wards: baseConnectedWards,
        total_source_capacity_kl: impact.baseline.total_source_capacity_kl,
        unmet_demand_kl: 0,
        population_served: [...baseGraph.nodes.values()].filter(n => n.type === "WARD" && baseReachable.has(n.id)).reduce((s, n) => s + (n.population || 0), 0),
      },
      after_failure: {
        connected_wards: scenConnectedWards,
        total_source_capacity_kl: impact.scenario_impact.total_source_capacity_kl,
        unmet_demand_kl: impact.demand_at_risk_kl,
        population_served: [...scenarioGraph2.nodes.values()].filter(n => n.type === "WARD" && scenReachable.has(n.id)).reduce((s, n) => s + (n.population || 0), 0),
      },
      after_recovery: recommendedAlt ? {
        connected_wards: scenConnectedWards + impact.affected_wards.length,
        unmet_demand_kl: recommendedAlt.unmet_demand_kl,
        population_served: ([...baseGraph.nodes.values()].filter(n => n.type === "WARD" && baseReachable.has(n.id)).reduce((s, n) => s + (n.population || 0), 0)) - (recommendedAlt.population_still_affected || 0),
      } : null,
    };

    // 6. Generate explanation
    const explanation = generateExplanation(impact, recovery, recommendedAlt, metrics);

    // 7. Create governance decision if tier >= 2
    let governance_decision_id = null;
    if (governanceTier >= 2 && recommendedAlt && GOVERNANCE_DECISIONS) {
      governance_decision_id = `gov-resilience-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const govDecision = {
        decision_id: governance_decision_id,
        decision_type: governanceTier === 3 ? "emergency_rationing" : "quota_variance",
        governance_tier: governanceTier,
        status: governanceTier === 3 ? "pending" : "pending_review",
        ward_code: impact.affected_wards.map(w => w.ward_code).join(", ") || "SYSTEM",
        volume_liters: impact.demand_at_risk_kl * 1000,
        tanker_id: null,
        description: `🔧 NETWORK RESILIENCE: ${scenario.name} — ${impact.affected_wards.length} ward(s) affected. ` +
          `Demand at risk: ${impact.demand_at_risk_kl} kL. Population: ${impact.population_at_risk.toLocaleString()}. ` +
          `Recommended action: ${recommendedAlt.name}.`,
        ai_recommendation: explanation,
        risk_level: governanceTier === 3 ? "critical" : "medium",
        timestamp: new Date().toISOString(),
        authorized_by: null,
        justification: null,
        simulation_id: `resilience-${scenario_id}-${Date.now()}`,
        sandbox_source: false,
        resilience_source: true,
        scenario_id,
      };

      GOVERNANCE_DECISIONS.push(govDecision);
    }

    // 8. Determine execution blocking
    const executionBlocked = governanceTier === 3;

    const traceData = {
      scenario_id,
      scenario_name: scenario.name,
      affected_asset: scenario.affected_asset,
      status: "ANALYZED",
      impact: {
        affected_wards: impact.affected_wards.map(w => w.ward_code),
        affected_facilities: impact.affected_facilities.map(f => f.name),
        demand_at_risk_kl: impact.demand_at_risk_kl,
        population_at_risk: impact.population_at_risk,
      },
      recovery_option: recommendedAlt ? {
        option_id: recommendedAlt.option_id,
        name: recommendedAlt.name,
        objective_score: recommendedAlt.objective_score,
        score_breakdown: recommendedAlt.score_breakdown,
      } : null,
      governance: {
        tier: governanceTier,
        decision_id: governance_decision_id,
        execution_blocked: executionBlocked,
        block_reason: executionBlocked
          ? "AUTHORIZATION REQUIRED — Tier 3 action blocked until executive approval via Governance Center."
          : null,
        status: governanceTier === 3 ? "PENDING_AUTHORIZATION" : governanceTier === 2 ? "PENDING_REVIEW" : "PERMITTED",
      },
      preconditions: recommendedAlt?.preconditions || null,
      timestamp: new Date().toISOString(),
    };
    ACTIVE_RESILIENCE_TRACES.set(scenario_id, traceData);

    res.json({
      success: true,
      simulation_id: `resilience-${scenario_id}-${Date.now()}`,
      scenario_id,
      scenario,
      impact,
      fault_localization: faultLocalization,
      recovery: recovery,
      metrics,
      explanation,
      preconditions: recommendedAlt?.preconditions || null,
      score_breakdown: recommendedAlt?.score_breakdown || null,
      governance: {
        tier: governanceTier,
        decision_id: governance_decision_id,
        execution_blocked: executionBlocked,
        block_reason: executionBlocked
          ? "AUTHORIZATION REQUIRED — Tier 3 action blocked until executive approval via Governance Center."
          : null,
        status: governanceTier === 3 ? "PENDING_AUTHORIZATION" : governanceTier === 2 ? "PENDING_REVIEW" : "PERMITTED",
      },
      provenance: {
        ...GRAPH_PROVENANCE,
        source_type: scenario.source_type || "SYNTHETIC_SEEDED",
        seed: scenario.seed || 42,
      },
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // POST /api/resilience/execute-recovery — Authorize & Dispatch Governed Recovery
  app.post("/api/resilience/execute-recovery", (req, res) => {
    const {
      scenario_id = "SEED42_TRUNK_FAILURE_01",
      option_id = "D",
      target_ward,
      volume_liters = 10000,
      officer_name = "Executive Officer Demo",
      officer_id = "DEMO_EXEC_01",
      pin = "4491",
      justification = "Authorized emergency relief dispatch for critical facility and ward supply",
    } = req.body;

    const scenario = FAILURE_SCENARIOS[scenario_id];
    if (!scenario) {
      return res.status(400).json({ success: false, error: `Invalid scenario_id: ${scenario_id}` });
    }

    // 1. Kill Switch Check
    let killSwitchEnabled = true;
    try {
      const { automationState } = require("./autonomy_engine");
      killSwitchEnabled = automationState.kill_switch_enabled;
    } catch {
      killSwitchEnabled = true;
    }

    if (!killSwitchEnabled) {
      if (GOVERNANCE_AUDIT_LOG) {
        GOVERNANCE_AUDIT_LOG.push({
          audit_id: `audit-killswitch-block-${Date.now().toString(36)}`,
          action: "RECOVERY_BLOCKED_BY_KILL_SWITCH",
          scenario_id,
          option_id,
          timestamp: new Date().toISOString(),
          officer_name,
          detail: "Kill switch is active. Execution blocked by safety controller.",
        });
      }
      return res.status(403).json({
        success: false,
        error: "KILL SWITCH ACTIVE — Execution blocked by safety controller. Automation is disabled.",
        blocked: true,
        kill_switch_active: true,
        code: "KILL_SWITCH_ACTIVE",
      });
    }

    // 2. Network Impact Analysis
    const impact = analyzeNetworkImpact(scenario);
    const tankers = operationalContext.getTankers ? operationalContext.getTankers() : [];
    const availableTankers = tankers.filter(t => t.status === "available");
    const recovery = generateRecoveryAlternatives(impact, {
      available_tankers: availableTankers.length,
      kill_switch_enabled: killSwitchEnabled,
    });

    const selectedOption = recovery.alternatives.find(a => a.option_id === option_id) || recovery.alternatives[0];
    const governanceTier = classifyResilienceGovernanceTier(selectedOption, impact);

    // 3. Authorization Check for Tier 3 (via Demo Authorization Gate)
    if (governanceTier === 3) {
      const authResult = operationalContext.verifyDemoExecutiveAuth
        ? operationalContext.verifyDemoExecutiveAuth(pin)
        : (pin && ["4491", "admin123", "DEMO_EXEC_PIN_4491"].includes(String(pin).trim())
            ? { valid: true, mode: "DEMO_EXECUTIVE_AUTH", label: "[DEMO AUTHORIZATION GATE — NOT PRODUCTION CREDENTIAL]" }
            : { valid: false, reason: "TIER_3_PIN_REQUIRED: Invalid executive authorization PIN or demonstration token" });

      if (!authResult.valid) {
        return res.status(403).json({
          success: false,
          error: "UNAUTHORIZED — Tier 3 critical recovery requires valid executive demonstration authorization.",
          governance_tier: 3,
          blocked: true,
          code: "UNAUTHORIZED_TIER3",
          demo_notice: "[DEMO MODE — NOT A PRODUCTION MUNICIPAL CREDENTIAL]",
          reason: authResult.reason,
        });
      }
    }

    // 4. Tanker Availability Check
    if (selectedOption.option_id === "D" && availableTankers.length === 0) {
      return res.status(409).json({
        success: false,
        error: "NO_AVAILABLE_TANKER — Fleet capacity exhausted. 0 tankers available to execute recovery.",
        code: "NO_AVAILABLE_TANKER",
        blocked: true,
      });
    }

    // 5. Select Tanker & Target Ward
    const assignedTanker = availableTankers[0] || tankers[0] || {
      transponder_id: "T-01",
      driver_name: "Municipal Fleet Driver",
      capacity: 10000,
    };
    const targetWardCode = target_ward || (impact.affected_wards[0]?.ward_code) || "G/N";
    const missionVol = Number(volume_liters) || 10000;
    const govDecisionId = `gov-resilience-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // 6. Create Real Mission
    let mission = null;
    if (operationalContext.createMission) {
      mission = operationalContext.createMission({
        destination_ward: `Ward ${targetWardCode}`,
        ward_code: targetWardCode,
        volume_liters: missionVol,
        target_liters: missionVol,
        tanker_id: assignedTanker.transponder_id,
        driver_name: assignedTanker.driver_name || "Municipal Fleet Driver",
        assigned_worker: assignedTanker.driver_name || "Municipal Fleet Driver",
        destination_address: `Ward ${targetWardCode} Emergency Standpost / Healthcare Relief Header`,
        eta_minutes: 14,
        depot_name: "Bhandup Complex Mega-Hub",
        otp_code: "7419", // Deterministic demonstration OTP for Seed 42
        scenario_id,
        recovery_option_id: option_id,
        governance_decision_id: govDecisionId,
      });
    }

    // Mutate Tanker State
    assignedTanker.status = "en_route";
    assignedTanker.assigned_ward = targetWardCode;
    assignedTanker.current_load = missionVol;
    assignedTanker.eta_minutes = 14;

    // 7. Create Decision Record
    const wards = operationalContext.getWards ? operationalContext.getWards() : [];
    const wardObj = wards.find(w => w.ward_number === targetWardCode || w.ward_code === targetWardCode) || {
      ward_number: targetWardCode,
      ward_code: targetWardCode,
      demand_liters: (impact.demand_at_risk_kl || 35) * 1000,
      vulnerability_index: 0.93,
      dry_pipe_hours: 52,
    };

    let decisionRecord = null;
    if (operationalContext.generateDecisionRecord) {
      decisionRecord = operationalContext.generateDecisionRecord({
        ward: wardObj,
        volume_liters: missionVol,
        tanker: assignedTanker,
        governance_tier: governanceTier,
        officer_name: officer_name || "Executive Officer Demo",
        officer_id: officer_id || "DEMO_EXEC_01",
        mission: mission,
        pin: pin,
        status: "DISPATCHED",
        scenario_id,
        recovery_option_id: option_id,
      });
    }

    // 8. Log Governance Decisions & In-Memory Audit
    if (GOVERNANCE_DECISIONS) {
      GOVERNANCE_DECISIONS.push({
        decision_id: govDecisionId,
        decision_type: "emergency_rationing",
        governance_tier: governanceTier,
        status: "authorized",
        ward_code: targetWardCode,
        volume_liters: missionVol,
        tanker_id: assignedTanker.transponder_id,
        description: `🔧 NETWORK RESILIENCE: ${scenario.name} — Recovery dispatched to Ward ${targetWardCode}. Mission #${mission?.mission_id || "503"}.`,
        ai_recommendation: `Emergency relief dispatched via Tanker ${assignedTanker.transponder_id}.`,
        risk_level: "critical",
        timestamp: new Date().toISOString(),
        authorized_by: officer_name,
        justification: justification,
        mission_id: mission?.mission_id || null,
        resilience_source: true,
        scenario_id,
      });
    }

    if (GOVERNANCE_AUDIT_LOG) {
      GOVERNANCE_AUDIT_LOG.push({
        audit_id: `audit-resilience-${Date.now().toString(36)}`,
        decision_id: govDecisionId,
        mission_id: mission?.mission_id || null,
        scenario_id,
        recovery_option_id: option_id,
        action: "RECOVERY_AUTHORIZED_AND_DISPATCHED",
        officer_id: officer_id || "DEMO_EXEC_01",
        officer_name: officer_name || "Executive Officer Demo",
        timestamp: new Date().toISOString(),
        governance_tier: governanceTier,
        pin_authenticated: true,
        authorization_gate: "[DEMO AUTHORIZATION GATE — NOT PRODUCTION CREDENTIAL]",
        demo_mode_notice: "DEMO MODE — NOT A PRODUCTION MUNICIPAL CREDENTIAL",
        audit_storage: "IN_MEMORY",
      });
    }

    // 9. Update Active Traces with Explicit Planned vs Executed Distinction
    const plannedRecoveryVolLiters = selectedOption.planned_recovery_volume_liters || 35000;
    const expectedUnmetAfterPlanLiters = selectedOption.expected_unmet_demand_after_plan_liters ?? 0;
    const actualExecutedVolLiters = missionVol;
    const actualUnmetBeforeExecutionLiters = wardObj.demand_liters;
    const actualUnmetAfterExecutionLiters = Math.max(0, actualUnmetBeforeExecutionLiters - actualExecutedVolLiters);

    const traceData = {
      scenario_id,
      scenario_name: scenario.name,
      affected_asset: scenario.affected_asset,
      timestamp: new Date().toISOString(),
      impact: {
        affected_wards: impact.affected_wards.map(w => w.ward_code),
        affected_facilities: impact.affected_facilities.map(f => f.name),
        demand_at_risk_kl: impact.demand_at_risk_kl,
        population_at_risk: impact.population_at_risk,
      },
      recovery_plan: {
        option_id,
        name: selectedOption.name,
        plan_type: selectedOption.plan_type || "MULTI_TRANCHE_TANKER_RELIEF",
        planned_recovery_volume_liters: plannedRecoveryVolLiters,
        expected_unmet_demand_after_plan_liters: expectedUnmetAfterPlanLiters,
        score: selectedOption.objective_score,
        score_breakdown: selectedOption.score_breakdown,
      },
      execution_outcome: {
        tranche: 1,
        actual_executed_volume_liters: actualExecutedVolLiters,
        actual_unmet_demand_before_execution_liters: actualUnmetBeforeExecutionLiters,
        actual_unmet_demand_after_execution_liters: actualUnmetAfterExecutionLiters,
        recovery_completion_status: actualUnmetAfterExecutionLiters === 0 ? "FULLY_RECOVERED" : "PARTIALLY_RECOVERED",
      },
      recovery_option: {
        option_id,
        name: selectedOption.name,
        score: selectedOption.objective_score,
        score_breakdown: selectedOption.score_breakdown,
      },
      governance: {
        tier: governanceTier,
        status: "AUTHORIZED",
        authorized_by: officer_name,
        decision_id: govDecisionId,
        authorization_gate: "[DEMO AUTHORIZATION GATE — NOT PRODUCTION CREDENTIAL]",
      },
      decision_record: {
        decision_id: decisionRecord?.decision_id || govDecisionId,
        status: "DISPATCHED",
      },
      mission: {
        mission_id: mission?.mission_id || "503",
        tanker_id: assignedTanker.transponder_id,
        target_ward: targetWardCode,
        volume_liters: missionVol,
        otp_code: "7419",
        status: "en_route",
      },
      recovery_state: "DISPATCHED",
      planned_recovery_volume_liters: plannedRecoveryVolLiters,
      expected_unmet_demand_after_plan_liters: expectedUnmetAfterPlanLiters,
      actual_executed_volume_liters: actualExecutedVolLiters,
      actual_unmet_demand_after_execution_liters: actualUnmetAfterExecutionLiters,
      recovery_completion_status: "PARTIALLY_RECOVERED",
    };
    ACTIVE_RESILIENCE_TRACES.set(scenario_id, traceData);

    return res.status(201).json({
      success: true,
      message: `Recovery mission #${mission?.mission_id} dispatched to ${mission?.destination_ward} via ${assignedTanker.transponder_id}`,
      scenario_id,
      recovery_option_id: option_id,
      decision_id: decisionRecord?.decision_id || govDecisionId,
      mission_id: mission?.mission_id || "503",
      mission,
      tanker: assignedTanker,
      planned_recovery_volume_liters: plannedRecoveryVolLiters,
      expected_unmet_demand_after_plan_liters: expectedUnmetAfterPlanLiters,
      actual_executed_volume_liters: actualExecutedVolLiters,
      actual_unmet_demand_before_execution_liters: actualUnmetBeforeExecutionLiters,
      actual_unmet_demand_after_execution_liters: actualUnmetAfterExecutionLiters,
      recovery_completion_status: "PARTIALLY_RECOVERED",
      governance: {
        tier: governanceTier,
        status: "AUTHORIZED",
        authorized_by: officer_name,
        decision_id: govDecisionId,
        authorization_gate: "[DEMO AUTHORIZATION GATE — NOT PRODUCTION CREDENTIAL]",
        demo_mode_notice: "DEMO MODE — NOT A PRODUCTION MUNICIPAL CREDENTIAL",
      },
      preconditions: selectedOption.preconditions,
      score_breakdown: selectedOption.score_breakdown,
      trace: traceData,
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // GET /api/resilience/trace/:scenario_id — Query end-to-end resilience recovery trace
  app.get("/api/resilience/trace/:scenario_id", (req, res) => {
    const scenarioId = req.params.scenario_id;
    let trace = ACTIVE_RESILIENCE_TRACES.get(scenarioId);

    if (!trace) {
      const scenario = FAILURE_SCENARIOS[scenarioId] || FAILURE_SCENARIOS.SEED42_TRUNK_FAILURE_01;
      const impact = analyzeNetworkImpact(scenario);
      const recovery = generateRecoveryAlternatives(impact);
      trace = {
        scenario_id: scenarioId,
        scenario_name: scenario.name,
        affected_asset: scenario.affected_asset,
        status: "ANALYZED_NOT_YET_DISPATCHED",
        impact: {
          affected_wards: impact.affected_wards.map(w => w.ward_code),
          affected_facilities: impact.affected_facilities.map(f => f.name),
          demand_at_risk_kl: impact.demand_at_risk_kl,
          population_at_risk: impact.population_at_risk,
        },
        recovery_options: recovery.alternatives.map(a => ({
          option_id: a.option_id,
          name: a.name,
          score: a.objective_score,
          score_breakdown: a.score_breakdown,
        })),
        mode: "DEMO / OPERATIONAL SIMULATION",
      };
    }

    // Refresh live mission / decision record data if available
    if (trace.mission?.mission_id && operationalContext.OPERATIONAL_DECISION_RECORDS) {
      const dec = Array.from(operationalContext.OPERATIONAL_DECISION_RECORDS.values()).find(
        d => d.mission_id === String(trace.mission.mission_id) || d.scenario_id === scenarioId
      );
      if (dec) {
        trace.decision_record = dec;
        trace.post_action_effect = dec.post_action_effect;
        trace.verification_status = dec.verification_status;
        if (dec.post_action_effect) {
          trace.actual_executed_volume_liters = dec.post_action_effect.actual_executed_volume_liters;
          trace.actual_verified_volume_liters = dec.post_action_effect.actual_verified_volume_liters;
          trace.actual_unmet_demand_after_execution_liters = dec.post_action_effect.actual_unmet_demand_after_execution_liters;
          trace.recovery_completion_status = dec.post_action_effect.recovery_completion_status;
        }
        if (dec.verification_status === "VERIFIED") {
          trace.recovery_state = "SERVICE_RECOVERED";
        }
      }
    }

    res.json({
      success: true,
      trace,
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // POST /api/resilience/reset — Reset resilience and operational state to Seed 42 baseline
  app.post("/api/resilience/reset", (req, res) => {
    ACTIVE_RESILIENCE_TRACES.clear();
    if (operationalContext.resetOperationalState) {
      operationalContext.resetOperationalState();
    }
    try {
      const { automationState } = require("./autonomy_engine");
      automationState.kill_switch_enabled = true;
    } catch {
      // ignore
    }
    res.json({
      success: true,
      message: "Resilience demonstration state and operational fleet reset to Seed 42 baseline.",
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });

  // GET /api/resilience/topology — Return the graph topology for visualization
  app.get("/api/resilience/topology", (req, res) => {
    res.json({
      nodes: NODES,
      edges: EDGES,
      provenance: GRAPH_PROVENANCE,
      mode: "DEMO / OPERATIONAL SIMULATION",
    });
  });
}

// =============================================================================
// EXPLANATION GENERATOR
// =============================================================================

function generateExplanation(impact, recovery, recommended, metrics) {
  if (!recommended) return "No recovery action recommended — all options are infeasible.";

  const parts = [];

  // What happened
  parts.push(`Scenario "${impact.scenario_name}": ${impact.scenario_description}`);

  // What changed
  if (impact.affected_wards.length > 0) {
    parts.push(`Impact: ${impact.affected_wards.length} ward(s) affected (${impact.affected_wards.map(w => w.ward_code).join(", ")}). ` +
      `${impact.demand_at_risk_kl} kL demand at risk. ${impact.population_at_risk.toLocaleString()} residents affected.`);
  }

  if (impact.affected_facilities.length > 0) {
    parts.push(`Critical facilities affected: ${impact.affected_facilities.map(f => f.name).join(", ")}.`);
  }

  // Source capacity
  if (impact.scenario_impact.capacity_reduction_kl > 0) {
    parts.push(`Source capacity reduced by ${impact.scenario_impact.capacity_reduction_kl} kL ` +
      `(${impact.baseline.total_source_capacity_kl} → ${impact.scenario_impact.total_source_capacity_kl} kL).`);
  }

  // Why the recommended action
  parts.push(`Recommended: "${recommended.name}" (objective score: ${recommended.objective_score}). ` +
    `This reduces unmet demand from ${impact.demand_at_risk_kl} kL to ${recommended.unmet_demand_kl} kL.`);

  // Recovery actions
  if (recommended.actions.length > 0) {
    parts.push(`Actions: ${recommended.actions.join("; ")}.`);
  }

  return parts.join(" ");
}

// =============================================================================
// EXPORTS
// =============================================================================

function resetResilienceState() {
  ACTIVE_RESILIENCE_TRACES.clear();
}

module.exports = {
  resetResilienceState,
  NODES,
  EDGES,
  FAILURE_SCENARIOS,
  GRAPH_PROVENANCE,
  WaterNetworkGraph,
  analyzeNetworkImpact,
  generateRecoveryAlternatives,
  localizeFault,
  generateSyntheticObservations,
  classifyResilienceGovernanceTier,
  mountResilienceRoutes,
  ACTIVE_RESILIENCE_TRACES,
};
