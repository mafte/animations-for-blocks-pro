import * as React from 'react'
import { createRoot } from '@wordpress/element'
import AnimationControl from '../src/animation-control'
import { ANIMATIONS, VARIATIONS } from '../src/aos-data'

// Exercise our controls and handlers without depending on WordPress primitive markup.
jest.mock('@wordpress/components', () => {
	const React = require('react')
	const Container = ({ children }) => <div>{children}</div>
	const Empty = () => null
	return {
		BaseControl: Container,
		Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
		TextControl: ({ label }) => <label>{label}</label>,
		ToggleControl: Empty, RangeControl: Empty, Icon: Empty,
		__experimentalUnitControl: Empty,
		__experimentalVStack: Container, __experimentalHStack: Container,
	}
})

let container, root, onChange

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true })
beforeEach(() => {
	container = document.createElement('div')
	document.body.append(container)
	root = createRoot(container)
	onChange = jest.fn()
})
afterEach(() => {
	React.act(() => root.unmount())
	container.remove()
})
afterAll(() => { delete globalThis.IS_REACT_ACT_ENVIRONMENT })

function render(value, props = {}) {
	React.act(() => root.render(<AnimationControl value={value} onChange={onChange} {...props} />))
}

function click(label) {
	const button = [...container.querySelectorAll('button')].find(element => element.textContent === label)
	expect(button).toBeDefined()
	React.act(() => button.click())
}

test('switching families preserves a compatible variation and other settings', () => {
	render({ animation: 'fade', variation: 'left', duration: 850, distance: 24 })
	click('Slide')
	expect(onChange).toHaveBeenCalledWith({ animation: 'slide', variation: 'left', duration: 850, distance: 24 })
})

test.each(ANIMATIONS)('$value selects its first variation when the previous one is incompatible', ({ label, value }) => {
	render({ animation: 'none', variation: 'not-a-variant' })
	click(label)
	expect(onChange).toHaveBeenCalledWith({ animation: value, variation: VARIATIONS[value][0].value })
})

test('selecting the current animation again disables it while retaining its variation', () => {
	render({ animation: 'curtain', variation: 'right' })
	click('Curtain')
	expect(onChange).toHaveBeenCalledWith({ animation: '', variation: 'right' })
})

test('required selection prevents deselecting either an animation or its variation', () => {
	render({ animation: 'curtain', variation: 'right' }, { required: true })
	click('Curtain')
	click('Right')
	expect(onChange).not.toHaveBeenCalled()
})

test('a direction uses the existing variant group', () => {
	render({ animation: 'curtain', variation: 'right' })
	click('Left')
	expect(onChange).toHaveBeenCalledWith({ animation: 'curtain', variation: 'left' })
})

test('Default and Inherit are opt-in and retain their existing selection behavior', () => {
	const value = { animation: 'curtain', variation: 'right' }
	render(value)
	expect(container.textContent).not.toMatch(/Default|Inherit/)
	render(value, { allowDefault: true, allowInherit: true })
	click('Default')
	expect(onChange).toHaveBeenLastCalledWith({ animation: 'default', variation: '' })
	click('Inherit')
	expect(onChange).toHaveBeenLastCalledWith({ animation: 'inherit', variation: '' })
	render({ animation: 'inherit' }, { allowInherit: true })
	expect(container.textContent).toContain('Sequence order')
})

test.each([{}, { animation: 'none' }, { animation: 'default' }, { animation: 'inherit' }])('inactive and dynamic selections do not show concrete animation settings: %j', value => {
	render(value)
	expect(container.textContent).not.toContain('Advanced settings')
	expect(container.textContent).not.toContain('Distance (px)')
})

test('distance controls remain limited to supported families', () => {
	for (const { value } of ANIMATIONS) {
		render({ animation: value, variation: VARIATIONS[value][0].value })
		expect(container.textContent.includes('Distance (px)')).toBe(['fade', 'slide'].includes(value))
	}
})
