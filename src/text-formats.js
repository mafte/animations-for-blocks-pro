import { registerFormatType, applyFormat, removeFormat, getActiveFormat, useAnchor } from '@wordpress/rich-text'
import { RichTextToolbarButton } from '@wordpress/block-editor'
import { Button, SelectControl, TextControl, ToggleControl, Notice, Popover } from '@wordpress/components'
import { useState, useRef } from '@wordpress/element'
import { useSelect } from '@wordpress/data'
import { __ } from '@wordpress/i18n'
import schema from '../includes/animation-schema.json'
import { animateFragment } from './text-runtime'
import { counterConfig } from './counter-config'

const name = 'anfb/text'
const defaults = { effect: 'typing', duration: 1200, delay: 0, cursor: false }

function Edit({ isActive, value, onChange, contentRef }) {
	const block = useSelect(select => select('core/block-editor').getSelectedBlock(), [])
	const [open, setOpen] = useState(false)
	const [config, setConfig] = useState(defaults)
	const [error, setError] = useState('')
	const previewRef = useRef(null)
	const anchor = useAnchor({ editableContentElement: contentRef.current, settings: { name, tagName: 'span', className: 'anfb-text', isActive } })
	if (!schema.textBlocks.includes(block?.name) || block?.attributes?.metadata?.bindings || /\{\{.*?\}\}/s.test(block?.attributes?.content || '')) return null
	const update = (key, newValue) => setConfig(current => ({ ...current, [key]: newValue }))
	const show = () => {
		try { setConfig(JSON.parse(getActiveFormat(value, name)?.attributes?.config || JSON.stringify(defaults))) }
		catch { setConfig(defaults) }
		setError('')
		setOpen(!open)
	}
	const selection = () => {
		let start = value.start, end = value.end
		if (start === end && isActive) {
			const format = getActiveFormat(value, name)
			while (start > 0 && value.formats[start - 1]?.includes(format)) start--
			while (end < value.text.length && value.formats[end]?.includes(format)) end++
		}
		if (start === end) throw new Error(__('Select the text to animate.', 'animations-for-blocks'))
		return { start, end }
	}
	const configuredSelection = () => {
		const { start, end } = selection()
		const duration = Number(config.duration), delay = Number(config.delay ?? 0)
		if (!Number.isInteger(duration) || duration < 1 || duration > 60000 || !Number.isInteger(delay) || delay < 0 || delay > 60000) throw new Error(__('Use a duration of 1–60000 ms and delay of 0–60000 ms.', 'animations-for-blocks'))
		let next = { effect: config.effect, duration, delay }
		if (config.effect === 'words-up') { next.startWithBlock = !!config.startWithBlock; next.distance = Number(config.distance ?? 12); next.mobileDistance = Number(config.mobileDistance ?? 8); if (![next.distance, next.mobileDistance].every(value => Number.isInteger(value) && value >= 0 && value <= 200)) throw new Error(__('Distance must be 0–200 px.', 'animations-for-blocks')) }
		if (config.effect === 'typing') next.cursor = !!config.cursor
		if (config.effect === 'count') {
			try { next = { ...next, ...counterConfig(value.text.slice(start, end)), start: config.start ?? 0 } }
			catch { throw new Error(__('Select one number with its format, for example 1.250,50 or 98%.', 'animations-for-blocks')) }
		}
		return { start, end, next }
	}
	const apply = () => {
		try {
			const { start, end, next } = configuredSelection()
			const selectedFormats = value.formats.slice(start, end).flat().filter(Boolean).filter(format => format.type === name)
			for (const format of selectedFormats) {
				if (value.formats[start - 1]?.includes(format) || value.formats[end]?.includes(format)) throw new Error(__('Select the entire existing effect before replacing it.', 'animations-for-blocks'))
			}
			onChange(applyFormat(removeFormat(value, name, start, end), { type: name, attributes: { config: JSON.stringify(next) } }, start, end))
			setOpen(false)
		} catch (error) { setError(error.message) }
	}
	const preview = () => {
		try {
			const { start, end, next } = configuredSelection()
			const element = previewRef.current.ownerDocument.createElement('span')
			element.className = 'anfb-text'
			element.textContent = value.text.slice(start, end)
			element.dataset.anfb = JSON.stringify(next)
			previewRef.current.replaceChildren(element)
			setError('')
			animateFragment(element, { preview: true })
		} catch (error) { setError(error.message) }
	}

	return <>
		<RichTextToolbarButton icon="editor-textcolor" title={__('Text animation', 'animations-for-blocks')} onClick={show} isActive={isActive} />
		{open && <Popover anchor={anchor} placement="bottom" shift resize={false} onClose={() => setOpen(false)}>
			<div style={{ padding: 16, minWidth: 280, maxHeight: '65vh', overflow: 'auto' }}>
				{error && <Notice status="error" isDismissible={false}>{error}</Notice>}
				<SelectControl label={__('Effect', 'animations-for-blocks')} value={config.effect} options={[{ label: __('Typing', 'animations-for-blocks'), value: 'typing' }, { label: __('Reveal words', 'animations-for-blocks'), value: 'words' }, { label: __('Smooth words', 'animations-for-blocks'), value: 'words-up' }, { label: __('Counter', 'animations-for-blocks'), value: 'count' }]} onChange={effect => update('effect', effect)} />
				{(config.effect === 'count' ? ['duration'] : ['duration', 'delay']).map(key => <TextControl key={key} label={key === 'duration' ? __('Duration (ms)', 'animations-for-blocks') : __('Delay (ms)', 'animations-for-blocks')} type="number" value={config[key]} onChange={newValue => update(key, newValue)} />)}
				{config.effect === 'words-up' && ['distance', 'mobileDistance'].map(key => <TextControl key={key} label={key === 'distance' ? __('Distance (px)', 'animations-for-blocks') : __('Mobile distance (px)', 'animations-for-blocks')} type="number" min={0} max={200} value={config[key] ?? (key === 'distance' ? 12 : 8)} onChange={value => update(key, value)} />)}
				{config.effect === 'words-up' && <ToggleControl label={__('Start during block entrance', 'animations-for-blocks')} checked={!!config.startWithBlock} onChange={value => update('startWithBlock', value)} />}
				{config.effect === 'typing' && <ToggleControl label={__('Show cursor', 'animations-for-blocks')} checked={!!config.cursor} onChange={cursor => update('cursor', cursor)} />}
				{config.effect === 'count' && <p>{__('Counts to the selected number, preserving its format.', 'animations-for-blocks')}</p>}
				<Button variant="primary" onClick={apply}>{__('Apply', 'animations-for-blocks')}</Button>
				<Button onClick={() => { onChange(removeFormat(value, name)); setOpen(false) }}>{__('Remove', 'animations-for-blocks')}</Button>
				<Button onClick={preview}>{__('Preview', 'animations-for-blocks')}</Button>
				<div ref={previewRef} aria-label={__('Animation preview', 'animations-for-blocks')} />
			</div>
		</Popover>}
	</>
}

registerFormatType(name, { title: __('Text animation', 'animations-for-blocks'), tagName: 'span', className: 'anfb-text', attributes: { config: 'data-anfb' }, edit: Edit })
