"use client";

import {
  AlertTriangle,
  FileText,
  Lock,
  MessagesSquare,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import BackToTop from "@/components/BackToTop";
import InputBox from "@/components/InputBox";
import Reveal from "@/components/Reveal";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { parseRequirement } from "@/lib/api";
import { track } from "@/lib/analytics";
import { store } from "@/lib/store";

const PAINS = [
  {
    Icon: SearchX,
    title: "信息过载",
    desc: "参数表格几十列，型号成千上万，看完还是不知道买哪个。",
    tint: "bg-brand-50 text-brand-600",
  },
  {
    Icon: Wallet,
    title: "预算错配",
    desc: "照着教程买，要么性能过剩白花钱，要么关键参数不匹配。",
    tint: "bg-success-50 text-success-600",
  },
  {
    Icon: AlertTriangle,
    title: "怕被坑",
    desc: "型号水太深，停产、假货、封装对不上，踩坑成本太高。",
    tint: "bg-amber-50 text-amber-600",
  },
];

const CAPABILITIES = [
  {
    Icon: MessagesSquare,
    title: "一句话需求 → 结构化参数",
    desc: "自动识别用途、供电、功耗、通信和预算，不用填表。",
    tint: "bg-brand-50 text-brand-600",
    chip: "供电、通信、接口、预算",
    wide: true,
    chat: true,
  },
  {
    Icon: Wallet,
    title: "预算平替",
    desc: "在预算内找参数接近的替代型号，不盲目追贵。",
    tint: "bg-success-50 text-success-600",
    chip: "预算内 · 高性价比",
    wide: false,
  },
  {
    Icon: ShieldCheck,
    title: "兼容性体检",
    desc: "供电、接口、电平自动核对，避免买回来装不上。",
    tint: "bg-ink-100 text-ink-600",
    chip: "接口、电平、供电",
    wide: false,
  },
  {
    Icon: SlidersHorizontal,
    title: "性能可视化",
    desc: "功耗、频率、精度逐项量化，选型不靠猜。",
    tint: "bg-brand-50 text-brand-600",
    chip: "工作电压、待机电流、精度",
    wide: false,
    bars: [72, 88, 64, 96, 80],
  },
  {
    Icon: FileText,
    title: "Datasheet 溯源",
    desc: "每个推荐都带官方数据手册链接，可自行核验。",
    tint: "bg-brand-50 text-brand-600",
    chip: "datasheet → 立创商城",
    wide: false,
  },
  {
    Icon: Lock,
    title: "本地优先，数据不出机",
    desc: "历史记录存本地数据库，查看不消耗 token；可配 DeepSeek / OpenAI / 本地 Ollama，也能完全离线规则模式。",
    tint: "bg-success-50 text-success-600",
    chip: "localhost / SQLite / BYOK",
    wide: true,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(text: string) {
    setLoading(true);
    setError("");
    track("parse_start");
    try {
      const { params, degraded } = await parseRequirement(text);
      track("parse_success", { degraded });
      store.setParams(params);
      store.setDegraded(degraded);
      store.setQuery(text);
      store.setRecommendations([]);
      store.setSelected([]);
      router.push("/recommend");
    } catch (e) {
      track("parse_fail");
      setError(e instanceof Error ? e.message : "解析失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <main className="volt-landing">
      <TopBar current={1} />

      {/* ===== 首屏 Hero：左侧主张 + 右侧真实选型引擎 ===== */}
      <section id="top" className="relative flex min-h-[100dvh] items-center">
        <div className="mx-auto grid w-full max-w-[1220px] items-center gap-12 px-6 pt-24 pb-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-14">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-[rgba(11,32,72,.42)] px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.2em] text-white">
              <i className="h-px w-4 bg-white/70" />
              AI · 元器件选型
              <i className="h-px w-4 bg-white/70" />
            </span>
            <h1 className="mt-6 text-[42px] font-bold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_26px_rgba(6,20,50,.5)] md:text-[62px]">
              选硬件，不选错。
              <em className="block pb-1 not-italic text-success-400">预算花在刀刃上。</em>
            </h1>
            <p className="mt-5 max-w-[42ch] text-[17px] leading-relaxed text-[#eafeff] drop-shadow-[0_1px_16px_rgba(6,20,50,.45)]">
              读懂专业、预算和真实用途，30 秒配出兼容、够用、不溢价的方案。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#engine" className="btn-primary">
                <span>开始选型</span>
                <span className="arr">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              </a>
              <a href="#capabilities" className="btn-ghost-light">
                <span>看核心能力</span>
                <span className="arr">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              </a>
            </div>
          </div>

          <div id="engine" className="order-1 scroll-mt-28 lg:order-2">
            <div className="relative">
              <div className="absolute -left-4 top-10 z-10 hidden animate-floaty items-center gap-2 rounded-full border border-ink-100 bg-white px-3.5 py-2 font-mono text-xs text-ink-800 shadow-xl sm:flex">
                <span className="text-success-500">✓</span>
                解析 4 类元器件
              </div>
              <div
                className="absolute -right-3 bottom-16 z-10 hidden animate-floaty items-center gap-2 rounded-full border border-ink-100 bg-white px-3.5 py-2 font-mono text-xs text-ink-800 shadow-xl sm:flex"
                style={{ animationDelay: "2.2s" }}
              >
                <span className="font-medium text-brand-600">BOM</span>
                一键导出
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                  {error}（请确认后端已启动：python -m uvicorn app.main:app --port 8000）
                </div>
              )}

              <InputBox loading={loading} onSubmit={handleSubmit} />

              {/* 终端输出行：真实产品输出格式的示例 */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3 font-mono text-[12px] leading-relaxed text-[#cfe0ff] shadow-[0_20px_50px_rgba(8,18,38,.35)]">
                <div className="mb-1.5 flex items-center justify-between text-[10.5px] uppercase tracking-[0.14em] text-ink-400">
                  <span>示例输出</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                    本地运行
                  </span>
                </div>
                <div>
                  <span className="text-success-400">$</span> hc parse 低功耗蓝牙温湿度传感器
                </div>
                <div>
                  <span className="text-brand-400">→</span> 供电 电池、通信 BLE、接口 I2C
                </div>
                <div>
                  <span className="text-success-400">✓</span> 4 类元器件 · 平均匹配度 0.92（BOM 已就绪）
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 权威数据条 ===== */}
      <section className="border-y border-ink-100 bg-[rgba(244,247,252,.92)]">
        <Reveal>
          <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-x-10 gap-y-3 px-6 py-5 font-mono text-[12.5px] text-ink-500">
            <span>
              <b className="text-ink-900">100+</b> 元器件库
            </span>
            <span>
              <b className="text-brand-600">4</b> 大品类
            </span>
            <span>
              <b className="text-success-600">3</b> 分钟出 BOM
            </span>
            <span>
              <b className="text-ink-900">数据</b> 不出本机
            </span>
          </div>
        </Reveal>
      </section>

      {/* ===== 痛点区 ===== */}
      <section className="bg-[rgba(246,249,253,.85)] py-24">
        <div className="mx-auto max-w-[1220px] px-6">
          <Reveal>
            <div className="mb-12 max-w-2xl">
              <h2 className="text-[32px] font-bold tracking-tight text-ink-900 md:text-[44px]">自己选，为什么这么难</h2>
              <p className="mt-3 text-[16px] text-ink-500">不是你不会，是信息差太大。</p>
            </div>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {PAINS.map((p, i) => (
              <Reveal key={p.title}>
                <div className="card-hover volt-card h-full p-7">
                  <span className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl ${p.tint}`}>
                    <p.Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-[21px] font-semibold text-ink-900">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 核心能力 Bento ===== */}
      <section id="capabilities" className="scroll-mt-24 bg-[rgba(246,249,253,.85)] pb-24">
        <div className="mx-auto max-w-[1220px] px-6">
          <Reveal>
            <div className="mb-12 max-w-2xl">
              <h2 className="text-[32px] font-bold tracking-tight text-ink-900 md:text-[44px]">核心能力</h2>
              <p className="mt-3 text-[16px] text-ink-500">从一句话需求到一份可采购的 BOM，中间的事情交给 AI。</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-12 gap-4">
            {CAPABILITIES.map((c, i) => {
              const cls = c.wide ? "col-span-12 md:col-span-8" : "col-span-12 md:col-span-4";
              return (
                <Reveal key={c.title} className={cls}>
                  <div className="volt-card flex h-full flex-col p-6">
                    <span className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${c.tint}`}>
                      <c.Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-[19px] font-semibold text-ink-900">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">{c.desc}</p>

                    {c.chat && (
                      <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-ink-400">
                          <span className="flex items-center gap-2">
                            <span className="text-success-500">▲</span>
                            你
                          </span>
                          <span>示例</span>
                        </div>
                        <p className="text-[13px] leading-relaxed text-ink-600">
                          低功耗蓝牙温湿度传感器，电池供电工作半年，I2C 接口，预算 50 元内
                        </p>
                        <div className="mb-1.5 mt-3 flex items-center gap-2 font-mono text-[11px] text-ink-400">
                          <span className="text-brand-500">●</span>
                          AI
                        </div>
                        <p className="text-[13px] leading-relaxed text-ink-700">
                          供电：电池、通信：BLE、接口：I2C
                          <span className="text-success-600"> → 推荐 3 类 6 个元件</span>
                        </p>
                      </div>
                    )}

                    {c.bars && (
                      <div className="mt-auto flex items-end gap-1.5 pt-5">
                        {c.bars.map((h, j) => (
                          <span
                            key={j}
                            className={`w-full rounded-t-md ${
                              j % 2 === 0 ? "bg-brand-500/80" : "bg-success-500/80"
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    )}

                    {c.chip && !c.chat && !c.bars && (
                      <div className="mt-auto pt-4">
                        <div className="rounded-xl bg-ink-50 px-3 py-2 font-mono text-[12px] text-ink-500">
                          {c.chip}
                        </div>
                      </div>
                    )}
                    {c.chip && c.bars && (
                      <div className="mt-4 rounded-xl bg-ink-50 px-3 py-2 font-mono text-[12px] text-ink-500">
                        {c.chip}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA 转化带 ===== */}
      <section className="bg-[rgba(246,249,253,.85)] pb-24">
        <Reveal>
          <div className="mx-auto max-w-[1220px] px-6">
            <div className="rounded-[34px] bg-gradient-to-br from-brand-800 to-brand-500 p-3 shadow-[0_40px_90px_rgba(47,107,255,.3)]">
              <div className="rounded-3xl border border-white/20 bg-white/10 px-8 py-14 text-center">
                <h2 className="text-[34px] font-bold tracking-tight text-white md:text-[46px]">现在就试一次</h2>
                <p className="mx-auto mt-3 max-w-[44ch] text-[15px] text-[#e4ecff]">
                  描述你的第一个项目，看看 AI 能帮你省多少时间。
                </p>
                <a
                  href="#engine"
                  className="btn-primary mt-8 border-white bg-white !text-brand-600 shadow-[0_16px_40px_rgba(0,0,0,.2)] hover:shadow-[0_16px_40px_rgba(0,0,0,.3)]"
                >
                  <span>开始选型</span>
                  <span className="arr bg-success-500 !text-white">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== 页脚 ===== */}
      <footer className="border-t border-ink-100 bg-[rgba(244,247,252,.92)] px-6 py-12">
        <div className="mx-auto max-w-[1220px]">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[13.5px] text-ink-500">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <Zap className="h-3.5 w-3.5 fill-current" />
              </span>
              <span className="font-semibold text-ink-800">AI 硬件选型助手</span>
            </div>
            <div className="flex flex-wrap gap-6">
              <a href="/history" className="transition-colors hover:text-brand-600">
                历史方案
              </a>
              <a href="/profile" className="transition-colors hover:text-brand-600">
                个人配置
              </a>
              <a href="/admin" className="transition-colors hover:text-brand-600">
                管理后台
              </a>
            </div>
          </div>
          <p className="mt-6 text-center font-mono text-[11px] leading-relaxed text-ink-400">
            数据来源：立创商城 / 嘉立创 / 厂商官方 Datasheet · 价格仅供参考，请以实际采购为准
          </p>
          <p className="mt-1 text-center text-[11px] text-ink-400">
            本地运行模式数据不出本机；使用云端 API 时需求文本将发送至所选 AI 服务商。
            <a
              href="mailto:juha75915@gmail.com?subject=AI硬件选型助手反馈"
              className="ml-2 text-brand-600 hover:text-brand-700"
            >
              反馈问题 / 提交缺失元器件
            </a>
          </p>
        </div>
      </footer>

      <ToastHost />
      <BackToTop />
    </main>
  );
}
