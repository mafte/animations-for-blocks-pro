import { PanelBody, ToggleControl, TextControl, Button } from '@wordpress/components'
import { useSelect, useDispatch } from '@wordpress/data'
import { __ } from '@wordpress/i18n'
import { unsupportedBlocks } from './data'
import schema from '../includes/animation-schema.json'

export default function SequenceControls({ clientId, attributes, setAttributes }) {
	const block = useSelect(select => select('core/block-editor').getBlock(clientId), [clientId])
	const { updateBlockAttributes, selectBlock } = useDispatch('core/block-editor')
	if (!schema.sequenceBlocks.includes(block?.name)) return null
	const children = block.innerBlocks || []
	return <PanelBody title={__('Sequence', 'animations-for-blocks')} initialOpen={!!attributes.isAnimationProvider}>
		<ToggleControl label={__('Provide animation to children', 'animations-for-blocks')} checked={!!attributes.isAnimationProvider} onChange={enabled => {
			setAttributes({ isAnimationProvider: enabled, ...(!attributes.animationsForBlocks?.animation && enabled ? { animationsForBlocks: { animation: 'fade', variation: 'up', duration: 450, delay: 0, once: true, distance: 24, mobileDistance: 16, easing: 'ease-out-cubic' } } : {}) })
			if (enabled) children.forEach(child => {
				if (!unsupportedBlocks.includes(child.name) && !child.attributes.animationsForBlocks?.animation && !child.attributes.isAnimationProvider) updateBlockAttributes(child.clientId, { animationsForBlocks: { animation: 'inherit' } })
			})
		}} />
		{attributes.isAnimationProvider && <>
			<TextControl label={__('Interval (ms)', 'animations-for-blocks')} type="number" min={0} max={1000} value={attributes.animationStagger ?? 0} onChange={value => setAttributes({ animationStagger: Math.max(0, Math.min(1000, Math.round((Number(value) || 0) / 50) * 50)) })} help={__('Initial delay comes from the group animation. Prefer 50–100 ms between cards.', 'animations-for-blocks')} />
			<Button variant="secondary" onClick={() => { const replay = child => { document.dispatchEvent(new CustomEvent(`anfb:animate:${child.clientId}`)); child.innerBlocks.forEach(replay) }; children.forEach(replay) }}>{__('Replay sequence from start', 'animations-for-blocks')}</Button>
			<p>{__('Children using Inherit follow their order in the group; select one to change its order.', 'animations-for-blocks')}</p>
			{children.filter(child => child.attributes.animationsForBlocks?.animation).map(child => <Button key={child.clientId} variant="tertiary" onClick={() => selectBlock(child.clientId)}>{child.attributes.metadata?.name || child.name} — {child.attributes.animationsForBlocks?.animation}</Button>)}
		</>}
	</PanelBody>
}
