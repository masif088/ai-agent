"use client";

import { Layout, Avatar, Dropdown } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const { Header } = Layout;

export function AdminHeader({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Header className="bg-white border-b border-slate-200 px-6 flex items-center justify-end h-16">
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <button className="flex items-center gap-3  rounded-lg px-3 py-2 transition">
          <Avatar
            icon={<UserOutlined />}
            src={user.user_metadata?.avatar_url}
            className="bg-slate-200"
          />
          <div className="text-left hidden sm:block">
            <div className="text-sm font-medium text-white">
              {user.email}
            </div>
            <div className="text-xs text-white hover:text-slate-500">Admin</div>
          </div>
        </button>
      </Dropdown>
    </Header>
  );
}
