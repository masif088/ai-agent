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
  Upload,
  Avatar,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const TEMPLATE_IMAGES_BUCKET = "template-images";

type Company = { id: string; name: string };

type TemplateImage = { url: string; label: string };

type Template = {
  id: string;
  company_id: string | null;
  template_type: string | null;
  template_content: string | null;
  template_images?: TemplateImage[] | null;
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
  const [templateImages, setTemplateImages] = useState<TemplateImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

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
    setTemplateImages([]);
    form.setFieldsValue({
      company_id: null,
      template_type: "",
      template_content: "",
    });
    setModalOpen(true);
  }

  function openEditModal(record: Template) {
    setEditingId(record.id);
    const imgs = record.template_images;
    setTemplateImages(Array.isArray(imgs) ? imgs : []);
    form.setFieldsValue({
      company_id: record.company_id ?? undefined,
      template_type: record.template_type ?? "",
      template_content: record.template_content ?? "",
    });
    setModalOpen(true);
  }

  async function handleImageUpload(file: File, label: string) {
    if (!supabase || !editingId) return;
    setImageUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${editingId}/${Date.now()}-${label.replace(/\s+/g, "-") || "image"}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(TEMPLATE_IMAGES_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from(TEMPLATE_IMAGES_BUCKET)
        .getPublicUrl(path);
      setTemplateImages((prev) => [...prev, { url: urlData.publicUrl, label }]);
      message.success("Image uploaded");
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setImageUploading(false);
    }
  }

  function removeTemplateImage(idx: number) {
    setTemplateImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(values: TemplateFormValues) {
    if (!supabase) return;
    setSubmitLoading(true);
    try {
      const payload = {
        company_id: values.company_id || null,
        template_type: values.template_type.trim() || null,
        template_content: values.template_content.trim() || null,
        template_images: templateImages.length > 0 ? templateImages : null,
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
      title: "Images",
      dataIndex: "template_images",
      key: "template_images",
      width: 80,
      render: (imgs: TemplateImage[] | null) =>
        Array.isArray(imgs) && imgs.length > 0 ? (
          <span className="text-slate-600">{imgs.length} image(s)</span>
        ) : (
          "-"
        ),
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
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Reference Images</div>
                      <div className="text-slate-600 text-xs">
                        Add logos or reference images below. They are sent to the AI when generating content (vision).
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

          <Form.Item label="Reference images (optional)">
            <p className="text-xs text-slate-500 mb-2">
              Add logos or reference images. They will be sent to AI when generating content.
            </p>
            {editingId ? (
              <div className="space-y-3">
                {templateImages.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                    <Avatar src={img.url} shape="square" size={48} />
                    <Input
                      placeholder="Label (e.g. Logo)"
                      value={img.label}
                      onChange={(e) =>
                        setTemplateImages((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x))
                        )
                      }
                      className="flex-1 max-w-[180px]"
                    />
                    <Button type="text" danger size="small" onClick={() => removeTemplateImage(idx)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Upload
                  showUploadList={false}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  beforeUpload={(file) => {
                    handleImageUpload(file, "Reference image");
                    return false;
                  }}
                  disabled={imageUploading}
                >
                  <Button icon={<UploadOutlined />} loading={imageUploading}>
                    Add image
                  </Button>
                </Upload>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Save the template first, then edit to add images.</p>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
