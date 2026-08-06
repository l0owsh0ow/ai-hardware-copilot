"use client";

import { useState } from "react";

import Spinner from "./Spinner";

const EXAMPLES = [
  "我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上，最好能用I2C接口，预算50元以内",
  "做一个智能家居环境监测站，WiFi连接上传数据到服务器，需要测温度湿度PM2.5，USB供电",
  "电赛智能小车，需要电机驱动、红外避障、蓝牙遥控、OLED显示，12V电池供电",
  "可穿戴心率监测手环，用蓝牙传数据到手机，电池供电至少一周，带OLED显示",
];

export default function InputBox({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="card p-6 sm:p-10">
      <h1 className="mb-2 text-lg font-semibold sm:text-[22px]">描述你的硬件项目需求</h1>
      <p className="mb-8 text-sm text-muted">
        用大白话描述就行，AI会帮你提取关键参数并推荐元器件
      </p>

      <div className="mb-2 text-xs font-medium text-muted">项目需求描述</div>
      <textarea
        className="min-h-[120px] w-full resize-y rounded-xl border-[1.5px] border-inputline p-4 text-sm leading-relaxed transition-colors focus:border-primary focus:outline-none"
        placeholder="例如：我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上，最好能用I2C接口，预算50元以内..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex, i) => (
          <button key={i} type="button" className="example-chip" onClick={() => setText(ex)}>
            {ex.split("，")[0]}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner text="AI正在解析你的需求..." sub="通常只需几秒钟" />
      ) : (
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setText("")}>
            清空
          </button>
          <button
            type="button"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!text.trim()}
            onClick={() => onSubmit(text.trim())}
          >
            开始选型 →
          </button>
        </div>
      )}
    </div>
  );
}
