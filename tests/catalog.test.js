import { __ } from '@wordpress/i18n'
import schema from '../includes/animation-schema.json'
import {
	ANIMATIONS, VARIATIONS, EASINGS, ANCHOR_PLACEMENTS,
	ANIMATION_INHERIT, ANIMATION_DEFAULT,
} from '../src/aos-data'
import { getAnimationProps } from '../src/utils'

jest.mock('@wordpress/i18n', () => ({
	__: jest.fn(text => `translated:${text}`),
}))

const values = options => options.map(option => option.value)
const expectUnique = items => expect(new Set(items).size).toBe(items.length)

test('the editor lists every schema animation exactly once, keeping its visual order', () => {
	const animations = values(ANIMATIONS)
	expectUnique(animations)
	expect([...animations].sort()).toEqual(Object.keys(schema.variations).sort())
	expect(Object.keys(VARIATIONS).sort()).toEqual(Object.keys(schema.variations).sort())
	expect(animations).toEqual(['curtain', 'fade', 'flip', 'slide', 'zoom', 'scale'])
})

test.each(Object.keys(schema.variations))('%s variants match the schema, including their default order', animation => {
	const variants = values(VARIATIONS[animation])
	expect(variants.length).toBeGreaterThan(0)
	expectUnique(variants)
	expect(variants).toEqual(schema.variations[animation])
})

test.each([
	['easings', EASINGS],
	['anchorPlacements', ANCHOR_PLACEMENTS],
])('%s options match the schema in order without duplicates', (key, options) => {
	expectUnique(values(options))
	expect(values(options)).toEqual(schema[key])
})

test('catalog labels use the plugin translation domain and keep IDs independent', () => {
	const options = [ANIMATIONS, ...Object.values(VARIATIONS), EASINGS, ANCHOR_PLACEMENTS, ANIMATION_INHERIT, ANIMATION_DEFAULT].flat()
	for (const option of options) {
		expect(option.label).toMatch(/^translated:.+/)
		expect(option.value).not.toContain('translated:')
	}
	expect(__.mock.calls.length).toBeGreaterThanOrEqual(options.length)
	for (const [text, domain] of __.mock.calls) {
		expect(typeof text).toBe('string')
		expect(domain).toBe('animations-for-blocks')
	}
})

test('every supported animation and variant preserves its data-aos identifier', () => {
	for (const [animation, variants] of Object.entries(schema.variations)) {
		for (const variation of variants) {
			const expected = animation === variation ? animation : `${animation}-${variation}`
			expect(getAnimationProps({ animation, variation })['data-aos']).toBe(expected)
		}
	}
})

test('dynamic and disabled entries keep their existing serialization rules', () => {
	for (const animation of ['', 'none', undefined, 'default', 'inherit']) {
		expect(getAnimationProps({ animation })).toEqual({})
	}
	expect(getAnimationProps({ animation: 'fade', variation: 'up', pageIds: [123] })).toEqual({})
})
