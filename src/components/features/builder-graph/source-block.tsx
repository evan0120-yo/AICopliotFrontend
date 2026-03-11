'use client';

import { UseFormRegister, UseFormSetValue, Control, useFieldArray, useFormState, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronUp, ChevronDown, Trash2, Plus, Copy, Save } from 'lucide-react';
import { RagItem } from './rag-item';
import { cn } from '@/lib/utils';
import type { GraphFormValues, RagFormValues } from '@/types/admin';

const TYPE_CODE_STYLES: Record<string, { border: string; badge: string; label: string }> = {
    PINNED: { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700', label: '固定規則' },
    CHECK: { border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', label: '檢查規則' },
    CONTENT: { border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: '主要內容' },
};

const DEFAULT_STYLE = { border: 'border-l-gray-400', badge: 'bg-gray-100 text-gray-700', label: '尚未分類' };

const NEW_RAG: RagFormValues = {
    ragType: '',
    title: '',
    content: '',
    overridable: false,
};

interface SourceBlockProps {
    index: number;
    sourceCount: number;
    register: UseFormRegister<GraphFormValues>;
    control: Control<GraphFormValues>;
    setValue: UseFormSetValue<GraphFormValues>;
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
    register,
    control,
    setValue,
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
    const typeCode = useWatch({ control, name: `sources.${index}.typeCode` }) ?? '';
    const templateName = useWatch({ control, name: `sources.${index}.templateName` });
    const templateDescription = useWatch({ control, name: `sources.${index}.templateDescription` });
    const { errors } = useFormState({ control, name: `sources.${index}` });
    const style = TYPE_CODE_STYLES[typeCode] || DEFAULT_STYLE;
    const sourceErrors = errors.sources?.[index];
    const typeError = sourceErrors && 'typeCode' in sourceErrors ? sourceErrors.typeCode?.message : undefined;
    const promptsError = sourceErrors && 'prompts' in sourceErrors ? sourceErrors.prompts?.message : undefined;

    return (
        <Card className={cn('border-l-4', style.border)}>
            <CardHeader>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', style.badge)}>
                            {style.label}
                        </span>
                        <CardTitle className="text-sm">Source #{index + 1}</CardTitle>
                    </div>
                    {templateName ? (
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
                    ) : null}
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
                </div>
                <CardAction>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={index === 0}
                            onClick={onMoveUp}
                        >
                            <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={index === sourceCount - 1}
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
                <div className="space-y-1">
                    <Label className="text-xs">用途分類</Label>
                    {templateId ? (
                        <div className="space-y-2">
                            <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm text-foreground">
                                {style.label}
                            </div>
                            <p className="text-[11px] leading-5 text-muted-foreground">
                                這段用途是跟著範本一起帶入的。若要換成其他用途，建議新增空白 Source 或重新套用其他範本。
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Select
                                value={typeCode || undefined}
                                onValueChange={(value) => setValue(`sources.${index}.typeCode`, value ?? '', { shouldDirty: true })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="請先選這段內容的用途" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PINNED">固定規則</SelectItem>
                                    <SelectItem value="CHECK">檢查規則</SelectItem>
                                    <SelectItem value="CONTENT">主要內容</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] leading-5 text-muted-foreground">
                                這個分類會決定這段 prompts 在 Builder 裡的角色與排序，但你不用記工程名，只要選對用途就好。
                            </p>
                        </div>
                    )}
                    {typeError ? (
                        <p className="text-[11px] text-destructive">{String(typeError)}</p>
                    ) : null}
                </div>

                <div className="space-y-1">
                    <Label className="text-xs">Prompts</Label>
                    <Textarea
                        placeholder="輸入 source prompts..."
                        className="min-h-24"
                        {...register(`sources.${index}.prompts`)}
                    />
                    {promptsError ? (
                        <p className="text-[11px] text-destructive">{String(promptsError)}</p>
                    ) : null}
                </div>

                {/* RAG Supplements */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                            RAG Supplements ({ragFieldArray.fields.length})
                        </Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => ragFieldArray.append(NEW_RAG)}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            新增 RAG
                        </Button>
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
