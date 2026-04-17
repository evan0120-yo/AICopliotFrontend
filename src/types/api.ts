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

export type ZodiacKey =
    | 'aries'
    | 'taurus'
    | 'gemini'
    | 'cancer'
    | 'leo'
    | 'virgo'
    | 'libra'
    | 'scorpio'
    | 'sagittarius'
    | 'capricorn'
    | 'aquarius'
    | 'pisces';

export interface WeightedZodiacEntry {
    key: ZodiacKey;
    weightPercent: number;
}

export interface ProfileConsultRequestData {
    builderId: number;
    text?: string;
    payload: Record<string, string[] | WeightedZodiacEntry[]>;
}

export interface LineTaskConsultRequestData {
    appId?: string;
    builderId: number;
    messageText: string;
    referenceTime?: string;
    timeZone?: string;
    supportedTaskTypes?: string[];
}

export interface LineTaskConsultResponse {
    taskType: string;
    operation: 'create' | 'update' | 'delete' | 'query';
    eventId: string;
    summary: string;
    startAt: string;
    endAt: string;
    queryStartAt: string;
    queryEndAt: string;
    location: string;
    missingFields: string[];
}
