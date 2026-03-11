'use client';

import { Control, UseFormRegister, UseFormSetValue, useWatch } from 'react-hook-form';
import { Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { GraphFormValues } from '@/types/admin';

interface BuilderInfoSectionProps {
    register: UseFormRegister<GraphFormValues>;
    control: Control<GraphFormValues>;
    setValue: UseFormSetValue<GraphFormValues>;
}

export function BuilderInfoSection({ register, control, setValue }: BuilderInfoSectionProps) {
    const includeFile = useWatch({ control, name: 'builder.includeFile' });
    const active = useWatch({ control, name: 'builder.active' });
    const defaultOutputFormat = useWatch({ control, name: 'builder.defaultOutputFormat' });
    const groupLabel = useWatch({ control, name: 'builder.groupLabel' });
    const name = useWatch({ control, name: 'builder.name' });
    const description = useWatch({ control, name: 'builder.description' });

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
            <Card className="overflow-visible rounded-3xl border border-border/70 bg-[linear-gradient(160deg,rgba(255,255,255,1)_0%,rgba(247,247,247,1)_48%,rgba(241,241,241,1)_100%)] shadow-sm">
                <CardContent className="p-0">
                    <div className="relative flex items-start justify-between gap-4 px-6 py-5">
                        <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                                    {active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                                {includeFile ? (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-700">
                                        FILE OUTPUT
                                    </span>
                                ) : null}
                            </div>

                            <Input
                                aria-label="Group Label"
                                placeholder="例如：測試團隊"
                                className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-semibold text-muted-foreground shadow-none focus-visible:ring-0"
                                {...register('builder.groupLabel')}
                            />

                            <Input
                                aria-label="Builder Name"
                                placeholder="請輸入 AI Builder 名稱"
                                className="h-auto border-0 bg-transparent px-0 py-0 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
                                {...register('builder.name')}
                            />

                            <Textarea
                                aria-label="Builder Description"
                                placeholder="直接描述這個 AI Builder 會幫使用者做什麼。"
                                className="min-h-24 resize-none border-0 bg-transparent px-0 py-0 text-base leading-7 text-muted-foreground shadow-none focus-visible:ring-0"
                                {...register('builder.description')}
                            />
                        </div>

                        <details className="relative shrink-0">
                            <summary className="list-none">
                                <Button type="button" variant="ghost" size="icon-sm" className="rounded-full">
                                    <Settings2 className="h-4 w-4" />
                                </Button>
                            </summary>
                            <div className="absolute right-0 top-12 z-10 w-72 rounded-2xl border bg-background p-4 shadow-xl">
                                <p className="mb-3 text-xs font-semibold text-muted-foreground">進階設定</p>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Builder Code</Label>
                                        <Input
                                            placeholder="e.g. qa-smoke-doc"
                                            {...register('builder.builderCode')}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">File Prefix</Label>
                                        <Input
                                            placeholder="輸出檔案前綴"
                                            {...register('builder.filePrefix')}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">預設輸出格式</Label>
                                        <Select
                                            value={defaultOutputFormat || 'markdown'}
                                            onValueChange={(value) => setValue('builder.defaultOutputFormat', value ?? 'markdown')}
                                            disabled={!includeFile}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="markdown">Markdown</SelectItem>
                                                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>

                    <div className="border-t border-border/70 bg-white/60 px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.9fr)]">
                            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    即時預覽
                                </p>
                                <div className="mt-3 rounded-2xl border border-border/70 bg-muted/20 p-5">
                                    <p className="text-sm font-semibold text-muted-foreground">
                                        {groupLabel || '群組標籤'}
                                    </p>
                                    <h2 className="mt-2 text-2xl font-semibold leading-tight">
                                        {name || 'AI Builder 名稱'}
                                    </h2>
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                        {description || '這裡會顯示 Builder 的對外說明。'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                                <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="rounded border-input"
                                        {...register('builder.active')}
                                    />
                                    <span className={active ? 'text-foreground' : 'text-muted-foreground'}>
                                        啟用 (Active)
                                    </span>
                                </label>

                                <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="rounded border-input"
                                        {...register('builder.includeFile')}
                                    />
                                    <span className={includeFile ? 'text-foreground' : 'text-muted-foreground'}>
                                        包含檔案輸出 (Include File)
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border border-dashed border-border/80 bg-muted/20">
                <CardContent className="space-y-3 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        編輯提示
                    </p>
                    <h3 className="text-lg font-semibold">先像改卡片一樣改 Builder</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                        直接修改左邊卡片上的群組、名稱、描述，會比先填工程欄位更直覺。
                        `Builder Code`、`File Prefix`、輸出格式則收在右上角齒輪的進階設定內。
                    </p>
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
                        這張卡片就是側邊欄 Builder 名片的編輯版本。你現在改的內容，會直接影響使用者看到的 Builder 介紹。
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
