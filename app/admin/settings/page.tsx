import { AdminShell } from "@/components/AdminShell";

export default function SettingsPage() {
  return <AdminShell title="Settings">
    <div className="page-heading"><div><h1>Settings</h1><p>Manage organization-wide attendance preferences.</p></div></div>
    <div className="two-column"><section className="panel"><div className="panel-header"><h2 className="panel-title">Attendance configuration</h2><span className="panel-note">Current foundation</span></div><ul className="list"><li className="list-row"><span>Attendance method</span><span className="muted">GPS check-in</span></li><li className="list-row"><span>Location verification</span><span className="muted">Server validated</span></li><li className="list-row"><span>Late threshold</span><span className="muted">Not configured</span></li></ul></section><section className="panel"><div className="panel-header"><h2 className="panel-title">Organization</h2></div><ul className="list"><li className="list-row"><span>Company name</span><strong>ARL ENGINEERS</strong></li><li className="list-row"><span>Application</span><span className="muted">Workforce Attendance</span></li><li className="list-row"><span>Timezone</span><span className="muted">Not configured</span></li></ul></section></div>
  </AdminShell>;
}
