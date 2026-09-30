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
    name: "Normal Operations",
    description: "All network components operational. No failures.",
    disabled_edges: [],
    disabled_nodes: [],
    capacity_reductions: {},
  },
  SINGLE_PIPE_FAILURE: {
    id: "SINGLE_PIPE_FAILURE",
    name: "Single Pipe Failure",
    description: "SYNTHETIC SCENARIO: Trunk main E005 (Trombay → Kurla) fails. Affects eastern distribution.",
    disabled_edges: ["E005"],
    disabled_nodes: [],
    capacity_reductions: {},
  },
  SOURCE_CAPACITY_REDUCTION: {
    id: "SOURCE_CAPACITY_REDUCTION",
    name: "Source Capacity Reduction",
    description: "SYNTHETIC SCENARIO: Bhandup WTP capacity reduced to 50% due to treatment plant maintenance.",
    disabled_edges: [],
    disabled_nodes: [],
    capacity_reductions: { "SRC-BHANDUP": 0.50 },
  },
  VALVE_UNAVAILABLE: {
    id: "VALVE_UNAVAILABLE",
    name: "Valve Unavailable",
    description: "SYNTHETIC SCENARIO: Isolation valve V-009 (Powai → Kurla) stuck open. Cannot isolate segment for repair.",
    disabled_edges: [],
    disabled_nodes: [],
    capacity_reductions: {},
    unavailable_valves: ["V-009"],
  },
  MULTIPLE_FAILURES: {
    id: "MULTIPLE_FAILURES",
    name: "Multiple Failures",
    description: "SYNTHETIC SCENARIO: Trunk main E005 fails AND Bhandup WTP at 60% capacity. Compound disruption.",
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

  return {
    scenario_id: scenario.id,
    scenario_name: scenario.name,
    scenario_description: scenario.description,
    provenance: GRAPH_PROVENANCE,
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
    })),
    demand_at_risk_kl: demandAtRisk,
    population_at_risk: populationAtRisk,
    alternative_paths: alternativePaths,
    isolation_candidates: isolationCandidates,
    timestamp: new Date().toISOString(),
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
function generateRecoveryAlternatives(impact) {
  const alternatives = [];

  // === Option A: No Intervention ===
  alternatives.push({
    option_id: "A",
    name: "No Intervention",
    description: "Take no corrective action. Allow natural network rerouting if any alternative paths exist.",
    feasible: true,
    unmet_demand_kl: impact.demand_at_risk_kl,
    population_still_affected: impact.population_at_risk,
    critical_facilities_affected: impact.affected_facilities.length,
    operational_cost_units: 0,
    estimated_restoration_hours: null,
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
      description: `Close isolation valves to contain failure. ${impact.isolation_candidates.length} valve(s) available.`,
      feasible: true,
      unmet_demand_kl: reducedDemand,
      population_still_affected: Math.round(impact.population_at_risk * 0.7),
      critical_facilities_affected: impact.affected_facilities.length, // Facilities may still be cut off
      operational_cost_units: impact.isolation_candidates.length * 2, // ~2 units per valve operation
      estimated_restoration_hours: 4,
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

    alternatives.push({
      option_id: "C",
      name: "Reroute via Alternative Path",
      description: `Use alternative distribution paths. ${Object.keys(impact.alternative_paths).length} ward(s) can be rerouted.`,
      feasible: true,
      unmet_demand_kl: remainingUnmet,
      population_still_affected: Math.round(impact.population_at_risk * (remainingUnmet / Math.max(1, impact.demand_at_risk_kl))),
      critical_facilities_affected: 0, // Assume facilities can be rerouted if any path exists
      operational_cost_units: Object.keys(impact.alternative_paths).length * 3,
      estimated_restoration_hours: 2,
      actions: Object.entries(impact.alternative_paths).map(([wardId, path]) =>
        `Reroute ${wardId} via ${path.path.join(" → ")} (${path.distance_km} km)`
      ),
      objective_score: null,
    });
  }

  // === Option D: Emergency Tanker Dispatch ===
  // Always feasible as a fallback using existing allocation/tanker system
  const tankerCapacityKl = 10; // Average tanker capacity in kL
  const tankersNeeded = Math.ceil(impact.demand_at_risk_kl / tankerCapacityKl);
  alternatives.push({
    option_id: "D",
    name: "Emergency Tanker Dispatch",
    description: `Deploy ${tankersNeeded} tanker(s) to serve affected wards via existing allocation system. Uses WaterFlow OS allocation and routing engine.`,
    feasible: tankersNeeded <= 25, // Fleet size constraint
    unmet_demand_kl: tankersNeeded <= 25 ? 0 : Math.max(0, impact.demand_at_risk_kl - 25 * tankerCapacityKl),
    population_still_affected: tankersNeeded <= 25 ? 0 : Math.round(impact.population_at_risk * 0.2),
    critical_facilities_affected: 0,
    operational_cost_units: tankersNeeded * 10,
    estimated_restoration_hours: 1 + Math.ceil(tankersNeeded / 5), // Dispatch time scales
    actions: [`Dispatch ${Math.min(tankersNeeded, 25)} tankers to ${impact.affected_wards.map(w => w.ward_code).join(", ")}`],
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
    alt.objective_score = Math.round((
      alt.unmet_demand_kl * WEIGHTS.unmet_demand +
      alt.critical_facilities_affected * WEIGHTS.critical_facility_penalty +
      alt.population_still_affected * WEIGHTS.vulnerable_population +
      alt.operational_cost_units * WEIGHTS.operational_cost
    ) * 100) / 100;

    alt.objective_weights = { ...WEIGHTS };
    alt.objective_formula = "unmet_demand_kl × 1.0 + critical_facilities × 50.0 + population_affected × 0.001 + operational_cost × 0.1";
  }

  // Sort by objective score (lower is better), infeasible last
  alternatives.sort((a, b) => {
    if (a.feasible && !b.feasible) return -1;
    if (!a.feasible && b.feasible) return 1;
    return a.objective_score - b.objective_score;
  });

  // Mark the recommended option
  if (alternatives.length > 0 && alternatives[0].feasible) {
    alternatives[0].recommended = true;
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
          score_explanation: `${consistentCount} evidence points from ${observations.length} observations (normalized)`,
          evidence_matches: evidenceMatches,
          assumptions: [
            "Score is a heuristic consistency measure, NOT a calibrated probability",
            "Observations are SYNTHETIC — generated for demonstration",
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
    observation_source: "SYNTHETIC",
    methodology: "Deterministic topological consistency scoring: count of observations consistent with each candidate edge, normalized by total possible evidence. NOT a calibrated probability.",
    missing_observations: [
      "Real-time pressure sensor data (not available in demo)",
      "Flow meter readings (not available in demo)",
      "Acoustic leak detection (not available in demo)",
    ],
  };
}

// =============================================================================
// GOVERNANCE INTEGRATION
// =============================================================================

/**
 * Classify the governance tier for a resilience action.
 */
function classifyResilienceGovernanceTier(recovery) {
  if (!recovery) return 1;

  // Tier 3: Actions affecting critical facilities or large populations
  if (recovery.critical_facilities_affected > 0) return 3;
  if (recovery.population_still_affected > 500000) return 3;
  if (recovery.unmet_demand_kl > 100) return 3;

  // Tier 2: Moderate impact, isolation actions
  if (recovery.option_id === "B") return 2; // Valve isolation requires operator review
  if (recovery.population_still_affected > 100000) return 2;
  if (recovery.unmet_demand_kl > 30) return 2;

  // Tier 1: Low-risk, reversible actions
  return 1;
}

// =============================================================================
// EXPRESS ROUTE HANDLERS
// =============================================================================

function mountResilienceRoutes(app, GOVERNANCE_DECISIONS, GOVERNANCE_AUDIT_LOG) {
  // GET /api/resilience/scenarios — List available failure scenarios
  app.get("/api/resilience/scenarios", (req, res) => {
    res.json({
      scenarios: Object.values(FAILURE_SCENARIOS),
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

    // 1. Analyze network impact
    const impact = analyzeNetworkImpact(scenario);

    // 2. Localize fault (if applicable)
    const faultLocalization = localizeFault(scenario_id);

    // 3. Generate recovery alternatives
    const recovery = generateRecoveryAlternatives(impact);

    // 4. Determine governance tier for the recommended action
    const recommendedAlt = recovery.alternatives.find(a => a.recommended);
    const governanceTier = classifyResilienceGovernanceTier(recommendedAlt);

    // 5. Compute before/after metrics
    const beforeMetrics = {
      connected_wards: impact.baseline.reachable_from_sources - [...new WaterNetworkGraph().build(NODES, EDGES) || []].length,
      total_source_capacity_kl: impact.baseline.total_source_capacity_kl,
      total_ward_demand_kl: impact.baseline.total_ward_demand_kl,
      unmet_demand_kl: 0,
    };

    // Recompute connected ward count properly
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
        connected_wards: scenConnectedWards + impact.affected_wards.length, // Optimistic for recovery
        unmet_demand_kl: recommendedAlt.unmet_demand_kl,
        population_served: (metrics?.before?.population_served || 0) - (recommendedAlt.population_still_affected || 0),
      } : null,
    };
    // Fix circular reference
    if (metrics.after_recovery) {
      metrics.after_recovery.population_served = metrics.before.population_served - (recommendedAlt?.population_still_affected || 0);
    }

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
      };

      GOVERNANCE_DECISIONS.push(govDecision);
    }

    // 8. Determine execution blocking
    const executionBlocked = governanceTier === 3;

    res.json({
      success: true,
      simulation_id: `resilience-${scenario_id}-${Date.now()}`,
      impact,
      fault_localization: faultLocalization,
      recovery: recovery,
      metrics,
      explanation,
      governance: {
        tier: governanceTier,
        decision_id: governance_decision_id,
        execution_blocked: executionBlocked,
        block_reason: executionBlocked
          ? "AUTHORIZATION REQUIRED — Tier 3 action blocked until executive approval via Governance Center."
          : null,
        status: governanceTier === 3 ? "PENDING_AUTHORIZATION" : governanceTier === 2 ? "PENDING_REVIEW" : "PERMITTED",
      },
      provenance: GRAPH_PROVENANCE,
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

module.exports = {
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
};
