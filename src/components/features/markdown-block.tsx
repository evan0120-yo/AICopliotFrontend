'use client';

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsultFilePayload } from "@/types/api";

interface MarkdownBlockProps {
    content: string;
    file?: ConsultFilePayload;
}

export function MarkdownBlock({ content, file }: MarkdownBlockProps) {
    const handleDownload = () => {
        if (!file) return;

        try {
            const byteCharacters = atob(file.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: file.contentType });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading file:", error);
        }
    };

    return (
        <div className="w-full space-y-4 font-sans max-w-none prose prose-slate dark:prose-invert">
            <div className="bg-muted/30 rounded-lg p-6 overflow-x-auto text-sm md:text-base leading-relaxed break-words">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                        table: ({ ...props }) => (
                            <div className="overflow-x-auto my-4 overflow-y-hidden border rounded-md">
                                <table className="min-w-full text-left" {...props} />
                            </div>
                        ),
                        th: ({ ...props }) => <th className="bg-muted/50 px-4 py-2 border-b font-medium" {...props} />,
                        td: ({ ...props }) => <td className="px-4 py-2 border-b" {...props} />,
                        code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match && !className;
                            return isInline ? (
                                <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
                                    {children}
                                </code>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        pre: ({ ...props }) => (
                            <pre className="!bg-zinc-950 !text-zinc-50 p-4 rounded-md overflow-x-auto my-4 text-sm font-mono border" {...props} />
                        )
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>

            {file && (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">附件已產生</span>
                        <span className="text-xs text-muted-foreground">{file.fileName}</span>
                    </div>
                    <Button onClick={handleDownload} variant="secondary" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        下載檔案
                    </Button>
                </div>
            )}
        </div>
    );
}
