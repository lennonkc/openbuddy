import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ScatteredDecorations } from "./ScatteredDecorations";
import { EventStreamProvider, useEventStreamConnection } from "@/lib/useEventStream";

export function Layout() {
  const { pathname } = useLocation();
  const events = useEventStreamConnection();

  return (
    <EventStreamProvider value={events}>
      <div className="flex h-screen bg-candy-gradient">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScatteredDecorations />
          <div key={pathname} className="flex-1 flex flex-col overflow-hidden relative animate-fade-in-up pointer-events-none [&>*]:pointer-events-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </EventStreamProvider>
  );
}
