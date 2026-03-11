'use client';

import { use } from 'react';
import { BuilderGraphEditor } from '@/components/features/builder-graph/builder-graph-editor';

export default function BuilderGraphPage({
    params,
}: {
    params: Promise<{ builderId: string }>;
}) {
    const { builderId: builderIdParam } = use(params);
    const builderId = Number.parseInt(builderIdParam, 10);

    return <BuilderGraphEditor builderId={builderId} builderIdParam={builderIdParam} />;
}
