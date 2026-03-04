import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: "📊", section: "Main" },
  { to: "/transactions", label: "Transactions", icon: "💳", section: "Main" },
  { to: "/accounts", label: "Accounts", icon: "🏦", section: "Main" },
  { to: "/reports/breakdown", label: "Spending Breakdown", icon: "🥧", section: "Reports" },
  { to: "/reports/trends", label: "Monthly Trends", icon: "📈", section: "Reports" },
  { to: "/settings/categories", label: "Categories", icon: "🏷️", section: "Settings" },
  { to: "/settings/accounts", label: "Manage Accounts", icon: "⚙️", section: "Settings" },
  { to: "/settings/data", label: "Data & Backup", icon: "💾", section: "Settings" },
  { to: "/settings/security", label: "Security", icon: "🔒", section: "Settings" },
];

const sections = ["Main", "Reports", "Settings"];

interface Props {
  onLock: () => void;
}

export default function Layout({ onLock }: Props) {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-logo">Accrue</div>
        <div className="sidebar-nav">
          {sections.map((section) => (
            <div key={section}>
              <div className="sidebar-section">{section}</div>
              {links
                .filter((l) => l.section === section)
                .map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    className={({ isActive }) =>
                      "sidebar-link" + (isActive ? " active" : "")
                    }
                  >
                    <span>{l.icon}</span>
                    <span>{l.label}</span>
                  </NavLink>
                ))}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="sidebar-lock-btn" onClick={onLock}>
            <span>🔐</span>
            <span>Lock</span>
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
