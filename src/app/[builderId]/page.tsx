'use client';

import { use, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Menu, Minus, Paperclip, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useConsult } from '@/hooks/useConsult';
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
const UNKNOWN_ZODIAC_VALUE = 'unknown';

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
type BuilderScreenVariant = 'generic_consult' | 'astrology_profile';
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
type ConversationLayoutProps = BuilderScreenProps & {
    chatHistory: ChatMessage[];
    isPending: boolean;
    pendingLabel: string;
    emptyStateText: string;
    footer: React.ReactNode;
    headerAction?: React.ReactNode;
    footerMode?: 'docked' | 'inline';
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
    return response.trim() || statusAns || '系統未提供額外內容。';
}

function resolveBuilderScreenVariant(builderId: number, currentBuilder?: BuilderSummary): BuilderScreenVariant {
    if (builderId === ASTROLOGY_BUILDER_ID || currentBuilder?.builderCode === ASTROLOGY_BUILDER_CODE) {
        return 'astrology_profile';
    }
    return 'generic_consult';
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
    headerAction,
    footerMode = 'docked',
}: ConversationLayoutProps) {
    return (
        <div className="relative flex h-full min-h-0 flex-col bg-background">
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

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 scroll-smooth md:p-8">
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

                {chatHistory.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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

                {footerMode === 'inline' ? (
                    <div className="pt-2">
                        {footer}
                    </div>
                ) : null}
            </div>

            {footerMode === 'docked' ? (
                <div className="border-t bg-card/50 p-4 pb-6 backdrop-blur">
                    {footer}
                </div>
            ) : null}
        </div>
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
    const [text, setText] = useState('');
    const [slots, setSlots] = useState<AstrologyFormState>(createDefaultAstrologyState);
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

            setText('');
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

    const footer = (
        <div className="mx-auto max-w-4xl space-y-4">
            <div className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="space-y-4">
                    {(Object.keys(ASTROLOGY_SLOT_LABELS) as AstrologySlotKey[]).map((slotKey) => {
                        const slotState = slots[slotKey];
                        const slotError = slotErrors[slotKey];

                        return (
                            <div key={slotKey} className="space-y-2">
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

                                {slotState.mode === 'single' ? (
                                    <Select
                                        value={slotState.value}
                                        onValueChange={(value) => updateSingleValue(slotKey, (value as AstrologySingleValue) ?? UNKNOWN_ZODIAC_VALUE)}
                                    >
                                        <SelectTrigger className="h-10 w-full">
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
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)_112px]">
                                        {slotState.entries.map((entry, entryIndex) => (
                                            <div key={`${slotKey}-${entryIndex}`} className="contents">
                                                <Select
                                                    value={entry.key}
                                                    onValueChange={(value) => updateWeightedKey(slotKey, entryIndex as 0 | 1, value as ZodiacKey)}
                                                >
                                                    <SelectTrigger className="h-10 w-full">
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
                                                    className="h-10"
                                                    placeholder="%"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {slotError ? (
                                    <p className="text-xs text-destructive">{slotError}</p>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-2">
                <Textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="輸入需求，送出後會用固定 profile-consult envelope 模擬..."
                    className="min-h-[120px] resize-y"
                    disabled={profileConsultMutation.isPending}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            void handleSubmit();
                        }
                    }}
                />
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>混合模式會自動互補百分比；兩個星座不可重複。</span>
                    <Button type="button" onClick={() => void handleSubmit()} disabled={submitDisabled}>
                        <Send className="h-4 w-4" />
                        送出 profile consult
                    </Button>
                </div>
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
            footer={footer}
            footerMode="inline"
        />
    );
}
