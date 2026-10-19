import { animationAttributes } from './persistence'
import {
	useSelect,
} from '@wordpress/data'

import {
	store as coreStore,
} from '@wordpress/core-data'

import {
	store as blockEditorStore,
	// @ts-ignore
} from '@wordpress/block-editor'

import schema from '../includes/animation-schema.json'

import {
	DEFAULT_ANIMATION,
} from './PluginSettings'

import type {
	AnimationsForBlocks,
} from './types'

export {
	usePluginSettings,
	usePluginSettingsEdit,
} from './PluginSettings'

export const useAnimationConfig = (clientId: string, animationsForBlocks: AnimationsForBlocks = {}, enabled = false) => {

	const {
		animation = '',
	} = animationsForBlocks

	const selectedAnimation = useSelect(select => {

		if(!enabled) {
			return false
		}

		const getDefaultAnimation = () => {
			const record = select(coreStore).getEditedEntityRecord('root', 'site', undefined!) as any
			const {'animations-for-blocks': pluginSettings = {}} = record || {}
			const {defaultAnimation = DEFAULT_ANIMATION} = pluginSettings
			return defaultAnimation
		}

		if(animation === 'default') {
			return getDefaultAnimation()
		}

		if(animation === 'inherit') {

			const parentAnimationContainers = select(blockEditorStore).getBlockParentsByBlockName(clientId, schema.sequenceBlocks, true) as string[]

			const getAnimationProvider = (containers: string[]) => {
				for(const clientId of containers) {
					const block = select(blockEditorStore).getBlock(clientId)
					if(block && animationAttributes(block.attributes).isAnimationProvider) {
						return block
					}
				}
				return false
			}

			const block = getAnimationProvider(parentAnimationContainers)
			if(!block) {
				return false
			}

			const provider = animationAttributes(block.attributes)
			const providedAnimation = provider.animationsForBlocks || {}

			if(!providedAnimation?.animation || providedAnimation.animation === 'inherit') {
				return false
			}


			const entries: any[] = []
			const collect = (children: any[]) => children.forEach(child => {
				const settings = animationAttributes(child.attributes)
				if (settings.isAnimationProvider) return
				const name = settings.animationsForBlocks?.animation
				if (name === 'inherit') { entries.push(child); return }
				if (!name || name === 'none') collect(child.innerBlocks)
			})
			collect(block.innerBlocks)
			entries.sort((a, b) => (animationAttributes(a.attributes).animationsForBlocks?.order ?? 0) - (animationAttributes(b.attributes).animationsForBlocks?.order ?? 0))
			const rank = entries.findIndex(entry => entry.clientId === clientId)
			if (rank < 0) return false
			const base = providedAnimation.animation === 'default' ? getDefaultAnimation() : providedAnimation
			return { ...base, delay: Math.min(3000, (base.delay ?? 0) + rank * (provider.animationStagger ?? 0)) }
		}

		return false
	}, [clientId, animation, enabled])

	if(!enabled) {
		return false
	}

	switch(animation) {

		case 'none':
			return false

		case 'default':
			return selectedAnimation || DEFAULT_ANIMATION

		case 'inherit':
			return selectedAnimation
	}

	return animationsForBlocks
}
