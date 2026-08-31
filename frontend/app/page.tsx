"use client";

import {
  AlertTriangle,
  ArrowRight,
  Database,
  FileText,
  GraduationCap,
  ListChecks,
  Lock,
  MessagesSquare,
  PackageSearch,
  PenLine,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const STEPS = [
  { Icon: PenLine, title: "一句话描述需求", desc: "说用途、预算和限制，不用填表" },
  { Icon: ListChecks, title: "AI 解析并确认参数", desc: "结构化参数可手动微调，再开始推荐" },
  { Icon: PackageSearch, title: "生成 BOM 导出", desc: "选好元件，一键导出 Excel / CSV" },
];

export default function HomePage() {
  const router = useRouter();
  const [stage, setStage] = useState<"intro" | "app">("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const introRef = useRef<HTMLElement>(null);

  // 点击「开始选型」：整页上滑，背景图同时隐入半透明背景
  function startApp() {
    introRef.current?.scrollTo({ top: 0 });
    setStage("app");
  }

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("hc-bg-engage", { detail: { engaged: stage === "app" } })
    );
  }, [stage]);

  // 从推荐页「修改需求」回来时，带 #engine 标记，直接进入输入需求阶段
  useEffect(() => {
    const wantsApp =
      window.location.hash === "#engine" ||
      new URLSearchParams(window.location.search).get("stage") === "app";
    if (wantsApp) setStage("app");
  }, []);

  function scrollToDetails() {
    introRef.current?.querySelector("#product-detail")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleNavStart() {
    if (stage === "intro") {
      startApp();
    } else {
      document.getElementById("engine")?.scrollIntoView({ behavior: "smooth" });
    }
  }

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
    <main className={stage === "intro" ? "volt-landing" : ""}>
      <TopBar current={stage === "app" ? 1 : 0} onStart={handleNavStart} />

      {/* ===== 介绍页（全屏覆盖层，点击开始后整体上滑） ===== */}
      <section
        ref={introRef}
        aria-hidden={stage === "app"}
        className={`fixed inset-0 z-30 overflow-y-auto scrollbar-thin transition-[transform,visibility] duration-1000 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform ${
          stage === "app" ? "invisible -translate-y-full" : "visible translate-y-0"
        }`}
      >
        {/* 态度鲜明的首屏 */}
        <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-[rgba(11,32,72,.42)] px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.2em] text-white">
            <i className="h-px w-4 bg-white/70" />
            AI · 元器件选型
            <i className="h-px w-4 bg-white/70" />
          </span>
          <h1 className="mt-8 text-[52px] font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_26px_rgba(6,20,50,.55)] md:text-[76px]">
            选硬件，
            <span className="text-success-400">不选错。</span>
          </h1>
          <p className="mt-6 max-w-[40ch] text-[18px] leading-relaxed text-[#eafeff] drop-shadow-[0_1px_16px_rgba(6,20,50,.5)]">
            读懂专业、预算和真实用途，30 秒配出兼容、够用、不溢价的方案。
          </p>

          <div className="mt-20 flex flex-col items-center gap-6">
            <button type="button" onClick={startApp} className="btn-primary !px-9 !py-4 text-lg">
              <span>开始选型</span>
              <span className="arr !h-9 !w-9">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={scrollToDetails}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              查看详细产品介绍
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 详细产品介绍 */}
        <div id="product-detail" className="scroll-mt-24 bg-[rgba(246,249,253,.94)] py-24">
          <div className="mx-auto max-w-[1100px] px-6">
            <Reveal>
              <div className="mb-14 max-w-2xl">
                <h2 className="text-[32px] font-bold tracking-tight text-ink-900 md:text-[44px]">
                  它解决什么问题
                </h2>
                <p className="mt-3 text-[16px] text-ink-500">
                  面向电子专业学生的选型助手，把「查数据手册 + 对比参数 + 避坑」的时间压缩到 30 秒。
                </p>
              </div>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-3">
              {PAINS.map((p) => (
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

            <Reveal>
              <div className="mb-12 mt-24 max-w-2xl">
                <h2 className="text-[32px] font-bold tracking-tight text-ink-900 md:text-[44px]">核心能力</h2>
                <p className="mt-3 text-[16px] text-ink-500">从一句话需求到一份可采购的 BOM，中间的事情交给 AI。</p>
              </div>
            </Reveal>

            <div className="grid grid-cols-12 gap-4">
              {CAPABILITIES.map((c) => {
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
                              className={`w-full rounded-t-md ${j % 2 === 0 ? "bg-brand-500/80" : "bg-success-500/80"}`}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      )}

                      {c.chip && (
                        <div className={`${c.chat || c.bars ? "mt-4" : "mt-auto pt-4"}`}>
                          <div className="rounded-xl bg-ink-50 px-3 py-2 font-mono text-[12px] text-ink-500">
                            {c.chip}
                          </div>
                        </div>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal>
              <div className="mb-12 mt-24 max-w-2xl">
                <h2 className="text-[32px] font-bold tracking-tight text-ink-900 md:text-[44px]">三步上手</h2>
              </div>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <Reveal key={s.title}>
                  <div className="volt-card flex h-full items-start gap-4 p-6">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand-50 text-brand-600">
                      <s.Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="mt-1 text-[17px] font-semibold text-ink-900">{s.title}</h3>
                      <p className="mt-1 text-sm text-ink-500">{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="mt-16 rounded-[28px] bg-gradient-to-br from-brand-800 to-brand-500 p-3 shadow-[0_40px_90px_rgba(47,107,255,.28)]">
                <div className="rounded-3xl border border-white/20 bg-white/10 px-8 py-12 text-center">
                  <h2 className="text-[30px] font-bold tracking-tight text-white md:text-[40px]">现在开始第一次选型</h2>
                  <p className="mx-auto mt-3 max-w-[44ch] text-[15px] text-[#e4ecff]">
                    描述你的第一个项目，AI 会给出完整的元器件方案。
                  </p>
                  <button type="button" onClick={startApp} className="btn-primary mt-8">
                    <span>开始选型</span>
                    <span className="arr bg-success-500 !text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== 工具页（输入框，保持原有排版） ===== */}
      <section
        id="engine"
        aria-hidden={stage === "intro"}
        className={`scroll-mt-24 transition-opacity duration-700 ${
          stage === "app" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 pt-28 pb-12 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="relative mb-8">
              <button
                type="button"
                onClick={() => {
                  introRef.current?.scrollTo({ top: 0 });
                  setStage("intro");
                }}
                className="btn-secondary absolute -left-2 top-4 !py-2 text-xs"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                返回首页
              </button>
              <div className="animate-slide-up text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                  <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-brand-500" />
                  AI 驱动 · 已收录 100+ 元器件
                </div>
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
                  描述你的硬件项目需求
                </h1>
                <p className="text-base text-ink-500">用自然语言描述，AI 自动提取参数并推荐元器件方案</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {error}（请确认后端已启动：python -m uvicorn app.main:app --port 8000）
              </div>
            )}

            <InputBox loading={loading} onSubmit={handleSubmit} />

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-ink-400">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                100+ 元器件知识库
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                3 分钟出 BOM
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                专为电子专业学生设计
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-1.5 border-t border-ink-100 pt-5 text-center text-[11px] leading-relaxed text-ink-400">
              <p>
                数据来源：立创商城 / 嘉立创 / 厂商官方 Datasheet · 价格仅供参考，请以实际采购为准
              </p>
              <p>
                本地运行模式数据不出本机；使用云端 API 时需求文本将发送至所选 AI 服务商。
              </p>
              <a
                href="mailto:juha75915@gmail.com?subject=AI硬件选型助手反馈"
                className="text-brand-600 hover:text-brand-700"
              >
                反馈问题 / 提交缺失元器件
              </a>
            </div>
          </div>
        </div>
      </section>

      <ToastHost />
      <BackToTop />
    </main>
  );
}
