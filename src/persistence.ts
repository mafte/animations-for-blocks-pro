import schema from '../includes/animation-schema.json'
import type { AnimationsForBlocks, BlockAttributes } from './types'

export interface AnimationMetadata {
	version: 1
	entry?: AnimationsForBlocks
	sequence?: { enabled: boolean, interval: number }
}

const record = (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value)

export function validAnimationMetadata(data: any): boolean {
	if (!record(data) || data.version !== 1 || Object.keys(data).some(key => !['version', 'entry', 'sequence'].includes(key))) return false
	if ('entry' in data) {
		const entry = data.entry
		if (!record(entry) || Object.keys(entry).some(key => !schema.entryOptions.includes(key))) return false
		const name = entry.animation
		if (![...Object.keys(schema.variations), 'none', 'inherit', 'default'].includes(name)) return false
		const variations = schema.variations as Record<string, string[]>
		if (variations[name] && !variations[name].includes(entry.variation)) return false
		const limits: Record<string, number> = { distance: 200, mobileDistance: 200, order: 1000 }
		for (const key of ['duration', 'delay', 'offset', 'distance', 'mobileDistance', 'order']) {
			if (entry[key] !== undefined && (!Number.isInteger(entry[key]) || entry[key] < 0 || entry[key] > (limits[key] ?? 60000))) return false
		}
		for (const key of ['duration', 'delay']) if (entry[key] !== undefined && (entry[key] > 3000 || entry[key] % 50 || (key === 'duration' && !entry[key]))) return false
		for (const key of ['once', 'mirror']) if (entry[key] !== undefined && typeof entry[key] !== 'boolean') return false
		if (entry.easing !== undefined && !schema.easings.includes(entry.easing)) return false
		if (entry.anchorPlacement !== undefined && !schema.anchorPlacements.includes(entry.anchorPlacement)) return false
		if (entry.pageIds !== undefined && (!Array.isArray(entry.pageIds) || entry.pageIds.some((id: number) => !Number.isInteger(id) || id < 1))) return false
	}
	if ('sequence' in data) {
		const sequence = data.sequence
		if (!record(sequence) || Object.keys(sequence).some(key => !['enabled', 'interval'].includes(key)) || typeof sequence.enabled !== 'boolean' || !Number.isInteger(sequence.interval) || sequence.interval < 0 || sequence.interval > 1000 || sequence.interval % 50 !== 0) return false
	}
	return true
}

/** Read legacy aliases without persisting a second copy of the configuration. */
export function animationAttributes(attributes: BlockAttributes): BlockAttributes {
	if (!Object.prototype.hasOwnProperty.call(attributes.metadata || {}, 'anfb')) return attributes
	const { animationsForBlocks, isAnimationProvider, animationStagger, ...rest } = attributes
	const data = attributes.metadata.anfb
	if (!validAnimationMetadata(data)) return rest
	return { ...rest, animationsForBlocks: data.entry, isAnimationProvider: data.sequence?.enabled, animationStagger: data.sequence?.interval }
}

export function animationUpdate(attributes: BlockAttributes, updates: BlockAttributes): BlockAttributes {
	if (attributes.metadata !== undefined && !record(attributes.metadata)) return {}
	const existing = attributes.metadata?.anfb
	if (Object.prototype.hasOwnProperty.call(attributes.metadata || {}, 'anfb') && !validAnimationMetadata(existing)) return {}
	const next = { ...animationAttributes(attributes), ...updates }
	const data: AnimationMetadata = { version: 1 }
	if (next.animationsForBlocks && Object.keys(next.animationsForBlocks).length) data.entry = { ...next.animationsForBlocks, animation: next.animationsForBlocks.animation || 'none' }
	if (next.isAnimationProvider || next.animationStagger) data.sequence = { enabled: !!next.isAnimationProvider, interval: next.animationStagger ?? 0 }
	if (!validAnimationMetadata(data)) return {}
	const metadata = { ...attributes.metadata }
	if (data.entry || data.sequence) metadata.anfb = data
	else delete metadata.anfb
	return { metadata: Object.keys(metadata).length ? metadata : undefined, animationsForBlocks: undefined, isAnimationProvider: undefined, animationStagger: undefined }
}
