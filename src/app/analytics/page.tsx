import { AnalyticsShell } from "@/components/analytics/analytics-shell";
import { buildHostawayResponse, refreshApprovals } from "@/lib/reviews/normalize";

const DEFAULT_QUERY = "http://localhost/api/reviews/hostaway?sort=date:desc";

export default function AnalyticsPage() {
  refreshApprovals();
  const initialData = buildHostawayResponse(DEFAULT_QUERY);

  return (
    <div className="min-h-screen bg-transparent">
      <AnalyticsShell initialData={initialData} />
    </div>
  );
}
