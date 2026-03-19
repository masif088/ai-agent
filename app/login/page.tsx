"use client";

import { useState, useEffect } from "react";
import { Form, Input, Button, Card, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { FormProps } from "antd";
import type { SupabaseClient } from "@supabase/supabase-js";

type FieldType = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const router = useRouter();

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    if (!values.email || !values.password || !supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      message.success("Login successful!");
      router.push("/admin");
      router.refresh();
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(err?.message ?? "Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card
        className="w-full max-w-md shadow-2xl border-0"
        styles={{
          body: { padding: 40 },
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            Admin Dashboard
          </h1>
          <p className="text-slate-500">Sign in with your account</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item<FieldType>
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email format" },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-slate-400" />}
              placeholder="Email"
            />
          </Form.Item>

          <Form.Item<FieldType>
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-slate-400" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-6">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className="h-12 font-medium"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
