'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex h-full flex-col border-r bg-muted/40 backdrop-blur">
          <Sidebar />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Mobile Header with Hamburger */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-background">
          <h1 className="font-semibold">RewardBridge Copilot</h1>
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background h-full">
          <div className="max-w-md space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Welcome to RewardBridge AI Copilot</h2>
            <p className="text-muted-foreground">
              Select an AI Builder from the sidebar to start a new consultation.
              Automate PM estimates, QA smoke tests, and more with company-specific guidelines.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <Button
                className="md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                Open Scenarios
              </Button>
              <div className="hidden md:block text-sm text-muted-foreground">
                ← Select a scenario on the left
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
