'use client';

import { Loader2, Sparkles } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BuilderTemplateResponse } from '@/types/admin';

interface TemplatePickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: BuilderTemplateResponse[];
    isLoading: boolean;
    isError: boolean;
    errorMessage?: string;
    onSelectTemplate: (template: BuilderTemplateResponse) => void;
}

export function TemplatePickerDialog({
    open,
    onOpenChange,
    templates,
    isLoading,
    isError,
    errorMessage,
    onSelectTemplate,
}: TemplatePickerDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="grid-rows-[auto,minmax(0,1fr)] overflow-hidden h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-0 sm:h-[calc(100vh-5rem)] sm:w-[calc(100vw-5rem)] sm:max-w-[calc(100vw-5rem)]"
                showCloseButton
            >
                <DialogHeader className="space-y-3 border-b border-border/60 px-6 pb-4 pt-6 sm:px-8">
                    <DialogTitle className="text-lg font-semibold">選擇 Source 範本</DialogTitle>
                    <DialogDescription className="max-w-3xl text-sm leading-7">
                        選一個預設範本後，系統會把對應的 Source prompts 與 RAG 直接帶進目前 Builder。
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="min-h-0 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
                    {isLoading ? (
                        <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            載入範本中...
                        </div>
                    ) : isError ? (
                        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            載入範本失敗：{errorMessage || '未知錯誤'}
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                            目前沒有可用範本
                        </div>
                    ) : (
                        <div className="grid gap-4 py-1 md:grid-cols-2 xl:grid-cols-3">
                            {templates.map((template) => (
                                <button
                                    key={template.templateId}
                                    type="button"
                                    className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-foreground/20 hover:bg-muted/40"
                                    onClick={() => {
                                        onSelectTemplate(template);
                                        onOpenChange(false);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                                    <Sparkles className="mr-1 inline h-3 w-3" />
                                                    排序 #{template.orderNo}
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                                                    {template.groupKey ? `群組：${template.groupKey}` : '公版'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold leading-6">{template.name}</p>
                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                    {template.description || '未提供範本說明'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground">
                                            套用
                                        </span>
                                    </div>

                                    <div className="mt-5 space-y-3 rounded-xl bg-muted/40 p-4">
                                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                            Source Prompts
                                        </p>
                                        <p className="line-clamp-5 text-sm leading-7 text-foreground/85">
                                            {template.prompts || '這個範本不會預填 source prompts。'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            會一起帶入 {template.rag.length} 筆 RAG
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
