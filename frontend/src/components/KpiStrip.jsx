import {
  Droplet,
  Truck,
  Droplets,
  ArrowUpRight,
  BarChart2,
  AlertTriangle,
} from "lucide-react";

const KPI_CONFIGS = [
  {
    key: "active_requests",
    label: "Active Requests",
    icon: Droplet,
    getValue: (k) => k.active_requests,
    getDelta: () => "+12%",
    deltaColor: "text-warm-amber",
    iconBg: "bg-blue-50",
    iconColor: "text-deep-blue",
    valueColor: "text-head-text",
  },
  {
    key: "fleet_available",
    label: "Fleet Available",
    icon: Truck,
    getValue: (k) => k.fleet_available,
    getSuffix: (k) => `/${k.fleet_total}`,
    getExtra: (k) =>
      k.fleet_total > 0
        ? `${Math.round((k.fleet_available / k.fleet_total) * 100)}%`
        : "",
    extraColor: "text-deep-blue",
    iconBg: "bg-blue-50",
    iconColor: "text-deep-blue",
    valueColor: "text-head-text",
  },
  {
    key: "water_available",
    label: "Water Available",
    icon: Droplets,
    getValue: (k) => k.water_available_kl,
    getSuffix: () => "KL",
    getExtra: (k) => `${k.water_pct}% bal`,
    extraColor: "text-olive-green",
    iconBg: "bg-blue-50",
    iconColor: "text-deep-blue",
    valueColor: "text-head-text",
  },
  {
    key: "unmet_demand",
    label: "Unmet Demand",
    icon: ArrowUpRight,
    getValue: (k) => k.unmet_demand_kl,
    getSuffix: () => "KL",
    getDelta: () => "↑14%",
    deltaColor: "text-crit-red",
    iconBg: "bg-amber-50",
    iconColor: "text-warm-amber",
    valueColor: "text-warm-amber",
  },
  {
    key: "equity_index",
    label: "Equity Index",
    icon: BarChart2,
    getValue: (k) => `${k.equity_index}%`,
    getExtra: () => ">90% tgt",
    extraColor: "text-sec-text",
    iconBg: "bg-emerald-50",
    iconColor: "text-olive-green",
    valueColor: "text-olive-green",
  },
  {
    key: "critical_alerts",
    label: "Critical Alerts",
    icon: AlertTriangle,
    getValue: (k) => k.critical_alerts,
    getExtra: () => "Wards >48h",
    extraColor: "text-warm-amber",
    iconBg: "bg-amber-100",
    iconColor: "text-warm-amber",
    valueColor: "text-warm-amber",
  },
];

export default function KpiStrip({ kpis }) {
  if (!kpis) return null;

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
      {KPI_CONFIGS.map((cfg) => {
        const Icon = cfg.icon;
        return (
          <div
            key={cfg.key}
            className="bg-white rounded-lg px-2.5 py-1.5 border border-card-border shadow-2xs flex items-center justify-between animate-fade-in"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-sec-text uppercase tracking-wider truncate">
                {cfg.label}
              </div>
              <div className="flex items-baseline space-x-1">
                <span className={`text-lg font-black ${cfg.valueColor}`}>
                  {cfg.getValue(kpis)}
                </span>
                {cfg.getSuffix && (
                  <span className="text-[11px] font-bold text-sec-text">
                    {cfg.getSuffix(kpis)}
                  </span>
                )}
                {cfg.getDelta && (
                  <span
                    className={`text-[10px] font-bold ${cfg.deltaColor} ml-1`}
                  >
                    {cfg.getDelta(kpis)}
                  </span>
                )}
                {cfg.getExtra && (
                  <span
                    className={`text-[10px] font-semibold ${cfg.extraColor} ml-0.5 truncate`}
                  >
                    {cfg.getExtra(kpis)}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`p-1 rounded ${cfg.iconBg} ${cfg.iconColor} shrink-0`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
          </div>
        );
      })}
    </section>
  );
}
