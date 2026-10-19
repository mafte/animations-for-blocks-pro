import { createElement } from '@wordpress/element'
import { createBlock, getBlockType, parse, registerBlockType, serialize, unregisterBlockType } from '@wordpress/blocks'
import { create, insert, toHTMLString } from '@wordpress/rich-text'

// uuid 14 is ESM-only; client IDs do not affect persistence assertions.
jest.mock('uuid', () => ({ v4: () => 'deactivation-test-client-id' }))

// Load WordPress's own metadata registration hook, without the editor UI.
require(require.resolve('@wordpress/block-editor').replace(/index\.cjs$/, 'hooks/metadata.cjs'))

// Characterize WordPress APIs without registering any animation plugin filters.
// Native block-library serializers are verified separately in the real editor.
const names = ['core/paragraph', 'core/heading', 'core/group']
const metadata = {
	name: 'Retained editor name',
	anfb: { version: 1, entry: { animation: 'fade', variation: 'up' }, sequence: { enabled: true, interval: 100 } },
}
const html = 'Agua <strong>salud</strong> <a href="/proyectos/">comunidad</a> <span class="anfb-text" data-anfb="wave">voces ñ 🌊</span>'

beforeAll(() => {
	for (const [name, tag] of [['core/paragraph', 'p'], ['core/heading', 'h2']]) {
		registerBlockType(name, {
			apiVersion: 3, title: name, category: 'text',
			attributes: { content: { type: 'string', source: 'html', selector: tag } },
			save: ({ attributes }) => createElement(tag, { dangerouslySetInnerHTML: { __html: attributes.content } }),
		})
	}
	registerBlockType('core/group', {
		apiVersion: 3, title: 'Group', category: 'design',
		save: () => null,
	})
})
afterAll(() => names.forEach(name => unregisterBlockType(name)))

test.each(names)('%s retains animation metadata through disabled-plugin serialization', name => {
	expect(getBlockType(name).attributes.metadata).toEqual(expect.objectContaining({ type: 'object' }))
	const block = createBlock(name, { metadata, ...(name !== 'core/group' ? { content: html } : {}) })
	const saved = serialize(block)
	const [reopened] = parse(saved)
	expect(reopened.isValid).toBe(true)
	expect(reopened.attributes.metadata).toEqual(metadata)
	expect(serialize(reopened)).toBe(saved)
	expect(saved).not.toContain('data-aos')
})

test.each(['core/paragraph', 'core/heading'])('%s retains unregistered text format while editing inside and beside it', name => {
	let [block] = parse(serialize(createBlock(name, { metadata, content: html })))
	let value = create({ html: block.attributes.content })
	const inside = value.text.indexOf('voces') + 2
	const typed = create({ text: 'Z' })
	typed.formats[0] = value.formats[inside]
	value = insert(value, typed, inside, inside)
	value = insert(value, 'Antes ', 0, 0)
	value = insert(value, ' después', value.text.length, value.text.length)
	block.attributes.content = toHTMLString({ value })
	const [reopened] = parse(serialize(block))
	expect(reopened.isValid).toBe(true)
	expect(reopened.attributes.metadata).toEqual(metadata)
	const document = new DOMParser().parseFromString(reopened.attributes.content, 'text/html')
	expect(document.querySelector('.anfb-text').getAttribute('data-anfb')).toBe('wave')
	expect(document.querySelector('.anfb-text').textContent).toBe('voZces ñ 🌊')
	expect(document.querySelector('strong').textContent).toBe('salud')
	expect(document.querySelector('a').getAttribute('href')).toBe('/proyectos/')
	expect(document.body.textContent).toBe('Antes Agua salud comunidad voZces ñ 🌊 después')
})
