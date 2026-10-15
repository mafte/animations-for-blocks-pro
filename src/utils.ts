import {
	DYNAMIC_ANIMATION_NAMES,
} from './aos-data'

import type {
	AnimationsForBlocks
} from './types'

/**
 * Construct props needed for animation from animationsForBlocks object.
 */
export const getAnimationProps = (animationsForBlocks: AnimationsForBlocks = {}, context: 'save' | 'edit' = 'save') => {

	let animationProps: Record<string, any> = {}

	if(!animationsForBlocks) {
		return animationProps
	}

	const {
		animation,
		variation,
		delay,
		duration,
		once,
		mirror,
		easing,
		offset,
		anchorPlacement,
	} = animationsForBlocks

	if(!animation || animation === 'none') {
		return animationProps
	}

	/** Dynamic animation attributes are added server-side only. */
	if(context === 'save' && (DYNAMIC_ANIMATION_NAMES.includes(animation) || animationsForBlocks.pageIds?.length)) {
		return animationProps
	}

	/** Animation. */
	animationProps['data-aos'] = animation === variation || !variation ? animation : `${animation}-${variation}`

	/** Delay. */
	if(delay && delay !== 0) {
		animationProps['data-aos-delay'] = delay.toString()
	}

	/** Duration. */
	if(duration && duration !== 400) {
		animationProps['data-aos-duration'] = duration.toString()
	}

	/** Easing. */
	if(easing && easing !== 'ease') {
		animationProps['data-aos-easing'] = easing
	}

	if (animationsForBlocks.distance !== undefined || animationsForBlocks.mobileDistance !== undefined) {
		animationProps['data-anfb-distance'] = String(animationsForBlocks.distance ?? 100)
		if (animationsForBlocks.mobileDistance !== undefined) animationProps['data-anfb-distance-mobile'] = String(animationsForBlocks.mobileDistance)
		if (context === 'edit') animationProps.style = { '--anfb-distance': `${animationsForBlocks.distance ?? 100}px`, '--anfb-distance-mobile': `${animationsForBlocks.mobileDistance ?? animationsForBlocks.distance ?? 100}px` }
	}

	/** Skip attributes not needed in the editor. */
	if(context === 'edit') {
		return animationProps
	}

	/** Once. */
	if(once) {
		animationProps['data-aos-once'] = 'true'
	}

	/** Mirror. */
	if(mirror) {
		animationProps['data-aos-mirror'] = 'true'
	}

	/** Offset. */
	if(offset !== undefined && offset !== 120) {
		animationProps['data-aos-offset'] = offset.toString()
	}

	/** Anchor placement. */
	if(anchorPlacement && anchorPlacement !== 'top-bottom') {
		animationProps['data-aos-anchor-placement'] = anchorPlacement
	}

	return animationProps
}
