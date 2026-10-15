import { registerFormatType, applyFormat, removeFormat, getActiveFormat, useAnchor } from '@wordpress/rich-text'
import { RichTextToolbarButton } from '@wordpress/block-editor'
import { Button, SelectControl, TextControl, ToggleControl, Notice, Popover } from '@wordpress/components'
import { useState, useRef } from '@wordpress/element'
import { useSelect } from '@wordpress/data'
import { __ } from '@wordpress/i18n'
import schema from '../includes/animation-schema.json'
import { animateFragment } from './text-runtime'

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
	const apply = () => {
		const duration = Number(config.duration), delay = Number(config.delay)
		if (!Number.isInteger(duration) || duration < 1 || duration > 60000 || !Number.isInteger(delay) || delay < 0 || delay > 60000) return setError(__('Use a duration of 1–60000 ms and delay of 0–60000 ms.', 'animations-for-blocks'))
		let next = { effect: config.effect, duration, delay }
		if (config.effect === 'typing') next.cursor = !!config.cursor
		if (config.effect === 'count') {
			const end = Number(config.end), start = Number(config.start ?? 0), decimals = Number(config.decimals ?? 0)
			if (config.end === undefined || String(config.end).trim() === '' || !Number.isFinite(end) || !Number.isFinite(start) || Math.abs(end) > Number.MAX_SAFE_INTEGER || Math.abs(start) > Number.MAX_SAFE_INTEGER || !Number.isInteger(decimals) || decimals < 0 || decimals > 10) return setError(__('Enter explicit numeric start/end values and 0–10 decimals.', 'animations-for-blocks'))
			next = { ...next, start, end, decimals, decimal: config.decimal ?? '.', thousands: config.thousands ?? ',', prefix: config.prefix ?? '', suffix: config.suffix ?? '' }
			if (!next.decimal || next.decimal === next.thousands || ['decimal', 'thousands', 'prefix', 'suffix'].some(key => next[key].length > 100)) return setError(__('Use different separators and affixes up to 100 characters.', 'animations-for-blocks'))
		}
		let start = value.start, end = value.end
		if (start === end && isActive) {
			const format = getActiveFormat(value, name)
			while (start > 0 && value.formats[start - 1]?.includes(format)) start--
			while (end < value.text.length && value.formats[end]?.includes(format)) end++
		}
		if (start === end) return setError(__('Select the text to animate.', 'animations-for-blocks'))
		const selectedFormats = value.formats.slice(start, end).flat().filter(Boolean).filter(format => format.type === name)
		for (const format of selectedFormats) {
			if (value.formats[start - 1]?.includes(format) || value.formats[end]?.includes(format)) return setError(__('Select the entire existing effect before replacing it.', 'animations-for-blocks'))
		}
		onChange(applyFormat(removeFormat(value, name, start, end), { type: name, attributes: { config: JSON.stringify(next) } }, start, end))
		setOpen(false)
	}
	return <>
		<RichTextToolbarButton icon="editor-textcolor" title={__('Text animation', 'animations-for-blocks')} onClick={show} isActive={isActive} />
		{open && <Popover anchor={anchor} placement="bottom" onClose={() => setOpen(false)}>
			<div style={{ padding: 16, minWidth: 280, maxHeight: '65vh', overflow: 'auto' }}>
				{error && <Notice status="error" isDismissible={false}>{error}</Notice>}
				<SelectControl label={__('Effect', 'animations-for-blocks')} value={config.effect} options={[{ label: __('Typing', 'animations-for-blocks'), value: 'typing' }, { label: __('Reveal words', 'animations-for-blocks'), value: 'words' }, { label: __('Counter', 'animations-for-blocks'), value: 'count' }]} onChange={effect => update('effect', effect)} />
				{['duration', 'delay'].map(key => <TextControl key={key} label={key === 'duration' ? __('Duration (ms)', 'animations-for-blocks') : __('Delay (ms)', 'animations-for-blocks')} type="number" value={config[key]} onChange={newValue => update(key, newValue)} />)}
				{config.effect === 'typing' && <ToggleControl label={__('Show cursor', 'animations-for-blocks')} checked={!!config.cursor} onChange={cursor => update('cursor', cursor)} />}
				{config.effect === 'count' && <>
					{[['start', 'Start', 0], ['end', 'End (explicit number)', ''], ['decimals', 'Decimals', 0], ['decimal', 'Decimal separator', '.'], ['thousands', 'Thousands separator', ','], ['prefix', 'Prefix', ''], ['suffix', 'Suffix', '']].map(([key, label, fallback]) => <TextControl key={key} label={label} type={['start', 'end', 'decimals'].includes(key) ? 'number' : 'text'} value={config[key] ?? fallback} onChange={newValue => update(key, newValue)} />)}
				</>}
				<Button variant="primary" onClick={apply}>{__('Apply', 'animations-for-blocks')}</Button>
				<Button onClick={() => { onChange(removeFormat(value, name)); setOpen(false) }}>{__('Remove', 'animations-for-blocks')}</Button>
				<Button onClick={() => { if (previewRef.current && contentRef.current) { previewRef.current.innerHTML = contentRef.current.innerHTML; previewRef.current.querySelectorAll('span.anfb-text').forEach(element => animateFragment(element, { preview: true })) } }}>{__('Preview saved effect', 'animations-for-blocks')}</Button>
				<div ref={previewRef} aria-label={__('Animation preview', 'animations-for-blocks')} />
			</div>
		</Popover>}
	</>
}

registerFormatType(name, { title: __('Text animation', 'animations-for-blocks'), tagName: 'span', className: 'anfb-text', attributes: { config: 'data-anfb' }, edit: Edit })
