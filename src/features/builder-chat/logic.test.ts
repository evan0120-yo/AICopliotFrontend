import { describe, expect, it } from 'vitest';

import {
    buildAstrologyPayload,
    buildAstrologySlotErrors,
    createDefaultAstrologyState,
    createWeightedSlotState,
    normalizeLineTaskReferenceTime,
    resolveBuilderScreenVariant,
} from './logic';

describe('resolveBuilderScreenVariant', () => {
    it('returns line_task_extract for line task builder code', () => {
        expect(resolveBuilderScreenVariant(4, {
            builderId: 4,
            builderCode: 'line-memo-crud',
            groupLabel: '',
            name: '',
            description: '',
            includeFile: false,
        })).toBe('line_task_extract');
    });

    it('returns astrology_profile for known astrology builder', () => {
        expect(resolveBuilderScreenVariant(3)).toBe('astrology_profile');
        expect(resolveBuilderScreenVariant(10, {
            builderId: 10,
            builderCode: 'linkchat-astrology',
            groupLabel: '',
            name: '',
            description: '',
            includeFile: false,
        })).toBe('astrology_profile');
    });

    it('falls back to generic_consult', () => {
        expect(resolveBuilderScreenVariant(2, {
            builderId: 2,
            builderCode: 'pm-estimate',
            groupLabel: '',
            name: '',
            description: '',
            includeFile: false,
        })).toBe('generic_consult');
    });
});

describe('normalizeLineTaskReferenceTime', () => {
    it('normalizes datetime-local format', () => {
        expect(normalizeLineTaskReferenceTime('2026-04-15T09:30')).toBe('2026-04-15 09:30:00');
    });

    it('normalizes space separated format', () => {
        expect(normalizeLineTaskReferenceTime('2026-04-15 09:30')).toBe('2026-04-15 09:30:00');
    });

    it('returns empty string for blank input', () => {
        expect(normalizeLineTaskReferenceTime('   ')).toBe('');
    });

    it('returns original text when date parsing fails', () => {
        expect(normalizeLineTaskReferenceTime('tomorrow afternoon')).toBe('tomorrow afternoon');
    });
});

describe('astrology payload helpers', () => {
    it('omits unknown slots and keeps weighted entries', () => {
        const state = createDefaultAstrologyState();
        state.sun_sign = { mode: 'single', value: 'capricorn' };
        state.moon_sign = createWeightedSlotState('pisces');

        const payload = buildAstrologyPayload(state);

        expect(payload).toEqual({
            sun_sign: ['capricorn'],
            moon_sign: [
                { key: 'pisces', weightPercent: 50 },
                { key: 'aries', weightPercent: 50 },
            ],
        });
        expect(payload).not.toHaveProperty('rising_sign');
    });

    it('reports duplicate zodiac and invalid sum errors', () => {
        const state = createDefaultAstrologyState();
        state.sun_sign = {
            mode: 'weighted',
            entries: [
                { key: 'aries', weightPercent: '60' },
                { key: 'aries', weightPercent: '40' },
            ],
        };
        state.moon_sign = {
            mode: 'weighted',
            entries: [
                { key: 'pisces', weightPercent: '20' },
                { key: 'leo', weightPercent: '20' },
            ],
        };

        const errors = buildAstrologySlotErrors(state);

        expect(errors.sun_sign).toBe('兩個星座不可重複。');
        expect(errors.moon_sign).toBe('兩個百分比相加必須等於 100。');
    });

    it('returns no errors for valid state', () => {
        const state = createDefaultAstrologyState();
        state.rising_sign = createWeightedSlotState('aquarius');

        expect(buildAstrologySlotErrors(state)).toEqual({});
    });
});

