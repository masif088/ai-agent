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
  Popconfirm,
  Upload,
  Avatar,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const LOGO_BUCKET = "company-logos";

type Company = {
  id: string;
  name: string;
  description: string | null;
  brand_voice: string | null;
  target_audience: string | null;
  tone: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyFormValues = {
  name: string;
  description: string;
  brand_voice: string;
  target_audience: string;
  tone: string;
};

const initialFormValues: CompanyFormValues = {
  name: "",
  description: "",
  brand_voice: "",
  target_audience: "",
  tone: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm<CompanyFormValues>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  useEffect(() => {
    if (supabase) fetchCompanies();
  }, [supabase]);

  async function fetchCompanies() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");
    if (error) {
      message.error("Failed to load data: " + error.message);
    } else {
      setCompanies((data as Company[]) ?? []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingId(null);
    form.setFieldsValue(initialFormValues);
    setModalOpen(true);
  }

  function openEditModal(record: Company) {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      description: record.description ?? "",
      brand_voice: record.brand_voice ?? "",
      target_audience: record.target_audience ?? "",
      tone: record.tone ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(values: CompanyFormValues) {
    if (!supabase) return;
    setSubmitLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        brand_voice: values.brand_voice.trim() || null,
        target_audience: values.target_audience.trim() || null,
        tone: values.tone.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        message.success("Company updated successfully");
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
        message.success("Company added successfully");
      }

      setModalOpen(false);
      fetchCompanies();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Failed to save: " + (err?.message ?? "Unknown error"));
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleLogoUpload(companyId: string, file: File) {
    if (!supabase) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${companyId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", companyId);
      if (updateError) throw updateError;
      message.success("Logo uploaded");
      fetchCompanies();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      message.success("Company deleted successfully");
      fetchCompanies();
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error("Failed to delete: " + (err?.message ?? "Unknown error"));
    }
  }

  const columns = [
    {
      title: "Logo",
      dataIndex: "logo_url",
      key: "logo",
      width: 64,
      render: (url: string | null) =>
        url ? (
          <Avatar src={url} alt="Logo" shape="square" className="!flex shrink-0" />
        ) : (
          <Avatar shape="square" className="!bg-slate-200">-</Avatar>
        ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: Company, b: Company) => a.name.localeCompare(b.name),
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (v: string) => v ?? "-",
    },
    {
      title: "Brand Voice",
      dataIndex: "brand_voice",
      key: "brand_voice",
      ellipsis: true,
      render: (v: string) => v ?? "-",
    },
    {
      title: "Target Audience",
      dataIndex: "target_audience",
      key: "target_audience",
      ellipsis: true,
      render: (v: string) => v ?? "-",
    },
    {
      title: "Tone",
      dataIndex: "tone",
      key: "tone",
      render: (v: string) => v ?? "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Company) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Delete company?"
            description="Related knowledge base and content planners will also be deleted."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes, delete"
            cancelText="Cancel"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
          <p className="text-slate-500 mt-1">
            Manage companies and brand profiles
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Company
        </Button>
      </div>

      <Card className="shadow-sm">
        <Table
          dataSource={companies}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? "Edit Company" : "Add Company"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitLoading}
        width={560}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Company name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea
              rows={3}
              placeholder="Brief company description"
            />
          </Form.Item>

          <Form.Item name="brand_voice" label="Brand Voice">
            <Input.TextArea
              rows={2}
              placeholder="Brand voice and character (for AI content)"
            />
          </Form.Item>

          <Form.Item name="target_audience" label="Target Audience">
            <Input placeholder="Who is the brand's target audience" />
          </Form.Item>

          <Form.Item name="tone" label="Tone">
            <Input placeholder="Communication tone (formal, casual, friendly, etc)" />
          </Form.Item>

          {editingId && (
            <Form.Item label="Logo">
              <div className="flex items-center gap-4">
                {(() => {
                  const rec = companies.find((c) => c.id === editingId);
                  const logoUrl = rec?.logo_url;
                  return (
                    <>
                      {logoUrl ? (
                        <Avatar src={logoUrl} size={64} shape="square" alt="Logo" />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">No logo</div>
                      )}
                      <Upload
                        showUploadList={false}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        beforeUpload={(file) => {
                          handleLogoUpload(editingId, file);
                          return false;
                        }}
                        disabled={logoUploading}
                      >
                        <Button icon={<UploadOutlined />} loading={logoUploading}>
                          {logoUrl ? "Replace logo" : "Upload logo"}
                        </Button>
                      </Upload>
                    </>
                  );
                })()}
              </div>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP, SVG. Max 2MB.</p>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
