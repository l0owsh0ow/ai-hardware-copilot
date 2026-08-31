"use client";

import {
  Activity as ActivityIcon,
  BatteryCharging as BatteryChargingIcon,
  Bluetooth as BluetoothIcon,
  Clock as ClockIcon,
  MapPin as MapPinIcon,
  Pencil,
  Plug as PlugIcon,
  Wallet as WalletIcon,
  ZapOff as ZapOffIcon,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  应用场景: MapPinIcon,
  供电方式: BatteryChargingIcon,
  功耗要求: ZapOffIcon,
  工作时长: ClockIcon,
  通信方式: BluetoothIcon,
  接口类型: PlugIcon,
  工作电压: ActivityIcon,
  预算限制: WalletIcon,
};

export default function ParamCard({
  name,
  value,
  editable,
  onChange,
}: {
  name: string;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
}) {
  const Icon = ICONS[name];
  return (
    <div className="card-hover rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-ink-400">
        {Icon && <Icon className="h-3 w-3" />}
        {name}
      </div>
      {editable ? (
        <div className="flex items-center gap-1">
          <input
            className="w-full border-none bg-transparent font-mono text-sm font-medium text-ink-800 outline-none"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
          <Pencil className="h-3 w-3 shrink-0 cursor-pointer text-brand-500 hover:text-brand-700" />
        </div>
      ) : (
        <div className="flex items-center gap-1 font-mono text-sm font-medium text-ink-800">
          {value || "未填写"}
          {onChange && <Pencil className="h-3 w-3 cursor-pointer text-brand-500 hover:text-brand-700" />}
        </div>
      )}
    </div>
  );
}
