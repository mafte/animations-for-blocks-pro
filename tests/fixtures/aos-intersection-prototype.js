(() => {
	window.AOSIOPrototype = {
		start(items, throttleDelay = 0) {
			const maxTravel = document.documentElement.scrollHeight + innerHeight
			const records = new Map()
			const stats = { targets: 0, callbacks: 0, entries: 0, recordsVisited: 0, observerCount: 1, applies: 0 }
			const pending = new Set()
			let timer
			let lastApply = -Infinity
			const apply = () => {
				timer = undefined
				const y = window.scrollY
				for (const record of pending) {
					const show = y >= record.enter
					const hide = record.mirror && !record.once && y >= record.exit
					record.element.classList.toggle('aos-animate', hide ? false : show)
					stats.recordsVisited++
				}
				stats.applies++
				pending.clear()
				lastApply = performance.now()
				stats.lastApplyMs = lastApply
			}
			const observer = new IntersectionObserver(entries => {
				stats.callbacks++
				stats.lastCallbackMs = performance.now()
				for (const entry of entries) {
					pending.add(records.get(entry.target))
					stats.entries++
				}
				const wait = throttleDelay - (performance.now() - lastApply)
				if (wait <= 0) apply()
				else if (!timer) timer = setTimeout(apply, wait)
			}, { rootMargin: `${maxTravel}px 0px ${-innerHeight}px 0px`, threshold: 0 })

			for (const item of items) {
				const record = { element: item.element, enter: item.enter, exit: item.exit, once: item.once, mirror: item.mirror }
				records.set(item.element, record)
				for (const [edge, top] of [['enter', item.enter], ['exit', item.exit]]) {
					const marker = document.createElement('i')
					marker.dataset.edge = edge
					marker.setAttribute('aria-hidden', 'true')
					marker.style.cssText = `position:absolute;left:0;top:${top}px;width:1px;height:1px;visibility:hidden;pointer-events:none;contain:strict`
					document.documentElement.append(marker)
					records.set(marker, record)
					observer.observe(marker)
					stats.targets++
				}
			}
			return { stats, holdThrottleWindow() { lastApply = performance.now(); stats.throttleWindowStartMs = lastApply }, cleanup() { observer.disconnect(); clearTimeout(timer); pending.clear(); document.querySelectorAll('i[data-edge]').forEach(marker => marker.remove()) } }
		}
	}
})()
