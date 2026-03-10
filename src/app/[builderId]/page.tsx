'use client';

import { use, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useConsult } from '@/hooks/useConsult';
import { useGetBuilders } from '@/hooks/useBuilders';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Loader2, Menu, Paperclip, Send } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { MarkdownBlock } from '@/components/features/markdown-block';
import { ConsultFilePayload } from '@/types/api';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
const FILE_ACCEPT_VALUE = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

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

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    file?: ConsultFilePayload;
    deliveryStatus?: 'pending' | 'success' | 'error';
    businessStatus?: boolean;
    statusAns?: string;
};

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

export default function BuilderChatPage({
    params,
}: {
    params: Promise<{ builderId: string }>;
}) {
    const { builderId: builderIdParam } = use(params);
    const builderId = Number.parseInt(builderIdParam, 10);

    // key forces React to remount and reset all state when builderId changes
    return <BuilderChat key={builderId} builderId={builderId} builderIdParam={builderIdParam} />;
}

function BuilderChat({
    builderId,
    builderIdParam,
}: {
    builderId: number;
    builderIdParam: string;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const consultMutation = useConsult();
    const {
        data: builders,
        isLoading: isBuildersLoading,
        isError: isBuildersError,
    } = useGetBuilders();
    const currentBuilder = builders?.find((builder) => builder.builderId === builderId);

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

    const onSubmit = async (data: FormValues) => {
        const userMessageId = createMessageId();
        const userContent = buildUserMessageContent(data.text);
        const submittedText = data.text.trim();
        const submittedFiles = data.files ? Array.from(data.files) : undefined;
        const submittedOutputFormat =
            currentBuilder?.includeFile && data.outputFormat && data.outputFormat !== 'default'
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
                builderId,
                text: submittedText,
                outputFormat: submittedOutputFormat,
                files: submittedFiles,
            });

            // Clear form only after success
            reset({
                text: '',
                outputFormat: currentBuilder?.includeFile ? selectedOutputFormat ?? 'default' : 'default',
                files: undefined,
            });

            setChatHistory((previous) => [
                ...previous.map((message) =>
                    message.id === userMessageId
                        ? { ...message, deliveryStatus: 'success' as const }
                        : message
                ),
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

            setChatHistory((previous) =>
                previous.map((chatMessage) =>
                    chatMessage.id === userMessageId
                        ? { ...chatMessage, deliveryStatus: 'error' as const }
                        : chatMessage
                )
            );
            toast.error(message);
        }
    };

    const showOutputFormat = currentBuilder?.includeFile ?? false;
    const isInvalidBuilder = Number.isNaN(builderId) || (!isBuildersLoading && !isBuildersError && !currentBuilder);
    const submitDisabled = consultMutation.isPending || isInvalidBuilder;

    return (
        <div className="relative flex h-full flex-col bg-background">
            <div className="z-10 flex items-center justify-between border-b bg-card p-4">
                <div className="flex items-center gap-3">
                    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                        <SheetTrigger
                            render={<Button variant="ghost" size="icon" className="md:hidden" />}
                        >
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

                {showOutputFormat ? (
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
                                    使用預設{currentBuilder?.defaultOutputFormat ? ` (${currentBuilder.defaultOutputFormat})` : ''}
                                </SelectItem>
                                <SelectItem value="markdown">Markdown</SelectItem>
                                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 scroll-smooth md:p-8">
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
                        {currentBuilder
                            ? `開始使用「${currentBuilder.name}」進行 consult。你可以輸入需求，或直接送出使用預設內容。`
                            : '輸入需求或上傳附件後送出，開始進行 consult。'}
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

                {consultMutation.isPending ? (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-3 rounded-xl border bg-transparent px-6 py-4 text-muted-foreground shadow-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">AI 正在分析需求並套用 builder 規則...</span>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="border-t bg-card/50 p-4 pb-6 backdrop-blur">
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

                        <Button
                            type="submit"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            disabled={submitDisabled}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>

                    {errors.text || errors.files ? (
                        <div className="px-2 text-xs text-destructive">
                            {errors.text?.message || errors.files?.message}
                        </div>
                    ) : null}
                </form>
            </div>
        </div>
    );
}
