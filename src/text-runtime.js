export function segments(text, kind) {
	if (typeof Intl.Segmenter === 'function') {
		return [...new Intl.Segmenter(undefined, { granularity: kind }).segment(text)].map(item => item.segment)
	}
	if (kind === 'word') return text.match(/\s+|\S+/gu) || []
	// shortcut: fallback groups combining marks, flags and joined emoji; prefer Intl.Segmenter when available.
	return text.match(/\p{Regional_Indicator}{2}|\P{Mark}(?:\p{Mark}|[\uFE0E\uFE0F]|\p{Emoji_Modifier})*(?:\u200D\P{Mark}(?:\p{Mark}|[\uFE0E\uFE0F]|\p{Emoji_Modifier})*)*|\p{Mark}/gu) || []
}

export function counterText(value, config) {
	const [integer, fraction] = value.toFixed(config.decimals ?? 0).split('.')
	return (config.prefix || '') + integer.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousands ?? ',') + (fraction ? (config.decimal ?? '.') + fraction : '') + (config.suffix || '')
}

export async function animateFragment(element, { preview = false } = {}) {
	if (element.dataset.anfbPlaying) return
	const doc = element.ownerDocument
	const win = doc.defaultView
	if (!win || win.matchMedia('(prefers-reduced-motion: reduce)').matches) return
	let config
	try { config = JSON.parse(element.dataset.anfb) } catch { return }
	if (!['typing', 'words', 'words-up', 'count'].includes(config.effect)) return
	const duration = Number(config.duration ?? 1200)
	const delay = Number(config.delay ?? 0)
	if (!Number.isFinite(duration) || duration < 1 || duration > 60000 || !Number.isFinite(delay) || delay < 0 || delay > 60000) return
	if (config.effect === 'count' && (typeof config.end !== 'number' || !Number.isFinite(config.end) || !Number.isFinite(config.start ?? 0) || !Number.isInteger(config.decimals ?? 0) || (config.decimals ?? 0) < 0 || config.decimals > 10)) return
	element.dataset.anfbPlaying = 'true'
	const original = [...element.childNodes]
	let frame, timeout, cancelWaiting, started = false
	const media = win.matchMedia('(prefers-reduced-motion: reduce)')
	const finish = () => {
		win.cancelAnimationFrame(frame)
		win.clearTimeout(timeout)
		cancelWaiting?.()
		if (started) element.replaceChildren(...original)
		delete element.dataset.anfbPlaying
		media.removeEventListener?.('change', finish)
		element.removeEventListener('focusin', finish)
	}
	media.addEventListener?.('change', finish, { once: true })
	element.addEventListener('focusin', finish, { once: true })
	let visual
	const tokens = []
	const prepare = () => {
		const accessible = doc.createElement('span')
		accessible.className = 'anfb-text-source'
		started = true
		accessible.append(...original)
		visual = doc.createElement('span')
		visual.setAttribute('aria-hidden', 'true')
		visual.className = 'anfb-text-visual'
		visual.innerHTML = accessible.innerHTML
		visual.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
		visual.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach(node => node.setAttribute('tabindex', '-1'))

		if (config.effect !== 'count') {
			const walker = doc.createTreeWalker(visual, win.NodeFilter.SHOW_TEXT)
			const nodes = []
			while (walker.nextNode()) nodes.push(walker.currentNode)
			for (const node of nodes) {
				const fragment = doc.createDocumentFragment()
				for (const text of segments(node.textContent, ['words', 'words-up'].includes(config.effect) ? 'word' : 'grapheme')) {
					if (config.effect === 'words-up' && /^\s+$/u.test(text)) { fragment.append(doc.createTextNode(text)); continue }
					const span = doc.createElement('span')
					span.textContent = text
					span.style.opacity = '0'
					if (config.effect === 'words-up') span.style.display = 'inline-block'
					fragment.append(span)
					tokens.push(span)
				}
				node.replaceWith(fragment)
			}
		}
		element.replaceChildren(accessible, visual)
	}

	try {
		if (config.effect === 'words-up') prepare()
		if (!preview) {
			const ancestors = []
			for (let node = element; node; node = node.parentElement) if (node.hasAttribute('data-aos')) ancestors.push(node)
			const activeClass = win.anfbAosSettings?.animatedClassName || 'aos-animate'
			const ready = node => !node.hasAttribute('data-aos') || node.classList.contains(activeClass)
			if (ancestors.length) {
				await new Promise(resolve => {
					const begin = win.performance.now()
					cancelWaiting = resolve
					const check = () => {
						if (ancestors.every(ready) || (!doc.documentElement.classList.contains('anfb-aos-pending') && !doc.documentElement.classList.contains('anfb-aos-ready')) || win.performance.now() - begin > 60000 || !element.isConnected) resolve()
						else frame = win.requestAnimationFrame(check)
					}
					check()
				})
				if (!element.dataset.anfbPlaying || !ancestors.every(ready)) return finish()
				await new Promise(resolve => {
					cancelWaiting = resolve
					const milliseconds = value => value.trim().endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000
					const waits = ancestors.map(node => {
						const style = win.getComputedStyle(node)
						return (config.startWithBlock ? 0 : Math.max(...style.transitionDuration.split(',').map(milliseconds), 0)) + Math.max(...style.transitionDelay.split(',').map(milliseconds), 0)
					})
					timeout = win.setTimeout(resolve, Math.min(60000, Math.max(...waits, 0)))
				})
			}
		}
		await new Promise(resolve => { cancelWaiting = resolve; timeout = win.setTimeout(resolve, delay) })
		if (!element.dataset.anfbPlaying || !element.isConnected || media.matches) return finish()
		if (!started) prepare()
		let revealed = 0
		const start = win.performance.now()
		const tick = now => {
			try {
				if (!element.isConnected || media.matches) return finish()
				const progress = Math.min(1, (now - start) / duration)
				if (config.effect === 'count') visual.textContent = counterText((config.start ?? 0) + (config.end - (config.start ?? 0)) * progress, config)
				else if (config.effect === 'words-up') {
					const travel = Number(win.matchMedia('(max-width: 767px)').matches ? (config.mobileDistance ?? config.distance ?? 8) : (config.distance ?? 12))
					const wordDuration = Math.min(400, duration)
					const interval = (duration - wordDuration) / Math.max(1, tokens.length - 1)
					tokens.forEach((token, index) => {
						const local = Math.max(0, Math.min(1, ((now - start) - index * interval) / wordDuration))
						const eased = 1 - Math.pow(1 - local, 3)
						token.style.opacity = String(eased)
						token.style.transform = `translateY(${(1 - eased) * Math.max(0, Math.min(200, travel))}px)`
					})
				} else {
					const visible = Math.ceil(tokens.length * progress)
					if (config.effect === 'typing' && config.cursor && visible !== revealed) {
						tokens[revealed - 1]?.classList.remove('anfb-text-cursor')
						tokens[visible - 1]?.classList.add('anfb-text-cursor')
					}
					for (; revealed < visible; revealed++) tokens[revealed].style.opacity = '1'
				}
				if (progress >= 1) finish()
				else frame = win.requestAnimationFrame(tick)
			} catch { finish() }
		}
		// Restore even if the browser stops scheduling frames while the document is hidden.
		timeout = win.setTimeout(finish, duration + 1000)
		frame = win.requestAnimationFrame(tick)
	} catch { finish() }
}
