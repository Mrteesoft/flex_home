import DashboardShell from "@/components/dashboard/dashboard-shell";
import { buildHostawayResponse, refreshApprovals } from "@/lib/reviews/normalize";

const DEFAULT_QUERY = "http://localhost/api/reviews/hostaway?sort=date:desc";

export default function DashboardPage() {
  refreshApprovals();
  const initialData = buildHostawayResponse(DEFAULT_QUERY);

  return (
    <div className="min-h-screen bg-transparent">
      <DashboardShell initialData={initialData} />
    </div>
  );
}
