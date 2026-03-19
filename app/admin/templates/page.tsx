"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Collapse,
  Alert,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

type Company = { id: string; name: string };

type Template = {
  id: string;
  company_id: string | null;
  template_type: string | null;
  template_content: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
};

type TemplateFormValues = {
  company_id: string | null;
  template_type: string;
  template_content: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm<TemplateFormValues>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  useEffect(() => {
    if (supabase) {
      fetchTemplates();
      fetchCompanies();
    }
  }, [supabase, selectedCompany]);

  async function fetchCompanies() {
    if (!supabase) return;
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");
    setCompanies(data ?? []);
  }

  async function fetchTemplates() {
    if (!supabase) return;
    setLoading(true);
    let query = supabase
      .from("templates")
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
      setTemplates((data as Template[]) ?? []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingId(null);
    form.setFieldsValue({
      company_id: null,
      template_type: "",
      template_content: "",
    });
    setModalOpen(true);
  }

  function openEditModal(record: Template) {
    setEditingId(record.id);
    form.setFieldsValue({
      company_id: record.company_id ?? undefined,
      template_type: record.template_type ?? "",
      template_content: record.template_content ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(values: TemplateFormValues) {
    if (!supabase) return;
    setSubmitLoading(true);
    try {
      const payload = {
        company_id: values.company_id || null,
        template_type: values.template_type.trim() || null,
        template_content: values.template_content.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("templates")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        message.success("Template updated successfully");
      } else {
        const { error } = await supabase.from("templates").insert(payload);
        if (error) throw error;
        message.success("Template added successfully");
      }

      setModalOpen(false);
      fetchTemplates();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Failed to save: " + (err?.message ?? "Unknown error"));
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
      message.success("Template deleted successfully");
      fetchTemplates();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Failed to delete: " + (err?.message ?? "Unknown error"));
    }
  }

  const columns = [
    {
      title: "Company",
      dataIndex: ["companies", "name"],
      key: "company",
      render: (v: string) => v ?? "-",
    },
    {
      title: "Template Type",
      dataIndex: "template_type",
      key: "template_type",
      render: (v: string) => v ?? "-",
    },
    {
      title: "Template Content",
      dataIndex: "template_content",
      key: "template_content",
      ellipsis: true,
      render: (v: string) => (v ? (v.length > 80 ? v.slice(0, 80) + "..." : v) : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Template) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            title="Edit"
          />
          <Popconfirm
            title="Delete template?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} title="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Templates</h1>
          <p className="text-slate-500 mt-1">
            Manage content templates for AI generation
          </p>
        </div>
        <Space wrap>
          <Select
            placeholder="Filter by company"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => setSelectedCompany(v ?? null)}
            options={companies.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add Template
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Table
          dataSource={templates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? "Edit Template" : "Add Template"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitLoading}
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <Form.Item name="company_id" label="Company">
            <Select
              placeholder="Select company (optional)"
              allowClear
              options={companies.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="template_type" label="Template Type">
            <Input placeholder="e.g. social_post, email, caption, image" />
          </Form.Item>

          <Collapse
            className="mb-4"
            items={[
              {
                key: "variables",
                label: "Available variables (format {{name}})",
                children: (
                  <div className="text-xs space-y-3">
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">From Content Planner</div>
                      <div className="text-slate-600 space-y-0.5">
                        <code className="bg-slate-100 px-1 rounded">{`{{post_title}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{content_description}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{platform}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{division}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{post_type}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{hashtags}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{target_location}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{goal}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{keywords}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{week}}`}</code>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">From Company</div>
                      <div className="text-slate-600">
                        <code className="bg-slate-100 px-1 rounded">{`{{company_name}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{brand_voice}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{target_audience}}`}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{`{{tone}}`}</code>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">From AI Results</div>
                      <div className="text-slate-600 space-y-0.5">
                        <code className="bg-slate-100 px-1 rounded">{`{{result_text}}`}</code> — main content text
                        <br />
                        <code className="bg-slate-100 px-1 rounded">{`{{result_caption}}`}</code> — social media caption
                        <br />
                        <code className="bg-slate-100 px-1 rounded">{`{{result_image_prompt}}`}</code> — for template type <strong>image</strong>, used when generating AI image
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />

          <Form.Item
            name="template_content"
            label="Template Content"
            rules={[{ required: true, message: "Template content is required" }]}
          >
            <Input.TextArea
              rows={8}
              placeholder="Use placeholders e.g. {{post_title}}, {{result_text}}, {{result_image_prompt}} for image."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
