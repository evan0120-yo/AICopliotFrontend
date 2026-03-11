'use client';

import { FileText, Layers3, Loader2, Sparkles } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { BuilderTemplateResponse } from '@/types/admin';

const TYPE_COPY: Record<string, { label: string; tone: string; icon: typeof Sparkles }> = {
    PINNED: {
        label: '固定規則',
        tone: 'bg-blue-100 text-blue-700',
        icon: Sparkles,
    },
    CHECK: {
        label: '檢查規則',
        tone: 'bg-amber-100 text-amber-700',
        icon: Layers3,
    },
    CONTENT: {
        label: '主要內容',
        tone: 'bg-emerald-100 text-emerald-700',
        icon: FileText,
    },
};

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
            <DialogContent className="max-w-3xl p-0" showCloseButton>
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>選擇 Source 範本</DialogTitle>
                    <DialogDescription>
                        先選一個預設範本，再由系統自動帶入對應的 prompts 與 RAG 補充內容。
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] px-6 pb-6">
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
                        <div className="grid gap-3 py-1 md:grid-cols-2">
                            {templates.map((template) => {
                                const typeMeta = TYPE_COPY[template.typeCode] ?? {
                                    label: template.typeCode,
                                    tone: 'bg-slate-100 text-slate-700',
                                    icon: FileText,
                                };
                                const TypeIcon = typeMeta.icon;

                                return (
                                    <button
                                        key={template.templateId}
                                        type="button"
                                        className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-foreground/20 hover:bg-muted/40"
                                        onClick={() => {
                                            onSelectTemplate(template);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold', typeMeta.tone)}>
                                                        <TypeIcon className="mr-1 inline h-3 w-3" />
                                                        {typeMeta.label}
                                                    </span>
                                                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                                                        {template.groupKey ? `群組：${template.groupKey}` : '公版'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">{template.name}</p>
                                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                        {template.description || '未提供範本說明'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                'inline-flex h-6 items-center rounded-lg border border-border px-2 text-xs text-foreground',
                                                'bg-background'
                                            )}>
                                                套用
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-2 rounded-xl bg-muted/40 p-3">
                                            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                                Source Prompts
                                            </p>
                                            <p className="line-clamp-4 text-xs leading-5 text-foreground/85">
                                                {template.prompts || '這個範本不會預填 source prompts。'}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                會一起帶入 {template.rag.length} 筆 RAG
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
