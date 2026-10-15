import { animateFragment } from './text-runtime'
import './text.scss'

function init() {
	if (!('IntersectionObserver' in window)) return
	const observer = new IntersectionObserver(entries => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				observer.unobserve(entry.target)
				animateFragment(entry.target)
			}
		}
	}, { threshold: 0 })
	document.querySelectorAll('span.anfb-text[data-anfb]').forEach(element => observer.observe(element))
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
else init()
