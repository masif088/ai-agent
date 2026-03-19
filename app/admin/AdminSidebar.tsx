"use client";

import { useState } from "react";
import { Layout, Menu, Typography } from "antd";
import {
  DashboardOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  BankOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Sider } = Layout;

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems: MenuProps["items"] = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: <Link href="/admin">Dashboard</Link>,
    },
    {
      key: "/admin/companies",
      icon: <BankOutlined />,
      label: <Link href="/admin/companies">Companies</Link>,
    },
    {
      key: "/admin/content-planners",
      icon: <FileTextOutlined />,
      label: <Link href="/admin/content-planners">Content Planners</Link>,
    },
    {
      key: "/admin/templates",
      icon: <CopyOutlined />,
      label: <Link href="/admin/templates">Templates</Link>,
    },
    {
      key: "/admin/settings",
      icon: <SettingOutlined />,
      label: <Link href="/admin/settings">Settings</Link>,
    },
  ];

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      theme="light"
      className="border-r border-slate-200 min-h-screen"
      width={256}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        {!collapsed && (
          <Typography.Title level={4} className="!mb-0 !text-slate-800">
            Admin
          </Typography.Title>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-slate-100 rounded"
        >
          {collapsed ? (
            <MenuUnfoldOutlined className="text-slate-600" style={{ color: "#000" }} />
          ) : (
            <MenuFoldOutlined className="text-slate-600" style={{ color: "#000" }} />
          )}
        </button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        className="mt-4 border-0"
        style={{ height: "calc(100vh - 64px)" }}
      />
    </Sider>
  );
}
