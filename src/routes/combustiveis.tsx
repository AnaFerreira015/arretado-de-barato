import { createFileRoute, redirect } from "@tanstack/react-router";
/** Keep existing bookmarks and shared links working. */
export const Route = createFileRoute("/combustiveis")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { tipo: "combustivel" }, replace: true });
  },
});
