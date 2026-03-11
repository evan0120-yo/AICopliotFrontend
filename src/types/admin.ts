// ─── Backend Response DTOs ───

export interface BuilderGraphBuilderResponse {
    builderId: number;
    builderCode: string;
    groupKey?: string | null;
    groupLabel: string;
    name: string;
    description: string;
    includeFile: boolean;
    defaultOutputFormat: string | null;
    filePrefix: string;
    active: boolean;
}

export interface BuilderGraphRagResponse {
    ragId: number;
    ragType: string;
    title: string;
    content: string;
    orderNo: number;
    overridable: boolean;
    retrievalMode: string;
}

export interface BuilderGraphSourceResponse {
    sourceId: number;
    templateId?: number | null;
    templateKey?: string | null;
    templateName?: string | null;
    templateDescription?: string | null;
    templateGroupKey?: string | null;
    typeCode: string;
    orderNo: number;
    prompts: string;
    rag: BuilderGraphRagResponse[];
}

export interface BuilderGraphResponse {
    builder: BuilderGraphBuilderResponse;
    sources: BuilderGraphSourceResponse[];
}

// ─── Backend Request DTOs ───

export interface BuilderGraphBuilderRequest {
    builderCode?: string;
    groupKey?: string;
    groupLabel?: string;
    name?: string;
    description?: string;
    includeFile?: boolean;
    defaultOutputFormat?: string;
    filePrefix?: string;
    active?: boolean;
}

export interface BuilderGraphRagRequest {
    ragType?: string;
    title?: string;
    content: string;
    orderNo?: number;
    overridable?: boolean;
    retrievalMode?: string;
}

export interface BuilderGraphSourceRequest {
    templateId?: number;
    templateKey?: string;
    templateName?: string;
    templateDescription?: string;
    templateGroupKey?: string;
    typeCode?: string;
    orderNo?: number;
    prompts: string;
    rag?: BuilderGraphRagRequest[];
}

export interface BuilderGraphRequest {
    builder?: BuilderGraphBuilderRequest;
    sources: BuilderGraphSourceRequest[];
}

export interface BuilderTemplateRagResponse {
    templateRagId: number;
    ragType: string;
    title: string;
    content: string;
    orderNo: number;
    overridable: boolean;
    retrievalMode: string;
}

export interface BuilderTemplateResponse {
    templateId: number;
    templateKey: string;
    name: string;
    description: string;
    groupKey?: string | null;
    typeCode: string;
    prompts: string;
    active: boolean;
    rag: BuilderTemplateRagResponse[];
}

export interface BuilderTemplateRagRequest {
    ragType?: string;
    title?: string;
    content: string;
    orderNo?: number;
    overridable?: boolean;
    retrievalMode?: string;
}

export interface BuilderTemplateRequest {
    templateKey?: string;
    name: string;
    description?: string;
    groupKey?: string;
    typeCode?: string;
    prompts?: string;
    active?: boolean;
    rag?: BuilderTemplateRagRequest[];
}

// ─── Form Values ───

export interface RagFormValues {
    ragType: string;
    title: string;
    content: string;
    overridable: boolean;
}

export interface SourceFormValues {
    templateId?: number;
    typeCode: string;
    prompts: string;
    templateKey?: string;
    templateName?: string;
    templateDescription?: string;
    templateGroupKey?: string;
    rag: RagFormValues[];
}

export interface TemplateFormValues {
    templateId?: number;
    templateKey: string;
    name: string;
    description: string;
    groupKey: string;
    typeCode: string;
    prompts: string;
    active: boolean;
    rag: RagFormValues[];
}

export interface BuilderFormValues {
    builderCode: string;
    groupKey?: string;
    name: string;
    groupLabel: string;
    description: string;
    includeFile: boolean;
    defaultOutputFormat: string;
    filePrefix: string;
    active: boolean;
}

export interface GraphFormValues {
    builder: BuilderFormValues;
    sources: SourceFormValues[];
}
