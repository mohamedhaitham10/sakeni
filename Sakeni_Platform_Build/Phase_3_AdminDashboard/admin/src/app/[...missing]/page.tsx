import { redirect } from "next/navigation";

const FALLBACK_ROUTE = "/portal";

const ROUTE_ALIASES: Record<string, string> = {
  admin: "/",
  dashboard: "/",
  analytics: "/",
  metric: "/",
  metrics: "/",
  report: "/",
  reports: "/",
  revenue: "/",
  payment: "/",
  payments: "/",
  billing: "/",
  account: "/account",
  accounts: "/account",
  auth: FALLBACK_ROUTE,
  login: FALLBACK_ROUTE,
  signin: FALLBACK_ROUTE,
  "sign-in": FALLBACK_ROUTE,
  signup: FALLBACK_ROUTE,
  "sign-up": FALLBACK_ROUTE,
  portal: FALLBACK_ROUTE,
  profile: FALLBACK_ROUTE,
  settings: FALLBACK_ROUTE,
  applications: FALLBACK_ROUTE,
  bookings: FALLBACK_ROUTE,
  saved: FALLBACK_ROUTE,
  student: "/student",
  students: "/student",
  housing: "/student",
  listing: "/student",
  listings: "/student",
  search: "/student",
  landlord: "/landlord",
  landlords: "/landlord",
  property: "/landlord",
  properties: "/landlord",
  inventory: "/landlord",
  stock: "/landlord",
};

function resolveSafeRoute(segments?: string[]) {
  const firstSegment = segments?.[0]?.toLowerCase();
  if (!firstSegment) return FALLBACK_ROUTE;

  return ROUTE_ALIASES[firstSegment] ?? FALLBACK_ROUTE;
}

export default async function MissingRouteRedirect({
  params,
}: {
  params: Promise<{ missing?: string[] }>;
}) {
  const resolvedParams = await params;

  redirect(resolveSafeRoute(resolvedParams.missing));
}
