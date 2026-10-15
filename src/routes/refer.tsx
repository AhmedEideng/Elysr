import { createFileRoute, redirect } from "@tanstack/react-router";

// Referral program retired. Keep this legacy URL alive and send old shared links home.
export const Route = createFileRoute("/refer")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  component: () => null,
});
