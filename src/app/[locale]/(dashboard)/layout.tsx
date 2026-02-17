import { Header } from "@/components/layout/header";
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
        <Header />
        <Sidebar />
        <main className="md:pl-56">
          <div className="p-4 pb-20 md:p-6 md:pb-20">{children}</div>
        </main>
        <MiniPlayer />
      </div>
    </PlayerProvider>
  );
}
