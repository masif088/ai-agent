"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Upload,
  Select,
  Tag,
  Modal,
  Input,
  Checkbox,
  Popconfirm,
  Form,
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

type Company = { id: string; name: string };
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

const DEFAULT_EXPORT_COLUMNS: { key: keyof ContentPlanner | "company_name"; label: string }[] = [
  { key: "company_id", label: "company_id" },
  { key: "company_name", label: "company_name" },
  { key: "week", label: "week" },
  { key: "platform", label: "platform" },
  { key: "division", label: "division" },
  { key: "post_type", label: "post_type" },
  { key: "post_title", label: "post_title" },
  { key: "content_description", label: "content_description" },
  { key: "hashtags", label: "hashtags" },
  { key: "status", label: "status" },
  { key: "target_location", label: "target_location" },
  { key: "goal", label: "goal" },
  { key: "keywords", label: "keywords" },
];

const IMPORT_TARGET_FIELDS = [
  { value: "week", label: "Week" },
  { value: "platform", label: "Platform" },
  { value: "division", label: "Division" },
  { value: "post_type", label: "Post Type" },
  { value: "post_title", label: "Post Title" },
  { value: "content_description", label: "Content Description" },
  { value: "hashtags", label: "Hashtags" },
  { value: "status", label: "Status" },
  { value: "target_location", label: "Target Location" },
  { value: "goal", label: "Goal" },
  { value: "keywords", label: "Keywords" },
  { value: "__skip__", label: "— Skip —" },
];

const IMPORT_FIELD_NAMES = IMPORT_TARGET_FIELDS.filter((f) => f.value !== "__skip__").map(
  (f) => f.value
);

const IMPORT_CSV_HEADERS = IMPORT_TARGET_FIELDS.filter((f) => f.value !== "__skip__").map(
  (f) => f.value
);

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/"/g, "");
}

const statusColors: Record<string, string> = {
  draft: "default",
  generated: "processing",
  published: "success",
};

export default function ContentPlannersPage() {
  const [planners, setPlanners] = useState<ContentPlanner[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCompanyId, setImportCompanyId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [exportHeaders, setExportHeaders] = useState<
    { key: string; label: string; include: boolean }[]
  >(() =>
    DEFAULT_EXPORT_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      include: true,
    }))
  );
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importParsedHeaders, setImportParsedHeaders] = useState<string[]>([]);
  const [importHeaderMapping, setImportHeaderMapping] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlanner, setEditingPlanner] = useState<ContentPlanner | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  function openExportModal() {
    setExportHeaders(
      DEFAULT_EXPORT_COLUMNS.map((c) => ({
        key: c.key,
        label: c.label,
        include: true,
      }))
    );
    setExportModalOpen(true);
  }

  function getPlannerValue(
    p: ContentPlanner,
    key: string
  ): string {
    if (key === "company_name") {
      return (p.companies as { name?: string } | null)?.name ?? "";
    }
    const v = p[key as keyof ContentPlanner];
    return v != null ? String(v) : "";
  }

  function exportToCSVWithHeaders() {
    setExportLoading(true);
    const included = exportHeaders.filter((h) => h.include);
    if (included.length === 0) {
      message.warning("Select at least one column to export");
      setExportLoading(false);
      return;
    }
    const headers = included.map((h) => h.label.trim() || h.key);
    const rows = planners.map((p) =>
      included.map((col) =>
        getPlannerValue(p, col.key)
      )
    );
    const escapeCsv = (s: string) =>
      `"${String(s).replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content_planners_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
    setExportModalOpen(false);
    message.success("CSV exported successfully");
  }

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchPlanners();
    fetchCompanies();
  }, [supabase, selectedCompany]);

  async function fetchCompanies() {
    if (!supabase) return;
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");
    setCompanies(data ?? []);
  }

  async function fetchPlanners() {
    if (!supabase) return;
    setLoading(true);
    let query = supabase
      .from("content_planners")
      .select(
        `
        *,
        companies (name)
      `
      )
      .order("created_at", { ascending: false });

    if (selectedCompany) {
      query = query.eq("company_id", selectedCompany);
    }

    const { data, error } = await query;
    if (error) {
      message.error("Failed to load data: " + error.message);
    } else {
      setPlanners((data as ContentPlanner[]) ?? []);
    }
    setLoading(false);
  }

  async function handleFileSelect(file: File) {
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) {
        message.error("CSV file is empty or invalid format");
        return;
      }
      const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/"/g, ""));
      if (headers.length === 0 || headers.every((h) => !h)) {
        message.error("No valid headers found in CSV");
        return;
      }
      setImportFileContent(text);
      setImportParsedHeaders(headers);
      const autoMapping: Record<string, string> = {};
      const normalizedTargets = IMPORT_TARGET_FIELDS.filter((f) => f.value !== "__skip__").map(
        (f) => f.value
      );
      headers.forEach((csvH) => {
        const norm = normalizeHeader(csvH);
        const match = normalizedTargets.find((t) => norm === t || norm === t.replace(/_/g, " "));
        autoMapping[csvH] = match ?? "__skip__";
      });
      setImportHeaderMapping(autoMapping);
      setImportStep(2);
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Failed to parse file: " + (err?.message ?? "Unknown error"));
    }
  }

  async function handleImportConfirm() {
    if (!supabase || !importCompanyId || !importFileContent) {
      message.error("Select company and file first");
      return;
    }
    const hasRequiredMapping = Object.values(importHeaderMapping).some(
      (v) => v && v !== "__skip__"
    );
    if (!hasRequiredMapping) {
      message.error("Map at least one CSV column to a field");
      return;
    }
    setImportLoading(true);
    try {
      const lines = importFileContent.split("\n").filter(Boolean);
      const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/"/g, ""));
      const data: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ?? "";
        });
        data.push(row);
      }
      const toInsert = data.map((row) => {
        const mapped: Record<string, string | null> = {
          week: null,
          platform: null,
          division: null,
          post_type: null,
          post_title: null,
          content_description: null,
          hashtags: null,
          status: "draft",
          target_location: null,
          goal: null,
          keywords: null,
        };
        headers.forEach((csvH) => {
          const target = importHeaderMapping[csvH];
          if (target && target !== "__skip__" && target in mapped) {
            const val = row[csvH]?.trim() || null;
            if (target === "status" && !val) {
              mapped.status = "draft";
            } else if (val) {
              (mapped as Record<string, string | null>)[target] = val;
            }
          }
        });
        return {
          company_id: importCompanyId,
          ...mapped,
        };
      });
      const { error } = await supabase.from("content_planners").insert(toInsert);
      if (error) throw error;
      message.success(`${toInsert.length} planner(s) imported successfully`);
      setImportModalOpen(false);
      resetImportState();
      fetchPlanners();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Import failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setImportLoading(false);
    }
  }

  function resetImportState() {
    setImportCompanyId(null);
    setImportFileContent(null);
    setImportParsedHeaders([]);
    setImportHeaderMapping({});
    setImportStep(1);
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === "," && !inQuotes) || c === "\r") {
        result.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  }

  async function openGenerateModal() {
    const selectedIds = selectedRowKeys as string[];
    const draftPlanners = planners.filter(
      (p) => selectedIds.includes(p.id) && p.status === "draft"
    );
    if (draftPlanners.length === 0) {
      message.warning("Select at least one planner with draft status to generate.");
      return;
    }
    setSelectedTemplateId(null);
    setGenerateModalOpen(true);
    if (supabase) {
      const { data } = await supabase
        .from("templates")
        .select("id, company_id, template_type, template_content, companies(name)")
        .order("template_type");
      setTemplates((data as Template[]) ?? []);
    }
  }

  async function executeGenerate() {
    if (!supabase) return;
    const selectedIds = selectedRowKeys as string[];
    const selectedPlanners = planners.filter((p) => selectedIds.includes(p.id));
    const draftPlanners = selectedPlanners.filter((p) => p.status === "draft");
    if (draftPlanners.length === 0) {
      message.warning("No selected planners with draft status.");
      return;
    }
    setGenerateLoading(true);
    try {
      const res = await fetch("/api/content-planners/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannerIds: draftPlanners.map((p) => p.id),
          templateId: selectedTemplateId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generate failed");
      message.success(
        `${json.generated ?? 0} content(s) generated successfully with OpenAI`
      );
      setGenerateModalOpen(false);
      setSelectedRowKeys([]);
      fetchPlanners();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Generate failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setGenerateLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (!supabase || selectedRowKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const ids = selectedRowKeys as string[];
      const { error } = await supabase
        .from("content_planners")
        .delete()
        .in("id", ids);
      if (error) throw error;
      message.success(`${ids.length} planner(s) deleted successfully`);
      setSelectedRowKeys([]);
      fetchPlanners();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Bulk delete failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  function openEditModal(planner: ContentPlanner) {
    setEditingPlanner(planner);
    editForm.setFieldsValue({
      week: planner.week ?? "",
      platform: planner.platform ?? "",
      division: planner.division ?? "",
      post_type: planner.post_type ?? "",
      post_title: planner.post_title ?? "",
      content_description: planner.content_description ?? "",
      hashtags: planner.hashtags ?? "",
      status: planner.status ?? "draft",
      target_location: planner.target_location ?? "",
      goal: planner.goal ?? "",
      keywords: planner.keywords ?? "",
    });
    setEditModalOpen(true);
  }

  async function handleEditSave() {
    if (!supabase || !editingPlanner) return;
    const values = await editForm.validateFields();
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from("content_planners")
        .update({
          week: values.week?.trim() || null,
          platform: values.platform?.trim() || null,
          division: values.division?.trim() || null,
          post_type: values.post_type?.trim() || null,
          post_title: values.post_title?.trim() || null,
          content_description: values.content_description?.trim() || null,
          hashtags: values.hashtags?.trim() || null,
          status: values.status || "draft",
          target_location: values.target_location?.trim() || null,
          goal: values.goal?.trim() || null,
          keywords: values.keywords?.trim() || null,
        })
        .eq("id", editingPlanner.id);
      if (error) throw error;
      message.success("Planner updated successfully");
      setEditModalOpen(false);
      setEditingPlanner(null);
      fetchPlanners();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Update failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setEditLoading(false);
    }
  }

  const columns = [
    {
      title: "Company",
      dataIndex: ["companies", "name"],
      key: "company",
      render: (n: string) => n ?? "-",
    },
    {
      title: "Week",
      dataIndex: "week",
      key: "week",
      render: (v: string) => v ?? "-",
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (v: string) => v ?? "-",
    },
    {
      title: "Post Title",
      dataIndex: "post_title",
      key: "post_title",
      render: (v: string) => v ?? "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => (
        <Tag color={statusColors[v] ?? "default"}>{v}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: ContentPlanner) => (
        <Space>
          <Link href={`/admin/content-planners/${record.id}`}>
            <Button type="text" icon={<EyeOutlined />} title="View Results" />
          </Link>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            title="Edit"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Content Planners
          </h1>
          <p className="text-slate-500 mt-1">
            Import from CSV, export, and execute content generation with AI
          </p>
        </div>
        <Space wrap>
          <Select
            placeholder="Filter company"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => setSelectedCompany(v ?? null)}
          >
            {companies.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
            loading={importLoading}
          >
            Import CSV
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={openExportModal}
            loading={exportLoading}
            disabled={planners.length === 0}
          >
            Export CSV
          </Button>
          <Popconfirm
            title="Delete selected planners?"
            description={`${selectedRowKeys.length} planner(s) will be deleted. Related AI prompts and results will also be removed.`}
            onConfirm={handleBulkDelete}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={bulkDeleteLoading}
              disabled={selectedRowKeys.length === 0}
            >
              Bulk Delete {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ""}
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={openGenerateModal}
            loading={generateLoading}
            disabled={
              selectedRowKeys.length === 0 ||
              planners.filter((p) => selectedRowKeys.includes(p.id) && p.status === "draft").length === 0
            }
          >
            Execute Generate (OpenAI)
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Table
          dataSource={planners}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
      </Card>

      <Modal
        title="Export CSV - Customize Headers"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        onOk={exportToCSVWithHeaders}
        confirmLoading={exportLoading}
        okText="Export"
        width={520}
      >
        <p className="text-slate-500 text-sm mb-4">
          Customize CSV column headers. Uncheck columns to exclude from export.
        </p>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {exportHeaders.map((h, idx) => (
            <div key={h.key} className="flex items-center gap-3">
              <Checkbox
                checked={h.include}
                onChange={(e) => {
                  const next = [...exportHeaders];
                  next[idx] = { ...next[idx], include: e.target.checked };
                  setExportHeaders(next);
                }}
              />
              <Input
                value={h.label}
                onChange={(e) => {
                  const next = [...exportHeaders];
                  next[idx] = { ...next[idx], label: e.target.value };
                  setExportHeaders(next);
                }}
                placeholder={`Header for ${h.key}`}
                disabled={!h.include}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title="Execute Generate - Select Template"
        open={generateModalOpen}
        onCancel={() => setGenerateModalOpen(false)}
        onOk={executeGenerate}
        confirmLoading={generateLoading}
        okText="Generate"
        width={480}
      >
        <div className="py-4 space-y-4">
          <p className="text-slate-600 text-sm">
            {planners.filter((p) => selectedRowKeys.includes(p.id) && p.status === "draft").length}{" "}
            planner(s) will be generated with OpenAI.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Template (optional)</label>
            <Select
              placeholder="Select a template to use"
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
        </div>
      </Modal>

      <Modal
        title="Edit Content Planner"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingPlanner(null);
        }}
        onOk={handleEditSave}
        confirmLoading={editLoading}
        okText="Save"
        cancelText="Cancel"
        width={560}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item name="week" label="Week">
            <Input placeholder="e.g. 2025-01-13" />
          </Form.Item>
          <Form.Item name="platform" label="Platform">
            <Input placeholder="e.g. Instagram, TikTok" />
          </Form.Item>
          <Form.Item name="division" label="Division">
            <Input placeholder="Division" />
          </Form.Item>
          <Form.Item name="post_type" label="Post Type">
            <Input placeholder="Post type" />
          </Form.Item>
          <Form.Item name="post_title" label="Post Title">
            <Input placeholder="Post title" />
          </Form.Item>
          <Form.Item name="content_description" label="Content Description">
            <Input.TextArea rows={3} placeholder="Content description" />
          </Form.Item>
          <Form.Item name="hashtags" label="Hashtags">
            <Input placeholder="Hashtags" />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { value: "draft", label: "Draft" },
                { value: "generated", label: "Generated" },
                { value: "published", label: "Published" },
              ]}
              placeholder="Status"
            />
          </Form.Item>
          <Form.Item name="target_location" label="Target Location">
            <Input placeholder="Target location" />
          </Form.Item>
          <Form.Item name="goal" label="Goal">
            <Input placeholder="Goal" />
          </Form.Item>
          <Form.Item name="keywords" label="Keywords">
            <Input placeholder="Keywords" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import Content Planners from CSV"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          resetImportState();
        }}
        footer={null}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Company
            </label>
            <Select
              placeholder="Select company"
              style={{ width: "100%" }}
              onChange={setImportCompanyId}
              value={importCompanyId}
              options={companies.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </div>
          {importStep === 1 ? (
            <>
              <p className="text-slate-500 text-sm">
                Expected columns: week, platform, division, post_type, post_title,
                content_description, hashtags, status, target_location, goal, keywords.
                You can map different header names in the next step.
              </p>
              <Upload.Dragger
                multiple={false}
                accept=".csv"
                beforeUpload={(file) => {
                  handleFileSelect(file);
                  return false;
                }}
                disabled={!importCompanyId}
                fileList={[]}
              >
                <p className="ant-upload-drag-icon">
                  <FileTextOutlined className="text-4xl text-blue-500" />
                </p>
                <p className="ant-upload-text">
                  Click or drag CSV file here
                </p>
              </Upload.Dragger>
            </>
          ) : (
            <>
              <p className="text-slate-500 text-sm">
                Map CSV columns to fields. Select &quot;— Skip —&quot; for columns to ignore.
              </p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {importParsedHeaders.map((csvH) => (
                  <div key={csvH} className="flex items-center gap-3">
                    <span className="w-36 truncate text-sm" title={csvH}>
                      {csvH}
                    </span>
                    <Select
                      value={importHeaderMapping[csvH] ?? "__skip__"}
                      onChange={(v) =>
                        setImportHeaderMapping((prev) => ({
                          ...prev,
                          [csvH]: v,
                        }))
                      }
                      options={IMPORT_TARGET_FIELDS}
                      style={{ flex: 1 }}
                      placeholder="Map to field"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => setImportStep(1)}>Back</Button>
                <Button
                  type="primary"
                  loading={importLoading}
                  onClick={handleImportConfirm}
                >
                  Import
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
