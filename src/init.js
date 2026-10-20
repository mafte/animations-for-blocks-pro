import AOSIO from '../vendor/aosio/src/js/aosio-core.js'
import '../vendor/aosio/src/sass/aosio.scss'
import './aos-custom.scss'

/**
 * Allow to customize default AOS settings by adding an object to window.
 *
 *	{
 *		// Global settings
 *		disable: false, // accepts following values: 'phone', 'tablet', 'mobile', boolean, expression or function
 *		startEvent: 'DOMContentLoaded', // name of the event dispatched on the document, that AOS should initialize on
 *		initClassName: 'aos-init', // class applied after initialization
 *		animatedClassName: 'aos-animate', // class applied on animation
 *		useClassNames: false, // if true, will add content of `data-aos` as classes on scroll
 *
 *		// Settings that can be overridden on per-element basis, by `data-aos-*` attributes:
 *		offset: 120, // offset (in px) from the original trigger point
 *		delay: 0, // values from 0 to 3000, with step 50ms
 *		duration: 400, // values from 0 to 3000, with step 50ms
 *		easing: 'ease', // default easing for AOS animations
 *		once: false, // whether animation should happen only once - while scrolling down
 *		mirror: false, // whether elements should animate out while scrolling past them
 *		anchorPlacement: 'top-bottom', // defines which position of the element regarding to window should trigger the animation
 *	}
 *
 * @see https://github.com/michalsnik/aos
 */
const settings = window.anfbAosSettings || {}

/**
 * Initialize AOS on the front end.
 */
const initialize = () => {
	const root = document.documentElement
	const reveal = () => root.classList.remove('anfb-aos-ready', 'anfb-aos-pending', 'anfb-aos-running')
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return reveal()
	document.querySelectorAll('[data-anfb-distance]').forEach(element => {
		for (const [attribute, variable] of [['data-anfb-distance', '--anfb-distance'], ['data-anfb-distance-mobile', '--anfb-distance-mobile']]) {
			if (!element.hasAttribute(attribute)) continue
			const value = Number(element.getAttribute(attribute))
			if (Number.isFinite(value) && value >= 0 && value <= 200) element.style.setProperty(variable, `${value}px`)
		}
	})
	const armed = root.classList.contains('anfb-aos-pending')
	const start = () => {
		try {
			const engine = window.AOS || AOSIO
			const supportsIntersectionObserver = 'IntersectionObserver' in window && 'IntersectionObserverEntry' in window && 'intersectionRatio' in window.IntersectionObserverEntry.prototype
			if (engine === AOSIO && !supportsIntersectionObserver) return reveal()
			engine.init(settings)
			window.AOS = engine
			root.classList.add('anfb-aos-ready', 'anfb-aos-running')
			root.classList.remove('anfb-aos-pending')
		} catch (error) {
			reveal()
			console.error('Animations for Blocks: initialization failed.', error)
		}
	}
	if (!armed) return start()
	root.classList.add('anfb-aos-ready')
	root.classList.remove('anfb-aos-pending')
	// Commit the initial CSS state before AOS applies its visible state.
	document.querySelectorAll('[data-aos]').forEach(element => getComputedStyle(element).opacity)
	requestAnimationFrame(() => requestAnimationFrame(start))
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true })
else initialize()
