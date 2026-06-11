import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-primary">404</p>
        <p className="mt-3 text-sm text-muted-foreground">This screen doesn't exist.</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="font-display text-2xl font-semibold text-foreground">Something broke</p>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={() => { router.invalidate(); reset(); }}
        className="tap mt-8 inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no",
      },
      { name: "theme-color", content: "#0a0d1a" },
      { title: "Holy Convocation · Check-In" },
      {
        name: "description",
        content:
          "Auxiliary member check-in and check-out for the 1st Combined South African Holy Convocation.",
      },
      { property: "og:title", content: "Holy Convocation · Check-In" },
      {
        property: "og:description",
        content: "Auxiliary check-in for the 1st Combined SA Holy Convocation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Holy Convocation · Check-In" },
      { name: "description", content: "Mobile app for event attendance tracking." },
      { property: "og:description", content: "Mobile app for event attendance tracking." },
      { name: "twitter:description", content: "Mobile app for event attendance tracking." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/69f5135d-b5ba-4b56-8e7c-57ed5acaea77/id-preview-d02963f7--1b61c91b-70b6-478d-8f4e-b0919c228236.lovable.app-1781181590665.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/69f5135d-b5ba-4b56-8e7c-57ed5acaea77/id-preview-d02963f7--1b61c91b-70b6-478d-8f4e-b0919c228236.lovable.app-1781181590665.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
