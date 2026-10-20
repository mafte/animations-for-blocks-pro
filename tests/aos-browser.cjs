const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { chromium, firefox, webkit } = require('@playwright/test')

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
	if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]])
	return pairs
}, []))
const mode = args.mode || 'contract'
const variants = Object.fromEntries(['control', 'candidate'].map(name => [name, path.resolve(args[name] || process.cwd())]))
const output = path.resolve(args.output || '/private/tmp/anfb-aos-results')
const browserType = ({ chromium, firefox, webkit })[args.browser || 'chromium']
const browserPath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const anchors = ['top-bottom', 'center-bottom', 'bottom-bottom', 'top-center', 'center-center', 'bottom-center', 'top-top', 'center-top', 'bottom-top']

function fixture(override = false, anchor = '', count = 0, customStart = false) {
	const placement = anchors.includes(anchor) ? ` data-aos-anchor-placement="${anchor}"` : ''
	const items = Array.from({ length: Math.min(1000, Math.max(0, count)) }, (_, i) => `<div class="bench" data-aos="fade-up" style="height:12px">${i}</div>`).join('')
	return `<!doctype html><html class="no-js"><head><meta charset="utf-8"><link rel="stylesheet" href="/VARIANT/build/aos.css"><style>#spacer{height:1600px}[data-aos]{transition-duration:0s}</style><script>document.documentElement.classList.remove('no-js');window.anfbAosSettings={offset:0,duration:0,delay:0${customStart ? ",startEvent:'anfb:test'" : ''}};window.__listeners=new Map();const __add=window.addEventListener,__remove=window.removeEventListener;window.addEventListener=function(type,listener,options){if(!window.__listeners.has(type))window.__listeners.set(type,new Set());window.__listeners.get(type).add(listener);return __add.call(this,type,listener,options)};window.removeEventListener=function(type,listener,options){window.__listeners.get(type)?.delete(listener);return __remove.call(this,type,listener,options)};window.__activeObservers=new Set();window.__aosObserverDeliveries=0;const __MutationObserver=window.MutationObserver;window.MutationObserver=class extends __MutationObserver{constructor(callback){const aos=new Error().stack.includes('/build/aos.js');super(records=>{if(aos&&records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.matches?.('[data-aos]')||node.querySelector?.('[data-aos]'))))window.__aosObserverDeliveries++;callback(records)});this.__aosObserver=aos}observe(...args){if(this.__aosObserver)window.__activeObservers.add(this);return super.observe(...args)}disconnect(){if(this.__aosObserver)window.__activeObservers.delete(this);return super.disconnect()}};let __aos;Object.defineProperty(window,'AOS',{configurable:true,get(){return __aos},set(engine){__aos=engine;window.__aosReadyMs=performance.now()}});${override ? 'window.AOS={init:function(){window.__externalInit=(window.__externalInit||0)+1}};' : ''}</script></head><body><div id="spacer"></div><div id="subject" data-aos="fade-up" data-aos-id="contract" data-aos-offset="0"${placement} style="height:80px"></div>${items}<div style="height:1800px"></div><script defer src="/VARIANT/build/aos.js"></script><script defer src="/VARIANT/build/init.js"></script></body></html>`
}

function geometryFixture({ anchor = '', globalAnchor = 'top-bottom', top = 1800, height = 101, offset = 37, inlineOffset = null, anchorTop = null, initialScroll = 0, mirror = false, once = false, transformY = 0, horizontalOffset = 0, throttleDelay = 0, position = '', clipParent = false, nestedScroller = false, hidden = false }) {
	const placement = anchor ? ` data-aos-anchor-placement="${anchor}"` : ''
	const localOffset = inlineOffset === null ? '' : ` data-aos-offset="${inlineOffset}"`
	const reference = anchorTop === null ? '' : `<div id="anchor-gap" style="height:${anchorTop - top}px"></div><div id="anchor-target" style="height:${height}px"></div>`
	const anchorSelector = anchorTop === null ? '' : ' data-aos-anchor="#anchor-target"'
	const style = `height:${height}px;margin-left:${horizontalOffset}px;transform:translateY(${transformY}px)${position ? `;position:${position};top:0` : ''}${hidden ? ';display:none' : ''}`
	const subject = `<div id="subject" data-aos="fade-up" data-aos-id="geometry"${placement}${localOffset}${anchorSelector} style="${style}"></div>`
	const target = clipParent ? `<div id="clip" style="height:${height}px;overflow:hidden;transform:translateY(-250px)">${subject}</div>` : subject
	const structure = nestedScroller ? `<div id="scroller" style="height:200px;overflow:auto"><div style="height:${top}px"></div>${target}<div style="height:3000px"></div></div><div id="tail"></div>` : `<div id="spacer"></div>${reference}${target}<div id="tail"></div>`
	return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/VARIANT/build/aos.css"><style>body{margin:0}#spacer{height:${top}px}#tail{height:3000px}[data-aos]{transition-duration:0s}</style><script>window.anfbAosSettings={offset:${offset},duration:0,delay:0,throttleDelay:${throttleDelay},once:${once},mirror:${mirror},anchorPlacement:'${globalAnchor}',startEvent:'anfb:geometry:start'};</script></head><body>${structure}<script defer src="/VARIANT/build/aos.js"></script><script defer src="/VARIANT/build/init.js"></script></body></html>`
}

function createServer() {
	return http.createServer((request, response) => {
		const url = new URL(request.url, 'http://localhost')
		if (url.pathname === '/fixture') {
			response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
			return response.end(fixture(url.searchParams.get('override') === '1', url.searchParams.get('anchor'), Number(url.searchParams.get('count')), url.searchParams.get('startEvent') === '1').replaceAll('/VARIANT', `/${url.searchParams.get('variant') || 'control'}`))
		}
		if (url.pathname === '/geometry') {
			const inlineOffset = url.searchParams.has('inlineOffset') ? Number(url.searchParams.get('inlineOffset')) : null
			const anchorTop = url.searchParams.has('anchorTop') ? Number(url.searchParams.get('anchorTop')) : null
			const page = geometryFixture({ anchor: url.searchParams.get('anchor') || '', globalAnchor: url.searchParams.get('globalAnchor') || 'top-bottom', top: Number(url.searchParams.get('top') || 1800), height: Number(url.searchParams.get('height') || 101), offset: Number(url.searchParams.get('offset') || 0), inlineOffset, anchorTop, initialScroll: Number(url.searchParams.get('initialScroll') || 0), mirror: url.searchParams.get('mirror') === 'true', once: url.searchParams.get('once') === 'true', transformY: Number(url.searchParams.get('transformY') || 0), horizontalOffset: Number(url.searchParams.get('horizontalOffset') || 0), throttleDelay: Number(url.searchParams.get('throttleDelay') || 0), position: url.searchParams.get('position') || '', clipParent: url.searchParams.get('clipParent') === 'true', nestedScroller: url.searchParams.get('nestedScroller') === 'true', hidden: url.searchParams.get('hidden') === 'true' })
			response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
			return response.end(page.replaceAll('/VARIANT', `/${url.searchParams.get('variant') || 'control'}`))
		}
		const match = url.pathname.match(/^\/(control|candidate)\/build\/(aos\.js|init\.js|aos\.css)$/)
		if (!match) { response.writeHead(404); return response.end('Not found') }
		const file = path.join(variants[match[1]], 'build', match[2])
		if (!fs.existsSync(file)) { response.writeHead(404); return response.end('Missing asset: ' + file) }
		response.writeHead(200, { 'content-type': match[2].endsWith('.css') ? 'text/css' : 'text/javascript', 'cache-control': 'no-store' })
		fs.createReadStream(file).pipe(response)
	})
}

async function pageFor(browser, base, variant, anchor = '') {
	const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
	const errors = []
	page.on('pageerror', error => errors.push(error.message))
	await page.addInitScript(() => {
		const NativeObserver = window.IntersectionObserver
		if (!NativeObserver) return
		window.__activeIO = new Set()
		window.__allIO = []
		window.IntersectionObserver = class extends NativeObserver {
			constructor(callback, options) {
				const emit = (entries, observer) => callback(entries, observer)
				super(emit, options)
				this.__emit = emit
				this.__targets = new Set()
				this.__seen = []
				window.__allIO.push(this)
			}
			observe(target) { this.__targets.add(target); this.__seen.push(target); window.__activeIO.add(this); return super.observe(target) }
			unobserve(target) { this.__targets.delete(target); return super.unobserve(target) }
			disconnect() { window.__activeIO.delete(this); this.__targets.clear(); return super.disconnect() }
		}
	})
	await page.goto(`${base}/fixture?variant=${variant}${anchor ? `&anchor=${anchor}` : ''}`)
	await page.waitForFunction(() => window.AOS && document.querySelector('#subject')?.classList.contains('aos-init'))
	return { page, errors }
}

function getTrigger(anchor, top, height, viewport, offset) {
	const [elementPoint, viewportPoint] = anchor.split('-')
	const elementFactor = { top: 0, center: 0.5, bottom: 1 }[elementPoint]
	const viewportFactor = { top: 0, center: 0.5, bottom: 1 }[viewportPoint]
	return top + height * elementFactor - viewport * viewportFactor + offset
}

async function geometryContracts(browser, base, variant) {
	const cases = anchors.map(anchor => ({ anchor, label: anchor, offsetIn: 0, offsetOut: 37 }))
	cases.push(
		{ anchor: '', globalAnchor: 'center-top', label: 'global-placement', offsetIn: 37, offsetOut: 37 },
		{ anchor: 'center-center', inlineOffset: 0, label: 'inline-zero', offsetIn: 0, offsetOut: 0 },
		{ anchor: 'center-center', inlineOffset: 17, label: 'inline-positive', offsetIn: 17, offsetOut: 17 },
		{ anchor: 'center-center', inlineOffset: -13, label: 'inline-negative', offsetIn: -13, offsetOut: -13 },
		{ anchor: 'center-center', anchorTop: 1950, label: 'external-anchor', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', mirror: true, label: 'mirror-entry-exit', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', mirror: true, once: true, label: 'once-over-mirror', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'bottom-top', height: 1700, label: 'taller-than-viewport', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'center-bottom', height: 0, label: 'zero-height', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'center-bottom', hidden: true, label: 'display-none', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', transformY: -350, label: 'transformed-target', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', clipParent: true, label: 'clipped-ancestor', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', horizontalOffset: 2400, label: 'offscreen-horizontal', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', position: 'sticky', label: 'sticky-target', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', position: 'fixed', label: 'fixed-target', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', nestedScroller: true, label: 'nested-scroller', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'center-bottom', viewport: 667, label: 'short-viewport', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'center-center', viewport: 900, label: 'tall-viewport', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-bottom', throttleDelay: 120, label: 'throttle-delay', offsetIn: 0, offsetOut: 37 },
		{ anchor: 'top-top', initialScroll: 1830, label: 'restored-scroll', offsetIn: 0, offsetOut: 37 },
	)
	const observed = []
	for (const testCase of cases) {
		const query = new URLSearchParams({ variant, anchor: testCase.anchor, globalAnchor: testCase.globalAnchor || 'top-bottom', offset: '37', top: '1800', height: String(testCase.height ?? 101), mirror: String(testCase.mirror || false), once: String(testCase.once || false), transformY: String(testCase.transformY || 0), horizontalOffset: String(testCase.horizontalOffset || 0), throttleDelay: String(testCase.throttleDelay || 0), position: testCase.position || '', clipParent: String(testCase.clipParent || false), nestedScroller: String(testCase.nestedScroller || false), hidden: String(testCase.hidden || false) })
		if (testCase.inlineOffset !== undefined) query.set('inlineOffset', String(testCase.inlineOffset))
		if (testCase.anchorTop !== undefined) query.set('anchorTop', String(testCase.anchorTop))
		if (testCase.initialScroll !== undefined) query.set('initialScroll', String(testCase.initialScroll))
		const page = await browser.newPage({ viewport: { width: testCase.viewportWidth || 1280, height: testCase.viewport || 800 } })
		try {
			await page.goto(`${base}/geometry?${query}`)
			await page.waitForFunction(() => window.AOS)
			const geometry = await page.evaluate(async () => {
				const subject = document.querySelector('#subject')
				window.scrollTo(0, Number(new URLSearchParams(location.search).get('initialScroll') || 0))
				const aosTop = element => { let top = 0; while (element && !Number.isNaN(element.offsetTop)) { top += element.offsetTop - (element.tagName !== 'BODY' ? element.scrollTop : 0); element = element.offsetParent }; return top }
				const reference = document.querySelector('#anchor-target') || subject
				document.dispatchEvent(new Event('anfb:geometry:start'))
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
				return { top: aosTop(reference), height: reference.offsetHeight, viewport: window.innerHeight, scrollY: window.scrollY, initialized: subject.classList.contains('aos-init'), animated: subject.classList.contains('aos-animate') }
			})
			assert(geometry.initialized, `${variant}: ${testCase.label} did not initialize on its start event`)
			const anchor = testCase.anchor || testCase.globalAnchor || 'top-bottom'
			if (variant === 'candidate') {
				const markerCount = await page.locator('[data-aos-observer]').count()
				const expectedMarkers = testCase.mirror && !testCase.once ? 2 : 1
				assert.equal(markerCount, expectedMarkers, `${variant}: ${testCase.label} used the unexpected detector`)
			}
			const anchorHeight = geometry.height
			const threshold = getTrigger(anchor, geometry.top, anchorHeight, geometry.viewport, testCase.offsetIn) + Number(args.geometryBias || 0)
			if (testCase.nestedScroller) {
				const nested = await page.evaluate(async () => {
					const scroller = document.querySelector('#scroller')
					scroller.scrollTop = 1800
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
					const animatedWhileNestedScrolling = document.querySelector('#subject').classList.contains('aos-animate')
					scroller.scrollTop = 0
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
					return { scrollTop: 1800, animatedWhileNestedScrolling }
				})
				assert.equal(nested.animatedWhileNestedScrolling, false, `${variant}: nested scroll unexpectedly triggered the animation`)
			}
			const results = []
			const targetYs = new Set([Math.floor(threshold) - 1, Math.floor(threshold), Math.ceil(threshold), Math.ceil(threshold) + 1].map(y => Math.max(0, y)))
			if (testCase.mirror) {
				const out = geometry.top + anchorHeight - testCase.offsetOut
				for (const target of [Math.floor(out) - 1, Math.floor(out), Math.ceil(out), Math.ceil(out) + 1]) targetYs.add(target)
			}
			for (const target of [...targetYs].sort((a, b) => a - b)) {
				const actual = await page.evaluate(async targetY => {
					const started = performance.now()
					if (window.scrollY !== targetY) {
						await new Promise(resolve => {
							const timeout = setTimeout(resolve, 100)
							window.addEventListener('scroll', () => { clearTimeout(timeout); resolve() }, { once: true })
							window.scrollTo(0, targetY)
						})
					}
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
					return { scrollY: window.scrollY, animated: document.querySelector('#subject').classList.contains('aos-animate'), responseMs: performance.now() - started }
				}, target)
				const out = geometry.top + anchorHeight - testCase.offsetOut
				const expected = actual.scrollY >= threshold && (testCase.once || !testCase.mirror || actual.scrollY < out)
				if (testCase.throttleDelay && actual.animated !== expected) {
					const settleStarted = Date.now()
					await page.waitForFunction(animated => document.querySelector('#subject').classList.contains('aos-animate') === animated, expected, { timeout: testCase.throttleDelay ? 600 : 200 })
					actual.responseMs += Date.now() - settleStarted
				}
				const settled = await page.locator('#subject').evaluate(element => element.classList.contains('aos-animate'))
				assert.equal(settled, expected, `${variant}: ${testCase.label} at scrollY=${actual.scrollY}, expected threshold=${threshold}`)
				results.push({ ...actual, animated: settled })
			}
			if (variant === 'candidate' && ['top-bottom', 'mirror-entry-exit', 'once-over-mirror', 'transformed-target', 'offscreen-horizontal', 'restored-scroll'].includes(testCase.label)) {
				const wasAnimatedBeforeJump = await page.locator('#subject').evaluate(element => element.classList.contains('aos-animate'))
				for (const targetY of [await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), 0]) {
					const jumped = await page.evaluate(async y => {
						window.scrollTo(0, y)
						await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
						return { scrollY, animated: document.querySelector('#subject').classList.contains('aos-animate') }
					}, targetY)
					const expectedAfterJump = testCase.once ? (wasAnimatedBeforeJump || jumped.scrollY >= threshold) : jumped.scrollY >= threshold && (!testCase.mirror || jumped.scrollY < geometry.top + anchorHeight - testCase.offsetOut)
					assert.equal(jumped.animated, expectedAfterJump, `${variant}: ${testCase.label} jump at scrollY=${jumped.scrollY}`)
				}
			}
			if (testCase.position !== 'fixed' && !testCase.hidden) assert.equal(geometry.top, testCase.anchorTop ?? 1800, `${variant}: ${testCase.label} reference top changed`)
			assert.equal(geometry.height, testCase.hidden ? 0 : testCase.anchorTop !== undefined ? 101 : testCase.height ?? 101, `${variant}: ${testCase.label} reference height changed`)
			if (testCase.initialScroll) assert(geometry.animated, `${variant}: ${testCase.label} did not initialize after restored scroll`)
			observed.push({ label: testCase.label, threshold, initialScroll: testCase.initialScroll || 0, results })
		} finally { await page.close() }
	}
	return observed
}

async function contracts(browser, base, variant) {
	const { page, errors } = await pageFor(browser, base, variant)
	let listenerCounts
	let mutationRefreshes
	let pageOffsetReads
	let timings
	let geometry
	try {
		const api = await page.evaluate(() => ['init', 'refresh', 'refreshHard'].every(name => typeof window.AOS[name] === 'function'))
		assert(api, `${variant}: public AOS API missing`)
		listenerCounts = await page.evaluate(() => {
			const active = type => window.__listeners.get(type)?.size || 0
			const io = () => ({ observers: window.__activeIO?.size || 0, targets: [...(window.__activeIO || [])].reduce((sum, observer) => sum + observer.__targets.size, 0) })
			const observersAfterInit = window.__activeObservers.size
			const afterInit = active('scroll')
			const ioAfterInit = io()
			const retiredIO = window.__allIO?.[0]
			const retiredMarker = retiredIO?.__seen[0]
			for (let i = 0; i < 100; i++) AOS.refresh()
			const after100Refresh = active('scroll')
			for (let i = 0; i < 100; i++) AOS.refreshHard()
			const after100RefreshHard = active('scroll')
			const ioAfter100RefreshHard = io()
			if (retiredMarker?.__aosElement) retiredMarker.__aosElement.position.in = -1
			if (retiredIO && retiredMarker) retiredIO.__emit([{ target: retiredMarker }], retiredIO)
			const staleCallbackChangedState = document.querySelector('#subject').classList.contains('aos-animate')
			const observersAfter100RefreshHard = window.__activeObservers.size
			for (let i = 0; i < 20; i++) AOS.init({ throttleDelay: 25 + i, debounceDelay: 10 + i })
			AOS.init({ duration: 250, easing: 'linear' })
			const updatedOptions = { duration: document.body.getAttribute('data-aos-duration'), easing: document.body.getAttribute('data-aos-easing') }
			AOS.init({ disableMutationObserver: true })
			const observersDisabled = window.__activeObservers.size
			AOS.init({ disableMutationObserver: false })
			return { afterInit, after100Refresh, after100RefreshHard, after20Reinit: active('scroll'), load: active('load'), resize: active('resize'), orientationchange: active('orientationchange'), observersAfterInit, observersAfter100RefreshHard, observersAfter20Reinit: window.__activeObservers.size, observersDisabled, updatedOptions, ioAfterInit, ioAfter100RefreshHard, ioAfter20Reinit: io(), staleCallbackChangedState }
		})
		if (variant === 'candidate') {
			assert.equal(listenerCounts.after100Refresh, 0, `${variant}: refresh must not add a scroll listener on the IO path`)
			assert.equal(listenerCounts.after100RefreshHard, 0, `${variant}: refreshHard must not add a scroll listener on the IO path`)
			assert.equal(listenerCounts.after20Reinit, 0, `${variant}: reinit must not add a scroll listener on the IO path`)
			assert.equal(listenerCounts.load, 0, `${variant}: completed initialization left a load listener attached`)
			assert.equal(listenerCounts.resize, 1, `${variant}: reinit duplicated the resize listener`)
			assert.equal(listenerCounts.orientationchange, 1, `${variant}: reinit duplicated the orientation listener`)
			assert.equal(listenerCounts.observersAfterInit, 1, `${variant}: expected one AOS mutation observer`)
			assert.equal(listenerCounts.observersAfter100RefreshHard, 1, `${variant}: refreshHard duplicated the mutation observer`)
			assert.equal(listenerCounts.observersAfter20Reinit, 1, `${variant}: reinit duplicated the mutation observer`)
			assert.equal(listenerCounts.observersDisabled, 0, `${variant}: disableMutationObserver did not disconnect`)
			assert.deepEqual(listenerCounts.ioAfterInit, { observers: 1, targets: 1 }, `${variant}: init should own one observer and one marker`)
			assert.deepEqual(listenerCounts.ioAfter100RefreshHard, { observers: 1, targets: 1 }, `${variant}: refreshHard accumulated IO resources`)
			assert.deepEqual(listenerCounts.ioAfter20Reinit, { observers: 1, targets: 1 }, `${variant}: reinit accumulated IO resources`)
			assert.equal(listenerCounts.staleCallbackChangedState, false, `${variant}: a disconnected observer changed element state`)
			assert.deepEqual(listenerCounts.updatedOptions, { duration: '250', easing: 'linear' }, `${variant}: reinit did not update global settings`)
		}
		const css = await page.locator('#subject').evaluate(element => getComputedStyle(element).opacity)
		assert.equal(css, '0', `${variant}: initial AOS CSS state`)
		timings = await page.evaluate(() => {
			document.body.dataset.aosDuration = '750'
			document.body.dataset.aosDelay = '500'
			const subject = document.querySelector('#subject')
			subject.dataset.aosDuration = '250'
			subject.dataset.aosDelay = '100'
			const local = getComputedStyle(subject).transitionDuration
			const delayBefore = getComputedStyle(subject).transitionDelay
			subject.classList.add('aos-animate')
			const delayAfter = getComputedStyle(subject).transitionDelay
			const parent = document.createElement('div')
			parent.dataset.aosDuration = '800'
			const child = document.createElement('div')
			child.dataset.aos = 'fade-up'
			parent.append(child)
			document.body.append(parent)
			const inherited = getComputedStyle(child).transitionDuration
			const zero = document.createElement('div')
			zero.dataset.aos = 'fade-up'
			zero.dataset.aosDuration = '0'
			document.body.append(zero)
			return { local, delayBefore, delayAfter, inherited, zero: getComputedStyle(zero).transitionDuration }
		})
		assert.deepEqual(timings, { local: '0.25s', delayBefore: '0s', delayAfter: '0.1s', inherited: '0.75s', zero: '0.75s' }, `${variant}: AOS timing CSS cascade`)
		geometry = await geometryContracts(browser, base, variant)

		const events = await page.evaluate(() => {
			window.__events = []
			document.addEventListener('aos:in', event => window.__events.push(['in', event.detail === document.querySelector('#subject')]))
			document.addEventListener('aos:out', event => window.__events.push(['out', event.detail === document.querySelector('#subject')]))
			document.addEventListener('aos:in:contract', event => window.__events.push(['id', event.detail === document.querySelector('#subject')]))
			return true
		})
		assert(events)
		await page.evaluate(() => window.scrollTo(0, document.querySelector('#subject').offsetTop))
		await page.waitForFunction(() => document.querySelector('#subject').classList.contains('aos-animate'))
		await page.waitForFunction(() => getComputedStyle(document.querySelector('#subject')).opacity === '1')
		assert.equal(await page.locator('#subject').evaluate(el => getComputedStyle(el).opacity), '1')
		const eventNames = await page.evaluate(() => window.__events.map(event => event[0]))
		assert(eventNames.includes('in'), `${variant}: missing aos:in`)
		assert(eventNames.includes('id'), `${variant}: missing aos:in:<id>`)
		assert((await page.evaluate(() => window.__events.filter(event => event[0] === 'in').every(event => event[1]))), `${variant}: aos:in detail is not the target`)

		// Move a single node through all supported anchors and verify each trigger threshold.
		for (const anchor of anchors) {
			const anchorPage = await pageFor(browser, base, variant, anchor)
			try {
				assert(!(await anchorPage.page.locator('#subject').evaluate(el => el.classList.contains('aos-animate'))), `${variant}: ${anchor} animated before scrolling`)
				await anchorPage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
				await anchorPage.page.waitForFunction(() => document.querySelector('#subject').classList.contains('aos-animate'))
			} finally { await anchorPage.page.close() }
		}

		await page.evaluate(() => {
			const dynamic = document.createElement('div')
			dynamic.id = 'dynamic'
			dynamic.dataset.aos = 'fade-up'
			dynamic.dataset.aosOffset = '0'
			document.body.append(dynamic)
			window.scrollTo(0, document.body.scrollHeight)
		})
		await page.waitForFunction(() => document.querySelector('#dynamic').classList.contains('aos-animate'))
		mutationRefreshes = await page.evaluate(async () => {
			const original = document.querySelectorAll.bind(document)
			let refreshes = 0
			document.querySelectorAll = selector => {
				if (selector === '[data-aos]') refreshes++
				return original(selector)
			}
			const before = window.__aosObserverDeliveries
			const batch = []
			for (let i = 0; i < 25; i++) {
				const item = document.createElement('div')
				item.dataset.aos = 'fade-up'
			batch.push(item)
			}
			const wrapper = document.createElement('div')
			const nested = document.createElement('div')
			nested.dataset.aos = 'fade-up'
			wrapper.append(nested)
			batch.push(wrapper)
			batch.forEach(item => document.body.append(item))
			await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
			const added = { deliveries: window.__aosObserverDeliveries - before, refreshes }
			refreshes = 0
			const removeBefore = window.__aosObserverDeliveries
			batch.forEach(item => item.remove())
			await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
			const removed = { deliveries: window.__aosObserverDeliveries - removeBefore, refreshes }
			const placeholder = document.createElement('div')
			document.body.append(placeholder)
			await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
			refreshes = 0
			const replaceBefore = window.__aosObserverDeliveries
			const replacement = document.createElement('div')
			replacement.dataset.aos = 'fade-up'
			placeholder.replaceWith(replacement)
			await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
			return { added, removed, replaced: { deliveries: window.__aosObserverDeliveries - replaceBefore, refreshes }, io: { observers: window.__activeIO?.size || 0, targets: [...(window.__activeIO || [])].reduce((sum, observer) => sum + observer.__targets.size, 0), markers: document.querySelectorAll('[data-aos-observer]').length, aosElements: document.querySelectorAll('[data-aos]').length } }
		})
		if (variant === 'candidate') {
			assert.equal(mutationRefreshes.added.deliveries, 1, `${variant}: expected one observer delivery for synchronous additions`)
			assert.equal(mutationRefreshes.added.refreshes, 1, `${variant}: additions should trigger one refreshHard per delivery`)
			assert.equal(mutationRefreshes.removed.deliveries, 1, `${variant}: expected one observer delivery for synchronous removal`)
			assert.equal(mutationRefreshes.removed.refreshes, 1, `${variant}: removals should trigger one refreshHard per delivery`)
			assert.equal(mutationRefreshes.replaced.deliveries, 1, `${variant}: expected one observer delivery for replacement`)
			assert.equal(mutationRefreshes.replaced.refreshes, 1, `${variant}: replacement should trigger one refreshHard per delivery`)
			assert.deepEqual(mutationRefreshes.io, { observers: 1, targets: mutationRefreshes.io.aosElements, markers: mutationRefreshes.io.aosElements, aosElements: mutationRefreshes.io.aosElements }, `${variant}: mutation refresh left stale observer targets`)
		}
		pageOffsetReads = await page.evaluate(() => {
			const pageOffset = window.pageYOffset
			let reads = 0
			Object.defineProperty(window, 'pageYOffset', { configurable: true, get() { reads++; return pageOffset } })
			AOS.refresh()
			delete window.pageYOffset
			return reads
		})
		if (variant === 'candidate') assert.equal(pageOffsetReads, 1, `${variant}: scroll pass should read pageYOffset once`)
		assert.deepEqual(errors, [], `${variant}: browser errors`)
	} finally { await page.close() }

	const once = await pageFor(browser, base, variant)
	try {
		await once.page.locator('#subject').evaluate(el => el.setAttribute('data-aos-once', 'true'))
		await once.page.evaluate(() => window.AOS.refreshHard())
		const y = await once.page.locator('#subject').evaluate(el => el.offsetTop)
		await once.page.evaluate(y => window.scrollTo(0, y), y)
		await once.page.waitForFunction(() => document.querySelector('#subject').classList.contains('aos-animate'))
		await once.page.evaluate(() => window.scrollTo(0, 0))
		await once.page.waitForTimeout(160)
		assert(await once.page.locator('#subject').evaluate(el => el.classList.contains('aos-animate')), `${variant}: once did not preserve animation`)
	} finally { await once.page.close() }

	const mirror = await pageFor(browser, base, variant)
	try {
		await mirror.page.evaluate(() => { window.__events = []; document.addEventListener('aos:out', () => window.__events.push('out')) })
		await mirror.page.locator('#subject').evaluate(el => el.setAttribute('data-aos-mirror', 'true'))
		await mirror.page.evaluate(() => window.AOS.refreshHard())
		const y = await mirror.page.locator('#subject').evaluate(el => el.offsetTop)
		await mirror.page.evaluate(y => window.scrollTo(0, y), y)
		await mirror.page.waitForFunction(() => document.querySelector('#subject').classList.contains('aos-animate'))
		await mirror.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
		await mirror.page.waitForFunction(() => !document.querySelector('#subject').classList.contains('aos-animate'))
		assert(await mirror.page.evaluate(() => window.__events.includes('out')), `${variant}: missing aos:out`)
	} finally { await mirror.page.close() }

	const override = await browser.newPage()
	try {
		await override.goto(`${base}/fixture?variant=${variant}&override=1`)
		await override.waitForFunction(() => window.__externalInit === 1)
		assert.equal(await override.evaluate(() => window.AOS.init instanceof Function), true)
	} finally { await override.close() }
	const customStart = await browser.newPage()
	try {
		await customStart.goto(`${base}/fixture?variant=${variant}&startEvent=1`)
		await customStart.waitForFunction(() => window.AOS && document.readyState === 'complete')
		assert.equal(await customStart.locator('#subject').evaluate(el => el.classList.contains('aos-init')), false)
		await customStart.evaluate(() => window.AOS.init({ startEvent: 'anfb:later' }))
		await customStart.evaluate(() => document.dispatchEvent(new Event('anfb:test')))
		await customStart.waitForTimeout(30)
		const oldStartTriggered = await customStart.locator('#subject').evaluate(el => el.classList.contains('aos-init'))
		if (variant === 'candidate') assert.equal(oldStartTriggered, false, `${variant}: old startEvent remained bound`)
		await customStart.evaluate(() => document.dispatchEvent(new Event('anfb:later')))
		await customStart.waitForFunction(() => document.querySelector('#subject').classList.contains('aos-init'))
	} finally { await customStart.close() }
	const dynamicDisable = await pageFor(browser, base, variant)
	try {
		const resources = await dynamicDisable.page.evaluate(() => {
			window.__disabled = false
			AOS.init({ disable: () => window.__disabled })
			window.__disabled = true
			AOS.refreshHard()
			return { observers: window.__activeIO?.size || 0, markers: document.querySelectorAll('[data-aos-observer]').length, scrollListeners: window.__listeners.get('scroll')?.size || 0, mutationObservers: window.__activeObservers.size }
		})
		if (variant === 'candidate') assert.deepEqual(resources, { observers: 0, markers: 0, scrollListeners: 0, mutationObservers: 0 }, `${variant}: dynamic disable left observer resources active`)
	} finally { await dynamicDisable.page.close() }
	const heightChange = await pageFor(browser, base, variant, 'bottom-bottom')
	let heightRefresh = null
	try {
		if (variant === 'candidate') {
			heightRefresh = await heightChange.page.evaluate(() => {
				const marker = document.querySelector('[data-aos-observer]')
				const before = parseFloat(marker.style.top)
				document.querySelector('#subject').style.height = '180px'
				AOS.refresh()
				return { before, after: parseFloat(document.querySelector('[data-aos-observer]').style.top), observers: window.__activeIO.size }
			})
			assert.equal(heightRefresh.after - heightRefresh.before, 100, `${variant}: refresh did not recalculate a changed element height`)
			assert.equal(heightRefresh.observers, 1, `${variant}: height refresh accumulated observers`)
		}
	} finally { await heightChange.page.close() }
	const resize = await pageFor(browser, base, variant, 'top-center')
	let viewportRefresh = null
	try {
		if (variant === 'candidate') {
			viewportRefresh = await resize.page.evaluate(() => ({ top: parseFloat(document.querySelector('[data-aos-observer]').style.top), instances: window.__allIO.length }))
			await resize.page.setViewportSize({ width: 1280, height: 600 })
			await resize.page.waitForTimeout(80)
			const resizedTop = await resize.page.locator('[data-aos-observer]').evaluate(marker => parseFloat(marker.style.top))
			await resize.page.evaluate(() => window.dispatchEvent(new Event('orientationchange')))
			await resize.page.waitForTimeout(80)
			const orientation = await resize.page.evaluate(() => ({ instances: window.__allIO.length, active: window.__activeIO.size }))
			assert.equal(resizedTop - viewportRefresh.top, 100, `${variant}: resize did not recalculate viewport threshold`)
			assert(orientation.instances > viewportRefresh.instances, `${variant}: orientation change did not refresh IO`)
			assert.equal(orientation.active, 1, `${variant}: orientation refresh accumulated IO observers`)
		}
	} finally { await resize.page.close() }
	return { variant, anchors: anchors.length, geometry, api: true, once: true, mirror: true, dynamicRefresh: true, dynamicDisable: true, heightRefresh, viewportRefresh, mutationRefreshes, pageOffsetReads, timings, externalOverride: true, customStartEventRebind: variant === 'candidate', listenerCounts }
}

;(async () => {
	assert(['contract', 'benchmark'].includes(mode), `Unknown mode: ${mode}`)
	for (const name of ['control', 'candidate']) for (const asset of ['aos.js', 'init.js', 'aos.css']) assert(fs.existsSync(path.join(variants[name], 'build', asset)), `Missing ${name} build/${asset}`)
	fs.mkdirSync(output, { recursive: true })
	const server = createServer()
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
	let browser
	try {
		const opts = { headless: true }
		if ((args.browser || 'chromium') === 'chromium') opts.executablePath = browserPath
		if ((args.browser || 'chromium') === 'firefox' && process.env.FIREFOX_PATH) opts.executablePath = process.env.FIREFOX_PATH
		browser = await browserType.launch(opts)
		const base = `http://127.0.0.1:${server.address().port}`
		const results = mode === 'contract'
			? await Promise.all([contracts(browser, base, 'control'), contracts(browser, base, 'candidate')])
				: await benchmark(browser, base)
		const file = path.join(output, `${mode}-${args.browser || 'chromium'}.json`)
		fs.writeFileSync(file, JSON.stringify({ mode, browser: args.browser || 'chromium', results }, null, 2) + '\n')
		console.log(JSON.stringify({ mode, file, results: mode === 'contract' ? results : `${results.length} samples` }, null, 2))
	} finally {
		await browser?.close()
		await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
	}
})().catch(error => { console.error(error); process.exitCode = 1 })
