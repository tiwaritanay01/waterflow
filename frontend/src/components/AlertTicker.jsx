export default function AlertTicker({ alerts }) {
  const displayAlerts = alerts || [];

  const severityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "text-crit-red";
      case "warning":
        return "text-warm-amber";
      default:
        return "text-sec-text";
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-white rounded-xl border border-card-border shadow-sm p-2.5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-card-border shrink-0">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-crit-red" />
          <h4 className="font-extrabold text-xs text-head-text">
            Active Alert Dispatch Ticker
          </h4>
        </div>
        <span className="text-[9px] font-bold text-crit-red bg-red-50 border border-red-200 px-1 rounded">
          {displayAlerts.length} Real-Time
        </span>
      </div>

      {/* Alert stream */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll divide-y divide-card-border/60 space-y-1 pr-1 mt-1">
        {displayAlerts.map((alert, idx) => (
          <div
            key={alert.id || idx}
            className="pt-1.5 pb-1 flex items-start space-x-2 animate-fade-in"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <span className={`${severityColor(alert.severity)} text-xs mt-0.5`}>
              ●
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-head-text">
                  {alert.title}
                </span>
                <span
                  className={`text-[9px] font-mono ${severityColor(
                    alert.severity
                  )} font-bold`}
                >
                  {alert.badge_text}
                </span>
              </div>
              <p className="text-[10px] text-sec-text truncate">
                {alert.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-1.5 border-t border-card-border flex items-center justify-between text-[10px] text-sec-text shrink-0">
        <span>SCADA Bridge Telemetry: 100% Active</span>
        <button className="text-deep-blue font-bold hover:underline">
          View All Alerts
        </button>
      </div>
    </div>
  );
}
