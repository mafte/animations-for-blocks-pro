import { animationAttributes } from '../../persistence'
import * as React from 'react'
import {__} from '@wordpress/i18n'

import {useBlockProps, useInnerBlocksProps} from '@wordpress/block-editor'

import metadata from './block.json'
export {metadata}

import type {
	AnimationsForBlocksBlockAttributes,
	AnimationsForBlocksBlockContext,
	BlockEditProps,
} from '../../types'

export type AnimationContainerBlockAttributes = AnimationsForBlocksBlockAttributes<{
	/** Should this block animate or provide the animation to child blocks. */
	isAnimationProvider?: boolean
	/** Stagger provided animation. */
	animationStagger?: number
}>

const Edit: React.FC<BlockEditProps<AnimationContainerBlockAttributes, AnimationsForBlocksBlockContext>> = props => {

	const blockProps = useBlockProps()
	const innerBlocksProps = useInnerBlocksProps(blockProps)

	return <>

		<div {...innerBlocksProps} />
	</>
}

const Save = () => {

	const blockProps = useBlockProps.save()
	const innerBlocksProps = useInnerBlocksProps.save(blockProps)

	return <div {...innerBlocksProps} />
}

export const settings = {
	edit: Edit,
	save: Save,
	__experimentalLabel: (attributes: AnimationContainerBlockAttributes, {context}: any) => {

		const customName = attributes?.metadata?.name
		if(context === 'list-view' && customName) {
			return customName
		}

		const {
			isAnimationProvider = false,
		} = animationAttributes(attributes)

		if(isAnimationProvider) {
			return __('Animation provider', 'animations-for-blocks')
		}
	},
}
