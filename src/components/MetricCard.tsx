import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subValue?: string;
  subtitle?: string;
  color?: string;
  badge?: string;
  icon?: LucideIcon | React.ReactNode;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subValue,
  subtitle,
  color = 'text-white',
  badge,
  icon,
  iconBg = 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  trend,
  onClick,
}) => {
  const displaySub = subValue || subtitle;
  const displayBadge = badge || (trend ? trend.value : undefined);
  const badgeColor = trend
    ? trend.isPositive
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    : 'bg-white/5 border-white/10 text-slate-300';

  const renderIcon = () => {
    if (!icon) return null;
    // Check if icon is already a React Element (JSX)
    if (React.isValidElement(icon)) {
      return (
        <div className={`p-2.5 rounded-xl ${iconBg} shrink-0 flex items-center justify-center`}>
          {icon}
        </div>
      );
    }
    // Otherwise treat as a component (e.g. LucideIcon function)
    const IconComponent = icon as LucideIcon;
    return (
      <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
        <IconComponent size={18} className="sm:w-5 sm:h-5" />
      </div>
    );
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-[#111116] p-5 rounded-2xl border border-white/5 hover:border-white/15 transition-all duration-200 group ${
        onClick ? 'cursor-pointer hover:border-blue-500/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-slate-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">
            {title}
          </p>
          <h3 className={`text-xl sm:text-2xl font-black mt-1 tracking-tight truncate ${color === 'text-slate-900' ? 'text-white' : color}`}>
            {value}
          </h3>
        </div>
        {renderIcon()}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2.5 flex-wrap sm:flex-nowrap">
        {displaySub && (
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate flex-1" title={displaySub}>
            {displaySub}
          </p>
        )}
        {displayBadge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeColor}`}>
            {displayBadge}
          </span>
        )}
      </div>
    </div>
  );
};

