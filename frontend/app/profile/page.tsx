"use client";

import { CheckCircle2, KeyRound, Loader2, Save, Server, Settings2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import BackToTop from "@/components/BackToTop";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchLLMSettings, saveLLMSettings, testLLMConnection } from "@/lib/api";
import { track } from "@/lib/analytics";
import { showToast } from "@/lib/toast";
import type { LLMSettings } from "@/lib/types";

const PROVIDERS: { value: string; label: string; hint: string; needsKey: boolean; needsBase: boolean }[] = [
  { value: "mock", label: "规则模式（无需配置）", hint: "用规则解析+关键词打分，不调用任何大模型", needsKey: false, needsBase: false },
  { value: "local", label: "本地模型（Ollama / llama.cpp）", hint: "默认连接 http://localhost:11434/v1", needsKey: false, needsBase: true },
  { value: "deepseek", label: "DeepSeek API", hint: "默认连接 DeepSeek 官方接口", needsKey: true, needsBase: false },
  { value: "openai", label: "OpenAI API", hint: "默认连接 OpenAI 官方接口", needsKey: true, needsBase: false },
  { value: "claude", label: "Claude API", hint: "Anthropic 官方接口", needsKey: true, needsBase: false },
  { value: "custom", label: "自定义（OpenAI 兼容）", hint: "填你自己的 Base URL 和模型名", needsKey: true, needsBase: true },
];

const MODEL_PLACEHOLDERS: Record<string, string> = {
  local: "glm4:9b",
  deepseek: "deepseek-chat",
  openai: "gpt-4o-mini",
  claude: "claude-sonnet-4-20250514",
  custom: "your-model-name",
};

export default function ProfilePage() {
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [provider, setProvider] = useState("mock");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latency_ms: number; model: string; error: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLLMSettings()
      .then((s) => {
        setSettings(s);
        setProvider(s.provider);
        setModel(s.model);
        setBaseUrl(s.base_url);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载设置失败"));
  }, []);

  const current = PROVIDERS.find((p) => p.value === provider);

  function payload() {
    return {
      provider,
      model: model || undefined,
      base_url: current?.needsBase ? baseUrl || undefined : "",
      api_key: apiKey || undefined,
    };
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const saved = await saveLLMSettings(payload());
      track("settings_save", { provider });
      setSettings(saved);
      setApiKey("");
      showToast("设置已保存，立即生效", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError("");
    track("settings_test", { provider });
    try {
      setTestResult(await testLLMConnection(payload()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "测试失败");
    } finally {
      setTesting(false);
    }
  }

  return (
    <main>
      <TopBar current={0} />
      <div className="mx-auto max-w-6xl px-4 pt-28 pb-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-1 flex items-center gap-2">
            <div className="volt-aurora flex h-8 w-8 items-center justify-center rounded-xl">
              <Settings2 className="h-5 w-5 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900">个人主页 · AI 配置</h1>
          </div>
          <p className="mb-6 ml-10 text-sm text-ink-500">
            配置你的大模型 API，或切换到本地模型。保存后立即生效，无需重启。
          </p>

          {error && (
            <div className="mb-4 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}

          <Card className="border-ink-100 shadow-lg [--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle className="text-xl">模型配置</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-ink-500">
                解析与推荐都会使用这里的设置，Key 只保存在本地数据库。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="provider" className="text-sm font-medium text-ink-700">
                  LLM 供应商
                </Label>
                <Select
                  value={provider}
                  onValueChange={(v) => {
                    setProvider(v);
                    setModel(MODEL_PLACEHOLDERS[v] || "");
                    setBaseUrl(v === "local" ? "http://localhost:11434/v1/chat/completions" : "");
                  }}
                >
                  <SelectTrigger id="provider" className="h-10 w-full">
                    <SelectValue placeholder="选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {current && <p className="text-xs text-ink-400">{current.hint}</p>}
              </div>

              {current?.needsBase && (
                <div className="space-y-2">
                  <Label htmlFor="baseUrl" className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                    <Server className="h-4 w-4 text-ink-400" />
                    Base URL
                  </Label>
                  <Input
                    id="baseUrl"
                    className="h-10 bg-ink-50/50 px-3 focus:bg-white"
                    placeholder="http://localhost:11434/v1/chat/completions"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="model" className="text-sm font-medium text-ink-700">
                  模型名称
                </Label>
                <Input
                  id="model"
                  className="h-10 bg-ink-50/50 px-3 focus:bg-white"
                  placeholder={MODEL_PLACEHOLDERS[provider] || "deepseek-chat"}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              {current?.needsKey && (
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                    <KeyRound className="h-4 w-4 text-ink-400" />
                    API Key
                    {settings?.api_key_set && (
                      <Badge variant="secondary" className="font-normal">
                        已配置
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    className="h-10 bg-ink-50/50 px-3 focus:bg-white"
                    placeholder={settings?.api_key_set ? "留空表示保留当前 Key" : "输入你的 API Key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-ink-400">Key 只保存在本地数据库，不会显示和上传</p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-ink-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || provider === "mock"}
                  size="lg"
                  className="rounded-full"
                >
                  {testing ? <Loader2 className="animate-spin" /> : <Server />}
                  测试连接
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="rounded-full px-6"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  保存配置
                </Button>
              </div>
            </CardContent>
          </Card>

          {testResult && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
                testResult.ok
                  ? "border-success-100 bg-success-50 text-success-700"
                  : "border-danger-100 bg-danger-50 text-danger-700"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              )}
              <div>
                <div className="font-medium">
                  {testResult.ok
                    ? `连接成功，延迟 ${testResult.latency_ms}ms，模型 ${testResult.model || "未知"}`
                    : "连接失败"}
                </div>
                {!testResult.ok && <div className="mt-1 text-xs opacity-80">{testResult.error}</div>}
              </div>
            </div>
          )}

          <Card className="mt-6 border-ink-100 shadow-sm [--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle className="text-base">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-ink-500">
              <p>配置保存在本地 SQLite，不进 git、不上传云端</p>
              <p>切换供应商/模型后，解析和推荐会立即使用新配置</p>
              <p>本地模型建议：Ollama（ollama pull glm4:9b）或 llama.cpp，两者都提供 OpenAI 兼容接口</p>
              <p>不想用大模型时可切回「规则模式」，免费且离线可用</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastHost />
      <BackToTop />
    </main>
  );
}
