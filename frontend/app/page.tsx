"use client";

import {
  FileText,
  Lock,
  MessagesSquare,
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
        <div className="mx-auto grid w-full max-w-[1220px] items-center gap-12 px-6 pt-32 pb-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-14">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-[rgba(11,32,72,.4)] px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.2em] text-white">
              <i className="h-px w-4 bg-white/70" />
              AI · 元器件选型
              <i className="h-px w-4 bg-white/70" />
            </span>
            <h1 className="mt-6 text-[42px] font-bold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_26px_rgba(6,20,50,.5)] md:text-[62px]">
              选硬件，不选错。
              <br />
              <em className="not-italic text-success-400">预算花在刀刃上。</em>
            </h1>
            <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed text-[#eafeff] drop-shadow-[0_1px_16px_rgba(6,20,50,.45)]">
              读懂你的专业、预算和真实用途，30 秒配出一套兼容、够用、不溢价的元器件方案。
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
                className="absolute -right-3 bottom-12 z-10 hidden animate-floaty items-center gap-2 rounded-full border border-ink-100 bg-white px-3.5 py-2 font-mono text-xs text-ink-800 shadow-xl sm:flex"
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

      {/* ===== 核心能力 Bento ===== */}
      <section id="capabilities" className="scroll-mt-24 bg-[rgba(246,249,253,.85)] py-24">
        <div className="mx-auto max-w-[1220px] px-6">
          <Reveal>
            <div className="mb-12 max-w-2xl">
              <h2 className="text-[32px] font-bold tracking-tight text-ink-900 md:text-[44px]">核心能力</h2>
              <p className="mt-3 text-[16px] text-ink-500">从一句话需求到一份可采购的 BOM，中间的事情交给 AI。</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-12 gap-4">
            <Reveal className="col-span-12 md:col-span-8">
              <div className="volt-card flex h-full flex-col p-6">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <MessagesSquare className="h-5 w-5" />
                </span>
                <h3 className="text-[19px] font-semibold text-ink-900">一句话需求 → 结构化参数</h3>
                <p className="mt-1 text-sm text-ink-500">自动识别用途、供电、功耗、通信和预算，不用填表。</p>
                <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50 p-4">
                  <div className="mb-1.5 flex items-center gap-2 font-mono text-[11.5px] text-ink-400">
                    <span className="text-success-500">▲</span>
                    你
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-600">
                    低功耗蓝牙温湿度传感器，电池供电工作半年，I2C 接口，预算 50 元内
                  </p>
                  <div className="mb-1.5 mt-3 flex items-center gap-2 font-mono text-[11.5px] text-ink-400">
                    <span className="text-brand-500">●</span>
                    AI
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-700">
                    供电：电池 · 通信：BLE · 接口：I2C · 预算：50 元
                    <span className="text-success-600"> → 推荐 3 类 6 个元件</span>
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal className="col-span-12 md:col-span-4">
              <div className="volt-card flex h-full flex-col p-6">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-success-50 text-success-600">
                  <Wallet className="h-5 w-5" />
                </span>
                <h3 className="text-[19px] font-semibold text-ink-900">预算平替</h3>
                <p className="mt-1 text-sm text-ink-500">在预算内找参数接近的替代型号，不盲目追贵。</p>
                <div className="mt-auto pt-4">
                  <div className="rounded-xl bg-success-50 px-3 py-2 font-mono text-[12px] text-success-700">
                    预算内 · 高性价比
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal className="col-span-12 md:col-span-4">
              <div className="volt-card flex h-full flex-col p-6">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="text-[19px] font-semibold text-ink-900">兼容性体检</h3>
                <p className="mt-1 text-sm text-ink-500">供电、接口、电平自动核对，避免买回来装不上。</p>
                <div className="mt-auto pt-4 font-mono text-[11.5px] text-ink-400">
                  接口 · 电平 · 供电
                </div>
              </div>
            </Reveal>

            <Reveal className="col-span-12 md:col-span-4">
              <div className="volt-card flex h-full flex-col p-6">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <SlidersHorizontal className="h-5 w-5" />
                </span>
                <h3 className="text-[19px] font-semibold text-ink-900">性能可视化</h3>
                <p className="mt-1 text-sm text-ink-500">功耗、频率、精度逐项量化，选型不靠猜。</p>
                <div className="mt-auto pt-4 font-mono text-[11.5px] text-ink-400">
                  工作电压 · 待机电流 · 精度
                </div>
              </div>
            </Reveal>

            <Reveal className="col-span-12 md:col-span-4">
              <div className="volt-card flex h-full flex-col p-6">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <FileText className="h-5 w-5" />
                </span>
                <h3 className="text-[19px] font-semibold text-ink-900">Datasheet 溯源</h3>
                <p className="mt-1 text-sm text-ink-500">每个推荐都带官方数据手册链接，可自行核验。</p>
                <div className="mt-auto pt-4 font-mono text-[11.5px] text-ink-400">
                  datasheet → 立创商城
                </div>
              </div>
            </Reveal>

            <Reveal className="col-span-12">
              <div className="volt-card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-xl">
                  <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-success-50 text-success-600">
                    <Lock className="h-5 w-5" />
                  </span>
                  <h3 className="text-[19px] font-semibold text-ink-900">本地优先，数据不出机</h3>
                  <p className="mt-1 text-sm text-ink-500">
                    历史记录存本地数据库，查看不消耗 token；可配置 DeepSeek / OpenAI / 本地 Ollama 模型，也能完全离线用规则模式。
                  </p>
                </div>
                <div className="rounded-2xl border border-ink-100 bg-ink-50 px-5 py-4 font-mono text-[12px] leading-relaxed text-ink-500">
                  localhost · SQLite · BYOK
                </div>
              </div>
            </Reveal>
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
