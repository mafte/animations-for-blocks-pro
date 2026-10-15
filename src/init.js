import AOS from 'aos'
import '../node_modules/aos/dist/aos.css'
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
const initialize = () => setTimeout(() => {
	try {
		const engine = window.AOS || AOS
		engine.init(settings)
		window.AOS = engine
		document.documentElement.classList.add('anfb-aos-ready')
	} catch (error) {
		document.documentElement.classList.remove('anfb-aos-ready')
		console.error('Animations for Blocks: initialization failed.', error)
	}
}, 50)
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true })
else initialize()
