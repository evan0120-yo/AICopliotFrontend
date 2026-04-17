import type { BuilderSummary, ProfileConsultRequestData, WeightedZodiacEntry, ZodiacKey } from '../../types/api';

export const ASTROLOGY_BUILDER_ID = 3;
export const ASTROLOGY_BUILDER_CODE = 'linkchat-astrology';
export const LINE_TASK_BUILDER_CODE = 'line-memo-crud';
export const UNKNOWN_ZODIAC_VALUE = 'unknown';
export const DEFAULT_ASTROLOGY_TEXT = '請分析這個人的核心性格與外在社交表現。';
export const DEFAULT_LINE_TASK_APP_ID = '';

export type BuilderScreenVariant = 'generic_consult' | 'astrology_profile' | 'line_task_extract';
export type AstrologySlotKey = 'sun_sign' | 'moon_sign' | 'rising_sign';
export type AstrologySingleValue = ZodiacKey | typeof UNKNOWN_ZODIAC_VALUE;
export type AstrologyWeightedEntryState = {
    key: ZodiacKey;
    weightPercent: string;
};
export type AstrologySlotState =
    | {
          mode: 'single';
          value: AstrologySingleValue;
      }
    | {
          mode: 'weighted';
          entries: [AstrologyWeightedEntryState, AstrologyWeightedEntryState];
      };
export type AstrologyFormState = Record<AstrologySlotKey, AstrologySlotState>;
export type SlotErrorMap = Partial<Record<AstrologySlotKey, string>>;

export const ASTROLOGY_SLOT_LABELS: Record<AstrologySlotKey, string> = {
    sun_sign: '太陽',
    moon_sign: '月亮',
    rising_sign: '上升',
};

export const ZODIAC_OPTIONS: Array<{ key: ZodiacKey; label: string }> = [
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

export function resolveBuilderScreenVariant(builderID: number, currentBuilder?: BuilderSummary): BuilderScreenVariant {
    if (currentBuilder?.builderCode === LINE_TASK_BUILDER_CODE) {
        return 'line_task_extract';
    }
    if (builderID === ASTROLOGY_BUILDER_ID || currentBuilder?.builderCode === ASTROLOGY_BUILDER_CODE) {
        return 'astrology_profile';
    }
    return 'generic_consult';
}

function padDatePart(value: number) {
    return value.toString().padStart(2, '0');
}

export function formatDateTimeLocalValue(date: Date) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

export function normalizeLineTaskReferenceTime(value: string) {
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

export function defaultLineTaskTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei';
}

export function getZodiacLabel(key: ZodiacKey) {
    return ZODIAC_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export function getNextDifferentZodiac(first: ZodiacKey) {
    return ZODIAC_OPTIONS.find((option) => option.key !== first)?.key ?? 'taurus';
}

export function createDefaultAstrologyState(): AstrologyFormState {
    return {
        sun_sign: { mode: 'single', value: UNKNOWN_ZODIAC_VALUE },
        moon_sign: { mode: 'single', value: UNKNOWN_ZODIAC_VALUE },
        rising_sign: { mode: 'single', value: UNKNOWN_ZODIAC_VALUE },
    };
}

export function createWeightedSlotState(previousValue: AstrologySingleValue): AstrologySlotState {
    const firstKey = previousValue !== UNKNOWN_ZODIAC_VALUE ? previousValue : 'aries';
    return {
        mode: 'weighted',
        entries: [
            { key: firstKey, weightPercent: '50' },
            { key: getNextDifferentZodiac(firstKey), weightPercent: '50' },
        ],
    };
}

export function buildAstrologyPayload(state: AstrologyFormState): ProfileConsultRequestData['payload'] {
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

export function getAstrologySlotError(slotState: AstrologySlotState) {
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

export function buildAstrologySlotErrors(state: AstrologyFormState): SlotErrorMap {
    const errors: SlotErrorMap = {};
    (Object.keys(state) as AstrologySlotKey[]).forEach((slotKey) => {
        const error = getAstrologySlotError(state[slotKey]);
        if (error) {
            errors[slotKey] = error;
        }
    });
    return errors;
}

export function describeAstrologySlot(slotState: AstrologySlotState) {
    if (slotState.mode === 'single') {
        return slotState.value === UNKNOWN_ZODIAC_VALUE ? '不知道' : getZodiacLabel(slotState.value);
    }

    return slotState.entries
        .map((entry) => `${getZodiacLabel(entry.key)} ${entry.weightPercent || '0'}%`)
        .join(' / ');
}

