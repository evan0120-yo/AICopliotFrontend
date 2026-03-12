'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2, Plus, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBuilderGraph, useBuilderTemplates, useSaveBuilderGraph } from '@/hooks/useBuilderGraph';
import { useCreateTemplate, useTemplateLibrary, useUpdateTemplate } from '@/hooks/useTemplates';
import { BuilderInfoSection } from '@/components/features/builder-graph/builder-info-section';
import { SourceBlock } from '@/components/features/builder-graph/source-block';
import { TemplatePickerDialog } from '@/components/features/builder-graph/template-picker-dialog';
import { TemplateFormDialog } from '@/components/features/builder-graph/template-form-dialog';
import type {
    BuilderGraphRequest,
    BuilderGraphResponse,
    BuilderTemplateResponse,
    GraphFormValues,
    SourceFormValues,
    TemplateFormValues,
} from '@/types/admin';

const ragSchema = z.object({
    ragType: z.string(),
    title: z.string(),
    content: z.string().min(1, 'RAG 內容為必填'),
    overridable: z.boolean(),
});

const sourceSchema = z.object({
    systemBlock: z.boolean(),
    templateId: z.number().optional(),
    prompts: z.string().min(1, 'Prompts 為必填'),
    templateKey: z.string().optional(),
    templateName: z.string().optional(),
    templateDescription: z.string().optional(),
    templateGroupKey: z.string().optional(),
    rag: z.array(ragSchema),
});

const builderSchema = z.object({
    builderCode: z.string(),
    groupKey: z.string().optional(),
    name: z.string(),
    groupLabel: z.string(),
    description: z.string(),
    includeFile: z.boolean(),
    defaultOutputFormat: z.string(),
    filePrefix: z.string(),
    active: z.boolean(),
});

const graphFormSchema = z.object({
    builder: builderSchema,
    sources: z.array(sourceSchema).min(1, '至少需要一個 Source'),
});

const EMPTY_SOURCE: SourceFormValues = {
    systemBlock: false,
    templateId: undefined,
    prompts: '',
    templateKey: undefined,
    templateName: undefined,
    templateDescription: undefined,
    templateGroupKey: undefined,
    rag: [],
};

const DEFAULT_FORM_VALUES: GraphFormValues = {
    builder: {
        builderCode: '',
        groupKey: '',
        name: '',
        groupLabel: '',
        description: '',
        includeFile: false,
        defaultOutputFormat: 'markdown',
        filePrefix: '',
        active: true,
    },
    sources: [{ ...EMPTY_SOURCE }],
};

type TemplateDialogState =
    | {
        mode: 'create';
        sourceIndex: number;
        title: string;
        description: string;
        submitLabel: string;
        initialValues: TemplateFormValues;
      }
    | {
        mode: 'update';
        sourceIndex: number;
        templateId: number;
        title: string;
        description: string;
        submitLabel: string;
        initialValues: TemplateFormValues;
      };

function responseToFormValues(data: BuilderGraphResponse): GraphFormValues {
    return {
        builder: {
            builderCode: data.builder.builderCode ?? '',
            groupKey: data.builder.groupKey ?? '',
            name: data.builder.name ?? '',
            groupLabel: data.builder.groupLabel ?? '',
            description: data.builder.description ?? '',
            includeFile: data.builder.includeFile,
            defaultOutputFormat: data.builder.defaultOutputFormat ?? 'markdown',
            filePrefix: data.builder.filePrefix ?? '',
            active: data.builder.active,
        },
        sources: data.sources.map((source) => ({
            systemBlock: source.systemBlock,
            templateId: source.templateId ?? undefined,
            prompts: source.prompts,
            templateKey: source.templateKey ?? undefined,
            templateName: source.templateName ?? undefined,
            templateDescription: source.templateDescription ?? undefined,
            templateGroupKey: source.templateGroupKey ?? undefined,
            rag: source.rag.map((rag) => ({
                ragType: rag.ragType ?? '',
                title: rag.title ?? '',
                content: rag.content,
                overridable: rag.overridable,
            })),
        })),
    };
}

function templateToSourceFormValues(template: BuilderTemplateResponse): SourceFormValues {
    return {
        systemBlock: false,
        templateId: template.templateId,
        prompts: template.prompts ?? '',
        templateKey: template.templateKey,
        templateName: template.name,
        templateDescription: template.description ?? '',
        templateGroupKey: template.groupKey ?? undefined,
        rag: template.rag.map((rag) => ({
            ragType: rag.ragType ?? '',
            title: rag.title ?? '',
            content: rag.content ?? '',
            overridable: rag.overridable,
        })),
    };
}

function formValuesToRequest(values: GraphFormValues): BuilderGraphRequest {
    return {
        builder: {
            builderCode: values.builder.builderCode || undefined,
            groupKey: values.builder.groupKey || undefined,
            name: values.builder.name || undefined,
            groupLabel: values.builder.groupLabel || undefined,
            description: values.builder.description || undefined,
            includeFile: values.builder.includeFile,
            defaultOutputFormat: values.builder.includeFile
                ? values.builder.defaultOutputFormat || undefined
                : undefined,
            filePrefix: values.builder.filePrefix || undefined,
            active: values.builder.active,
        },
        sources: values.sources
            .filter((source) => !source.systemBlock)
            .map((source, sourceIndex) => ({
                templateId: source.templateId,
                templateKey: source.templateKey || undefined,
                templateName: source.templateName || undefined,
                templateDescription: source.templateDescription || undefined,
                templateGroupKey: source.templateGroupKey || undefined,
                orderNo: sourceIndex + 1,
                systemBlock: source.systemBlock,
                prompts: source.prompts,
                rag: source.rag.length > 0
                    ? source.rag.map((rag, ragIndex) => ({
                        ragType: rag.ragType || undefined,
                        title: rag.title || undefined,
                        content: rag.content,
                        orderNo: ragIndex + 1,
                        overridable: rag.overridable,
                        retrievalMode: 'full_context',
                    }))
                    : undefined,
            })),
    };
}

function sourceToTemplateFormValues(
    source: SourceFormValues,
    fallbackGroupKey: string | undefined,
    fallbackName: string,
    fallbackOrderNo?: number,
): TemplateFormValues {
    return {
        templateId: source.templateId,
        templateKey: source.templateKey ?? '',
        name: source.templateName ?? fallbackName,
        description: source.templateDescription ?? '',
        groupKey: source.templateGroupKey ?? fallbackGroupKey ?? '',
        orderNo: fallbackOrderNo ? String(fallbackOrderNo) : '',
        prompts: source.prompts,
        active: true,
        rag: source.rag.map((rag) => ({
            ragType: rag.ragType,
            title: rag.title,
            content: rag.content,
            overridable: rag.overridable,
        })),
    };
}

function templateFormValuesToRequest(values: TemplateFormValues) {
    const parsedOrder = Number(values.orderNo);
    const orderNo = values.orderNo && Number.isFinite(parsedOrder) && parsedOrder > 0 ? parsedOrder : undefined;

    return {
        templateKey: values.templateKey || undefined,
        name: values.name,
        description: values.description || undefined,
        groupKey: values.groupKey || undefined,
        orderNo,
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

interface BuilderGraphEditorProps {
    builderId: number;
    builderIdParam: string;
    isCreateMode?: boolean;
}

export function BuilderGraphEditor({
    builderId,
    builderIdParam,
    isCreateMode = false,
}: BuilderGraphEditorProps) {
    const { data, isLoading, isError, error } = useBuilderGraph(builderId);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [templateFormState, setTemplateFormState] = useState<TemplateDialogState | null>(null);
    const builderTemplateQuery = useBuilderTemplates(builderId, !isCreateMode);
    const templateLibraryQuery = useTemplateLibrary(isCreateMode);
    const saveMutation = useSaveBuilderGraph(builderId);
    const createTemplateMutation = useCreateTemplate();
    const updateTemplateMutation = useUpdateTemplate();

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors, isDirty },
    } = useForm<GraphFormValues>({
        resolver: zodResolver(graphFormSchema),
        defaultValues: DEFAULT_FORM_VALUES,
    });

    const sourceFieldArray = useFieldArray({ control, name: 'sources' });
    const sources = useWatch({ control, name: 'sources' }) ?? [];
    const builderGroupKey = useWatch({ control, name: 'builder.groupKey' }) ?? '';
    const templateQuery = isCreateMode ? templateLibraryQuery : builderTemplateQuery;

    useEffect(() => {
        if (isCreateMode) {
            reset(DEFAULT_FORM_VALUES);
            return;
        }

        if (data) {
            reset(responseToFormValues(data));
        }
    }, [data, isCreateMode, reset]);

    const onSubmit = async (values: GraphFormValues) => {
        if (isCreateMode) {
            toast.error('後端尚未提供建立新 AI Builder 的 API，這頁目前只能先編輯草稿。');
            return;
        }

        try {
            await saveMutation.mutateAsync(formValuesToRequest(values));
            toast.success('Builder Graph 儲存成功');
        } catch (err) {
            const message = err instanceof Error ? err.message : '儲存失敗';
            toast.error(message);
        }
    };

    const handleAppendBlankSource = () => {
        sourceFieldArray.append({ ...EMPTY_SOURCE });
    };

    const handleSelectTemplate = (template: BuilderTemplateResponse) => {
        sourceFieldArray.append(templateToSourceFormValues(template));
        toast.success(`已套用範本：${template.name}`);
    };

    const findTemplateOrder = (templateId?: number) => {
        if (!templateId) {
            return undefined;
        }
        return templateQuery.data?.find((template) => template.templateId === templateId)?.orderNo;
    };

    const applyTemplateMetadataToSource = (sourceIndex: number, template: BuilderTemplateResponse) => {
        setValue(`sources.${sourceIndex}.templateId`, template.templateId, { shouldDirty: true });
        setValue(`sources.${sourceIndex}.templateKey`, template.templateKey, { shouldDirty: true });
        setValue(`sources.${sourceIndex}.templateName`, template.name, { shouldDirty: true });
        setValue(`sources.${sourceIndex}.templateDescription`, template.description ?? '', { shouldDirty: true });
        setValue(`sources.${sourceIndex}.templateGroupKey`, template.groupKey ?? '', { shouldDirty: true });
    };

    const openCreateTemplateDialog = (sourceIndex: number, asNewCopy = false) => {
        const source = sources[sourceIndex];
        if (!source) {
            return;
        }

        const defaultName = source.templateName
            ? (asNewCopy ? `${source.templateName} 副本` : source.templateName)
            : `Source ${sourceIndex + 1} 範本`;

        const initialValues = sourceToTemplateFormValues(
            source,
            builderGroupKey,
            defaultName,
            asNewCopy ? undefined : findTemplateOrder(source.templateId),
        );

        setTemplateFormState({
            mode: 'create',
            sourceIndex,
            title: asNewCopy ? '另存為新範本' : '另存成範本',
            description: '會把目前 Source 內容複製成可重複套用的 Template，之後可從範本快速插入。',
            submitLabel: asNewCopy ? '建立新範本' : '儲存範本',
            initialValues: {
                ...initialValues,
                templateId: undefined,
                templateKey: asNewCopy ? '' : initialValues.templateKey,
                name: defaultName,
            },
        });
    };

    const openUpdateTemplateDialog = (sourceIndex: number) => {
        const source = sources[sourceIndex];
        if (!source?.templateId) {
            return;
        }

        setTemplateFormState({
            mode: 'update',
            sourceIndex,
            templateId: source.templateId,
            title: '更新原範本',
            description: '這會用目前 Source 的內容覆蓋原本套用的 Template。',
            submitLabel: '更新範本',
            initialValues: sourceToTemplateFormValues(
                source,
                builderGroupKey,
                source.templateName ?? `Source ${sourceIndex + 1} 範本`,
                findTemplateOrder(source.templateId),
            ),
        });
    };

    const handleSubmitTemplateForm = async (values: TemplateFormValues) => {
        const request = templateFormValuesToRequest(values);

        try {
            if (templateFormState?.mode === 'update') {
                const updatedTemplate = await updateTemplateMutation.mutateAsync({
                    templateId: templateFormState.templateId,
                    data: request,
                });
                applyTemplateMetadataToSource(templateFormState.sourceIndex, updatedTemplate);
                toast.success('範本更新成功');
                return;
            }

            const createdTemplate = await createTemplateMutation.mutateAsync(request);
            applyTemplateMetadataToSource(templateFormState!.sourceIndex, createdTemplate);
            toast.success('範本建立成功');
        } catch (err) {
            const message = err instanceof Error ? err.message : '範本儲存失敗';
            toast.error(message);
            throw err;
        }
    };

    if (!isCreateMode && Number.isNaN(builderId)) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-destructive">無效的 Builder ID</p>
            </div>
        );
    }

    const pageTitle = isCreateMode ? '新增 AI Builder' : 'Builder Graph Editor';
    const pageSubtitle = isCreateMode
        ? '先建立 builder 草稿卡片與 source/rag 區塊'
        : `Builder #${builderIdParam}${data ? ` — ${data.builder.name}` : ''}`;
    const saveDisabled = isCreateMode || saveMutation.isPending || !isDirty;
    const templateFormPending = createTemplateMutation.isPending || updateTemplateMutation.isPending;

    return (
        <div className="min-h-screen bg-background">
            <div className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button type="button" variant="ghost" size="sm">
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                返回
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-semibold">{pageTitle}</h1>
                                {isCreateMode ? (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                        草稿模式
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{pageSubtitle}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        disabled={saveDisabled}
                        onClick={handleSubmit(onSubmit)}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-1 h-4 w-4" />
                        )}
                        {isCreateMode ? '等待建立 API' : '儲存'}
                    </Button>
                </div>
            </div>

            <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
                {isCreateMode ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        你現在可以先整理 Builder 草稿與 Source/RAG 結構，但因為後端還沒有建立新 Builder 的 API，
                        目前無法直接存成新的 AI Builder。
                    </div>
                ) : null}

                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-64 w-full rounded-3xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                ) : isError ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        載入失敗：{error instanceof Error ? error.message : '未知錯誤'}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <BuilderInfoSection
                            register={register}
                            control={control}
                            setValue={setValue}
                        />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        Sources ({sourceFieldArray.fields.length})
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        依畫面順序編排 prompts 與 RAG 補充內容
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAppendBlankSource}
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        新增空白 Source
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsTemplateDialogOpen(true)}
                                    >
                                        <Sparkles className="mr-1 h-4 w-4" />
                                        從範本新增 Source
                                    </Button>
                                </div>
                            </div>

                            {errors.sources?.root?.message ? (
                                <p className="text-xs text-destructive">{errors.sources.root.message}</p>
                            ) : null}

                            {sourceFieldArray.fields.map((field, index) => (
                                <SourceBlock
                                    key={field.id}
                                    index={index}
                                    sourceCount={sourceFieldArray.fields.length}
                                    sourceNumber={sources.slice(0, index + 1).filter((source) => !source?.systemBlock).length}
                                    isSystemBlock={Boolean(sources[index]?.systemBlock)}
                                    canMoveUp={index > 0 && !sources[index - 1]?.systemBlock}
                                    canMoveDown={index < sourceFieldArray.fields.length - 1}
                                    register={register}
                                    control={control}
                                    onMoveUp={() => sourceFieldArray.move(index, index - 1)}
                                    onMoveDown={() => sourceFieldArray.move(index, index + 1)}
                                    onRemove={() => sourceFieldArray.remove(index)}
                                    onSaveAsTemplate={() => openCreateTemplateDialog(index)}
                                    onSaveAsNewTemplate={() => openCreateTemplateDialog(index, true)}
                                    onUpdateTemplate={() => openUpdateTemplateDialog(index)}
                                />
                            ))}
                        </div>
                    </form>
                )}
            </div>

            <TemplatePickerDialog
                open={isTemplateDialogOpen}
                onOpenChange={setIsTemplateDialogOpen}
                templates={templateQuery.data ?? []}
                isLoading={templateQuery.isLoading}
                isError={templateQuery.isError}
                errorMessage={templateQuery.error instanceof Error ? templateQuery.error.message : undefined}
                onSelectTemplate={handleSelectTemplate}
            />

            {templateFormState ? (
                <TemplateFormDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setTemplateFormState(null);
                        }
                    }}
                    title={templateFormState.title}
                    description={templateFormState.description}
                    submitLabel={templateFormState.submitLabel}
                    initialValues={templateFormState.initialValues}
                    isPending={templateFormPending}
                    onSubmit={handleSubmitTemplateForm}
                />
            ) : null}
        </div>
    );
}
