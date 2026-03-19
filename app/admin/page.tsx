import { Card, Row, Col, Statistic } from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

export default function AdminDashboardPage() {
  const stats = [
    {
      title: "Total Users",
      value: 128,
      icon: <UserOutlined />,
      color: "#1677ff",
    },
    {
      title: "Total Documents",
      value: 456,
      icon: <FileTextOutlined />,
      color: "#52c41a",
    },
    {
      title: "Completed",
      value: 312,
      icon: <CheckCircleOutlined />,
      color: "#13c2c2",
    },
    {
      title: "In Progress",
      value: 144,
      icon: <ClockCircleOutlined />,
      color: "#faad14",
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Selamat datang di panel administrasi
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={
                  <span
                    className="text-2xl"
                    style={{ color: stat.color }}
                  >
                    {stat.icon}
                  </span>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} className="mt-6">
        <Col xs={24} lg={16}>
          <Card title="Aktivitas Terbaru" className="shadow-sm">
            <p className="text-slate-500">
              Belum ada aktivitas. Dashboard siap untuk diintegrasikan dengan
              data Anda.
            </p>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Ringkasan" className="shadow-sm">
            <p className="text-slate-500">
              Sistem admin dashboard terhubung dengan Supabase. Login untuk
              mengakses fitur ini.
            </p>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
