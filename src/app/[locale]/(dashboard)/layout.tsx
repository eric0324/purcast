import { Sidebar } from "@/components/layout/sidebar";
import { PlayerProvider } from "@/components/player/player-context";
import { MiniPlayer } from "@/components/player/mini-player";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="pt-14 md:pl-56 md:pt-0">
          <div className="p-4 pb-20 md:p-6 md:pb-20">{children}</div>
        </main>
        <MiniPlayer />
      </div>
    </PlayerProvider>
  );
}
