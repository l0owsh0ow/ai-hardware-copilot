"use client";

import { ArrowRight, Car, Eraser, Home, MessageSquareText, ShieldCheck, SlidersHorizontal, Sparkles, Thermometer, Watch } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

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

  const selects: { label: string; value: string; set: (v: string) => void; options: string[] }[] = [
    { label: "供电方式", value: power, set: setPower, options: ["自动推断", "电池供电", "USB 5V", "12V 适配器", "太阳能"] },
    { label: "预算范围", value: budget, set: setBudget, options: ["不限", "20 元以内", "50 元以内", "100 元以内", "200 元以内"] },
    { label: "通信方式", value: comm, set: setComm, options: ["自动推断", "蓝牙", "WiFi", "LoRa", "有线串口", "不需要"] },
    { label: "使用场景", value: scene, set: setScene, options: ["自动推断", "室内", "室外", "可穿戴", "工业环境"] },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 shadow-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg className="h-7 w-7 animate-spin text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-ink-800">AI 正在解析你的需求...</h2>
          <p className="text-sm text-ink-500">{LOADING_TEXTS[loadingIdx]}</p>
        </div>

        <div className="mx-auto mb-8 max-w-xs">
          <div className="loading-bar-track">
            <div className="loading-bar-fill" style={{ width: barWidth }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-ink-400">
            <span>步骤 {Math.min(loadingIdx + 1, 4)}/4</span>
            <span>预计 3 秒</span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-md">
      <div className="p-6">
        <label className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-700">
          <MessageSquareText className="h-4 w-4 text-brand-500" />
          项目需求描述
        </label>
        <Textarea
          rows={4}
          maxLength={500}
          className="scrollbar-thin min-h-[120px] resize-none text-sm leading-relaxed"
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
          <span className="text-xs text-ink-300">Ctrl + Enter 快速提交</span>
          <span className={`text-xs ${text.length > 450 ? "text-warning-600" : "text-ink-400"}`}>
            {text.length} / 500
          </span>
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center gap-1 text-xs text-ink-400">
            <Sparkles className="h-3 w-3" />
            快速示例 — 点击填入
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Button
                key={ex.short}
                type="button"
                variant="outline"
                size="sm"
                className="border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100"
                onClick={() => setText(ex.text)}
              >
                <ex.Icon className="h-3 w-3" />
                {ex.short}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-ink-100" />

      <div className="bg-ink-50/50 p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-ink-600">
          <SlidersHorizontal className="h-4 w-4 text-ink-400" />
          补充参数
          <span className="text-xs font-normal text-ink-400">可选，不填 AI 会自动推断</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {selects.map((s) => (
            <div key={s.label}>
              <label className="mb-1.5 block text-xs text-ink-500">{s.label}</label>
              <Select value={s.value} onValueChange={s.set}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={s.value} />
                </SelectTrigger>
                <SelectContent>
                  {s.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t bg-card p-4">
        <div className="flex items-center gap-1.5 text-xs text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5 text-success-500" />
          数据来源：立创商城 · 嘉立创 · Datasheet
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => setText("")}>
            <Eraser className="mr-1.5 h-4 w-4" />
            清空
          </Button>
          <Button type="button" onClick={submit} disabled={!text.trim()}>
            开始选型
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
