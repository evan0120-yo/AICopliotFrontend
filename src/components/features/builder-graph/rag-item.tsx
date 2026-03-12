'use client';

import { UseFormRegister, Control, useWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { GraphFormValues } from '@/types/admin';

interface RagItemProps {
    sourceIndex: number;
    ragIndex: number;
    ragCount: number;
    readOnly?: boolean;
    register: UseFormRegister<GraphFormValues>;
    control: Control<GraphFormValues>;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
}

export function RagItem({
    sourceIndex,
    ragIndex,
    ragCount,
    readOnly = false,
    register,
    control,
    onMoveUp,
    onMoveDown,
    onRemove,
}: RagItemProps) {
    const overridable = useWatch({
        control,
        name: `sources.${sourceIndex}.rag.${ragIndex}.overridable`,
    });
    const title = useWatch({
        control,
        name: `sources.${sourceIndex}.rag.${ragIndex}.title`,
    });
    const ragType = useWatch({
        control,
        name: `sources.${sourceIndex}.rag.${ragIndex}.ragType`,
    });
    const content = useWatch({
        control,
        name: `sources.${sourceIndex}.rag.${ragIndex}.content`,
    });

    return (
        <div className={readOnly ? 'space-y-3 rounded-lg border border-slate-200 bg-white/80 p-4' : 'space-y-3 rounded-lg border bg-muted/30 p-3'}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                    RAG #{ragIndex + 1}
                </span>
                {!readOnly ? (
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={ragIndex === 0}
                            onClick={onMoveUp}
                        >
                            <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={ragIndex === ragCount - 1}
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
                ) : null}
            </div>

            {readOnly ? (
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                            {title || '(未設定)'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                            {ragType || '(未設定)'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input
                            placeholder="RAG 標題"
                            {...register(`sources.${sourceIndex}.rag.${ragIndex}.title`)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Input
                            placeholder="ragType (e.g. default_content)"
                            {...register(`sources.${sourceIndex}.rag.${ragIndex}.ragType`)}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <Label className="text-xs">Content</Label>
                {readOnly ? (
                    <div className="min-h-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-7 whitespace-pre-wrap break-words text-slate-900">
                        {content || '尚未設定 RAG 內容'}
                    </div>
                ) : (
                    <Textarea
                        placeholder="RAG 內容..."
                        className="min-h-20"
                        {...register(`sources.${sourceIndex}.rag.${ragIndex}.content`)}
                    />
                )}
            </div>

            {readOnly ? (
                <div className="text-xs">
                    <span className={overridable ? 'text-foreground' : 'text-muted-foreground'}>
                        {overridable ? '允許使用者輸入覆蓋' : '不允許使用者輸入覆蓋'}
                    </span>
                </div>
            ) : (
                <label className="flex cursor-pointer select-none items-center gap-2 text-xs">
                    <input
                        type="checkbox"
                        className="rounded border-input"
                        {...register(`sources.${sourceIndex}.rag.${ragIndex}.overridable`)}
                    />
                    <span className={overridable ? 'text-foreground' : 'text-muted-foreground'}>
                        Overridable（允許使用者輸入覆蓋）
                    </span>
                </label>
            )}
        </div>
    );
}
