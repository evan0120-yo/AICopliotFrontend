'use client';

import { BuilderGraphEditor } from '@/components/features/builder-graph/builder-graph-editor';

export default function NewBuilderGraphPage() {
    return <BuilderGraphEditor builderId={Number.NaN} builderIdParam="new" isCreateMode />;
}
