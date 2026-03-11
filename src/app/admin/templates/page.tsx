'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TemplateFormDialog } from '@/components/features/builder-graph/template-form-dialog';
import { useCreateTemplate, useDeleteTemplate, useTemplateLibrary, useUpdateTemplate } from '@/hooks/useTemplates';
import type { BuilderTemplateResponse, TemplateFormValues } from '@/types/admin';

const EMPTY_TEMPLATE: TemplateFormValues = {
    templateKey: '',
    name: '',
    description: '',
    groupKey: '',
    typeCode: 'CONTENT',
    prompts: '',
    active: true,
    rag: [],
};

const TYPE_COPY: Record<string, { label: string; tone: string }> = {
    PINNED: { label: '固定規則', tone: 'bg-blue-100 text-blue-700' },
    CHECK: { label: '檢查規則', tone: 'bg-amber-100 text-amber-700' },
    CONTENT: { label: '主要內容', tone: 'bg-emerald-100 text-emerald-700' },
};

type TemplateDialogState =
    | {
        mode: 'create';
        title: string;
        description: string;
        submitLabel: string;
        initialValues: TemplateFormValues;
      }
    | {
        mode: 'update';
        templateId: number;
        title: string;
        description: string;
        submitLabel: string;
        initialValues: TemplateFormValues;
      };

function templateToFormValues(template: BuilderTemplateResponse): TemplateFormValues {
    return {
        templateId: template.templateId,
        templateKey: template.templateKey,
        name: template.name,
        description: template.description ?? '',
        groupKey: template.groupKey ?? '',
        typeCode: template.typeCode,
        prompts: template.prompts ?? '',
        active: template.active,
        rag: template.rag.map((rag) => ({
            ragType: rag.ragType ?? '',
            title: rag.title ?? '',
            content: rag.content ?? '',
            overridable: rag.overridable,
        })),
    };
}

function formValuesToRequest(values: TemplateFormValues) {
    return {
        templateKey: values.templateKey || undefined,
        name: values.name,
        description: values.description || undefined,
        groupKey: values.groupKey || undefined,
        typeCode: values.typeCode || undefined,
        prompts: values.prompts || undefined,
        active: values.active,
        rag: values.rag.map((rag, index) => ({
            ragType: rag.ragType || undefined,
            title: rag.title || undefined,
            content: rag.content,
            orderNo: index + 1,
            overridable: rag.overridable,
            retrievalMode: 'full_context',
        })),
    };
}

export default function TemplateLibraryPage() {
    const templateQuery = useTemplateLibrary();
    const createMutation = useCreateTemplate();
    const updateMutation = useUpdateTemplate();
    const deleteMutation = useDeleteTemplate();
    const [dialogState, setDialogState] = useState<TemplateDialogState | null>(null);

    const sortedTemplates = useMemo(
        () => templateQuery.data ?? [],
        [templateQuery.data],
    );

    const handleCreate = () => {
        setDialogState({
            mode: 'create',
            title: '新增 Template',
            description: '在這裡建立可被 Builder Source 重複套用的公版或群組範本。',
            submitLabel: '建立範本',
            initialValues: EMPTY_TEMPLATE,
        });
    };

    const handleEdit = (template: BuilderTemplateResponse) => {
        setDialogState({
            mode: 'update',
            templateId: template.templateId,
            title: '編輯 Template',
            description: '更新範本本身的 prompts、RAG 與群組範圍。',
            submitLabel: '更新範本',
            initialValues: templateToFormValues(template),
        });
    };

    const handleDelete = async (template: BuilderTemplateResponse) => {
        const shouldDelete = window.confirm(`確定要刪除範本「${template.name}」嗎？這會讓之後的 Source 無法再直接套用它。`);
        if (!shouldDelete) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(template.templateId);
            toast.success('範本已刪除');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '刪除範本失敗');
        }
    };

    const handleSubmitDialog = async (values: TemplateFormValues) => {
        const request = formValuesToRequest(values);

        try {
            if (dialogState?.mode === 'update') {
                await updateMutation.mutateAsync({
                    templateId: dialogState.templateId,
                    data: request,
                });
                toast.success('範本更新成功');
                return;
            }

            await createMutation.mutateAsync(request);
            toast.success('範本建立成功');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '範本儲存失敗');
            throw err;
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="min-h-screen bg-background">
            <div className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button type="button" variant="ghost" size="sm">
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                返回
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-sm font-semibold">Template Library</h1>
                            <p className="text-xs text-muted-foreground">
                                集中管理所有 Source 範本，包含公版與群組專用版本。
                            </p>
                        </div>
                    </div>

                    <Button type="button" size="sm" onClick={handleCreate}>
                        <Plus className="mr-1 h-4 w-4" />
                        新增 Template
                    </Button>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-6">
                {templateQuery.isLoading ? (
                    <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        載入範本中...
                    </div>
                ) : templateQuery.isError ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        載入範本失敗：{templateQuery.error instanceof Error ? templateQuery.error.message : '未知錯誤'}
                    </div>
                ) : sortedTemplates.length === 0 ? (
                    <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-4 text-base font-semibold">目前還沒有任何 Template</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            可以先建立幾個常用的 Source prompts / RAG 範本，之後在 Builder 裡直接套用。
                        </p>
                        <Button type="button" className="mt-5" onClick={handleCreate}>
                            <Plus className="mr-1 h-4 w-4" />
                            建立第一個 Template
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {sortedTemplates.map((template) => {
                            const typeMeta = TYPE_COPY[template.typeCode] ?? {
                                label: template.typeCode,
                                tone: 'bg-slate-100 text-slate-700',
                            };

                            return (
                                <div key={template.templateId} className="rounded-3xl border bg-card p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${typeMeta.tone}`}>
                                                    {typeMeta.label}
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                                                    {template.groupKey ? `群組：${template.groupKey}` : '公版'}
                                                </span>
                                                {!template.active ? (
                                                    <span className="rounded-full bg-zinc-200 px-2 py-1 text-[11px] text-zinc-700">
                                                        已停用
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div>
                                                <p className="text-lg font-semibold">{template.name}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {template.templateKey}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button type="button" variant="ghost" size="xs" onClick={() => handleEdit(template)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="xs"
                                                disabled={deleteMutation.isPending}
                                                onClick={() => handleDelete(template)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                                        {template.description || '未提供範本說明。'}
                                    </p>

                                    <div className="mt-4 rounded-2xl bg-muted/40 p-4">
                                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                            Source Prompts
                                        </p>
                                        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-foreground/85">
                                            {template.prompts || '這個範本不會預填 Source prompts。'}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>RAG: {template.rag.length} 筆</span>
                                        <span>{template.rag.filter((rag) => rag.overridable).length} 筆可覆蓋</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {dialogState ? (
                <TemplateFormDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setDialogState(null);
                        }
                    }}
                    title={dialogState.title}
                    description={dialogState.description}
                    submitLabel={dialogState.submitLabel}
                    initialValues={dialogState.initialValues}
                    isPending={isSubmitting}
                    onSubmit={handleSubmitDialog}
                />
            ) : null}
        </div>
    );
}
