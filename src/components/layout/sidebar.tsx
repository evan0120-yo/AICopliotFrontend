"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, Plus, Settings, Sparkles } from "lucide-react";
import { useGetBuilders } from "@/hooks/useBuilders";

export function Sidebar() {
    const pathname = usePathname();
    const { data: builders, isLoading, isError } = useGetBuilders();

    return (
        <div className="flex h-full flex-col overflow-y-auto w-full py-4">
            <div className="px-4 py-2 mb-4">
                <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                    RewardBridge
                </h2>
                <p className="px-2 text-xs text-muted-foreground">
                    Internal AI Copilot Platform
                </p>
            </div>

            <div className="px-4">
                <Link
                    href="/"
                    className="inline-flex w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground mb-6"
                >
                    <MessageSquarePlus className="h-4 w-4" />
                    New Chat
                </Link>
            </div>

            <div className="flex-1 px-4 space-y-1">
                <div className="mb-2 flex items-center justify-between px-2">
                    <h3 className="text-sm font-medium tracking-tight">
                        Available Builders
                    </h3>
                    <div className="flex items-center gap-1">
                        <Link
                            href="/admin/templates"
                            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Sparkles className="h-3 w-3" />
                            範本庫
                        </Link>
                        <Link
                            href="/admin/builders/new/graph"
                            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Plus className="h-3 w-3" />
                            新增
                        </Link>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-2 px-2">
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                    </div>
                ) : isError ? (
                    <div className="px-4 text-sm text-destructive">無法載入 builder 清單。</div>
                ) : !builders || builders.length === 0 ? (
                    <div className="px-4 text-sm text-muted-foreground">目前沒有可用的 builder。</div>
                ) : (
                    builders.map((builder) => (
                        <div key={builder.builderId} className="flex items-start gap-1 mb-1">
                            <Link
                                href={`/${builder.builderId}`}
                                className={cn(
                                    "flex flex-1 w-full items-start rounded-md px-4 py-3 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === `/${builder.builderId}` && "bg-secondary text-secondary-foreground"
                                )}
                            >
                                <div className="flex flex-col items-start gap-1 text-left">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {builder.groupLabel}
                                    </span>
                                    <span className="text-sm">
                                        {builder.name}
                                    </span>
                                    {builder.description && (
                                        <span className="text-xs text-muted-foreground line-clamp-2 font-normal">
                                            {builder.description}
                                        </span>
                                    )}
                                </div>
                            </Link>
                            <Link
                                href={`/admin/builders/${builder.builderId}/graph`}
                                className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                title="編輯 Graph"
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
