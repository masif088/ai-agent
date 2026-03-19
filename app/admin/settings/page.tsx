import { Card, Form, Input, Button } from "antd";

export default function AdminSettingsPage() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Manage application settings</p>
      </div>

      <Card title="Pengaturan Umum" className="shadow-sm max-w-2xl">
        <Form layout="vertical">
          <Form.Item label="Nama Aplikasi" name="appName">
            <Input placeholder="Masukkan nama aplikasi" />
          </Form.Item>
          <Form.Item label="Deskripsi" name="description">
            <Input.TextArea
              rows={3}
              placeholder="Masukkan deskripsi aplikasi"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary">Simpan</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
