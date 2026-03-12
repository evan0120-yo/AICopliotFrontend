'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { RagFormValues, TemplateFormValues } from '@/types/admin';

const EMPTY_RAG: RagFormValues = {
    ragType: '',
    title: '',
    content: '',
    overridable: false,
};

interface TemplateFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    submitLabel: string;
    initialValues: TemplateFormValues;
    isPending: boolean;
    onSubmit: (values: TemplateFormValues) => Promise<void>;
}

export function TemplateFormDialog({
    open,
    onOpenChange,
    title,
    description,
    submitLabel,
    initialValues,
    isPending,
    onSubmit,
}: TemplateFormDialogProps) {
    const {
        register,
        control,
        handleSubmit,
        reset,
    } = useForm<TemplateFormValues>({
        defaultValues: initialValues,
    });

    const ragFieldArray = useFieldArray({
        control,
        name: 'rag',
    });

    useEffect(() => {
        if (open) {
            reset(initialValues);
        }
    }, [initialValues, open, reset]);

    const active = useWatch({ control, name: 'active' });
    const groupKey = useWatch({ control, name: 'groupKey' });
    const orderNo = useWatch({ control, name: 'orderNo' });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0" showCloseButton>
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[75vh] px-6 pb-6">
                    <form
                        className="space-y-6 py-1"
                        onSubmit={handleSubmit(async (values) => {
                            await onSubmit(values);
                            onOpenChange(false);
                        })}
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">範本名稱</Label>
                                <Input
                                    placeholder="例如：標準執行流程"
                                    {...register('name', { required: true })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">範本 Key</Label>
                                <Input
                                    placeholder="留空時會依名稱自動產生"
                                    {...register('templateKey')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">群組 Key</Label>
                                <Input
                                    placeholder="留空代表公版範本"
                                    {...register('groupKey')}
                                />
                                <p className="text-[11px] leading-5 text-muted-foreground">
                                    {groupKey ? `目前會儲存成 ${groupKey} 專用範本。` : '目前會儲存成所有群組都可用的公版範本。'}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">範本排序</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="留空代表排到最後"
                                    {...register('orderNo')}
                                />
                                <p className="text-[11px] leading-5 text-muted-foreground">
                                    {orderNo ? `目前會嘗試排到第 ${orderNo} 位。` : '留空時後端會自動排到最後。'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">範本說明</Label>
                            <Textarea
                                placeholder="讓管理者知道這個範本適合拿來做什麼。"
                                className="min-h-24"
                                {...register('description')}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Source Prompts</Label>
                            <Textarea
                                placeholder="輸入套用這個範本時要帶入的 source prompts。"
                                className="min-h-32"
                                {...register('prompts')}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Template RAG ({ragFieldArray.fields.length})
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        這些 RAG 會跟著範本一起套用到 source。
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => ragFieldArray.append({ ...EMPTY_RAG })}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    新增 RAG
                                </Button>
                            </div>

                            {ragFieldArray.fields.length === 0 ? (
                                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                                    這個範本目前不會帶入任何 RAG。
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {ragFieldArray.fields.map((field, index) => (
                                        <div key={field.id} className="rounded-2xl border bg-card p-4">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold">RAG #{index + 1}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        可在這裡定義預設補充內容與使用者輸入插槽。
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="xs"
                                                        disabled={index === 0}
                                                        onClick={() => ragFieldArray.move(index, index - 1)}
                                                    >
                                                        <ChevronUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="xs"
                                                        disabled={index === ragFieldArray.fields.length - 1}
                                                        onClick={() => ragFieldArray.move(index, index + 1)}
                                                    >
                                                        <ChevronDown className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="xs"
                                                        onClick={() => ragFieldArray.remove(index)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">RAG Type</Label>
                                                    <Input
                                                        placeholder="例如：execution_steps"
                                                        {...register(`rag.${index}.ragType`)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">標題</Label>
                                                    <Input
                                                        placeholder="例如：執行步驟"
                                                        {...register(`rag.${index}.title`)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-1.5">
                                                <Label className="text-xs">內容</Label>
                                                <Textarea
                                                    placeholder="輸入這筆 RAG 的預設內容。"
                                                    className="min-h-24"
                                                    {...register(`rag.${index}.content`)}
                                                />
                                            </div>

                                            <label className="mt-3 inline-flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-input"
                                                    {...register(`rag.${index}.overridable`)}
                                                />
                                                <span>允許被使用者輸入覆蓋</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    className="rounded border-input"
                                    {...register('active')}
                                />
                                <span>{active ? '啟用中' : '停用中'}</span>
                            </label>

                            <div className="flex items-center gap-2">
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                    取消
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                    {submitLabel}
                                </Button>
                            </div>
                        </div>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
