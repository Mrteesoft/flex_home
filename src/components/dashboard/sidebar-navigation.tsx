"use client";

import Link from "next/link";

export type NavKey =
  | "dashboard"
  | "analytics";

const NAV_ITEMS: Array<{
  key: NavKey;
  label: string;
  href: string;
  icon: NavKey;
}> = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: "analytics" },
];

const NavIcon = ({
  name,
  active,
}: {
  name: NavKey;
  active?: boolean;
}) => {
  const strokeColor = active ? "currentColor" : "rgba(255,255,255,0.65)";

  switch (name) {
    case "analytics":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19v-8" />
          <path d="M10 19v-4" />
          <path d="M16 19V7" />
          <path d="M22 19V3" />
          <path d="M2 21h20" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h8v8H3z" />
          <path d="M13 3h8v5h-8z" />
          <path d="M13 12h8v9h-8z" />
          <path d="M3 15h8v6H3z" />
        </svg>
      );
  }
};

export const SidebarNavigation = ({
  isOpen = false,
  onClose,
  active = "reviews",
}: {
  isOpen?: boolean;
  onClose?: () => void;
  active?: NavKey;
}) => {
  const mobileState = isOpen ? "translate-x-0" : "-translate-x-[110%]";
  const pointerState = isOpen ? "pointer-events-auto" : "pointer-events-none lg:pointer-events-auto";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[80vw] flex-shrink-0 flex-col border-b border-white/10 bg-gradient-to-br from-[#0f172a]/95 to-[#050910]/80 px-4 py-6 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out sm:px-6 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:border-r lg:border-b-0 lg:rounded-r-[36px] ${mobileState} ${pointerState}`}
    >
      <div className="flex items-center justify-between lg:block">
        <div>
          <p className="text-xs uppercase tracking-[0.36em] text-white/50">Flex Living</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Manager Hub</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="mt-0 rounded-full border border-[var(--flex-primary)] bg-[var(--flex-primary-soft)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--flex-primary)] lg:mt-6">
            v1.0
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-white/25 hover:text-white lg:hidden"
              aria-label="Close navigation"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12" />
                <path d="M6 18L18 6" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <nav className="mt-8 space-y-2 overflow-y-auto pb-6 lg:pb-0">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-[var(--flex-primary)] bg-[var(--flex-primary-soft)] text-white"
                  : "border-transparent bg-white/5 text-white/70 hover:border-white/15 hover:text-white"
              }`}
            >
              <NavIcon name={item.icon} active={isActive} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 lg:block">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Support</p>
        <p className="mt-2">
          Curate reviews, update pricing, and sync channel feedback in one workspace.
        </p>
      </div>
    </aside>
  );
};
