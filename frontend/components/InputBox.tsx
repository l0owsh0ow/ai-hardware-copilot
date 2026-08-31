"use client";

import {
  ArrowRight,
  Car,
  ChevronDown,
  Eraser,
  Home,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Watch,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EXAMPLES: { text: string; short: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { short: "低功耗蓝牙温湿度传感器", text: "我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上，最好能用 I2C 接口，预算 50 元以内", Icon: Thermometer },
  { short: "智能家居环境监测站", text: "做一个智能家居环境监测站，WiFi 连接上传数据到服务器，需要测温度湿度 PM2.5，USB 供电", Icon: Home },
  { short: "电赛智能小车控制器", text: "电赛智能小车，需要电机驱动、红外避障、蓝牙遥控、OLED 显示，12V 电池供电", Icon: Car },
  { short: "可穿戴心率监测手环", text: "可穿戴心率监测手环，用蓝牙传数据到手机，电池供电至少一周，带 OLED 显示", Icon: Watch },
];

const LOADING_TEXTS = ["正在提取关键参数", "正在匹配元器件类型", "正在计算功耗和预算", "解析完成"];

export default function InputBox({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [power, setPower] = useState("自动推断");
  const [budget, setBudget] = useState("不限");
  const [comm, setComm] = useState("自动推断");
  const [scene, setScene] = useState("自动推断");
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [barWidth, setBarWidth] = useState("0%");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setLoadingIdx(0);
      setBarWidth("0%");
      let idx = 0;
      timerRef.current = setInterval(() => {
        idx += 1;
        setLoadingIdx(Math.min(idx, LOADING_TEXTS.length - 1));
        setBarWidth(`${(idx / LOADING_TEXTS.length) * 100}%`);
      }, 800);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  function buildRequest(): string {
    const options: string[] = [];
    if (power !== "自动推断") options.push(`供电方式：${power}`);
    if (budget !== "不限") options.push(`预算：${budget}`);
    if (comm !== "自动推断") options.push(`通信方式：${comm}`);
    if (scene !== "自动推断") options.push(`使用场景：${scene}`);
    if (options.length === 0) return text;
    return `${text}\n补充参数：${options.join("；")}`;
  }

  function submit() {
    const req = buildRequest().trim();
    if (req && !loading) onSubmit(req);
  }

  const selects = [
    { label: "供电方式", value: power, set: setPower, options: ["自动推断", "电池供电", "USB 5V", "12V 适配器", "太阳能"] },
    { label: "预算范围", value: budget, set: setBudget, options: ["不限", "20 元以内", "50 元以内", "100 元以内", "200 元以内"] },
    { label: "通信方式", value: comm, set: setComm, options: ["自动推断", "蓝牙", "WiFi", "LoRa", "有线串口", "不需要"] },
    { label: "使用场景", value: scene, set: setScene, options: ["自动推断", "室内", "室外", "可穿戴", "工业环境"] },
  ];

  if (loading) {
    return (
      <div className="volt-card mx-auto max-w-3xl p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg className="h-7 w-7 animate-spin text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-ink-900">AI 正在解析你的需求...</h2>
          <p className="text-sm text-ink-500">{LOADING_TEXTS[loadingIdx]}</p>
        </div>

        <div className="mx-auto mb-8 max-w-xs">
          <div className="loading-bar-track">
            <div className="loading-bar-fill" style={{ width: barWidth }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-xs text-ink-400">
            <span>步骤 {Math.min(loadingIdx + 1, 4)}/4</span>
            <span>预计 3 秒</span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-ink-100 bg-white p-4">
              <div className="skeleton mb-2 h-3 w-16 rounded-full" />
              <div className="skeleton h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-6">
          <div className="skeleton mb-4 h-4 w-40 rounded-full" />
          <div className="space-y-3">
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-3/4 rounded-full" />
            <div className="skeleton h-3 w-5/6 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="volt-card mx-auto max-w-3xl overflow-hidden shadow-[0_34px_80px_rgba(15,31,61,.18)]">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-ink-100 bg-gradient-to-r from-brand-50/70 to-transparent px-6 py-4">
        <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-800">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
            <MessageSquareText className="h-4 w-4" />
          </span>
          项目需求描述
        </label>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-success-600">
          <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-success-500" />
          本地解析
        </span>
      </div>

      <div className="px-6 pt-5">
        <textarea
          rows={4}
          maxLength={500}
          className="scrollbar-thin w-full resize-none rounded-2xl border border-ink-100 bg-ink-50/50 px-4 py-3.5 text-sm leading-relaxed text-ink-800 outline-none transition-all placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          placeholder="例如：我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上，最好能用 I2C 接口，预算 50 元以内..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink-300">Ctrl + Enter 快速提交</span>
          <span className={`font-mono text-[11px] ${text.length > 450 ? "text-warning-600" : "text-ink-400"}`}>
            {text.length} / 500
          </span>
        </div>

        {/* 快速示例 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-300">
            <Sparkles className="h-3 w-3 text-brand-400" />
            示例
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.short}
              type="button"
              onClick={() => setText(ex.text)}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-100/70 bg-brand-50/60 px-3 py-1.5 text-xs font-medium text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-100/70 active:scale-[.97]"
            >
              <ex.Icon className="h-3 w-3" />
              {ex.short}
            </button>
          ))}
        </div>
      </div>

      {/* 补充参数：一体式分段参数条 */}
      <div className="px-6 pt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-500">补充参数</span>
          <span className="text-[11px] text-ink-400">不填则 AI 自动推断</span>
        </div>
        <div className="grid grid-cols-2 divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm md:grid-cols-4 md:divide-x md:divide-y-0">
          {selects.map((s) => (
            <div key={s.label} className="group relative border-b border-ink-100 px-4 py-3 transition-colors hover:bg-brand-50/40 md:border-b-0">
              <div className="text-[11px] font-medium text-ink-400">{s.label}</div>
              <div className="relative mt-0.5">
                <select
                  className="w-full cursor-pointer appearance-none bg-transparent pr-6 text-[13.5px] font-semibold text-ink-800 outline-none transition-colors group-hover:text-brand-700"
                  value={s.value}
                  onChange={(e) => s.set(e.target.value)}
                >
                  {s.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300 transition-colors group-hover:text-brand-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-gradient-to-r from-ink-50/80 to-white px-6 py-4">
        <div className="flex items-center gap-1.5 text-xs text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5 text-success-500" />
          数据来源：立创商城 / 官方 Datasheet
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setText("")}
            className="btn-secondary !py-2 text-sm"
          >
            <Eraser className="h-4 w-4" />
            清空
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="btn-primary"
          >
            <span>开始选型</span>
            <span className="arr">
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
