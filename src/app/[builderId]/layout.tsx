import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden">
            {/* 桌面版側邊欄 */}
            <div className="hidden md:flex md:w-64 md:flex-col">
                <div className="flex h-full flex-col border-r bg-muted/40 backdrop-blur">
                    <Sidebar />
                </div>
            </div>

            {/* 主畫面區域 */}
            <main className="flex-1 flex flex-col min-w-0 bg-background">
                {children}
            </main>
        </div>
    );
}
