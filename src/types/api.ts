export interface ApiError {
    code: string;
    message: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface ConsultFilePayload {
    fileName: string;
    contentType: string;
    base64: string;
}

export interface ConsultBusinessResponse {
    status: boolean;
    statusAns: string;
    response: string;
    file?: ConsultFilePayload | null;
}

export interface BuilderSummary {
    builderId: number;
    builderCode: string;
    groupLabel: string;
    name: string;
    description: string;
    includeFile: boolean;
    defaultOutputFormat?: string | null;
}

export interface ConsultRequestData {
    builderId: number;
    text?: string;
    outputFormat?: string;
    files?: File[];
}
