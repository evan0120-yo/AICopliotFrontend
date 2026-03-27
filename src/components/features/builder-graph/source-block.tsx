'use client';

import { UseFormRegister, Control, useFieldArray, useFormState, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Trash2, Plus, Copy, Save, Lock, Shield } from 'lucide-react';
import { RagItem } from './rag-item';
import { cn } from '@/lib/utils';
import type { GraphFormValues, RagFormValues } from '@/types/admin';

const NEW_RAG: RagFormValues = {
    ragType: '',
    title: '',
    content: '',
    overridable: false,
};

interface SourceBlockProps {
    index: number;
    sourceCount: number;
    sourceNumber: number;
    isSystemBlock: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    register: UseFormRegister<GraphFormValues>;
    control: Control<GraphFormValues>;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    onSaveAsTemplate: () => void;
    onSaveAsNewTemplate: () => void;
    onUpdateTemplate: () => void;
}

export function SourceBlock({
    index,
    sourceCount,
    sourceNumber,
    isSystemBlock,
    canMoveUp,
    canMoveDown,
    register,
    control,
    onMoveUp,
    onMoveDown,
    onRemove,
    onSaveAsTemplate,
    onSaveAsNewTemplate,
    onUpdateTemplate,
}: SourceBlockProps) {
    const ragFieldArray = useFieldArray({
        control,
        name: `sources.${index}.rag`,
    });

    const templateId = useWatch({ control, name: `sources.${index}.templateId` });
    const templateName = useWatch({ control, name: `sources.${index}.templateName` });
    const templateDescription = useWatch({ control, name: `sources.${index}.templateDescription` });
    const tags = useWatch({ control, name: `sources.${index}.tags` }) ?? [];
    const prompts = useWatch({ control, name: `sources.${index}.prompts` });
    const { errors } = useFormState({ control, name: `sources.${index}` });
    const sourceErrors = errors.sources?.[index];
    const promptsError = sourceErrors && 'prompts' in sourceErrors ? sourceErrors.prompts?.message : undefined;

    return (
        <Card
            className={cn(
                'border-l-4',
                isSystemBlock
                    ? 'border border-slate-200 border-dashed bg-slate-50/80 ring-slate-200'
                    : templateId
                        ? 'border-l-sky-500'
                        : 'border-l-zinc-400',
            )}
        >
            <CardHeader>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                'rounded px-2 py-0.5 text-xs font-semibold',
                                isSystemBlock
                                    ? 'bg-slate-900 text-slate-50'
                                    : templateId
                                        ? 'bg-sky-100 text-sky-700'
                                        : 'bg-zinc-100 text-zinc-700',
                            )}
                        >
                            {isSystemBlock ? '系統區塊' : templateId ? '範本副本' : '自訂區塊'}
                        </span>
                        <CardTitle className="text-sm">
                            {isSystemBlock ? '系統安全區塊' : `Source #${sourceNumber}`}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                            {isSystemBlock ? '固定置頂' : `排序 #${sourceNumber}`}
                        </span>
                        {isSystemBlock ? <Lock className="h-3.5 w-3.5 text-slate-500" /> : null}
                    </div>

                    {isSystemBlock ? (
                        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[11px] leading-5 text-slate-600">
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                                <Shield className="h-3.5 w-3.5" />
                                系統維護的安全規則區塊
                            </div>
                            <p className="mt-1">
                                這段 prompt 會固定排在最前面，方便閱讀完整組裝順序；目前僅供檢視，不可編輯、刪除或調整順序。
                            </p>
                        </div>
                    ) : templateName ? (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-foreground">
                                套用範本：{templateName}
                            </p>
                            {templateDescription ? (
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {templateDescription}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-[11px] leading-5 text-muted-foreground">
                            這是自由編排的 Source 區塊。最終組 prompt 時，系統只會依目前畫面上的上下順序處理。
                        </p>
                    )}

                    {!isSystemBlock ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" size="xs" onClick={onSaveAsTemplate}>
                                <Save className="mr-1 h-3 w-3" />
                                另存成範本
                            </Button>
                            {templateId ? (
                                <>
                                    <Button type="button" variant="outline" size="xs" onClick={onUpdateTemplate}>
                                        <Save className="mr-1 h-3 w-3" />
                                        更新原範本
                                    </Button>
                                    <Button type="button" variant="outline" size="xs" onClick={onSaveAsNewTemplate}>
                                        <Copy className="mr-1 h-3 w-3" />
                                        另存新範本
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <CardAction className={isSystemBlock ? 'hidden' : undefined}>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={!canMoveUp}
                            onClick={onMoveUp}
                        >
                            <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={!canMoveDown || index === sourceCount - 1}
                            onClick={onMoveDown}
                        >
                            <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={onRemove}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </CardAction>
            </CardHeader>

            <CardContent className="space-y-4">
                {tags.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-dashed bg-muted/20 p-3">
                        <Label className="text-xs">Tags</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="space-y-1">
                    <Label className="text-xs">Prompts</Label>
                    {isSystemBlock ? (
                        <div className="min-h-24 rounded-lg border border-slate-200 bg-white/80 px-3 py-3 text-sm leading-7 whitespace-pre-wrap break-words text-slate-900">
                            {prompts || '尚未設定系統 prompts'}
                        </div>
                    ) : (
                        <Textarea
                            placeholder="輸入 source prompts..."
                            className="min-h-24"
                            {...register(`sources.${index}.prompts`)}
                        />
                    )}
                    {promptsError ? (
                        <p className="text-[11px] text-destructive">{String(promptsError)}</p>
                    ) : null}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                            RAG Supplements ({ragFieldArray.fields.length})
                        </Label>
                        {!isSystemBlock ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => ragFieldArray.append(NEW_RAG)}
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                新增 RAG
                            </Button>
                        ) : null}
                    </div>

                    {ragFieldArray.fields.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                            尚未新增 RAG supplement
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ragFieldArray.fields.map((field, ragIndex) => (
                                <RagItem
                                    key={field.id}
                                    sourceIndex={index}
                                    ragIndex={ragIndex}
                                    ragCount={ragFieldArray.fields.length}
                                    readOnly={isSystemBlock}
                                    register={register}
                                    control={control}
                                    onMoveUp={() => ragFieldArray.move(ragIndex, ragIndex - 1)}
                                    onMoveDown={() => ragFieldArray.move(ragIndex, ragIndex + 1)}
                                    onRemove={() => ragFieldArray.remove(ragIndex)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
