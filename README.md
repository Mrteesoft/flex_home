# Flex Living – Reviews Dashboard

A Next.js (App Router) project that delivers the Flex Living developer assessment:

- Aggregates Hostaway reviews via the required `GET /api/reviews/hostaway` endpoint.
- Normalises mixed-scale ratings and enriches them with property insights.
- Provides a manager-facing dashboard for filtering, trend analysis, and publication control.
- Mirrors the Flex Living property page layout with a reviews module that only renders approved feedback.

## 1. Tech Stack & Project Structure

- **Frontend:** Next.js 15 (App Router, React 19), Tailwind CSS v4, TypeScript.
- **API layer:** Next.js Route Handlers (Node runtime) with a mocked Hostaway payload (`src/data/hostaway-reviews.json`).
- **Shared libraries:** `src/lib/reviews` encapsulates Hostaway parsing, normalisation, metrics, and the in-memory approvals store. UI helpers (formatting and star rating renderings) live under `src/lib` and `src/components/ui`.
- **Property catalogue:** `src/data/properties.ts` seeds metadata for the property page experience.
- **Key routes:**
  - `/api/reviews/hostaway` – returns the normalised dataset with filter & summary metadata.
  - `/api/reviews/hostaway/approve` – toggles the transient publication flag.
  - `/dashboard` – manager dashboard.
  - `/properties/[slug]` – property detail page showcasing approved reviews.

```
src/
 ├─ app/
 │   ├─ api/reviews/hostaway/(route handlers)
 │   ├─ dashboard/page.tsx
 │   └─ properties/[slug]/page.tsx
 ├─ components/
 │   ├─ dashboard/dashboard-shell.tsx
 │   └─ ui/star-rating.tsx
 ├─ data/
 │   ├─ hostaway-reviews.json
 │   └─ properties.ts
 └─ lib/
     ├─ reviews/{normalize,store,types}.ts
     └─ format.ts
```

## 2. Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **(Optional) configure env**
   ```bash
   cp .env.local.example .env.local
   ```
   `NEXT_PUBLIC_APP_URL` is available if you prefer an absolute base URL for API calls; the current implementation uses relative paths so the app also works without the variable.
3. **Run the app**
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000/dashboard` for the manager view or browse to any `/properties/<slug>` page (e.g. `/properties/shoreditch-heights-a`) for the guest-facing layout.

### Testing & linting

```bash
npm run lint
```

## 3. API Behaviour

### `GET /api/reviews/hostaway`

Returns a `ReviewsResponse` payload:

- `reviews`: normalised reviews with consistent 0–5 ratings, category scores, approval state, metadata, and slugs suitable for routing.
- `listings`: per-property aggregates (total reviews, approved count, channel mix, trend data).
- `metrics`: overall vs filtered totals including date range, approval counts, and average rating.
- `meta.filters`: available filter vocab (channels, review types, statuses, categories) plus source date range.

Supported query parameters:

| Parameter           | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `listingSlug`       | Filter by property slug (e.g. `shoreditch-heights-a`)           |
| `channel`           | Filter by channel (`airbnb,booking,google,expedia,flex,other`)  |
| `type`              | Hostaway review type (`guest-to-host`, `host-to-guest`, …)      |
| `status`            | Review status (`published`, `pending`, `archived`, …)           |
| `approved`          | `true` to return only manager-approved reviews                  |
| `minRating`         | Lower bound for the normalised rating (0–5 scale)               |
| `category`          | Filter on a specific category key (e.g. `cleanliness`)          |
| `minCategoryRating` | Lower bound when filtering by category                          |
| `startDate`/`endDate` | ISO strings to constrain the date window                     |
| `search`            | Full-text search across listing, guest name, notes, & comments  |
| `sort`              | `date:desc` (default), `date:asc`, `rating:desc`, `rating:asc`, `listing:asc`, `channel:asc` |

### `POST /api/reviews/hostaway/approve`

Body: `{ "reviewId": "hostaway-7453", "approved": true }`  
Returns the toggled state. Persistence is intentionally in-memory for the assessment; the store bootstraps initial values from `publishOnFlex` in the mock data (or defaults to auto-approving high scores). The `GET` variant at the same path exposes the current snapshot for debugging.

## 4. Dashboard Design Decisions

- **Single source of truth:** the dashboard consumes the live API so the same payload powers both manager and property views. Changing filters or approval status refetches from the API to keep metrics, cards, and review lists in sync.
- **Filters built for real workflows:** property, channel, category, minimum rating, time window, and approval toggle reflect the brief’s requirement to slice by rating, category, channel, and time while giving managers control of what is public.
- **Property drill-down insights:** focusing a property surfaces channel mix, category pulse, standout vs. at-risk dimensions, and a quick link to the public page without leaving the dashboard.
- **Insight-first UI:** the hero KPIs, trend line, channel distribution, and top properties mirror the Flex Living aesthetic with glassmorphism, neon accents, and radial gradients. Trends are derived from the filtered dataset to help managers spot recurring issues quickly.
- **Approval workflow:** toggling the “Show on flexliving.com” switch calls the approval endpoint, then reloads the data so the property page reflects updates instantly.
- **Mobile-resilient layout:** grid sections collapse smoothly, and cards remain readable on smaller viewports.

## 5. Property Detail Page

- Mirrors Flex Living’s real-world layout: hero banner, stay summary, highlights, amenities grid, and review section.
- Shows only approved reviews, grouped by the same `listingSlug` logic as the dashboard.
- Reuses the star rating component and category breakdowns to reinforce transparency.
- `generateStaticParams` pre-builds the known properties from the mock dataset while still sourcing live review approvals on each request.

## 6. Google Reviews Exploration

- The Google Places API would require an API key with Places API access and a Place ID for each property.  
- Sandbox constraints plus the limited scope of the assessment mean no live Google integration was implemented.
- Recommended next steps: map property slugs to Place IDs, create a server-side fetcher with Places Review API, merge results into the normalisation pipeline (tagging source as `google`), and cache responses to stay within Google’s quota.

## 7. Potential Enhancements

- Persist approval decisions in a lightweight data store (Supabase, DynamoDB, or Hostaway custom fields) instead of in-memory state.
- Add authentication to protect the manager dashboard.
- Expand analytics with anomaly detection (alerts for drops in cleanliness or communication scores).
- Introduce automated summarisation of guest sentiment (OpenAI or Vertex) for weekly digests.

---

Feel free to reach out if you’d like a video walkthrough or architectural deep-dive. Enjoy exploring the dashboard! 
