"use client";

import { useState, useEffect } from "react";
import { Card, Descriptions, Tag, Button, Empty, Spin, Collapse, Modal, Select, message } from "antd";
import { ArrowLeftOutlined, CopyOutlined, FileTextOutlined, PictureOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Template = {
  id: string;
  template_type: string | null;
  template_content: string | null;
  company_id: string | null;
  companies?: { name: string } | null;
};

type ContentPlanner = {
  id: string;
  company_id: string;
  week: string | null;
  platform: string | null;
  division: string | null;
  post_type: string | null;
  post_title: string | null;
  content_description: string | null;
  hashtags: string | null;
  status: string;
  target_location: string | null;
  goal: string | null;
  keywords: string | null;
  created_at: string;
  companies?: { name: string } | null;
};

type AiResult = {
  id: string;
  planner_id: string;
  result_text: string | null;
  result_caption: string | null;
  result_image_prompt: string | null;
  result_image_url: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  draft: "default",
  generated: "processing",
  published: "success",
};

function formatDate(s: string | null) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default function ContentPlannerDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [planner, setPlanner] = useState<ContentPlanner | null>(null);
  const [results, setResults] = useState<AiResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generatingResultId, setGeneratingResultId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [generateImageLoading, setGenerateImageLoading] = useState(false);

  async function fetchTemplates() {
    const { data } = await createClient()
      .from("templates")
      .select("id, company_id, template_type, template_content, companies(name)")
      .order("template_type");
    setTemplates((data as unknown as Template[]) ?? []);
  }

  function openGenerateImageModal(r: AiResult) {
    if (!r.result_image_prompt) return;
    setGeneratingResultId(r.id);
    setSelectedTemplateId(null);
    fetchTemplates();
    setGenerateModalOpen(true);
  }

  async function copyPrompt() {
    if (!generatingResultId) return;
    try {
      const params = new URLSearchParams({ resultId: generatingResultId });
      if (selectedTemplateId) params.set("templateId", selectedTemplateId);
      const res = await fetch(`/api/content-planners/generate-image?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load prompt");
      const prompt = json.prompt as string;
      await navigator.clipboard.writeText(prompt);
      message.success("Prompt copied to clipboard");
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Copy failed: " + (err?.message ?? "Unknown error"));
    }
  }

  async function executeGenerateImage() {
    if (!generatingResultId) return;
    setGenerateImageLoading(true);
    try {
      const res = await fetch("/api/content-planners/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: generatingResultId,
          templateId: selectedTemplateId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generate image failed");
      message.success("Image generated successfully");
      setGenerateModalOpen(false);
      setGeneratingResultId(null);
      // Refresh results to show new image
      const { data } = await createClient()
        .from("ai_results")
        .select("*")
        .eq("planner_id", id)
        .order("created_at", { ascending: false });
      setResults((data as AiResult[]) ?? []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Generate image failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setGenerateImageLoading(false);
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: plannerData, error: plannerError } = await createClient()
        .from("content_planners")
        .select(
          `
          *,
          companies (name)
        `
        )
        .eq("id", id)
        .single();

      if (plannerError || !plannerData) {
        setPlanner(null);
        setResults([]);
        setLoading(false);
        return;
      }

      setPlanner(plannerData as ContentPlanner);

      const { data: resultsData, error: resultsError } = await createClient()
        .from("ai_results")
        .select("*")
        .eq("planner_id", id)
        .order("created_at", { ascending: false });

      setResults((resultsData as AiResult[]) ?? []);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!planner) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <Link href="/admin/content-planners">
          <Button icon={<ArrowLeftOutlined />}>Back to Content Planners</Button>
        </Link>
        <Card className="mt-4">
          <Empty description="Planner not found" />
        </Card>
      </div>
    );
  }

  const companyName = (planner.companies as { name?: string } | null)?.name ?? "-";

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <Link href="/admin/content-planners">
          <Button icon={<ArrowLeftOutlined />}>Back to Content Planners</Button>
        </Link>
      </div>

      <Card className="shadow-sm mb-6" title="Content Planner Details">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Company">{companyName}</Descriptions.Item>
          <Descriptions.Item label="Post Title">{planner.post_title ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Week">{planner.week ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Platform">{planner.platform ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Division">{planner.division ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Post Type">{planner.post_type ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusColors[planner.status] ?? "default"}>{planner.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Content Description">
            {planner.content_description ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Hashtags">{planner.hashtags ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Target Location">
            {planner.target_location ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Goal">{planner.goal ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Keywords">{planner.keywords ?? "-"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        style={{
          marginTop: "20px",
          overflow: "auto",
        }}
        className="shadow-sm"
        title={
          <span>
            <FileTextOutlined className="mr-2" />
            AI Results ({results.length})
          </span>
        }
      >
        {results.length === 0 ? (
          <Empty description="No AI results yet. Run Execute Generate to create results." />
        ) : (
          <Collapse
            defaultActiveKey={results.map((_, i) => String(i))}
            items={results.map((r, idx) => ({
              key: String(idx),
              label: `Result #${results.length - idx} — ${formatDate(r.created_at)}`,
              children: (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Result Text
                    </div>
                    <div className="p-3 bg-slate-50 rounded text-sm whitespace-pre-wrap">
                      {r.result_text || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Caption
                    </div>
                    <div className="p-3 bg-slate-50 rounded text-sm whitespace-pre-wrap">
                      {r.result_caption || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Image Prompt
                    </div>
                    <div className="p-3 bg-slate-50 rounded text-sm whitespace-pre-wrap">
                      {r.result_image_prompt || "-"}
                    </div>
                    {r.result_image_prompt && (
                      <Button
                        type="primary"
                        icon={<PictureOutlined />}
                        onClick={() => openGenerateImageModal(r)}
                        className="mt-2"
                      >
                        Generate Image
                      </Button>
                    )}
                  </div>
                  {r.result_image_url && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                        Generated Image{r.result_image_url.trimStart().startsWith("[") ? "s" : ""}
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(() => {
                          let urls: string[];
                          try {
                            urls = r.result_image_url.trimStart().startsWith("[")
                              ? JSON.parse(r.result_image_url)
                              : [r.result_image_url];
                          } catch {
                            urls = [r.result_image_url];
                          }
                          return urls.map((src: string, i: number) => (
                            <img
                              key={i}
                              src={src}
                              alt={`Generated ${i + 1}`}
                              className="w-full rounded border border-slate-200 object-cover aspect-square"
                            />
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>

      <Modal
        title="Generate Image - Select Template"
        open={generateModalOpen}
        onCancel={() => {
          setGenerateModalOpen(false);
          setGeneratingResultId(null);
        }}
        onOk={executeGenerateImage}
        confirmLoading={generateImageLoading}
        okText="Generate"
        width={480}
      >
        <div className="py-4 space-y-4">
          <p className="text-slate-600 text-sm">
            Generate 4 images from the Image Prompt using DALL-E 3. You can optionally select a template to format the prompt.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Template (optional)</label>
            <Select
              placeholder="Select a template (uses {{result_image_prompt}})"
              allowClear
              style={{ width: "100%" }}
              value={selectedTemplateId ?? undefined}
              onChange={(v) => setSelectedTemplateId(v ?? null)}
              optionLabelProp="label"
              options={templates.map((t) => ({
                value: t.id,
                label: `${t.template_type ?? "Untitled"}${t.companies?.name ? ` (${t.companies.name})` : ""}`,
              }))}
            />
          </div>
          <div>
            <Button
              icon={<CopyOutlined />}
              onClick={copyPrompt}
              block
            >
              Copy prompt
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Copy the final prompt (with variables replaced) to use it elsewhere or debug.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
