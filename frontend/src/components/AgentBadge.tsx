import type { AgentStatus, AgentStatusType } from "../types";

const STATUS_CONFIG: Record<AgentStatusType, { dot: string; label: string }> = {
  running: { dot: "bg-green-400 animate-pulse", label: "稼働中" },
  idle:    { dot: "bg-slate-400",               label: "待機中" },
  error:   { dot: "bg-red-400",                 label: "エラー" },
};

interface AgentBadgeProps {
  status: AgentStatus;
}

export function AgentBadge({ status }: AgentBadgeProps) {
  const config = STATUS_CONFIG[status.status];

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      <span>🤖 {status.agentId}</span>
      <span className="text-slate-400">·</span>
      <span>{config.label}</span>
      {status.step && (
        <span className="max-w-32 truncate text-slate-500">— {status.step}</span>
      )}
    </div>
  );
}
