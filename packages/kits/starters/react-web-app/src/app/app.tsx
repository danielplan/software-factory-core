import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoadingState } from "@/components/layout/loading-state";
import { TopBar } from "@/components/layout/top-bar";

// Each page loads on demand.
const HomePage = lazy(() =>
  import("@/features/home/components/home-page").then((page) => ({
    default: page.HomePage,
  })),
);

// The app: the top bar and the page at the address. A new page is one more
// route here and one more area in src/features/.
export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-page px-4 pt-6 pb-12 md:px-6 lg:px-10 lg:pt-9">
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
