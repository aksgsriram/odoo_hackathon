import { useState, useMemo } from "react";
import {
  LayoutDashboard, Building2, Package, ArrowLeftRight,
  Calendar, Wrench, ClipboardCheck, BarChart3, Bell,
  ScrollText, LogOut, Search, Plus, Filter,
  CheckCircle2, Clock, AlertTriangle, Monitor, Car,
  Users, MapPin, Shield, X, Hash, TrendingUp,
  AlertCircle, ChevronRight, FileText, CalendarDays,
  MoreVertical, Eye, Activity, Boxes, Layers,
  ArrowUpRight, RefreshCw, UserCheck, Edit2,
  ChevronDown, Zap, Tag, Settings, BookOpen,
  Clipboard, CheckCheck, XCircle, Info, Star,
  ArrowRight, Lock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Role = "Admin" | "Asset Manager" | "Department Head" | "Employee";
type AssetStatus = "Available" | "Allocated" | "Reserved" | "Under Maintenance" | "Lost" | "Retired" | "Disposed";
type MaintStatus = "Pending" | "Approved" | "Rejected" | "In Progress" | "Resolved";
type BookStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
type AuditCycleStatus = "Open" | "In Progress" | "Closed";
type AuditItemStatus = "Pending" | "Verified" | "Missing" | "Damaged";

interface User { id: string; name: string; email: string; role: Role; department: string; status: "Active" | "Inactive"; }
interface Department { id: string; name: string; head?: string; parent?: string; status: "Active" | "Inactive"; employeeCount: number; }
interface AssetCategory { id: string; name: string; assetCount: number; customFields: string[]; }
interface Asset { id: string; tag: string; name: string; category: string; serial: string; acquired: string; cost: number; condition: string; location: string; status: AssetStatus; bookable: boolean; department?: string; }
interface Allocation { id: string; assetId: string; employeeId: string; department: string; allocatedDate: string; expectedReturn?: string; returnedDate?: string; conditionOut?: string; conditionIn?: string; notes?: string; status: "Active" | "Returned" | "Overdue"; }
interface Booking { id: string; assetId: string; bookedBy: string; date: string; startTime: string; endTime: string; purpose: string; status: BookStatus; }
interface MaintRequest { id: string; assetId: string; requestedBy: string; issue: string; priority: "Low" | "Medium" | "High"; status: MaintStatus; requestedDate: string; approvedBy?: string; technician?: string; resolvedDate?: string; notes?: string; }
interface AuditCycle { id: string; name: string; scope: string; auditors: string[]; startDate: string; endDate: string; status: AuditCycleStatus; items: AuditItem[]; }
interface AuditItem { assetId: string; status: AuditItemStatus; notes?: string; auditedBy?: string; }
interface TransferRequest { id: string; assetId: string; requestedBy: string; fromEmployee: string; toEmployee: string; requestedDate: string; status: "Requested" | "Approved" | "Rejected"; notes?: string; }
interface Notification { id: string; type: string; message: string; date: string; read: boolean; }
type Screen = "dashboard" | "org" | "assets" | "allocations" | "booking" | "maintenance" | "audit" | "reports" | "notifications" | "logs";

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
const INIT_USERS: User[] = [
  { id: "u1", name: "Sarah Chen", email: "sarah.chen@assetflow.io", role: "Admin", department: "IT", status: "Active" },
  { id: "u2", name: "Raj Patel", email: "raj.patel@assetflow.io", role: "Asset Manager", department: "IT", status: "Active" },
  { id: "u3", name: "Emma Wilson", email: "emma.wilson@assetflow.io", role: "Department Head", department: "Human Resources", status: "Active" },
  { id: "u4", name: "Marcus Johnson", email: "marcus.j@assetflow.io", role: "Department Head", department: "Operations", status: "Active" },
  { id: "u5", name: "Alex Kumar", email: "alex.kumar@assetflow.io", role: "Employee", department: "IT", status: "Active" },
  { id: "u6", name: "Priya Sharma", email: "priya.s@assetflow.io", role: "Employee", department: "Finance", status: "Active" },
  { id: "u7", name: "David Lee", email: "david.lee@assetflow.io", role: "Employee", department: "Engineering", status: "Active" },
  { id: "u8", name: "Maria Santos", email: "maria.s@assetflow.io", role: "Employee", department: "Human Resources", status: "Active" },
  { id: "u9", name: "James Brown", email: "james.b@assetflow.io", role: "Employee", department: "Operations", status: "Active" },
  { id: "u10", name: "Lisa Park", email: "lisa.park@assetflow.io", role: "Employee", department: "IT", status: "Active" },
];

const INIT_DEPTS: Department[] = [
  { id: "d1", name: "IT", head: "u2", status: "Active", employeeCount: 4 },
  { id: "d2", name: "Human Resources", head: "u3", status: "Active", employeeCount: 2 },
  { id: "d3", name: "Operations", head: "u4", status: "Active", employeeCount: 2 },
  { id: "d4", name: "Finance", status: "Active", employeeCount: 1 },
  { id: "d5", name: "Engineering", status: "Active", employeeCount: 1 },
  { id: "d6", name: "Legal", status: "Inactive", employeeCount: 0 },
];

const INIT_CATEGORIES: AssetCategory[] = [
  { id: "c1", name: "Electronics", assetCount: 9, customFields: ["Warranty Period", "MAC Address"] },
  { id: "c2", name: "Furniture", assetCount: 4, customFields: [] },
  { id: "c3", name: "Vehicles", assetCount: 3, customFields: ["License Plate", "Mileage"] },
  { id: "c4", name: "Shared Spaces", assetCount: 2, customFields: ["Capacity", "Amenities"] },
  { id: "c5", name: "AV Equipment", assetCount: 3, customFields: ["Resolution", "Connectivity"] },
];

const INIT_ASSETS: Asset[] = [
  { id: "a1", tag: "AF-0001", name: "MacBook Pro 14\"", category: "Electronics", serial: "SN-MBP-2247", acquired: "2024-01-15", cost: 2499, condition: "Excellent", location: "IT Office — Rack A", status: "Available", bookable: false },
  { id: "a2", tag: "AF-0002", name: "Dell Monitor 27\"", category: "Electronics", serial: "SN-DM-3812", acquired: "2023-06-10", cost: 549, condition: "Good", location: "IT Office — Desk 3", status: "Allocated", bookable: false, department: "IT" },
  { id: "a3", tag: "AF-0003", name: "MacBook Air M2", category: "Electronics", serial: "SN-MBA-9951", acquired: "2024-03-20", cost: 1299, condition: "Excellent", location: "Finance — Desk 1", status: "Allocated", bookable: false, department: "Finance" },
  { id: "a4", tag: "AF-0004", name: "iPhone 14 Pro", category: "Electronics", serial: "SN-IP-6647", acquired: "2023-09-01", cost: 1099, condition: "Good", location: "IT Storage", status: "Available", bookable: false },
  { id: "a5", tag: "AF-0005", name: "iPad Pro 11\"", category: "Electronics", serial: "SN-IPD-2294", acquired: "2023-11-15", cost: 899, condition: "Fair", location: "Maintenance Bay", status: "Under Maintenance", bookable: false },
  { id: "a6", tag: "AF-0006", name: "Ergonomic Chair (Black)", category: "Furniture", serial: "SN-CH-0012", acquired: "2022-08-01", cost: 389, condition: "Good", location: "Storage Room B", status: "Available", bookable: false },
  { id: "a7", tag: "AF-0007", name: "Height-Adjust Standing Desk", category: "Furniture", serial: "SN-SD-0088", acquired: "2023-01-10", cost: 750, condition: "Good", location: "Engineering — Bay 2", status: "Allocated", bookable: false, department: "Engineering" },
  { id: "a8", tag: "AF-0008", name: "Conference Table (12-seat)", category: "Furniture", serial: "SN-CT-0003", acquired: "2021-05-20", cost: 1200, condition: "Good", location: "Meeting Room A1", status: "Available", bookable: false },
  { id: "a9", tag: "AF-0009", name: "Toyota Corolla 2022", category: "Vehicles", serial: "VIN-TC-2022-441", acquired: "2022-03-15", cost: 24500, condition: "Good", location: "Parking B2", status: "Reserved", bookable: true },
  { id: "a10", tag: "AF-0010", name: "Honda Civic 2023", category: "Vehicles", serial: "VIN-HC-2023-872", acquired: "2023-06-01", cost: 27000, condition: "Excellent", location: "Parking A1", status: "Allocated", bookable: false, department: "Operations" },
  { id: "a11", tag: "AF-0011", name: "Meeting Room B2", category: "Shared Spaces", serial: "ROOM-B2", acquired: "2020-01-01", cost: 0, condition: "Good", location: "Floor 2 — Wing B", status: "Available", bookable: true },
  { id: "a12", tag: "AF-0012", name: "Conference Room A1", category: "Shared Spaces", serial: "ROOM-A1", acquired: "2020-01-01", cost: 0, condition: "Excellent", location: "Floor 1 — Wing A", status: "Available", bookable: true },
  { id: "a13", tag: "AF-0013", name: "Epson 4K Projector", category: "AV Equipment", serial: "SN-EP-7741", acquired: "2023-02-14", cost: 1200, condition: "Good", location: "AV Closet — Floor 1", status: "Available", bookable: true },
  { id: "a14", tag: "AF-0014", name: "Dell XPS 15 Laptop", category: "Electronics", serial: "SN-XPS-5523", acquired: "2024-02-01", cost: 1799, condition: "Excellent", location: "Operations — Desk 4", status: "Allocated", bookable: false, department: "Operations" },
  { id: "a15", tag: "AF-0015", name: "Whiteboard 6ft", category: "Furniture", serial: "SN-WB-0041", acquired: "2022-04-05", cost: 180, condition: "Fair", location: "Meeting Room B2", status: "Available", bookable: false },
  { id: "a16", tag: "AF-0016", name: "Sony Alpha A7 III", category: "AV Equipment", serial: "SN-SA-1127", acquired: "2023-07-20", cost: 2499, condition: "Fair", location: "Maintenance Bay", status: "Under Maintenance", bookable: false },
  { id: "a17", tag: "AF-0017", name: "MacBook Pro 16\"", category: "Electronics", serial: "SN-MBP-8834", acquired: "2024-04-15", cost: 3499, condition: "Excellent", location: "IT — Desk 7", status: "Allocated", bookable: false, department: "IT" },
  { id: "a18", tag: "AF-0018", name: "Logitech Rally Camera", category: "AV Equipment", serial: "SN-LR-4491", acquired: "2023-08-10", cost: 1099, condition: "Good", location: "Conference Room A1", status: "Available", bookable: true },
  { id: "a19", tag: "AF-0019", name: "Electric Kick Scooter", category: "Vehicles", serial: "SN-ES-2231", acquired: "2022-05-01", cost: 800, condition: "Poor", location: "Storage Yard", status: "Retired", bookable: false },
  { id: "a20", tag: "AF-0020", name: "Lenovo ThinkPad X1", category: "Electronics", serial: "SN-TP-9912", acquired: "2023-03-10", cost: 1599, condition: "Unknown", location: "Unknown", status: "Lost", bookable: false },
];

const INIT_ALLOCATIONS: Allocation[] = [
  { id: "al1", assetId: "a2", employeeId: "u5", department: "IT", allocatedDate: "2024-11-15", expectedReturn: "2025-06-15", status: "Overdue", conditionOut: "Good" },
  { id: "al2", assetId: "a3", employeeId: "u6", department: "Finance", allocatedDate: "2025-01-10", expectedReturn: "2025-07-10", status: "Overdue", conditionOut: "Excellent" },
  { id: "al3", assetId: "a7", employeeId: "u7", department: "Engineering", allocatedDate: "2025-02-01", status: "Active", conditionOut: "Good" },
  { id: "al4", assetId: "a10", employeeId: "u4", department: "Operations", allocatedDate: "2025-03-15", expectedReturn: "2025-07-15", status: "Active", conditionOut: "Excellent" },
  { id: "al5", assetId: "a14", employeeId: "u9", department: "Operations", allocatedDate: "2025-04-01", expectedReturn: "2025-07-20", status: "Active", conditionOut: "Excellent" },
  { id: "al6", assetId: "a17", employeeId: "u10", department: "IT", allocatedDate: "2025-05-01", expectedReturn: "2025-08-01", status: "Active", conditionOut: "Excellent" },
];

const INIT_BOOKINGS: Booking[] = [
  { id: "b1", assetId: "a11", bookedBy: "u5", date: "2025-07-12", startTime: "09:00", endTime: "10:00", purpose: "Team standup", status: "Ongoing" },
  { id: "b2", assetId: "a12", bookedBy: "u3", date: "2025-07-12", startTime: "14:00", endTime: "16:00", purpose: "HR onboarding session", status: "Upcoming" },
  { id: "b3", assetId: "a18", bookedBy: "u7", date: "2025-07-13", startTime: "10:00", endTime: "11:00", purpose: "Client video call", status: "Upcoming" },
  { id: "b4", assetId: "a11", bookedBy: "u6", date: "2025-07-11", startTime: "11:00", endTime: "12:00", purpose: "Finance review", status: "Completed" },
  { id: "b5", assetId: "a13", bookedBy: "u8", date: "2025-07-14", startTime: "13:00", endTime: "14:30", purpose: "Training presentation", status: "Upcoming" },
];

const INIT_MAINT: MaintRequest[] = [
  { id: "m1", assetId: "a5", requestedBy: "u9", issue: "Screen cracked, backlight failing — device unusable", priority: "High", status: "Approved", requestedDate: "2025-07-05", approvedBy: "u2", notes: "Approved for screen replacement. Part ordered." },
  { id: "m2", assetId: "a16", requestedBy: "u5", issue: "Autofocus intermittent, lens not tracking subjects correctly", priority: "Medium", status: "In Progress", requestedDate: "2025-07-01", approvedBy: "u2", technician: "ExpertTech Services" },
  { id: "m3", assetId: "a13", requestedBy: "u8", issue: "Lamp indicator shows Replace Soon — projected hours exceeded", priority: "Low", status: "Pending", requestedDate: "2025-07-10" },
  { id: "m4", assetId: "a4", requestedBy: "u7", issue: "Battery depletes within 3 hours under normal use", priority: "Medium", status: "Pending", requestedDate: "2025-07-11" },
  { id: "m5", assetId: "a2", requestedBy: "u5", issue: "Display flickering at 60Hz, visible horizontal lines", priority: "High", status: "Resolved", requestedDate: "2025-06-20", approvedBy: "u2", technician: "InHouse Repair", resolvedDate: "2025-06-28", notes: "Replaced DisplayPort cable. Issue resolved." },
];

const INIT_TRANSFERS: TransferRequest[] = [
  { id: "tr1", assetId: "a3", requestedBy: "u6", fromEmployee: "u6", toEmployee: "u8", requestedDate: "2025-07-10", status: "Requested", notes: "Priya moving to new role, Maria needs the laptop." },
];

const INIT_AUDITS: AuditCycle[] = [
  {
    id: "ac1", name: "Q2 2025 IT Department Audit", scope: "IT",
    auditors: ["u2", "u5"], startDate: "2025-07-01", endDate: "2025-07-31",
    status: "In Progress",
    items: [
      { assetId: "a1", status: "Verified", auditedBy: "u5" },
      { assetId: "a2", status: "Verified", auditedBy: "u5" },
      { assetId: "a4", status: "Pending" },
      { assetId: "a5", status: "Pending" },
      { assetId: "a17", status: "Verified", auditedBy: "u2" },
      { assetId: "a20", status: "Missing", notes: "Last seen at IT desk in March. Confirmed missing.", auditedBy: "u2" },
    ],
  },
  {
    id: "ac2", name: "Q1 2025 Full Organization Audit", scope: "All",
    auditors: ["u2"], startDate: "2025-04-01", endDate: "2025-04-15",
    status: "Closed",
    items: INIT_ASSETS.slice(0, 12).map(a => ({ assetId: a.id, status: "Verified" as AuditItemStatus })),
  },
];

const INIT_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "overdue", message: "AF-0002 (Dell Monitor 27\") assigned to Alex Kumar is overdue — expected return was Jun 15.", date: "2025-07-12T08:00:00", read: false },
  { id: "n2", type: "maintenance", message: "Maintenance request for AF-0005 (iPad Pro 11\") approved by Raj Patel.", date: "2025-07-05T11:30:00", read: false },
  { id: "n3", type: "booking", message: "Your booking for Meeting Room B2 today (09:00–10:00) starts in 30 minutes.", date: "2025-07-12T08:30:00", read: true },
  { id: "n4", type: "transfer", message: "Transfer request for AF-0003 (MacBook Air M2) from Priya Sharma to Maria Santos is awaiting approval.", date: "2025-07-10T14:20:00", read: false },
  { id: "n5", type: "maintenance", message: "AF-0002 (Dell Monitor 27\") maintenance resolved — asset status updated to Available.", date: "2025-06-28T16:00:00", read: true },
  { id: "n6", type: "audit", message: "AF-0020 (Lenovo ThinkPad X1) flagged as Missing in Q2 2025 IT Audit. Status set to Lost.", date: "2025-07-08T10:15:00", read: false },
  { id: "n7", type: "booking", message: "Conference Room A1 booking confirmed for Emma Wilson — today 14:00–16:00.", date: "2025-07-12T09:00:00", read: true },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getUser = (id: string, users: User[]) => users.find(u => u.id === id);
const getAsset = (id: string, assets: Asset[]) => assets.find(a => a.id === id);

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    Available: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    Allocated: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Reserved: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    "Under Maintenance": "text-amber-400 bg-amber-400/10 border-amber-400/20",
    Lost: "text-red-400 bg-red-400/10 border-red-400/20",
    Retired: "text-slate-500 bg-slate-500/10 border-slate-500/20",
    Disposed: "text-slate-600 bg-slate-600/10 border-slate-600/20",
    Active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    Inactive: "text-slate-500 bg-slate-500/10 border-slate-500/20",
    Pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    Approved: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Rejected: "text-red-400 bg-red-400/10 border-red-400/20",
    "In Progress": "text-violet-400 bg-violet-400/10 border-violet-400/20",
    Resolved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    Upcoming: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Ongoing: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    Completed: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    Cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
    Overdue: "text-red-400 bg-red-400/10 border-red-400/20",
    Requested: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    "Re-allocated": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    "Open": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "Closed": "text-slate-400 bg-slate-400/10 border-slate-400/20",
    Verified: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    Missing: "text-red-400 bg-red-400/10 border-red-400/20",
    Damaged: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    Admin: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    "Asset Manager": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "Department Head": "text-violet-400 bg-violet-400/10 border-violet-400/20",
    Employee: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    High: "text-red-400 bg-red-400/10 border-red-400/20",
    Medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    Low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  };
  return m[s] || "text-slate-400 bg-slate-400/10 border-slate-400/20";
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────
function Badge({ label, status }: { label: string; status?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${statusColor(status || label)}`}>
      {label}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", size = "sm", disabled = false, className = "" }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md"; disabled?: boolean; className?: string;
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded transition-all duration-150 select-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";
  const sizes = { xs: "px-2 py-1 text-xs", sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "bg-destructive/10 text-red-400 border border-red-400/20 hover:bg-destructive/20",
    outline: "border border-border text-foreground hover:bg-muted",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Modal({ title, children, onClose, width = "max-w-lg" }: {
  title: string; children: React.ReactNode; onClose: () => void; width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, as, options, disabled }: {
  label?: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; as?: "input" | "select" | "textarea";
  options?: { value: string; label: string }[]; disabled?: boolean;
}) {
  const cls = "w-full bg-input-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40";
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>}
      {as === "select" ? (
        <select value={value} onChange={e => onChange?.(e.target.value)} className={cls} disabled={disabled}>
          <option value="">— Select —</option>
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : as === "textarea" ? (
        <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={3}
          className={`${cls} resize-none`} disabled={disabled} />
      ) : (
        <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
          className={cls} disabled={disabled} />
      )}
    </div>
  );
}

function AssetTag({ tag }: { tag: string }) {
  return <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border/50">{tag}</span>;
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials(name)}
    </div>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded p-4 flex items-start gap-3 hover:border-border/80 transition-colors">
      <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${accent || "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-semibold text-foreground leading-none mb-1">{value}</div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {cols.map((c, i) => (
              <th key={i} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="text-center py-12 text-sm text-muted-foreground">No records found.</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 text-foreground whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; bg: string }> = {
    overdue: { icon: <AlertTriangle className="w-3.5 h-3.5" />, bg: "bg-red-400/10 text-red-400" },
    maintenance: { icon: <Wrench className="w-3.5 h-3.5" />, bg: "bg-amber-400/10 text-amber-400" },
    booking: { icon: <Calendar className="w-3.5 h-3.5" />, bg: "bg-blue-400/10 text-blue-400" },
    transfer: { icon: <ArrowLeftRight className="w-3.5 h-3.5" />, bg: "bg-violet-400/10 text-violet-400" },
    audit: { icon: <ClipboardCheck className="w-3.5 h-3.5" />, bg: "bg-emerald-400/10 text-emerald-400" },
  };
  const m = map[type] || { icon: <Bell className="w-3.5 h-3.5" />, bg: "bg-muted text-muted-foreground" };
  return <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.bg}`}>{m.icon}</div>;
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPw, setSignupPw] = useState("");
  const [signupDept, setSignupDept] = useState("");

  const quickLogins = [
    { user: INIT_USERS[0], label: "Admin", sub: "Sarah Chen" },
    { user: INIT_USERS[1], label: "Asset Manager", sub: "Raj Patel" },
    { user: INIT_USERS[2], label: "Dept Head", sub: "Emma Wilson" },
    { user: INIT_USERS[4], label: "Employee", sub: "Alex Kumar" },
  ];

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const u = INIT_USERS.find(u => u.email === email);
    if (!u) { setErr("No account found with that email."); return; }
    onLogin(u);
  }

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!signupName || !signupEmail) { setErr("Name and email are required."); return; }
    const newUser: User = {
      id: `u_new_${Date.now()}`, name: signupName, email: signupEmail,
      role: "Employee", department: signupDept || "Unassigned", status: "Active",
    };
    onLogin(newUser);
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Boxes className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="text-foreground font-semibold text-lg">AssetFlow</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">Enterprise</span>
          </div>
          <h2 className="text-3xl font-semibold text-foreground leading-tight mb-4">
            Centralized asset &amp;<br />resource management.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Track every asset through its full lifecycle, manage allocations and bookings, and run structured audit cycles — all in one platform.
          </p>
        </div>
        <div className="relative space-y-3">
          {[
            { stat: "20", label: "Assets tracked" },
            { stat: "6", label: "Active allocations" },
            { stat: "2", label: "Overdue returns" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xl font-semibold text-primary w-10 text-right">{s.stat}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <Boxes className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-foreground font-semibold">AssetFlow</span>
          </div>

          <div className="flex border-b border-border mb-6">
            {(["login", "signup"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setErr(""); }}
                className={`pb-2.5 px-1 mr-5 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <>
              <form onSubmit={handleLogin} className="space-y-3 mb-5">
                <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@company.io" />
                <Field label="Password" value={pw} onChange={setPw} type="password" placeholder="••••••••" />
                {err && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{err}</p>}
                <Btn variant="primary" size="md" className="w-full justify-center">Sign in</Btn>
              </form>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center mb-2">Quick login — demo accounts</p>
                {quickLogins.map(ql => (
                  <button key={ql.user.id} onClick={() => onLogin(ql.user)}
                    className="w-full flex items-center justify-between bg-muted/40 border border-border hover:bg-muted hover:border-border/80 rounded px-3 py-2.5 transition-colors text-left">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={ql.user.name} size="sm" />
                      <div>
                        <div className="text-xs font-medium text-foreground">{ql.sub}</div>
                        <div className="text-xs text-muted-foreground">{ql.user.email}</div>
                      </div>
                    </div>
                    <Badge label={ql.label} status={ql.user.role} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <Field label="Full Name" value={signupName} onChange={setSignupName} placeholder="Jane Smith" />
              <Field label="Work Email" value={signupEmail} onChange={setSignupEmail} type="email" placeholder="jane@company.io" />
              <Field label="Password" value={signupPw} onChange={setSignupPw} type="password" placeholder="Min. 8 characters" />
              <Field label="Department" value={signupDept} onChange={setSignupDept} as="select"
                options={INIT_DEPTS.filter(d => d.status === "Active").map(d => ({ value: d.name, label: d.name }))} />
              <div className="flex items-start gap-2 bg-accent/20 border border-accent-foreground/10 rounded px-3 py-2">
                <Info className="w-3.5 h-3.5 text-accent-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-accent-foreground/80">New accounts are created as Employee. Role promotion is performed by the Admin.</p>
              </div>
              {err && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{err}</p>}
              <Btn variant="primary" size="md" className="w-full justify-center">Create account</Btn>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
  { id: "org", label: "Organization Setup", icon: <Building2 className="w-4 h-4" />, roles: ["Admin"] },
  { id: "assets", label: "Asset Directory", icon: <Package className="w-4 h-4" />, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
  { id: "allocations", label: "Allocations", icon: <ArrowLeftRight className="w-4 h-4" />, roles: ["Admin", "Asset Manager", "Department Head"] },
  { id: "booking", label: "Resource Booking", icon: <Calendar className="w-4 h-4" />, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
  { id: "maintenance", label: "Maintenance", icon: <Wrench className="w-4 h-4" />, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
  { id: "audit", label: "Audit Cycles", icon: <ClipboardCheck className="w-4 h-4" />, roles: ["Admin", "Asset Manager"] },
  { id: "reports", label: "Reports & Analytics", icon: <BarChart3 className="w-4 h-4" />, roles: ["Admin", "Asset Manager", "Department Head"] },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" />, roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
  { id: "logs", label: "Activity Logs", icon: <ScrollText className="w-4 h-4" />, roles: ["Admin"] },
];

function Sidebar({ user, screen, onNavigate, onLogout, unread }: {
  user: User; screen: Screen; onNavigate: (s: Screen) => void;
  onLogout: () => void; unread: number;
}) {
  const allowed = NAV_ITEMS.filter(n => n.roles.includes(user.role));
  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 h-full">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center shrink-0">
            <Boxes className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground leading-none">AssetFlow</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">Enterprise</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const isAllowed = item.roles.includes(user.role);
          const isActive = screen === item.id;
          return (
            <button key={item.id}
              onClick={() => isAllowed && onNavigate(item.id)}
              disabled={!isAllowed}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors text-left
                ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"}
                ${isAllowed ? "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" : "opacity-30 cursor-not-allowed"}
              `}>
              <span className={isActive ? "text-primary" : ""}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {item.id === "notifications" && unread > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              {!isAllowed && <Lock className="w-3 h-3 ml-auto opacity-50" />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.department}</div>
          </div>
        </div>
        <Badge label={user.role} status={user.role} />
        <button onClick={onLogout}
          className="w-full mt-2 flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardScreen({ user, assets, allocations, bookings, maint, transfers, onNavigate }: {
  user: User; assets: Asset[]; allocations: Allocation[]; bookings: Booking[];
  maint: MaintRequest[]; transfers: TransferRequest[]; onNavigate: (s: Screen) => void;
}) {
  const available = assets.filter(a => a.status === "Available").length;
  const allocated = assets.filter(a => a.status === "Allocated").length;
  const underMaint = assets.filter(a => a.status === "Under Maintenance").length;
  const overdue = allocations.filter(a => a.status === "Overdue");
  const activeBookings = bookings.filter(b => b.status === "Ongoing" || b.status === "Upcoming").length;
  const pendingTransfers = transfers.filter(t => t.status === "Requested").length;
  const pendingMaint = maint.filter(m => m.status === "Pending").length;

  const statusData = [
    { name: "Available", value: available, fill: "#10B981" },
    { name: "Allocated", value: allocated, fill: "#3B82F6" },
    { name: "Maintenance", value: underMaint, fill: "#F59E0B" },
    { name: "Reserved", value: assets.filter(a => a.status === "Reserved").length, fill: "#8B5CF6" },
    { name: "Lost/Retired", value: assets.filter(a => a.status === "Lost" || a.status === "Retired").length, fill: "#EF4444" },
  ];

  const deptData = ["IT", "Operations", "Finance", "Engineering", "Human Resources"].map(d => ({
    dept: d.length > 8 ? d.substring(0, 8) + "…" : d,
    assets: allocations.filter(a => a.department === d).length,
  }));

  const recentActivity = [
    { action: "MacBook Air M2 allocated to Priya Sharma", time: "2h ago", type: "allocation" },
    { action: "Transfer request raised for AF-0003 by Priya Sharma", time: "2d ago", type: "transfer" },
    { action: "Maintenance approved for iPad Pro 11\" (AF-0005)", time: "7d ago", type: "maintenance" },
    { action: "Q2 IT Audit cycle started, 2 auditors assigned", time: "11d ago", type: "audit" },
    { action: "MacBook Pro 16\" (AF-0017) registered", time: "13d ago", type: "register" },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Saturday, July 12 — operational snapshot for {user.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm" onClick={() => onNavigate("assets")}>
            <Plus className="w-3.5 h-3.5" />Register Asset
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => onNavigate("booking")}>
            <Calendar className="w-3.5 h-3.5" />Book Resource
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Assets" value={assets.length} sub="across all categories" icon={<Package className="w-4 h-4" />} accent="bg-blue-400/10 text-blue-400" />
        <KpiCard label="Available" value={available} sub="ready to allocate" icon={<CheckCircle2 className="w-4 h-4" />} accent="bg-emerald-400/10 text-emerald-400" />
        <KpiCard label="Allocated" value={allocated} sub="with employees" icon={<Users className="w-4 h-4" />} accent="bg-blue-400/10 text-blue-400" />
        <KpiCard label="In Maintenance" value={underMaint} sub="under repair" icon={<Wrench className="w-4 h-4" />} accent="bg-amber-400/10 text-amber-400" />
        <KpiCard label="Active Bookings" value={activeBookings} sub="today" icon={<Calendar className="w-4 h-4" />} accent="bg-violet-400/10 text-violet-400" />
        <KpiCard label="Overdue Returns" value={overdue.length} sub="past due date" icon={<AlertTriangle className="w-4 h-4" />} accent={overdue.length > 0 ? "bg-red-400/10 text-red-400" : "bg-muted text-muted-foreground"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded p-4 lg:col-span-2">
          <h3 className="text-sm font-medium text-foreground mb-4">Department Allocation Summary</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deptData} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#4E6080" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#4E6080" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0F1629", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, fontSize: 12, color: "#CBD5E1" }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="assets" fill="#3B82F6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Asset Status Mix</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} strokeWidth={0} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0F1629", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, fontSize: 12, color: "#CBD5E1" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.fill }} />
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-400/5 border border-red-400/20 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-medium text-red-400">Overdue Returns — {overdue.length} asset{overdue.length > 1 ? "s" : ""}</h3>
          </div>
          <div className="space-y-2">
            {overdue.map(al => {
              const asset = assets.find(a => a.id === al.assetId);
              const emp = INIT_USERS.find(u => u.id === al.employeeId);
              return (
                <div key={al.id} className="flex items-center justify-between bg-red-400/5 rounded px-3 py-2 text-sm">
                  <div className="flex items-center gap-2.5">
                    <AssetTag tag={asset?.tag || ""} />
                    <span className="text-foreground">{asset?.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Held by <span className="text-foreground">{emp?.name}</span></span>
                    <span className="text-red-400">Due {al.expectedReturn ? fmtDate(al.expectedReturn) : "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(pendingTransfers > 0 || pendingMaint > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingMaint > 0 && (
            <div className="bg-amber-400/5 border border-amber-400/20 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">{pendingMaint} Maintenance Pending</span>
                </div>
                <Btn variant="ghost" size="xs" onClick={() => onNavigate("maintenance")}>View <ChevronRight className="w-3 h-3" /></Btn>
              </div>
              <p className="text-xs text-muted-foreground">Requests awaiting Asset Manager approval before work begins.</p>
            </div>
          )}
          {pendingTransfers > 0 && (
            <div className="bg-violet-400/5 border border-violet-400/20 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-400">{pendingTransfers} Transfer Requested</span>
                </div>
                <Btn variant="ghost" size="xs" onClick={() => onNavigate("allocations")}>View <ChevronRight className="w-3 h-3" /></Btn>
              </div>
              <p className="text-xs text-muted-foreground">Transfer requests pending Department Head or Asset Manager approval.</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Recent Activity</h3>
        <div className="space-y-2.5">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-0.5" />
              <span className="text-foreground/80 flex-1">{a.action}</span>
              <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ORG SETUP ─────────────────────────────────────────────────────────────────
function OrgSetupScreen({ users, setUsers, depts, setDepts, categories, setCategories }: {
  users: User[]; setUsers: (u: User[]) => void;
  depts: Department[]; setDepts: (d: Department[]) => void;
  categories: AssetCategory[]; setCategories: (c: AssetCategory[]) => void;
}) {
  const [tab, setTab] = useState<"depts" | "categories" | "employees">("depts");
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState<User | null>(null);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptHead, setNewDeptHead] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [promoteRole, setPromoteRole] = useState<Role>("Department Head");

  const filteredEmps = users.filter(u => u.name.toLowerCase().includes(empSearch.toLowerCase()) || u.email.toLowerCase().includes(empSearch.toLowerCase()));

  function addDept() {
    if (!newDeptName) return;
    setDepts([...depts, { id: `d_${Date.now()}`, name: newDeptName, head: newDeptHead || undefined, status: "Active", employeeCount: 0 }]);
    setNewDeptName(""); setNewDeptHead(""); setShowDeptModal(false);
  }

  function addCategory() {
    if (!newCatName) return;
    setCategories([...categories, { id: `c_${Date.now()}`, name: newCatName, assetCount: 0, customFields: [] }]);
    setNewCatName(""); setShowCatModal(false);
  }

  function promoteUser(u: User, role: Role) {
    setUsers(users.map(usr => usr.id === u.id ? { ...usr, role } : usr));
    setShowPromoteModal(null);
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Organization Setup" subtitle="Manage departments, asset categories, and the employee directory." />

      <div className="flex gap-1 bg-muted/50 border border-border rounded p-1 w-fit mb-5">
        {(["depts", "categories", "employees"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "depts" ? "Departments" : t === "categories" ? "Asset Categories" : "Employee Directory"}
          </button>
        ))}
      </div>

      {tab === "depts" && (
        <div className="bg-card border border-border rounded">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">{depts.length} Departments</span>
            <Btn variant="primary" size="sm" onClick={() => setShowDeptModal(true)}><Plus className="w-3.5 h-3.5" />New Department</Btn>
          </div>
          <Table cols={["Name", "Head", "Employees", "Status", "Actions"]} rows={depts.map(d => [
            <span className="font-medium text-foreground">{d.name}</span>,
            d.head ? <div className="flex items-center gap-1.5"><Avatar name={INIT_USERS.find(u => u.id === d.head)?.name || "?"} size="sm" /><span className="text-sm">{INIT_USERS.find(u => u.id === d.head)?.name || "—"}</span></div> : <span className="text-muted-foreground">—</span>,
            <span className="text-muted-foreground">{d.employeeCount}</span>,
            <Badge label={d.status} />,
            <button onClick={() => setDepts(depts.map(x => x.id === d.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x))}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {d.status === "Active" ? "Deactivate" : "Activate"}
            </button>
          ])} />
        </div>
      )}

      {tab === "categories" && (
        <div className="bg-card border border-border rounded">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">{categories.length} Categories</span>
            <Btn variant="primary" size="sm" onClick={() => setShowCatModal(true)}><Plus className="w-3.5 h-3.5" />New Category</Btn>
          </div>
          <Table cols={["Category", "Assets", "Custom Fields"]} rows={categories.map(c => [
            <span className="font-medium text-foreground">{c.name}</span>,
            <span className="text-muted-foreground">{c.assetCount}</span>,
            <span className="text-xs text-muted-foreground">{c.customFields.length > 0 ? c.customFields.join(", ") : "None"}</span>
          ])} />
        </div>
      )}

      {tab === "employees" && (
        <div className="bg-card border border-border rounded">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search employees…"
                className="w-full bg-input-background border border-border rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <span className="text-xs text-muted-foreground">{filteredEmps.length} employees</span>
          </div>
          <Table cols={["Employee", "Department", "Role", "Status", "Actions"]} rows={filteredEmps.map(u => [
            <div className="flex items-center gap-2.5"><Avatar name={u.name} size="sm" /><div><div className="text-sm font-medium text-foreground">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div></div>,
            <span className="text-muted-foreground text-sm">{u.department}</span>,
            <Badge label={u.role} status={u.role} />,
            <Badge label={u.status} />,
            <Btn variant="ghost" size="xs" onClick={() => setShowPromoteModal(u)}><UserCheck className="w-3.5 h-3.5" />Promote</Btn>
          ])} />
        </div>
      )}

      {showDeptModal && (
        <Modal title="Create Department" onClose={() => setShowDeptModal(false)}>
          <div className="space-y-3">
            <Field label="Department Name" value={newDeptName} onChange={setNewDeptName} placeholder="e.g. Product Design" />
            <Field label="Department Head" value={newDeptHead} onChange={setNewDeptHead} as="select"
              options={users.filter(u => u.role !== "Employee").map(u => ({ value: u.id, label: u.name }))} />
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" size="sm" onClick={addDept}>Create Department</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowDeptModal(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showCatModal && (
        <Modal title="Create Asset Category" onClose={() => setShowCatModal(false)}>
          <div className="space-y-3">
            <Field label="Category Name" value={newCatName} onChange={setNewCatName} placeholder="e.g. Networking Equipment" />
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" size="sm" onClick={addCategory}>Create Category</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowCatModal(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showPromoteModal && (
        <Modal title={`Promote ${showPromoteModal.name}`} onClose={() => setShowPromoteModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-muted/40 rounded px-3 py-3">
              <Avatar name={showPromoteModal.name} size="md" />
              <div>
                <div className="text-sm font-medium text-foreground">{showPromoteModal.name}</div>
                <div className="text-xs text-muted-foreground">{showPromoteModal.email} · {showPromoteModal.department}</div>
                <div className="mt-1"><Badge label={showPromoteModal.role} status={showPromoteModal.role} /></div>
              </div>
            </div>
            <div className="bg-accent/20 border border-accent-foreground/10 rounded px-3 py-2.5 text-xs text-accent-foreground/80 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Role promotion can only be performed here by the Admin. Employees cannot self-assign roles at signup.
            </div>
            <Field label="Assign Role" value={promoteRole} onChange={v => setPromoteRole(v as Role)} as="select"
              options={[
                { value: "Employee", label: "Employee" },
                { value: "Department Head", label: "Department Head" },
                { value: "Asset Manager", label: "Asset Manager" },
              ]} />
            <div className="flex gap-2">
              <Btn variant="primary" size="sm" onClick={() => promoteUser(showPromoteModal, promoteRole)}>Confirm Promotion</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowPromoteModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── ASSET DIRECTORY ───────────────────────────────────────────────────────────
function AssetDirectoryScreen({ user, assets, setAssets, allocations, maint, categories }: {
  user: User; assets: Asset[]; setAssets: (a: Asset[]) => void;
  allocations: Allocation[]; maint: MaintRequest[]; categories: AssetCategory[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [showRegister, setShowRegister] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({ name: "", category: "", serial: "", acquired: "", cost: "", condition: "Good", location: "" });

  const statusOptions = ["All", "Available", "Allocated", "Reserved", "Under Maintenance", "Lost", "Retired", "Disposed"];

  const filtered = useMemo(() => assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(q) || a.tag.toLowerCase().includes(q) || a.serial.toLowerCase().includes(q) || a.location.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    const matchCat = categoryFilter === "All" || a.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  }), [assets, search, statusFilter, categoryFilter]);

  function registerAsset() {
    if (!form.name || !form.category) return;
    const newAsset: Asset = {
      id: `a_${Date.now()}`, tag: `AF-${String(assets.length + 1).padStart(4, "0")}`,
      name: form.name, category: form.category, serial: form.serial,
      acquired: form.acquired || new Date().toISOString().slice(0, 10),
      cost: parseFloat(form.cost) || 0, condition: form.condition,
      location: form.location, status: "Available", bookable: false,
    };
    setAssets([...assets, newAsset]);
    setForm({ name: "", category: "", serial: "", acquired: "", cost: "", condition: "Good", location: "" });
    setShowRegister(false);
  }

  const assetAlloc = selectedAsset ? allocations.filter(a => a.assetId === selectedAsset.id) : [];
  const assetMaint = selectedAsset ? maint.filter(m => m.assetId === selectedAsset.id) : [];
  const currentHolder = selectedAsset ? allocations.find(a => a.assetId === selectedAsset.id && (a.status === "Active" || a.status === "Overdue")) : null;

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Asset Directory" subtitle={`${assets.length} assets registered across ${categories.length} categories`}
        actions={
          (user.role === "Admin" || user.role === "Asset Manager") ?
            <Btn variant="primary" size="sm" onClick={() => setShowRegister(true)}><Plus className="w-3.5 h-3.5" />Register Asset</Btn> : undefined
        } />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, tag, serial, location…"
            className="w-full bg-input-background border border-border rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-input-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          {statusOptions.map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-input-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <span className="text-xs text-muted-foreground self-center">{filtered.length} results</span>
      </div>

      <div className="bg-card border border-border rounded overflow-hidden">
        <Table cols={["Tag", "Asset Name", "Category", "Location", "Condition", "Status", ""]}
          rows={filtered.map(a => [
            <AssetTag tag={a.tag} />,
            <span className="font-medium text-foreground">{a.name}</span>,
            <span className="text-muted-foreground text-sm">{a.category}</span>,
            <span className="text-muted-foreground text-sm">{a.location}</span>,
            <span className="text-muted-foreground text-sm">{a.condition}</span>,
            <Badge label={a.status} />,
            <button onClick={() => setSelectedAsset(a)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><Eye className="w-3.5 h-3.5" /></button>
          ])} />
      </div>

      {showRegister && (
        <Modal title="Register New Asset" onClose={() => setShowRegister(false)} width="max-w-xl">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Asset Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Dell XPS 15 Laptop" /></div>
            <Field label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} as="select"
              options={categories.map(c => ({ value: c.name, label: c.name }))} />
            <Field label="Condition" value={form.condition} onChange={v => setForm({ ...form, condition: v })} as="select"
              options={["Excellent", "Good", "Fair", "Poor"].map(c => ({ value: c, label: c }))} />
            <Field label="Serial Number" value={form.serial} onChange={v => setForm({ ...form, serial: v })} placeholder="SN-XXXX-0000" />
            <Field label="Acquisition Date" value={form.acquired} onChange={v => setForm({ ...form, acquired: v })} type="date" />
            <Field label="Acquisition Cost ($)" value={form.cost} onChange={v => setForm({ ...form, cost: v })} type="number" placeholder="0.00" />
            <Field label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} placeholder="e.g. IT Storage — Rack B" />
            <div className="col-span-2 pt-1 flex gap-2">
              <Btn variant="primary" size="sm" onClick={registerAsset}>Register Asset</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowRegister(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {selectedAsset && (
        <Modal title="Asset Details" onClose={() => setSelectedAsset(null)} width="max-w-2xl">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AssetTag tag={selectedAsset.tag} />
                  <Badge label={selectedAsset.status} />
                  {selectedAsset.bookable && <Badge label="Bookable" status="Available" />}
                </div>
                <h3 className="text-base font-semibold text-foreground">{selectedAsset.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedAsset.category} · {selectedAsset.location}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { l: "Serial", v: selectedAsset.serial },
                { l: "Acquired", v: fmtDate(selectedAsset.acquired) },
                { l: "Cost", v: selectedAsset.cost > 0 ? `$${selectedAsset.cost.toLocaleString()}` : "—" },
                { l: "Condition", v: selectedAsset.condition },
                { l: "Department", v: selectedAsset.department || "—" },
              ].map(f => (
                <div key={f.l} className="bg-muted/40 rounded px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-0.5">{f.l}</div>
                  <div className="text-foreground font-medium font-mono text-xs">{f.v}</div>
                </div>
              ))}
            </div>
            {currentHolder && (
              <div className="bg-blue-400/5 border border-blue-400/20 rounded px-3 py-2.5">
                <p className="text-xs text-blue-400 font-medium mb-0.5">Currently allocated to</p>
                <p className="text-sm text-foreground">{getUser(currentHolder.employeeId, INIT_USERS)?.name} · {currentHolder.department}</p>
                {currentHolder.expectedReturn && <p className="text-xs text-muted-foreground mt-0.5">Expected return: {fmtDate(currentHolder.expectedReturn)}</p>}
              </div>
            )}
            {assetAlloc.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Allocation History</h4>
                <div className="space-y-1.5">
                  {assetAlloc.map(al => (
                    <div key={al.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-3 py-2">
                      <span className="text-foreground">{getUser(al.employeeId, INIT_USERS)?.name}</span>
                      <span className="text-muted-foreground">{fmtDate(al.allocatedDate)} → {al.returnedDate ? fmtDate(al.returnedDate) : "Present"}</span>
                      <Badge label={al.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {assetMaint.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Maintenance History</h4>
                <div className="space-y-1.5">
                  {assetMaint.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-3 py-2">
                      <span className="text-foreground truncate max-w-xs">{m.issue}</span>
                      <span className="text-muted-foreground ml-2">{fmtDate(m.requestedDate)}</span>
                      <Badge label={m.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── ALLOCATIONS ───────────────────────────────────────────────────────────────
function AllocationsScreen({ user, assets, setAssets, allocations, setAllocations, transfers, setTransfers, users }: {
  user: User; assets: Asset[]; setAssets: (a: Asset[]) => void;
  allocations: Allocation[]; setAllocations: (a: Allocation[]) => void;
  transfers: TransferRequest[]; setTransfers: (t: TransferRequest[]) => void;
  users: User[];
}) {
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<Allocation | null>(null);
  const [selAsset, setSelAsset] = useState("");
  const [selEmp, setSelEmp] = useState("");
  const [retDate, setRetDate] = useState("");
  const [conflict, setConflict] = useState<{ holder: User; alloc: Allocation } | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "transfers">("active");

  const activeAllocs = allocations.filter(a => a.status === "Active" || a.status === "Overdue");
  const availableAssets = assets.filter(a => a.status === "Available");

  function checkAndAllocate() {
    if (!selAsset || !selEmp) return;
    const existing = allocations.find(a => a.assetId === selAsset && (a.status === "Active" || a.status === "Overdue"));
    if (existing) {
      const holder = users.find(u => u.id === existing.employeeId);
      if (holder) { setConflict({ holder, alloc: existing }); return; }
    }
    const newAlloc: Allocation = {
      id: `al_${Date.now()}`, assetId: selAsset, employeeId: selEmp,
      department: users.find(u => u.id === selEmp)?.department || "",
      allocatedDate: "2025-07-12", expectedReturn: retDate || undefined,
      status: "Active", conditionOut: assets.find(a => a.id === selAsset)?.condition || "",
    };
    setAllocations([...allocations, newAlloc]);
    setAssets(assets.map(a => a.id === selAsset ? { ...a, status: "Allocated", department: users.find(u => u.id === selEmp)?.department } : a));
    setSelAsset(""); setSelEmp(""); setRetDate(""); setShowAllocModal(false);
  }

  function raiseTransfer(alloc: Allocation) {
    const tr: TransferRequest = {
      id: `tr_${Date.now()}`, assetId: alloc.assetId, requestedBy: user.id,
      fromEmployee: alloc.employeeId, toEmployee: user.id,
      requestedDate: "2025-07-12", status: "Requested",
      notes: "Transfer requested via conflict resolution.",
    };
    setTransfers([...transfers, tr]);
    setConflict(null); setShowAllocModal(false);
  }

  function returnAsset() {
    if (!showReturnModal) return;
    setAllocations(allocations.map(a => a.id === showReturnModal.id ? { ...a, status: "Returned", returnedDate: "2025-07-12", conditionIn: returnNotes } : a));
    setAssets(assets.map(a => a.id === showReturnModal.assetId ? { ...a, status: "Available", department: undefined } : a));
    setShowReturnModal(null); setReturnNotes("");
  }

  function approveTransfer(tr: TransferRequest) {
    const fromAlloc = allocations.find(a => a.assetId === tr.assetId && (a.status === "Active" || a.status === "Overdue"));
    if (fromAlloc) {
      setAllocations(allocations.map(a => {
        if (a.id === fromAlloc.id) return { ...a, status: "Returned", returnedDate: "2025-07-12" };
        return a;
      }));
    }
    const newAlloc: Allocation = {
      id: `al_${Date.now()}`, assetId: tr.assetId, employeeId: tr.toEmployee,
      department: users.find(u => u.id === tr.toEmployee)?.department || "",
      allocatedDate: "2025-07-12", status: "Active",
    };
    setAllocations(prev => [...prev.map(a => a.id === fromAlloc?.id ? { ...a, status: "Returned" as const, returnedDate: "2025-07-12" } : a), newAlloc]);
    setTransfers(transfers.map(t => t.id === tr.id ? { ...t, status: "Approved" } : t));
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Asset Allocations & Transfers" subtitle="Manage who holds what, initiate returns, and handle transfer requests."
        actions={
          (user.role === "Admin" || user.role === "Asset Manager") &&
          <Btn variant="primary" size="sm" onClick={() => setShowAllocModal(true)}><Plus className="w-3.5 h-3.5" />New Allocation</Btn>
        } />

      <div className="flex gap-1 bg-muted/50 border border-border rounded p-1 w-fit mb-5">
        {(["active", "transfers"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "active" ? `Active Allocations (${activeAllocs.length})` : `Transfer Requests (${transfers.filter(t => t.status === "Requested").length})`}
          </button>
        ))}
      </div>

      {activeTab === "active" && (
        <div className="bg-card border border-border rounded">
          <Table cols={["Asset", "Held By", "Department", "Allocated", "Expected Return", "Status", "Actions"]}
            rows={activeAllocs.map(al => {
              const asset = assets.find(a => a.id === al.assetId);
              const emp = users.find(u => u.id === al.employeeId);
              return [
                <div className="flex items-center gap-2"><AssetTag tag={asset?.tag || ""} /><span className="text-sm text-foreground">{asset?.name}</span></div>,
                <div className="flex items-center gap-2"><Avatar name={emp?.name || "?"} size="sm" /><span className="text-sm text-foreground">{emp?.name}</span></div>,
                <span className="text-muted-foreground text-sm">{al.department}</span>,
                <span className="text-muted-foreground text-sm font-mono">{fmtDate(al.allocatedDate)}</span>,
                al.expectedReturn ? <span className={`text-sm font-mono ${al.status === "Overdue" ? "text-red-400" : "text-muted-foreground"}`}>{fmtDate(al.expectedReturn)}</span> : <span className="text-muted-foreground">—</span>,
                <Badge label={al.status} />,
                <div className="flex items-center gap-1">
                  {(user.role === "Admin" || user.role === "Asset Manager") && (
                    <Btn variant="outline" size="xs" onClick={() => setShowReturnModal(al)}>Return</Btn>
                  )}
                </div>
              ];
            })} />
        </div>
      )}

      {activeTab === "transfers" && (
        <div className="bg-card border border-border rounded">
          <Table cols={["Asset", "From", "To", "Requested", "Status", "Actions"]}
            rows={transfers.map(tr => {
              const asset = assets.find(a => a.id === tr.assetId);
              const from = users.find(u => u.id === tr.fromEmployee);
              const to = users.find(u => u.id === tr.toEmployee);
              return [
                <div className="flex items-center gap-2"><AssetTag tag={asset?.tag || ""} /><span className="text-sm text-foreground">{asset?.name}</span></div>,
                <div className="flex items-center gap-2"><Avatar name={from?.name || "?"} size="sm" /><span className="text-sm">{from?.name}</span></div>,
                <div className="flex items-center gap-2"><Avatar name={to?.name || "?"} size="sm" /><span className="text-sm">{to?.name}</span></div>,
                <span className="text-muted-foreground text-sm font-mono">{fmtDate(tr.requestedDate)}</span>,
                <Badge label={tr.status} />,
                tr.status === "Requested" && (user.role === "Admin" || user.role === "Asset Manager" || user.role === "Department Head") ? (
                  <div className="flex gap-1">
                    <Btn variant="primary" size="xs" onClick={() => approveTransfer(tr)}><CheckCheck className="w-3.5 h-3.5" />Approve</Btn>
                    <Btn variant="danger" size="xs" onClick={() => setTransfers(transfers.map(t => t.id === tr.id ? { ...t, status: "Rejected" } : t))}><XCircle className="w-3.5 h-3.5" />Reject</Btn>
                  </div>
                ) : <span />
              ];
            })} />
        </div>
      )}

      {showAllocModal && (
        <Modal title="New Asset Allocation" onClose={() => { setShowAllocModal(false); setConflict(null); }}>
          {conflict ? (
            <div className="space-y-4">
              <div className="bg-red-400/10 border border-red-400/20 rounded px-4 py-3">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Asset Already Allocated</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono text-red-400">{assets.find(a => a.id === selAsset)?.tag}</span> is currently held by <strong className="text-foreground">{conflict.holder.name}</strong> ({conflict.holder.department}).
                  You cannot allocate it until it is returned.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Would you like to raise a transfer request instead? This will require approval from the Department Head or Asset Manager.</p>
              <div className="flex gap-2">
                <Btn variant="primary" size="sm" onClick={() => raiseTransfer(conflict.alloc)}>
                  <ArrowLeftRight className="w-3.5 h-3.5" />Raise Transfer Request
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConflict(null)}>Go Back</Btn>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Asset" value={selAsset} onChange={setSelAsset} as="select"
                options={availableAssets.map(a => ({ value: a.id, label: `${a.tag} — ${a.name}` }))} />
              <Field label="Assign To" value={selEmp} onChange={setSelEmp} as="select"
                options={users.filter(u => u.status === "Active").map(u => ({ value: u.id, label: `${u.name} (${u.department})` }))} />
              <Field label="Expected Return Date (optional)" value={retDate} onChange={setRetDate} type="date" />
              <div className="flex gap-2 pt-1">
                <Btn variant="primary" size="sm" onClick={checkAndAllocate}>Allocate Asset</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setShowAllocModal(false)}>Cancel</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {showReturnModal && (
        <Modal title="Return Asset" onClose={() => setShowReturnModal(null)}>
          <div className="space-y-3">
            <div className="bg-muted/40 rounded px-3 py-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <AssetTag tag={assets.find(a => a.id === showReturnModal.assetId)?.tag || ""} />
                <span className="text-foreground font-medium">{assets.find(a => a.id === showReturnModal.assetId)?.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">Returning from {users.find(u => u.id === showReturnModal.employeeId)?.name}</p>
            </div>
            <Field label="Condition on return / Notes" value={returnNotes} onChange={setReturnNotes} as="textarea" placeholder="e.g. Minor scuff on lid, otherwise in good condition." />
            <div className="flex gap-2">
              <Btn variant="primary" size="sm" onClick={returnAsset}><CheckCircle2 className="w-3.5 h-3.5" />Confirm Return</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowReturnModal(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── RESOURCE BOOKING ──────────────────────────────────────────────────────────
function ResourceBookingScreen({ user, assets, bookings, setBookings }: {
  user: User; assets: Asset[]; bookings: Booking[]; setBookings: (b: Booking[]) => void;
}) {
  const bookableAssets = assets.filter(a => a.bookable);
  const [selResource, setSelResource] = useState(bookableAssets[0]?.id || "");
  const [showBook, setShowBook] = useState(false);
  const [form, setForm] = useState({ date: "2025-07-12", start: "", end: "", purpose: "" });
  const [overlapError, setOverlapError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const resourceBookings = bookings.filter(b => b.assetId === selResource);
  const filteredBookings = statusFilter === "All" ? resourceBookings : resourceBookings.filter(b => b.status === statusFilter);

  function checkOverlap(date: string, start: string, end: string, excludeId?: string): boolean {
    const startMins = timeToMins(start);
    const endMins = timeToMins(end);
    return bookings.some(b =>
      b.assetId === selResource && b.date === date && b.id !== excludeId &&
      b.status !== "Cancelled" && b.status !== "Completed" &&
      timeToMins(b.startTime) < endMins && timeToMins(b.endTime) > startMins
    );
  }

  function timeToMins(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function book() {
    if (!form.start || !form.end || !form.purpose) { setOverlapError("All fields required."); return; }
    if (timeToMins(form.start) >= timeToMins(form.end)) { setOverlapError("End time must be after start time."); return; }
    if (checkOverlap(form.date, form.start, form.end)) {
      const conflict = bookings.find(b => b.assetId === selResource && b.date === form.date && b.status !== "Cancelled");
      setOverlapError(`Overlap detected. ${assets.find(a => a.id === selResource)?.name} is already booked ${conflict?.startTime}–${conflict?.endTime} on this date.`);
      return;
    }
    const newBook: Booking = {
      id: `b_${Date.now()}`, assetId: selResource, bookedBy: user.id,
      date: form.date, startTime: form.start, endTime: form.end,
      purpose: form.purpose, status: "Upcoming",
    };
    setBookings([...bookings, newBook]);
    setForm({ date: "2025-07-12", start: "", end: "", purpose: "" });
    setOverlapError(""); setShowBook(false);
  }

  const resource = assets.find(a => a.id === selResource);
  const weekDays = ["Jul 12", "Jul 13", "Jul 14", "Jul 15", "Jul 16", "Jul 17", "Jul 18"];
  const weekDates = ["2025-07-12", "2025-07-13", "2025-07-14", "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18"];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Resource Booking" subtitle="Reserve shared spaces, vehicles, and equipment by time slot."
        actions={<Btn variant="primary" size="sm" onClick={() => setShowBook(true)}><Plus className="w-3.5 h-3.5" />New Booking</Btn>} />

      <div className="flex gap-3 mb-5">
        <select value={selResource} onChange={e => setSelResource(e.target.value)}
          className="bg-input-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          {bookableAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-input-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          {["All", "Upcoming", "Ongoing", "Completed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded p-4 mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Week View — {resource?.name}</h3>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const dayBookings = bookings.filter(b => b.assetId === selResource && b.date === weekDates[i] && b.status !== "Cancelled");
            return (
              <div key={day} className="min-h-[80px]">
                <div className={`text-xs font-medium mb-1 px-1 py-0.5 rounded text-center ${weekDates[i] === "2025-07-12" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>{day}</div>
                {dayBookings.map(b => (
                  <div key={b.id} className={`text-xs rounded px-1.5 py-1 mb-1 truncate ${b.status === "Ongoing" ? "bg-emerald-400/20 text-emerald-400" : "bg-blue-400/10 text-blue-400"}`}>
                    {b.startTime}–{b.endTime}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">{filteredBookings.length} Booking{filteredBookings.length !== 1 ? "s" : ""}</span>
        </div>
        <Table cols={["Resource", "Booked By", "Date", "Time Slot", "Purpose", "Status", "Actions"]}
          rows={filteredBookings.map(b => {
            const res = assets.find(a => a.id === b.assetId);
            const bookedBy = INIT_USERS.find(u => u.id === b.bookedBy);
            return [
              <div className="flex items-center gap-1.5"><AssetTag tag={res?.tag || ""} /><span className="text-sm">{res?.name}</span></div>,
              <div className="flex items-center gap-1.5"><Avatar name={bookedBy?.name || "?"} size="sm" /><span className="text-sm">{bookedBy?.name}</span></div>,
              <span className="font-mono text-sm text-muted-foreground">{fmtDate(b.date)}</span>,
              <span className="font-mono text-sm text-foreground">{b.startTime} – {b.endTime}</span>,
              <span className="text-sm text-muted-foreground">{b.purpose}</span>,
              <Badge label={b.status} />,
              (b.status === "Upcoming" && (b.bookedBy === user.id || user.role === "Admin" || user.role === "Asset Manager")) ? (
                <Btn variant="danger" size="xs" onClick={() => setBookings(bookings.map(bk => bk.id === b.id ? { ...bk, status: "Cancelled" } : bk))}>Cancel</Btn>
              ) : <span />
            ];
          })} />
      </div>

      {showBook && (
        <Modal title="Book Resource" onClose={() => { setShowBook(false); setOverlapError(""); }}>
          <div className="space-y-3">
            <Field label="Resource" value={selResource} onChange={setSelResource} as="select"
              options={bookableAssets.map(a => ({ value: a.id, label: `${a.name} (${a.tag})` }))} />
            <Field label="Date" value={form.date} onChange={v => { setForm({ ...form, date: v }); setOverlapError(""); }} type="date" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time" value={form.start} onChange={v => { setForm({ ...form, start: v }); setOverlapError(""); }} type="time" />
              <Field label="End Time" value={form.end} onChange={v => { setForm({ ...form, end: v }); setOverlapError(""); }} type="time" />
            </div>
            <Field label="Purpose" value={form.purpose} onChange={v => setForm({ ...form, purpose: v })} placeholder="e.g. Design sprint planning" />
            {overlapError && (
              <div className="flex items-start gap-2 bg-red-400/10 border border-red-400/20 rounded px-3 py-2.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {overlapError}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Btn variant="primary" size="sm" onClick={book}><Calendar className="w-3.5 h-3.5" />Confirm Booking</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setShowBook(false); setOverlapError(""); }}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MAINTENANCE ────────────────────────────────────────────────────────────────
function MaintenanceScreen({ user, assets, setAssets, maint, setMaint }: {
  user: User; assets: Asset[]; setAssets: (a: Asset[]) => void;
  maint: MaintRequest[]; setMaint: (m: MaintRequest[]) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<MaintRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState({ assetId: "", issue: "", priority: "Medium" as "Low" | "Medium" | "High" });

  const filtered = statusFilter === "All" ? maint : maint.filter(m => m.status === statusFilter);

  function create() {
    if (!form.assetId || !form.issue) return;
    const req: MaintRequest = {
      id: `m_${Date.now()}`, assetId: form.assetId, requestedBy: user.id,
      issue: form.issue, priority: form.priority, status: "Pending",
      requestedDate: "2025-07-12",
    };
    setMaint([...maint, req]);
    setForm({ assetId: "", issue: "", priority: "Medium" });
    setShowCreate(false);
  }

  function approve(m: MaintRequest) {
    setMaint(maint.map(x => x.id === m.id ? { ...x, status: "Approved", approvedBy: user.id } : x));
    setAssets(assets.map(a => a.id === m.assetId ? { ...a, status: "Under Maintenance" } : a));
    setSelected(prev => prev?.id === m.id ? { ...prev, status: "Approved", approvedBy: user.id } : prev);
  }

  function reject(m: MaintRequest) {
    setMaint(maint.map(x => x.id === m.id ? { ...x, status: "Rejected" } : x));
    setSelected(prev => prev?.id === m.id ? { ...prev, status: "Rejected" } : prev);
  }

  function resolve(m: MaintRequest) {
    setMaint(maint.map(x => x.id === m.id ? { ...x, status: "Resolved", resolvedDate: "2025-07-12" } : x));
    setAssets(assets.map(a => a.id === m.assetId ? { ...a, status: "Available" } : a));
    setSelected(prev => prev?.id === m.id ? { ...prev, status: "Resolved" } : prev);
  }

  const stages: MaintStatus[] = ["Pending", "Approved", "In Progress", "Resolved"];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Maintenance Management" subtitle="Route repair requests through an approval workflow before work begins."
        actions={<Btn variant="primary" size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" />Raise Request</Btn>} />

      <div className="grid grid-cols-4 gap-3 mb-5">
        {(["Pending", "Approved", "In Progress", "Resolved"] as MaintStatus[]).map(s => {
          const count = maint.filter(m => m.status === s).length;
          return (
            <div key={s} className={`bg-card border rounded p-3 cursor-pointer transition-colors ${statusFilter === s ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"}`}
              onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}>
              <div className="flex items-center justify-between mb-1">
                <Badge label={s} />
                <span className="text-lg font-semibold text-foreground">{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4">
        <Btn variant={statusFilter === "All" ? "secondary" : "ghost"} size="xs" onClick={() => setStatusFilter("All")}>All ({maint.length})</Btn>
        <Btn variant={statusFilter === "Rejected" ? "secondary" : "ghost"} size="xs" onClick={() => setStatusFilter("Rejected")}>Rejected ({maint.filter(m => m.status === "Rejected").length})</Btn>
      </div>

      <div className="bg-card border border-border rounded">
        <Table cols={["Asset", "Reported By", "Issue", "Priority", "Date", "Status", "Actions"]}
          rows={filtered.map(m => {
            const asset = assets.find(a => a.id === m.assetId);
            const reporter = INIT_USERS.find(u => u.id === m.requestedBy);
            return [
              <div className="flex items-center gap-2"><AssetTag tag={asset?.tag || ""} /><span className="text-sm text-foreground max-w-28 truncate">{asset?.name}</span></div>,
              <div className="flex items-center gap-1.5"><Avatar name={reporter?.name || "?"} size="sm" /><span className="text-sm">{reporter?.name}</span></div>,
              <span className="text-sm text-muted-foreground max-w-48 truncate">{m.issue}</span>,
              <Badge label={m.priority} />,
              <span className="font-mono text-xs text-muted-foreground">{fmtDate(m.requestedDate)}</span>,
              <Badge label={m.status} />,
              <div className="flex items-center gap-1">
                <Btn variant="ghost" size="xs" onClick={() => setSelected(m)}><Eye className="w-3.5 h-3.5" /></Btn>
                {m.status === "Pending" && (user.role === "Admin" || user.role === "Asset Manager") && (
                  <>
                    <Btn variant="primary" size="xs" onClick={() => approve(m)}>Approve</Btn>
                    <Btn variant="danger" size="xs" onClick={() => reject(m)}>Reject</Btn>
                  </>
                )}
                {m.status === "In Progress" && (user.role === "Admin" || user.role === "Asset Manager") && (
                  <Btn variant="primary" size="xs" onClick={() => resolve(m)}><CheckCircle2 className="w-3.5 h-3.5" />Resolve</Btn>
                )}
              </div>
            ];
          })} />
      </div>

      {selected && (
        <Modal title="Maintenance Request Detail" onClose={() => setSelected(null)} width="max-w-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AssetTag tag={assets.find(a => a.id === selected.assetId)?.tag || ""} />
              <span className="text-sm font-medium text-foreground">{assets.find(a => a.id === selected.assetId)?.name}</span>
              <Badge label={selected.status} />
              <Badge label={selected.priority} />
            </div>

            <div className="bg-muted/40 rounded px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-1">Issue Description</p>
              <p className="text-sm text-foreground">{selected.issue}</p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {stages.map((s, i) => (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${selected.status === s || (stages.indexOf(selected.status as MaintStatus) > i) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {selected.status === s && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    {s}
                  </div>
                  {i < stages.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded px-3 py-2">
                <div className="text-muted-foreground mb-0.5">Requested by</div>
                <div className="text-foreground">{INIT_USERS.find(u => u.id === selected.requestedBy)?.name}</div>
                <div className="text-muted-foreground">{fmtDate(selected.requestedDate)}</div>
              </div>
              {selected.approvedBy && (
                <div className="bg-muted/30 rounded px-3 py-2">
                  <div className="text-muted-foreground mb-0.5">Approved by</div>
                  <div className="text-foreground">{INIT_USERS.find(u => u.id === selected.approvedBy)?.name}</div>
                </div>
              )}
              {selected.technician && (
                <div className="bg-muted/30 rounded px-3 py-2">
                  <div className="text-muted-foreground mb-0.5">Technician</div>
                  <div className="text-foreground">{selected.technician}</div>
                </div>
              )}
              {selected.resolvedDate && (
                <div className="bg-muted/30 rounded px-3 py-2">
                  <div className="text-muted-foreground mb-0.5">Resolved</div>
                  <div className="text-foreground">{fmtDate(selected.resolvedDate)}</div>
                </div>
              )}
            </div>

            {selected.notes && (
              <div className="bg-muted/30 rounded px-3 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Notes: </span>{selected.notes}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {selected.status === "Pending" && (user.role === "Admin" || user.role === "Asset Manager") && (
                <>
                  <Btn variant="primary" size="sm" onClick={() => approve(selected)}><CheckCircle2 className="w-3.5 h-3.5" />Approve</Btn>
                  <Btn variant="danger" size="sm" onClick={() => reject(selected)}><XCircle className="w-3.5 h-3.5" />Reject</Btn>
                </>
              )}
              {selected.status === "In Progress" && (user.role === "Admin" || user.role === "Asset Manager") && (
                <Btn variant="primary" size="sm" onClick={() => resolve(selected)}><CheckCheck className="w-3.5 h-3.5" />Mark Resolved</Btn>
              )}
              <Btn variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal title="Raise Maintenance Request" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <Field label="Asset" value={form.assetId} onChange={v => setForm({ ...form, assetId: v })} as="select"
              options={assets.filter(a => a.status !== "Retired" && a.status !== "Disposed").map(a => ({ value: a.id, label: `${a.tag} — ${a.name}` }))} />
            <Field label="Priority" value={form.priority} onChange={v => setForm({ ...form, priority: v as "Low" | "Medium" | "High" })} as="select"
              options={[{ value: "Low", label: "Low" }, { value: "Medium", label: "Medium" }, { value: "High", label: "High" }]} />
            <Field label="Issue Description" value={form.issue} onChange={v => setForm({ ...form, issue: v })} as="textarea"
              placeholder="Describe the problem in detail — symptoms, when it started, frequency…" />
            <div className="bg-accent/20 border border-accent-foreground/10 rounded px-3 py-2 text-xs text-accent-foreground/80 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Asset status will only change to Under Maintenance after the request is approved by an Asset Manager.
            </div>
            <div className="flex gap-2 pt-1">
              <Btn variant="primary" size="sm" onClick={create}>Submit Request</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── AUDIT CYCLES ──────────────────────────────────────────────────────────────
function AuditScreen({ user, assets, setAssets, audits, setAudits, users }: {
  user: User; assets: Asset[]; setAssets: (a: Asset[]) => void;
  audits: AuditCycle[]; setAudits: (a: AuditCycle[]) => void; users: User[];
}) {
  const [selectedAudit, setSelectedAudit] = useState<AuditCycle | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", scope: "", start: "", end: "", auditor: "" });

  function createCycle() {
    if (!form.name || !form.scope) return;
    const scopeAssets = form.scope === "All" ? assets : assets.filter(a => a.department === form.scope);
    const cycle: AuditCycle = {
      id: `ac_${Date.now()}`, name: form.name, scope: form.scope,
      auditors: form.auditor ? [form.auditor] : [],
      startDate: form.start || "2025-07-12", endDate: form.end || "2025-07-31",
      status: "Open",
      items: scopeAssets.map(a => ({ assetId: a.id, status: "Pending" })),
    };
    setAudits([...audits, cycle]);
    setForm({ name: "", scope: "", start: "", end: "", auditor: "" });
    setShowCreate(false);
  }

  function markItem(audit: AuditCycle, assetId: string, status: AuditItemStatus) {
    const updated = { ...audit, items: audit.items.map(i => i.assetId === assetId ? { ...i, status, auditedBy: user.id } : i) };
    setAudits(audits.map(a => a.id === audit.id ? updated : a));
    setSelectedAudit(updated);
  }

  function closeCycle(audit: AuditCycle) {
    const missingIds = audit.items.filter(i => i.status === "Missing").map(i => i.assetId);
    setAssets(assets.map(a => missingIds.includes(a.id) ? { ...a, status: "Lost" } : a));
    const closed = { ...audit, status: "Closed" as AuditCycleStatus };
    setAudits(audits.map(a => a.id === audit.id ? closed : a));
    setSelectedAudit(closed);
  }

  const discrepancies = (audit: AuditCycle) => audit.items.filter(i => i.status === "Missing" || i.status === "Damaged");

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Audit Cycles" subtitle="Run structured verification cycles and auto-generate discrepancy reports."
        actions={user.role === "Admin" && <Btn variant="primary" size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" />New Audit Cycle</Btn>} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {audits.map(a => {
          const verified = a.items.filter(i => i.status === "Verified").length;
          const pct = a.items.length > 0 ? Math.round((verified / a.items.length) * 100) : 0;
          const disc = discrepancies(a).length;
          return (
            <div key={a.id} className="bg-card border border-border rounded p-4 hover:border-border/80 transition-colors cursor-pointer" onClick={() => setSelectedAudit(a)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{a.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Scope: {a.scope} · {fmtDate(a.startDate)} – {fmtDate(a.endDate)}</p>
                </div>
                <Badge label={a.status} />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span>{a.items.length} assets</span>
                <span className="text-emerald-400">{verified} verified</span>
                {disc > 0 && <span className="text-red-400">{disc} discrepan{disc > 1 ? "cies" : "cy"}</span>}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pct}% complete · {a.auditors.length} auditor{a.auditors.length !== 1 ? "s" : ""}</p>
            </div>
          );
        })}
      </div>

      {selectedAudit && (
        <Modal title={selectedAudit.name} onClose={() => setSelectedAudit(null)} width="max-w-3xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={selectedAudit.status} />
              <span className="text-xs text-muted-foreground">Scope: {selectedAudit.scope}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(selectedAudit.startDate)} – {fmtDate(selectedAudit.endDate)}</span>
              <span className="text-xs text-muted-foreground">Auditors: {selectedAudit.auditors.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(", ")}</span>
            </div>

            {discrepancies(selectedAudit).length > 0 && (
              <div className="bg-red-400/5 border border-red-400/20 rounded p-3">
                <p className="text-xs font-medium text-red-400 mb-2">Discrepancy Report — {discrepancies(selectedAudit).length} item{discrepancies(selectedAudit).length > 1 ? "s" : ""}</p>
                {discrepancies(selectedAudit).map(item => {
                  const a = assets.find(x => x.id === item.assetId);
                  return (
                    <div key={item.assetId} className="flex items-center gap-2 text-xs py-1.5 border-b border-red-400/10 last:border-0">
                      <AssetTag tag={a?.tag || ""} />
                      <span className="text-foreground">{a?.name}</span>
                      <Badge label={item.status} />
                      {item.notes && <span className="text-muted-foreground">— {item.notes}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {selectedAudit.items.map(item => {
                const a = assets.find(x => x.id === item.assetId);
                return (
                  <div key={item.assetId} className="flex items-center gap-3 bg-muted/30 rounded px-3 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <AssetTag tag={a?.tag || ""} />
                      <span className="text-sm text-foreground truncate">{a?.name}</span>
                      <span className="text-xs text-muted-foreground">{a?.location}</span>
                    </div>
                    <Badge label={item.status} />
                    {selectedAudit.status !== "Closed" && (selectedAudit.auditors.includes(user.id) || user.role === "Admin" || user.role === "Asset Manager") && (
                      <div className="flex gap-1">
                        {(["Verified", "Missing", "Damaged"] as AuditItemStatus[]).map(s => (
                          <button key={s} onClick={() => markItem(selectedAudit, item.assetId, s)}
                            className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${item.status === s ? statusColor(s) : "border-border text-muted-foreground hover:text-foreground"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              {selectedAudit.status !== "Closed" && user.role === "Admin" && (
                <Btn variant="danger" size="sm" onClick={() => closeCycle(selectedAudit)}>
                  <Lock className="w-3.5 h-3.5" />Close Audit Cycle
                </Btn>
              )}
              <Btn variant="ghost" size="sm" onClick={() => setSelectedAudit(null)}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal title="Create Audit Cycle" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <Field label="Cycle Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Q3 2025 Operations Audit" />
            <Field label="Scope" value={form.scope} onChange={v => setForm({ ...form, scope: v })} as="select"
              options={[{ value: "All", label: "All Departments" }, ...INIT_DEPTS.map(d => ({ value: d.name, label: d.name }))]} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date" value={form.start} onChange={v => setForm({ ...form, start: v })} type="date" />
              <Field label="End Date" value={form.end} onChange={v => setForm({ ...form, end: v })} type="date" />
            </div>
            <Field label="Lead Auditor" value={form.auditor} onChange={v => setForm({ ...form, auditor: v })} as="select"
              options={users.filter(u => u.role !== "Employee").map(u => ({ value: u.id, label: u.name }))} />
            <div className="flex gap-2 pt-1">
              <Btn variant="primary" size="sm" onClick={createCycle}><ClipboardCheck className="w-3.5 h-3.5" />Create Cycle</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
function ReportsScreen({ assets, allocations, maint, bookings }: {
  assets: Asset[]; allocations: Allocation[]; maint: MaintRequest[]; bookings: Booking[];
}) {
  const statusDist = ["Available", "Allocated", "Reserved", "Under Maintenance", "Lost", "Retired"].map(s => ({
    name: s, value: assets.filter(a => a.status === s).length,
  }));

  const deptAlloc = ["IT", "Operations", "Finance", "Engineering", "Human Resources"].map(d => ({
    dept: d === "Human Resources" ? "HR" : d,
    active: allocations.filter(a => a.department === d && a.status === "Active").length,
    overdue: allocations.filter(a => a.department === d && a.status === "Overdue").length,
  }));

  const maintByCat = ["Electronics", "Furniture", "Vehicles", "AV Equipment", "Shared Spaces"].map(cat => ({
    category: cat === "AV Equipment" ? "AV Equip." : cat,
    total: maint.filter(m => assets.find(a => a.id === m.assetId)?.category === cat).length,
  }));

  const acqTimeline = [
    { month: "Jan 24", assets: 3 }, { month: "Feb 24", assets: 1 }, { month: "Mar 24", assets: 2 },
    { month: "Apr 24", assets: 0 }, { month: "May 24", assets: 1 }, { month: "Jun 24", assets: 2 },
    { month: "Jul 24", assets: 1 }, { month: "Aug 24", assets: 2 }, { month: "Sep 24", assets: 3 },
    { month: "Oct 24", assets: 1 }, { month: "Nov 24", assets: 2 }, { month: "Dec 24", assets: 1 },
    { month: "Jan 25", assets: 2 }, { month: "Feb 25", assets: 1 }, { month: "Mar 25", assets: 0 },
    { month: "Apr 25", assets: 2 }, { month: "May 25", assets: 1 }, { month: "Jun 25", assets: 0 },
  ];

  const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#64748B"];
  const TT_STYLE = { background: "#0F1629", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, fontSize: 12, color: "#CBD5E1" };

  const totalValue = assets.reduce((sum, a) => sum + a.cost, 0);
  const allocatedValue = allocations.filter(a => a.status === "Active" || a.status === "Overdue")
    .reduce((sum, al) => sum + (assets.find(a => a.id === al.assetId)?.cost || 0), 0);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Reports & Analytics" subtitle="Operational insights across the asset lifecycle."
        actions={<Btn variant="outline" size="sm"><FileText className="w-3.5 h-3.5" />Export Report</Btn>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Asset Value" value={`$${(totalValue / 1000).toFixed(0)}k`} sub="acquisition cost" icon={<TrendingUp className="w-4 h-4" />} accent="bg-blue-400/10 text-blue-400" />
        <KpiCard label="Value in Field" value={`$${(allocatedValue / 1000).toFixed(0)}k`} sub="currently allocated" icon={<ArrowUpRight className="w-4 h-4" />} accent="bg-emerald-400/10 text-emerald-400" />
        <KpiCard label="Maintenance Events" value={maint.length} sub="total requests" icon={<Wrench className="w-4 h-4" />} accent="bg-amber-400/10 text-amber-400" />
        <KpiCard label="Total Bookings" value={bookings.length} sub="all time" icon={<Calendar className="w-4 h-4" />} accent="bg-violet-400/10 text-violet-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Department Allocation Summary</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptAlloc} margin={{ left: -15, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#4E6080" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#4E6080" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="active" name="Active" fill="#3B82F6" radius={[2, 2, 0, 0]} stackId="a" />
              <Bar dataKey="overdue" name="Overdue" fill="#EF4444" radius={[2, 2, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Asset Status Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={statusDist.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {statusDist.filter(s => s.value > 0).map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="text-foreground font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Asset Acquisition Timeline</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={acqTimeline} margin={{ left: -15, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#4E6080" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: "#4E6080" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
              <Area type="monotone" dataKey="assets" name="Assets Added" stroke="#F59E0B" fill="rgba(245,158,11,0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Maintenance Frequency by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={maintByCat} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#4E6080" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: "#4E6080" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={TT_STYLE} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="total" name="Requests" fill="#8B5CF6" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
function NotificationsScreen({ notifications, setNotifications }: {
  notifications: Notification[]; setNotifications: (n: Notification[]) => void;
}) {
  function markAllRead() {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  }

  const unread = notifications.filter(n => !n.read).length;

  const activityLog = [
    { user: "Raj Patel", action: "Approved maintenance request for iPad Pro 11\" (AF-0005)", date: "2025-07-05T11:30:00" },
    { user: "Priya Sharma", action: "Raised transfer request for MacBook Air M2 (AF-0003) to Maria Santos", date: "2025-07-10T14:20:00" },
    { user: "Alex Kumar", action: "Booked Meeting Room B2 for Jul 12, 09:00–10:00", date: "2025-07-12T07:50:00" },
    { user: "Sarah Chen", action: "Promoted Raj Patel to Asset Manager", date: "2025-06-01T10:00:00" },
    { user: "Raj Patel", action: "Registered MacBook Pro 16\" (AF-0017) to asset directory", date: "2025-04-15T15:20:00" },
    { user: "James Brown", action: "Raised maintenance request for iPad Pro 11\" (AF-0005)", date: "2025-07-05T09:10:00" },
    { user: "Raj Patel", action: "Closed Q1 2025 Full Organization Audit cycle", date: "2025-04-16T17:00:00" },
    { user: "Emma Wilson", action: "Booked Conference Room A1 for Jul 12, 14:00–16:00", date: "2025-07-12T09:00:00" },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Notifications & Activity" subtitle="Stay informed on asset events, approvals, and overdue alerts."
        actions={unread > 0 && <Btn variant="ghost" size="sm" onClick={markAllRead}><CheckCheck className="w-3.5 h-3.5" />Mark all read ({unread})</Btn>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Notifications</h3>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} onClick={() => setNotifications(notifications.map(x => x.id === n.id ? { ...x, read: true } : x))}
                className={`flex items-start gap-3 bg-card border rounded p-3 cursor-pointer transition-colors hover:border-border/80 ${!n.read ? "border-border bg-accent/5" : "border-border/50"}`}>
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(n.date)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Activity Log</h3>
          <div className="bg-card border border-border rounded">
            {activityLog.map((log, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < activityLog.length - 1 ? "border-b border-border/50" : ""}`}>
                <Avatar name={log.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground">{log.user} </span>
                  <span className="text-xs text-muted-foreground">{log.action}</span>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{fmtDateTime(log.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ACTIVITY LOGS (ADMIN) ─────────────────────────────────────────────────────
function ActivityLogsScreen() {
  const logs = [
    { id: 1, user: "Sarah Chen", role: "Admin", action: "Promoted", target: "Raj Patel → Asset Manager", module: "Org Setup", date: "2025-06-01T10:00:00", ip: "192.168.1.5" },
    { id: 2, user: "Raj Patel", role: "Asset Manager", action: "Registered", target: "AF-0017 MacBook Pro 16\"", module: "Assets", date: "2025-04-15T15:20:00", ip: "192.168.1.12" },
    { id: 3, user: "Raj Patel", role: "Asset Manager", action: "Approved", target: "Maintenance M1 — iPad Pro 11\"", module: "Maintenance", date: "2025-07-05T11:30:00", ip: "192.168.1.12" },
    { id: 4, user: "Alex Kumar", role: "Employee", action: "Booked", target: "Meeting Room B2 — Jul 12 09:00", module: "Booking", date: "2025-07-12T07:50:00", ip: "192.168.1.31" },
    { id: 5, user: "Priya Sharma", role: "Employee", action: "Requested Transfer", target: "AF-0003 → Maria Santos", module: "Allocations", date: "2025-07-10T14:20:00", ip: "192.168.1.44" },
    { id: 6, user: "Raj Patel", role: "Asset Manager", action: "Closed", target: "Q1 2025 Full Org Audit", module: "Audit", date: "2025-04-16T17:00:00", ip: "192.168.1.12" },
    { id: 7, user: "Sarah Chen", role: "Admin", action: "Created", target: "Department: Engineering", module: "Org Setup", date: "2025-01-10T09:00:00", ip: "192.168.1.5" },
    { id: 8, user: "James Brown", role: "Employee", action: "Raised Maintenance", target: "AF-0005 iPad Pro 11\"", module: "Maintenance", date: "2025-07-05T09:10:00", ip: "192.168.1.51" },
    { id: 9, user: "Emma Wilson", role: "Department Head", action: "Booked", target: "Conference Room A1 — Jul 12 14:00", module: "Booking", date: "2025-07-12T09:00:00", ip: "192.168.1.22" },
    { id: 10, user: "Raj Patel", role: "Asset Manager", action: "Allocated", target: "AF-0017 → Lisa Park", module: "Allocations", date: "2025-05-01T10:00:00", ip: "192.168.1.12" },
  ];

  const moduleColors: Record<string, string> = {
    "Org Setup": "text-violet-400", "Assets": "text-blue-400", "Maintenance": "text-amber-400",
    "Booking": "text-emerald-400", "Allocations": "text-cyan-400", "Audit": "text-rose-400",
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <PageHeader title="Activity Logs" subtitle="Immutable record of all admin, manager, and employee actions." />

      <div className="bg-card border border-border rounded">
        <Table cols={["User", "Role", "Action", "Target", "Module", "Date", "IP"]}
          rows={logs.map(log => [
            <div className="flex items-center gap-2"><Avatar name={log.user} size="sm" /><span className="text-sm text-foreground">{log.user}</span></div>,
            <Badge label={log.role} status={log.role} />,
            <span className="text-sm text-foreground font-medium">{log.action}</span>,
            <span className="text-sm text-muted-foreground">{log.target}</span>,
            <span className={`text-xs font-medium ${moduleColors[log.module] || "text-muted-foreground"}`}>{log.module}</span>,
            <span className="font-mono text-xs text-muted-foreground">{fmtDateTime(log.date)}</span>,
            <span className="font-mono text-xs text-muted-foreground">{log.ip}</span>
          ])} />
      </div>
    </div>
  );
}

// ── APP SHELL ─────────────────────────────────────────────────────────────────
function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [users, setUsers] = useState<User[]>(INIT_USERS);
  const [depts, setDepts] = useState<Department[]>(INIT_DEPTS);
  const [categories, setCategories] = useState<AssetCategory[]>(INIT_CATEGORIES);
  const [assets, setAssets] = useState<Asset[]>(INIT_ASSETS);
  const [allocations, setAllocations] = useState<Allocation[]>(INIT_ALLOCATIONS);
  const [bookings, setBookings] = useState<Booking[]>(INIT_BOOKINGS);
  const [maint, setMaint] = useState<MaintRequest[]>(INIT_MAINT);
  const [transfers, setTransfers] = useState<TransferRequest[]>(INIT_TRANSFERS);
  const [audits, setAudits] = useState<AuditCycle[]>(INIT_AUDITS);
  const [notifications, setNotifications] = useState<Notification[]>(INIT_NOTIFICATIONS);

  const unread = notifications.filter(n => !n.read).length;

  const screenMap: Record<Screen, React.ReactNode> = {
    dashboard: <DashboardScreen user={user} assets={assets} allocations={allocations} bookings={bookings} maint={maint} transfers={transfers} onNavigate={setScreen} />,
    org: <OrgSetupScreen users={users} setUsers={setUsers} depts={depts} setDepts={setDepts} categories={categories} setCategories={setCategories} />,
    assets: <AssetDirectoryScreen user={user} assets={assets} setAssets={setAssets} allocations={allocations} maint={maint} categories={categories} />,
    allocations: <AllocationsScreen user={user} assets={assets} setAssets={setAssets} allocations={allocations} setAllocations={setAllocations} transfers={transfers} setTransfers={setTransfers} users={users} />,
    booking: <ResourceBookingScreen user={user} assets={assets} bookings={bookings} setBookings={setBookings} />,
    maintenance: <MaintenanceScreen user={user} assets={assets} setAssets={setAssets} maint={maint} setMaint={setMaint} />,
    audit: <AuditScreen user={user} assets={assets} setAssets={setAssets} audits={audits} setAudits={setAudits} users={users} />,
    reports: <ReportsScreen assets={assets} allocations={allocations} maint={maint} bookings={bookings} />,
    notifications: <NotificationsScreen notifications={notifications} setNotifications={setNotifications} />,
    logs: <ActivityLogsScreen />,
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar user={user} screen={screen} onNavigate={setScreen} onLogout={onLogout} unread={unread} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-11 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>AssetFlow</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{NAV_ITEMS.find(n => n.id === screen)?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScreen("notifications")}
              className="relative w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors hover:bg-muted">
              <Bell className="w-4 h-4" />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold leading-none">{unread > 9 ? "9" : unread}</span>}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar name={user.name} size="sm" />
              <span className="text-foreground">{user.name}</span>
              <Badge label={user.role} status={user.role} />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {screenMap[screen]}
        </main>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) return <LoginScreen onLogin={setUser} />;
  return <AppShell user={user} onLogout={() => setUser(null)} />;
}
