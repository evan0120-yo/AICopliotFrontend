'use client';

import { use, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Menu, Minus, Paperclip, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useConsult } from '@/hooks/useConsult';
import { useLineTaskConsult } from '@/hooks/useLineTaskConsult';
import { useProfileConsult } from '@/hooks/useProfileConsult';
import { useGetBuilders } from '@/hooks/useBuilders';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/layout/sidebar';
import { MarkdownBlock } from '@/components/features/markdown-block';
import {
    BuilderSummary,
    ConsultFilePayload,
    LineTaskConsultResponse,
    ProfileConsultRequestData,
    WeightedZodiacEntry,
    ZodiacKey,
} from '@/types/api';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
const FILE_ACCEPT_VALUE = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',');
const ASTROLOGY_BUILDER_ID = 3;
const ASTROLOGY_BUILDER_CODE = 'linkchat-astrology';
const LINE_TASK_BUILDER_CODE = 'line-memo-crud';
const UNKNOWN_ZODIAC_VALUE = 'unknown';
const DEFAULT_ASTROLOGY_TEXT = '請分析這個人的核心性格與外在社交表現。';
const DEFAULT_LINE_TASK_APP_ID = '';

const formSchema = z.object({
    text: z.string(),
    outputFormat: z.string().optional(),
    files: z
        .custom<FileList>()
        .optional()
        .refine((files) => !files || files.length <= MAX_FILES, `最多可上傳 ${MAX_FILES} 個檔案。`)
        .refine((files) => {
            if (!files) {
                return true;
            }

            let totalSize = 0;
            for (let index = 0; index < files.length; index++) {
                totalSize += files[index].size;
            }
            return totalSize <= MAX_TOTAL_SIZE;
        }, '檔案總大小不可超過 50MB。')
        .refine((files) => {
            if (!files) {
                return true;
            }

            for (let index = 0; index < files.length; index++) {
                if (files[index].size > MAX_FILE_SIZE) {
                    return false;
                }
            }
            return true;
        }, '單一檔案不可超過 20MB。')
        .refine((files) => {
            if (!files) {
                return true;
            }

            for (let index = 0; index < files.length; index++) {
                const extension = files[index].name.split('.').pop()?.toLowerCase() || '';
                if (!ALLOWED_EXTENSIONS.includes(extension)) {
                    return false;
                }
            }
            return true;
        }, '檔案格式不支援。'),
});

type FormValues = z.infer<typeof formSchema>;
type BuilderScreenVariant = 'generic_consult' | 'astrology_profile' | 'line_task_extract';
type AstrologySlotKey = 'sun_sign' | 'moon_sign' | 'rising_sign';
type AstrologySingleValue = ZodiacKey | typeof UNKNOWN_ZODIAC_VALUE;
type AstrologyWeightedEntryState = {
    key: ZodiacKey;
    weightPercent: string;
};
type AstrologySlotState =
    | {
          mode: 'single';
          value: AstrologySingleValue;
      }
    | {
          mode: 'weighted';
          entries: [AstrologyWeightedEntryState, AstrologyWeightedEntryState];
      };
type AstrologyFormState = Record<AstrologySlotKey, AstrologySlotState>;
type SlotErrorMap = Partial<Record<AstrologySlotKey, string>>;
type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    file?: ConsultFilePayload;
    deliveryStatus?: 'pending' | 'success' | 'error';
    businessStatus?: boolean;
    statusAns?: string;
};
type BuilderScreenProps = {
    builderId: number;
    builderIdParam: string;
    currentBuilder?: BuilderSummary;
    isBuildersLoading: boolean;
    isBuildersError: boolean;
    isInvalidBuilder: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};
type LineTaskSubmission = {
    id: string;
    appId: string;
    messageText: string;
    referenceTime?: string;
    timeZone?: string;
    useCustomCurrentTime: boolean;
    response?: LineTaskConsultResponse;
    errorMessage?: string;
    deliveryStatus: 'pending' | 'success' | 'error';
};
type ConversationLayoutProps = BuilderScreenProps & {
    chatHistory: ChatMessage[];
    isPending: boolean;
    pendingLabel: string;
    emptyStateText: string;
    footer: React.ReactNode;
    topPanel?: React.ReactNode;
    headerAction?: React.ReactNode;
    showHeader?: boolean;
    mainContent?: React.ReactNode;
};

const ASTROLOGY_SLOT_LABELS: Record<AstrologySlotKey, string> = {
    sun_sign: '太陽',
    moon_sign: '月亮',
    rising_sign: '上升',
};

const ZODIAC_OPTIONS: Array<{ key: ZodiacKey; label: string }> = [
    { key: 'aries', label: '牡羊' },
    { key: 'taurus', label: '金牛' },
    { key: 'gemini', label: '雙子' },
    { key: 'cancer', label: '巨蟹' },
    { key: 'leo', label: '獅子' },
    { key: 'virgo', label: '處女' },
    { key: 'libra', label: '天秤' },
    { key: 'scorpio', label: '天蠍' },
    { key: 'sagittarius', label: '射手' },
    { key: 'capricorn', label: '魔羯' },
    { key: 'aquarius', label: '水瓶' },
    { key: 'pisces', label: '雙魚' },
];

let messageSequence = 0;

function createMessageId() {
    messageSequence += 1;
    return `message-${Date.now()}-${messageSequence}`;
}

function buildUserMessageContent(text: string) {
    return text.trim() || '未提供文字，使用 builder 預設內容。';
}

function buildAssistantMessageContent(response: string, statusAns: string) {
    if (response.trim()) {
        return response.trim();
    }
    if (statusAns.trim()) {
        return '系統未提供 response 內容。';
    }
    return '系統未提供額外內容。';
}

function resolveBuilderScreenVariant(builderId: number, currentBuilder?: BuilderSummary): BuilderScreenVariant {
    if (currentBuilder?.builderCode === LINE_TASK_BUILDER_CODE) {
        return 'line_task_extract';
    }
    if (builderId === ASTROLOGY_BUILDER_ID || currentBuilder?.builderCode === ASTROLOGY_BUILDER_CODE) {
        return 'astrology_profile';
    }
    return 'generic_consult';
}

function padDatePart(value: number) {
    return value.toString().padStart(2, '0');
}

function formatDateTimeLocalValue(date: Date) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function normalizeLineTaskReferenceTime(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const candidate = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    const date = new Date(candidate);
    if (Number.isNaN(date.getTime())) {
        return trimmed;
    }

    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:00`;
}

function defaultLineTaskTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei';
}

function getZodiacLabel(key: ZodiacKey) {
    return ZODIAC_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

function getNextDifferentZodiac(first: ZodiacKey) {
    return ZODIAC_OPTIONS.find((option) => option.key !== first)?.key ?? 'taurus';
}

function createDefaultAstrologyState(): AstrologyFormState {
    return {
        sun_sign: { mode: 'single', value: UNKNOWN_ZODIAC_VALUE },
        moon_sign: { mode: 'single', value: UNKNOWN_ZODIAC_VALUE },
        rising_sign: { mode: 'single', value: UNKNOWN_ZODIAC_VALUE },
    };
}

function createWeightedSlotState(previousValue: AstrologySingleValue): AstrologySlotState {
    const firstKey = previousValue !== UNKNOWN_ZODIAC_VALUE ? previousValue : 'aries';
    return {
        mode: 'weighted',
        entries: [
            { key: firstKey, weightPercent: '50' },
            { key: getNextDifferentZodiac(firstKey), weightPercent: '50' },
        ],
    };
}

function buildAstrologyPayload(state: AstrologyFormState): ProfileConsultRequestData['payload'] {
    const payload: ProfileConsultRequestData['payload'] = {};

    (Object.keys(state) as AstrologySlotKey[]).forEach((slotKey) => {
        const slotState = state[slotKey];
        if (slotState.mode === 'single') {
            if (slotState.value !== UNKNOWN_ZODIAC_VALUE) {
                payload[slotKey] = [slotState.value];
            }
            return;
        }

        payload[slotKey] = slotState.entries.map<WeightedZodiacEntry>((entry) => ({
            key: entry.key,
            weightPercent: Number(entry.weightPercent),
        }));
    });

    return payload;
}

function getAstrologySlotError(slotState: AstrologySlotState) {
    if (slotState.mode === 'single') {
        return '';
    }

    const [first, second] = slotState.entries;
    if (first.key === second.key) {
        return '兩個星座不可重複。';
    }

    const firstWeight = Number(first.weightPercent);
    const secondWeight = Number(second.weightPercent);
    if (!Number.isFinite(firstWeight) || !Number.isFinite(secondWeight)) {
        return '請填入兩個百分比。';
    }

    if (firstWeight < 0 || firstWeight > 100 || secondWeight < 0 || secondWeight > 100) {
        return '百分比需介於 0 到 100。';
    }

    if (firstWeight + secondWeight !== 100) {
        return '兩個百分比相加必須等於 100。';
    }

    return '';
}

function buildAstrologySlotErrors(state: AstrologyFormState): SlotErrorMap {
    const errors: SlotErrorMap = {};
    (Object.keys(state) as AstrologySlotKey[]).forEach((slotKey) => {
        const error = getAstrologySlotError(state[slotKey]);
        if (error) {
            errors[slotKey] = error;
        }
    });
    return errors;
}

function describeAstrologySlot(slotState: AstrologySlotState) {
    if (slotState.mode === 'single') {
        return slotState.value === UNKNOWN_ZODIAC_VALUE ? '不知道' : getZodiacLabel(slotState.value);
    }

    return slotState.entries
        .map((entry) => `${getZodiacLabel(entry.key)} ${entry.weightPercent || '0'}%`)
        .join(' / ');
}

function buildAstrologyUserMessageContent(state: AstrologyFormState, text: string) {
    const lines = (Object.keys(state) as AstrologySlotKey[]).map((slotKey) => (
        `${ASTROLOGY_SLOT_LABELS[slotKey]}：${describeAstrologySlot(state[slotKey])}`
    ));
    lines.push(`需求：${text.trim() || '未提供文字，使用固定 profile envelope 送出。'}`);
    return lines.join('\n');
}

export default function BuilderChatPage({
    params,
}: {
    params: Promise<{ builderId: string }>;
}) {
    const { builderId: builderIdParam } = use(params);
    const builderId = Number.parseInt(builderIdParam, 10);
    return <BuilderEntry key={builderIdParam} builderId={builderId} builderIdParam={builderIdParam} />;
}

function BuilderEntry({
    builderId,
    builderIdParam,
}: {
    builderId: number;
    builderIdParam: string;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const {
        data: builders,
        isLoading: isBuildersLoading,
        isError: isBuildersError,
    } = useGetBuilders();
    const currentBuilder = builders?.find((builder) => builder.builderId === builderId);
    const isInvalidBuilder = Number.isNaN(builderId) || (!isBuildersLoading && !isBuildersError && !currentBuilder);
    const variant = resolveBuilderScreenVariant(builderId, currentBuilder);
    const screenProps: BuilderScreenProps = {
        builderId,
        builderIdParam,
        currentBuilder,
        isBuildersLoading,
        isBuildersError,
        isInvalidBuilder,
        isSidebarOpen,
        setIsSidebarOpen,
    };

    if (variant === 'astrology_profile') {
        return <AstrologyProfileScreen {...screenProps} />;
    }

    if (variant === 'line_task_extract') {
        return <LineTaskExtractScreen {...screenProps} />;
    }

    return <GenericConsultScreen {...screenProps} />;
}

function ConversationLayout({
    builderIdParam,
    currentBuilder,
    isBuildersLoading,
    isBuildersError,
    isInvalidBuilder,
    isSidebarOpen,
    setIsSidebarOpen,
    chatHistory,
    isPending,
    pendingLabel,
    emptyStateText,
    footer,
    topPanel,
    headerAction,
    showHeader = true,
    mainContent,
}: ConversationLayoutProps) {
    return (
        <div className="relative flex h-full min-h-0 flex-col bg-background">
            {showHeader ? (
                <div className="z-10 flex items-center justify-between border-b bg-card p-4">
                    <div className="flex items-center gap-3">
                        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
                                <Menu className="h-5 w-5" />
                            </SheetTrigger>
                            <SheetContent side="left" className="w-64 p-0">
                                <Sidebar />
                            </SheetContent>
                        </Sheet>

                        <div className="flex flex-col">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">
                                {currentBuilder?.groupLabel || `Builder ${builderIdParam}`}
                            </span>
                            <h1 className="text-sm font-semibold md:text-base">
                                {currentBuilder?.name || 'Consultation Session'}
                            </h1>
                            <p className="hidden text-xs text-muted-foreground md:block">
                                {currentBuilder?.description
                                    || (isBuildersLoading ? '載入 builder 資訊中...' : '找不到 builder 描述')}
                            </p>
                        </div>
                    </div>

                    {headerAction ?? null}
                </div>
            ) : null}

            {topPanel ? (
                <div className="border-b bg-card/40 px-4 py-4 backdrop-blur md:px-8">
                    {topPanel}
                </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
                <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
                    {isInvalidBuilder ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            找不到對應的 builder，請從左側重新選擇。
                        </div>
                    ) : null}

                    {isBuildersError ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            Builder 清單載入失敗，目前無法確認 builder 設定。
                        </div>
                    ) : null}

                    {mainContent ? mainContent : chatHistory.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                            {emptyStateText}
                        </div>
                    ) : (
                        chatHistory.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[90%] rounded-xl px-4 py-3 md:max-w-[80%] ${
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'w-full border bg-transparent shadow-sm'
                                    }`}
                                >
                                    {message.role === 'user' ? (
                                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {message.businessStatus === false && message.statusAns ? (
                                                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                                    {message.statusAns}
                                                </div>
                                            ) : null}
                                            <MarkdownBlock content={message.content} file={message.file} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {isPending ? (
                        <div className="flex justify-start">
                            <div className="flex items-center gap-3 rounded-xl border bg-transparent px-6 py-4 text-muted-foreground shadow-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">{pendingLabel}</span>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="border-t bg-card/50 p-4 pb-6 backdrop-blur">
                {footer}
            </div>
        </div>
    );
}

const lineTaskFormSchema = z.object({
    appId: z.string().optional(),
    messageText: z.string().trim().min(1, '請輸入口語訊息。'),
    useCustomCurrentTime: z.boolean(),
    referenceTime: z.string().optional(),
    timeZone: z.string().optional(),
}).superRefine((value, context) => {
    if (!value.useCustomCurrentTime) {
        return;
    }
    if (!value.referenceTime?.trim()) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['referenceTime'],
            message: '請提供 referenceTime。',
        });
    }
    if (!value.timeZone?.trim()) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['timeZone'],
            message: '請提供 timeZone。',
        });
    }
});

type LineTaskFormValues = z.infer<typeof lineTaskFormSchema>;

function LineTaskExtractScreen(props: BuilderScreenProps) {
    const [submissions, setSubmissions] = useState<LineTaskSubmission[]>([]);
    const lineTaskConsultMutation = useLineTaskConsult();
    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<LineTaskFormValues>({
        resolver: zodResolver(lineTaskFormSchema),
        defaultValues: {
            appId: DEFAULT_LINE_TASK_APP_ID,
            messageText: '',
            useCustomCurrentTime: false,
            referenceTime: formatDateTimeLocalValue(new Date()),
            timeZone: defaultLineTaskTimeZone(),
        },
    });
    const useCustomCurrentTime = useWatch({ control, name: 'useCustomCurrentTime' }) ?? false;

    const submitDisabled = lineTaskConsultMutation.isPending || props.isInvalidBuilder;

    const onSubmit = async (data: LineTaskFormValues) => {
        const submissionId = createMessageId();
        const normalizedReferenceTime = data.useCustomCurrentTime
            ? normalizeLineTaskReferenceTime(data.referenceTime?.trim() || '')
            : '';
        const normalizedTimeZone = data.useCustomCurrentTime ? data.timeZone?.trim() || '' : '';

        setSubmissions((previous) => [
            {
                id: submissionId,
                appId: data.appId?.trim() || '',
                messageText: data.messageText.trim(),
                referenceTime: normalizedReferenceTime || undefined,
                timeZone: normalizedTimeZone || undefined,
                useCustomCurrentTime: data.useCustomCurrentTime,
                deliveryStatus: 'pending',
            },
            ...previous,
        ]);

        try {
            const response = await lineTaskConsultMutation.mutateAsync({
                appId: data.appId?.trim() || '',
                builderId: props.builderId,
                messageText: data.messageText.trim(),
                referenceTime: normalizedReferenceTime || undefined,
                timeZone: normalizedTimeZone || undefined,
            });

            reset({
                appId: data.appId?.trim() || '',
                messageText: '',
                useCustomCurrentTime: data.useCustomCurrentTime,
                referenceTime: data.useCustomCurrentTime ? (data.referenceTime?.trim() || '') : formatDateTimeLocalValue(new Date()),
                timeZone: data.useCustomCurrentTime ? normalizedTimeZone : defaultLineTaskTimeZone(),
            });

            setSubmissions((previous) => previous.map((item) => (
                item.id === submissionId
                    ? { ...item, response, deliveryStatus: 'success' as const }
                    : item
            )));
            toast.success('Line task extraction 已完成');
        } catch (error) {
            const message = error instanceof Error ? error.message : '請求失敗';
            setSubmissions((previous) => previous.map((item) => (
                item.id === submissionId
                    ? { ...item, errorMessage: message, deliveryStatus: 'error' as const }
                    : item
            )));
            toast.error(message);
        }
    };

    const topPanel = (
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-5xl space-y-4">
            <div className="rounded-2xl border bg-background/95 p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="line-task-app-id">App ID（選填）</Label>
                        <Input
                            id="line-task-app-id"
                            placeholder="留空代表 local/dev 路線"
                            disabled={lineTaskConsultMutation.isPending}
                            {...register('appId')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="line-task-custom-current-time" className="text-sm font-medium">
                            測試模式
                        </Label>
                        <label
                            htmlFor="line-task-custom-current-time"
                            className="flex min-h-10 items-start gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                        >
                            <input
                                id="line-task-custom-current-time"
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-input"
                                disabled={lineTaskConsultMutation.isPending}
                                {...register('useCustomCurrentTime')}
                            />
                            <span className="space-y-1">
                                <span className="block font-medium">自定義現在時間</span>
                                <span className="block text-xs text-muted-foreground">
                                    未勾選時由 backend 自動補系統時間與系統時區。
                                </span>
                            </span>
                        </label>
                    </div>
                </div>

                <div className={`mt-4 grid gap-4 ${useCustomCurrentTime ? 'md:grid-cols-[minmax(0,1fr)_220px]' : ''}`}>
                    <div className="space-y-2">
                        <Label htmlFor="line-task-message-text">Message Text</Label>
                        <Textarea
                            id="line-task-message-text"
                            placeholder="例如：小傑 明天 下午三點找我吃飯"
                            className="min-h-[112px] resize-none"
                            disabled={lineTaskConsultMutation.isPending}
                            {...register('messageText')}
                            onKeyDown={(event) => {
                                if (event.nativeEvent.isComposing) return;
                                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                    event.preventDefault();
                                    handleSubmit(onSubmit)();
                                }
                            }}
                        />
                        {errors.messageText ? (
                            <p className="text-xs text-destructive">{errors.messageText.message}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                這條畫面會直接送到 /api/line-task-consult，不走 generic consult。
                            </p>
                        )}
                    </div>

                    {useCustomCurrentTime ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="line-task-time-zone">Time Zone</Label>
                                <Input
                                    id="line-task-time-zone"
                                    placeholder="Asia/Taipei"
                                    disabled={lineTaskConsultMutation.isPending}
                                    {...register('timeZone')}
                                />
                                {errors.timeZone ? (
                                    <p className="text-xs text-destructive">{errors.timeZone.message}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        只在測試模式下送出覆蓋值。
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="line-task-reference-time">Reference Time</Label>
                                <Input
                                    id="line-task-reference-time"
                                    type="datetime-local"
                                    step={60}
                                    disabled={lineTaskConsultMutation.isPending}
                                    {...register('referenceTime')}
                                />
                                {errors.referenceTime ? (
                                    <p className="text-xs text-destructive">{errors.referenceTime.message}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        送出時會轉成 `YYYY-MM-DD HH:mm:ss`。
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="mt-4 flex justify-end">
                    <Button type="submit" className={useCustomCurrentTime ? 'w-full md:w-[220px]' : ''} disabled={submitDisabled}>
                        <Send className="h-4 w-4" />
                        送出 line task consult
                    </Button>
                </div>
            </div>
        </form>
    );

    const mainContent = submissions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            輸入口語訊息後送出，開始測試 line task extraction。需要覆蓋系統時間時再勾選測試模式。
        </div>
    ) : (
        <div className="flex flex-col gap-4">
            {submissions.map((submission) => (
                <div key={submission.id} className="rounded-2xl border bg-background/95 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">{submission.messageText}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {submission.useCustomCurrentTime ? (
                                    <>
                                        <span>referenceTime: {submission.referenceTime}</span>
                                        <span>timeZone: {submission.timeZone}</span>
                                    </>
                                ) : (
                                    <span>executionTime: backend system clock / system timezone</span>
                                )}
                                {submission.appId ? <span>appId: {submission.appId}</span> : <span>appId: (empty)</span>}
                            </div>
                        </div>
                        <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                submission.deliveryStatus === 'success'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : submission.deliveryStatus === 'error'
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-secondary text-secondary-foreground'
                            }`}
                        >
                            {submission.deliveryStatus === 'success'
                                ? 'success'
                                : submission.deliveryStatus === 'error'
                                    ? 'error'
                                    : 'pending'}
                        </span>
                    </div>

                    {submission.deliveryStatus === 'pending' ? (
                        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            AI 正在抽取結構化事件資料...
                        </div>
                    ) : null}

                    {submission.deliveryStatus === 'error' ? (
                        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            {submission.errorMessage || 'Line task consult 失敗'}
                        </div>
                    ) : null}

                    {submission.response ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border bg-muted/20 p-3">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Operation</p>
                                <p className="mt-1 text-sm font-medium">{submission.response.operation}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Summary</p>
                                <p className="mt-1 text-sm font-medium">{submission.response.summary || '(empty)'}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Start At</p>
                                <p className="mt-1 text-sm font-medium">{submission.response.startAt || '(empty)'}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">End At</p>
                                <p className="mt-1 text-sm font-medium">{submission.response.endAt || '(empty)'}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3 md:col-span-2">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Location</p>
                                <p className="mt-1 text-sm font-medium">{submission.response.location || '(empty)'}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3 md:col-span-2">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Missing Fields</p>
                                {submission.response.missingFields.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {submission.response.missingFields.map((field) => (
                                            <span key={field} className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm font-medium">(none)</p>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );

    const footer = (
        <div className="mx-auto max-w-5xl text-xs text-muted-foreground">
            structured result 會直接對齊 backend `operation / summary / startAt / endAt / location / missingFields`。
            快捷鍵：Message Text 使用 `Ctrl/Cmd + Enter` 送出。
        </div>
    );

    return (
        <ConversationLayout
            {...props}
            chatHistory={[]}
            isPending={false}
            pendingLabel=""
            emptyStateText=""
            topPanel={topPanel}
            mainContent={mainContent}
            footer={footer}
        />
    );
}

function GenericConsultScreen(props: BuilderScreenProps) {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const consultMutation = useConsult();
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        control,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            text: '',
            outputFormat: 'default',
        },
    });

    const files = useWatch({ control, name: 'files' });
    const selectedOutputFormat = useWatch({ control, name: 'outputFormat' });
    const showOutputFormat = props.currentBuilder?.includeFile ?? false;
    const submitDisabled = consultMutation.isPending || props.isInvalidBuilder;

    const onSubmit = async (data: FormValues) => {
        const userMessageId = createMessageId();
        const userContent = buildUserMessageContent(data.text);
        const submittedText = data.text.trim();
        const submittedFiles = data.files ? Array.from(data.files) : undefined;
        const submittedOutputFormat =
            props.currentBuilder?.includeFile && data.outputFormat && data.outputFormat !== 'default'
                ? data.outputFormat
                : undefined;

        setChatHistory((previous) => [
            ...previous,
            {
                id: userMessageId,
                role: 'user',
                content: userContent,
                deliveryStatus: 'pending',
            },
        ]);

        try {
            const response = await consultMutation.mutateAsync({
                builderId: props.builderId,
                text: submittedText,
                outputFormat: submittedOutputFormat,
                files: submittedFiles,
            });

            reset({
                text: '',
                outputFormat: props.currentBuilder?.includeFile ? selectedOutputFormat ?? 'default' : 'default',
                files: undefined,
            });

            setChatHistory((previous) => [
                ...previous.map((message) => (
                    message.id === userMessageId
                        ? { ...message, deliveryStatus: 'success' as const }
                        : message
                )),
                {
                    id: createMessageId(),
                    role: 'assistant',
                    content: buildAssistantMessageContent(response.response, response.statusAns),
                    file: response.file ?? undefined,
                    deliveryStatus: response.status ? 'success' : 'error',
                    businessStatus: response.status,
                    statusAns: response.statusAns,
                },
            ]);

            if (response.status) {
                toast.success('回應已產生');
            } else {
                toast.error(response.statusAns || '本次請求未通過業務規則');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '請求失敗';

            setChatHistory((previous) => previous.map((messageItem) => (
                messageItem.id === userMessageId
                    ? { ...messageItem, deliveryStatus: 'error' as const }
                    : messageItem
            )));
            toast.error(message);
        }
    };

    const footer = (
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl space-y-2">
            {files && files.length > 0 ? (
                <div className="flex flex-wrap gap-2 px-2">
                    <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        <Paperclip className="h-3 w-3" />
                        已附加 {files.length} 個檔案
                    </span>
                </div>
            ) : null}

            <div className="flex items-end gap-2 rounded-lg border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                <div className="relative">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                            <Paperclip className="h-5 w-5" />
                        </div>
                    </Label>
                    <Input
                        id="file-upload"
                        type="file"
                        multiple
                        accept={FILE_ACCEPT_VALUE}
                        className="hidden"
                        {...register('files')}
                    />
                </div>

                <Textarea
                    placeholder="輸入需求，或直接送出使用 builder 預設內容..."
                    className="min-h-[44px] max-h-32 flex-1 resize-none border-0 px-2 py-3 shadow-none focus-visible:ring-0"
                    disabled={consultMutation.isPending}
                    {...register('text')}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleSubmit(onSubmit)();
                        }
                    }}
                />

                <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={submitDisabled}>
                    <Send className="h-4 w-4" />
                </Button>
            </div>

            {errors.text || errors.files ? (
                <div className="px-2 text-xs text-destructive">
                    {errors.text?.message || errors.files?.message}
                </div>
            ) : null}
        </form>
    );

    const headerAction = showOutputFormat ? (
        <div className="flex items-center gap-2">
            <Select
                value={selectedOutputFormat ?? 'default'}
                onValueChange={(value) => setValue('outputFormat', value ?? 'default')}
            >
                <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="輸出格式" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="default">
                        使用預設{props.currentBuilder?.defaultOutputFormat ? ` (${props.currentBuilder.defaultOutputFormat})` : ''}
                    </SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                </SelectContent>
            </Select>
        </div>
    ) : null;

    return (
        <ConversationLayout
            {...props}
            chatHistory={chatHistory}
            isPending={consultMutation.isPending}
            pendingLabel="AI 正在分析需求並套用 builder 規則..."
            emptyStateText={
                props.currentBuilder
                    ? `開始使用「${props.currentBuilder.name}」進行 consult。你可以輸入需求，或直接送出使用預設內容。`
                    : '輸入需求或上傳附件後送出，開始進行 consult。'
            }
            footer={footer}
            headerAction={headerAction}
        />
    );
}

function AstrologyProfileScreen(props: BuilderScreenProps) {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [text, setText] = useState(DEFAULT_ASTROLOGY_TEXT);
    const [slots, setSlots] = useState<AstrologyFormState>(createDefaultAstrologyState);
    const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
    const profileConsultMutation = useProfileConsult();
    const slotErrors = useMemo(() => buildAstrologySlotErrors(slots), [slots]);
    const submitDisabled = profileConsultMutation.isPending || props.isInvalidBuilder;

    const switchToWeighted = (slotKey: AstrologySlotKey) => {
        setSlots((previous) => {
            const slotState = previous[slotKey];
            if (slotState.mode === 'weighted') {
                return previous;
            }
            return {
                ...previous,
                [slotKey]: createWeightedSlotState(slotState.value),
            };
        });
    };

    const switchToSingle = (slotKey: AstrologySlotKey) => {
        setSlots((previous) => ({
            ...previous,
            [slotKey]: { mode: 'single', value: UNKNOWN_ZODIAC_VALUE },
        }));
    };

    const updateSingleValue = (slotKey: AstrologySlotKey, value: AstrologySingleValue) => {
        setSlots((previous) => ({
            ...previous,
            [slotKey]: { mode: 'single', value },
        }));
    };

    const updateWeightedKey = (slotKey: AstrologySlotKey, entryIndex: 0 | 1, value: ZodiacKey) => {
        setSlots((previous) => {
            const slotState = previous[slotKey];
            if (slotState.mode !== 'weighted') {
                return previous;
            }

            const nextEntries = [...slotState.entries] as [AstrologyWeightedEntryState, AstrologyWeightedEntryState];
            nextEntries[entryIndex] = {
                ...nextEntries[entryIndex],
                key: value,
            };

            return {
                ...previous,
                [slotKey]: {
                    mode: 'weighted',
                    entries: nextEntries,
                },
            };
        });
    };

    const updateWeightedPercent = (slotKey: AstrologySlotKey, entryIndex: 0 | 1, nextValue: string) => {
        setSlots((previous) => {
            const slotState = previous[slotKey];
            if (slotState.mode !== 'weighted') {
                return previous;
            }

            const nextEntries = [...slotState.entries] as [AstrologyWeightedEntryState, AstrologyWeightedEntryState];
            const sanitizedValue = nextValue.replace(/[^\d]/g, '').slice(0, 3);
            nextEntries[entryIndex] = {
                ...nextEntries[entryIndex],
                weightPercent: sanitizedValue,
            };

            if (sanitizedValue !== '') {
                const numericValue = Number(sanitizedValue);
                if (Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 100) {
                    const complementIndex = entryIndex === 0 ? 1 : 0;
                    nextEntries[complementIndex] = {
                        ...nextEntries[complementIndex],
                        weightPercent: String(100 - numericValue),
                    };
                }
            }

            return {
                ...previous,
                [slotKey]: {
                    mode: 'weighted',
                    entries: nextEntries,
                },
            };
        });
    };

    const handleSubmit = async () => {
        if (submitDisabled) {
            return;
        }

        const currentSlotErrors = buildAstrologySlotErrors(slots);
        if (Object.values(currentSlotErrors).some(Boolean)) {
            toast.error('請先修正星座設定。');
            return;
        }

        const payload = buildAstrologyPayload(slots);
        const userMessageId = createMessageId();
        const userContent = buildAstrologyUserMessageContent(slots, text);

        setChatHistory((previous) => [
            ...previous,
            {
                id: userMessageId,
                role: 'user',
                content: userContent,
                deliveryStatus: 'pending',
            },
        ]);

        try {
            const response = await profileConsultMutation.mutateAsync({
                builderId: props.builderId,
                text: text.trim(),
                payload,
            });

            setText(DEFAULT_ASTROLOGY_TEXT);
            setChatHistory((previous) => [
                ...previous.map((message) => (
                    message.id === userMessageId
                        ? { ...message, deliveryStatus: 'success' as const }
                        : message
                )),
                {
                    id: createMessageId(),
                    role: 'assistant',
                    content: buildAssistantMessageContent(response.response, response.statusAns),
                    file: response.file ?? undefined,
                    deliveryStatus: response.status ? 'success' : 'error',
                    businessStatus: response.status,
                    statusAns: response.statusAns,
                },
            ]);

            if (response.status) {
                toast.success('星座 profile 已送出');
            } else {
                toast.error(response.statusAns || '本次請求未通過業務規則');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '請求失敗';

            setChatHistory((previous) => previous.map((messageItem) => (
                messageItem.id === userMessageId
                    ? { ...messageItem, deliveryStatus: 'error' as const }
                    : messageItem
            )));
            toast.error(message);
        }
    };

    const topPanel = (
        <div className="mx-auto w-full max-w-5xl">
            <div className="rounded-2xl border bg-background/95 shadow-sm">
                <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold">星座設定</p>
                        <p className="text-xs text-muted-foreground">
                            先調整太陽、月亮、上升；中間區域只拿來看對話，底部固定輸入需求。
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsConfigCollapsed((previous) => !previous)}
                        >
                            {isConfigCollapsed ? '展開設定' : '收合設定'}
                        </Button>
                    </div>
                </div>

                {isConfigCollapsed ? (
                    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                        {(Object.keys(ASTROLOGY_SLOT_LABELS) as AstrologySlotKey[]).map((slotKey) => (
                            <div key={slotKey} className="rounded-xl border bg-muted/20 px-3 py-2">
                                <p className="text-xs text-muted-foreground">{ASTROLOGY_SLOT_LABELS[slotKey]}</p>
                                <p className="mt-1 text-sm font-medium">{describeAstrologySlot(slots[slotKey])}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-3 p-4 lg:grid-cols-3">
                        {(Object.keys(ASTROLOGY_SLOT_LABELS) as AstrologySlotKey[]).map((slotKey) => {
                            const slotState = slots[slotKey];
                            const slotError = slotErrors[slotKey];

                            return (
                                <div key={slotKey} className="rounded-xl border bg-muted/20 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label className="text-sm font-medium">{ASTROLOGY_SLOT_LABELS[slotKey]}</Label>
                                        {slotState.mode === 'single' ? (
                                            <Button type="button" variant="outline" size="sm" onClick={() => switchToWeighted(slotKey)}>
                                                <Plus className="h-3.5 w-3.5" />
                                                混合
                                            </Button>
                                        ) : (
                                            <Button type="button" variant="outline" size="sm" onClick={() => switchToSingle(slotKey)}>
                                                <Minus className="h-3.5 w-3.5" />
                                                單一
                                            </Button>
                                        )}
                                    </div>

                                    <div className="mt-2 space-y-2">
                                        {slotState.mode === 'single' ? (
                                            <Select
                                                value={slotState.value}
                                                onValueChange={(value) => updateSingleValue(slotKey, (value as AstrologySingleValue) ?? UNKNOWN_ZODIAC_VALUE)}
                                            >
                                                <SelectTrigger className="h-9 w-full">
                                                    <SelectValue placeholder="不知道（預設）" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={UNKNOWN_ZODIAC_VALUE}>不知道（預設）</SelectItem>
                                                    {ZODIAC_OPTIONS.map((option) => (
                                                        <SelectItem key={option.key} value={option.key}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="space-y-2">
                                                {slotState.entries.map((entry, entryIndex) => (
                                                    <div key={`${slotKey}-${entryIndex}`} className="grid gap-2 grid-cols-[minmax(0,1fr)_80px]">
                                                        <Select
                                                            value={entry.key}
                                                            onValueChange={(value) => updateWeightedKey(slotKey, entryIndex as 0 | 1, value as ZodiacKey)}
                                                        >
                                                            <SelectTrigger className="h-9 w-full">
                                                                <SelectValue placeholder="選擇星座" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ZODIAC_OPTIONS.map((option) => (
                                                                    <SelectItem key={option.key} value={option.key}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={entry.weightPercent}
                                                            onChange={(event) => updateWeightedPercent(slotKey, entryIndex as 0 | 1, event.target.value)}
                                                            className="h-9"
                                                            placeholder="%"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {slotError ? (
                                            <p className="text-xs text-destructive">{slotError}</p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                {slotState.mode === 'single' ? '未提供就不送這個欄位。' : '第二格百分比會自動互補。'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const footer = (
        <div className="mx-auto max-w-5xl space-y-2">
            <div className="flex items-end gap-3 rounded-2xl border bg-background p-3 shadow-sm">
                <Textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="輸入需求，送出後會用固定 profile-consult envelope 模擬..."
                    className="min-h-[72px] flex-1 resize-none border-0 px-2 py-3 shadow-none focus-visible:ring-0"
                    disabled={profileConsultMutation.isPending}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            void handleSubmit();
                        }
                    }}
                />
                <Button type="button" onClick={() => void handleSubmit()} disabled={submitDisabled} className="shrink-0">
                    <Send className="h-4 w-4" />
                    送出 profile consult
                </Button>
            </div>
            <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
                <span>回傳模式由後端啟動設定控制。混合模式會自動互補百分比；兩個星座不可重複。</span>
                <span>快捷鍵：Ctrl/Cmd + Enter</span>
            </div>
        </div>
    );

    return (
        <ConversationLayout
            {...props}
            chatHistory={chatHistory}
            isPending={profileConsultMutation.isPending}
            pendingLabel="AI 正在分析星座骨架並產生回應..."
            emptyStateText="設定太陽、月亮、上升與需求後送出，開始模擬 astrology profile consult。"
            topPanel={topPanel}
            footer={footer}
            showHeader={false}
        />
    );
}
