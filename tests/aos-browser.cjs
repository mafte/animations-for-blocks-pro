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
	return `<!doctype html><html class="no-js"><head><meta charset="utf-8"><link rel="stylesheet" href="/VARIANT/build/aos.css"><style>#spacer{height:1600px}[data-aos]{transition-duration:0s}</style><script>document.documentElement.classList.remove('no-js');window.anfbAosSettings={offset:0,duration:0,delay:0${customStart ? ",startEvent:'anfb:test'" : ''}};window.__listeners=new Map();const __add=window.addEventListener,__remove=window.removeEventListener;window.addEventListener=function(type,listener,options){if(!window.__listeners.has(type))window.__listeners.set(type,new Set());window.__listeners.get(type).add(listener);return __add.call(this,type,listener,options)};window.removeEventListener=function(type,listener,options){window.__listeners.get(type)?.delete(listener);return __remove.call(this,type,listener,options)};window.__activeObservers=new Set();const __MutationObserver=window.MutationObserver;window.MutationObserver=class extends __MutationObserver{constructor(callback){super(callback);this.__aosObserver=new Error().stack.includes('/build/aos.js')}observe(...args){if(this.__aosObserver)window.__activeObservers.add(this);return super.observe(...args)}disconnect(){if(this.__aosObserver)window.__activeObservers.delete(this);return super.disconnect()}};let __aos;Object.defineProperty(window,'AOS',{configurable:true,get(){return __aos},set(engine){__aos=engine;window.__aosReadyMs=performance.now()}});${override ? 'window.AOS={init:function(){window.__externalInit=(window.__externalInit||0)+1}};' : ''}</script></head><body><div id="spacer"></div><div id="subject" data-aos="fade-up" data-aos-id="contract" data-aos-offset="0"${placement} style="height:80px"></div>${items}<div style="height:1800px"></div><script defer src="/VARIANT/build/aos.js"></script><script defer src="/VARIANT/build/init.js"></script></body></html>`
}

function createServer() {
	return http.createServer((request, response) => {
		const url = new URL(request.url, 'http://localhost')
		if (url.pathname === '/fixture') {
			response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
			return response.end(fixture(url.searchParams.get('override') === '1', url.searchParams.get('anchor'), Number(url.searchParams.get('count')), url.searchParams.get('startEvent') === '1').replaceAll('/VARIANT', `/${url.searchParams.get('variant') || 'control'}`))
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
	await page.goto(`${base}/fixture?variant=${variant}${anchor ? `&anchor=${anchor}` : ''}`)
	await page.waitForFunction(() => window.AOS && document.querySelector('#subject')?.classList.contains('aos-init'))
	return { page, errors }
}

async function contracts(browser, base, variant) {
	const { page, errors } = await pageFor(browser, base, variant)
	let listenerCounts
	try {
		const api = await page.evaluate(() => ['init', 'refresh', 'refreshHard'].every(name => typeof window.AOS[name] === 'function'))
		assert(api, `${variant}: public AOS API missing`)
		listenerCounts = await page.evaluate(() => {
			const active = type => window.__listeners.get(type)?.size || 0
			const observersAfterInit = window.__activeObservers.size
			const afterInit = active('scroll')
			for (let i = 0; i < 100; i++) AOS.refresh()
			const after100Refresh = active('scroll')
			for (let i = 0; i < 100; i++) AOS.refreshHard()
			const after100RefreshHard = active('scroll')
			const observersAfter100RefreshHard = window.__activeObservers.size
			for (let i = 0; i < 20; i++) AOS.init({ throttleDelay: 25 + i, debounceDelay: 10 + i })
			AOS.init({ duration: 250, easing: 'linear' })
			const updatedOptions = { duration: document.body.getAttribute('data-aos-duration'), easing: document.body.getAttribute('data-aos-easing') }
			AOS.init({ disableMutationObserver: true })
			const observersDisabled = window.__activeObservers.size
			AOS.init({ disableMutationObserver: false })
			return { afterInit, after100Refresh, after100RefreshHard, after20Reinit: active('scroll'), load: active('load'), resize: active('resize'), orientationchange: active('orientationchange'), observersAfterInit, observersAfter100RefreshHard, observersAfter20Reinit: window.__activeObservers.size, observersDisabled, updatedOptions }
		})
		if (variant === 'candidate') {
			assert.equal(listenerCounts.after100Refresh, 1, `${variant}: refresh must keep one scroll listener`)
			assert.equal(listenerCounts.after100RefreshHard, 1, `${variant}: refreshHard must keep one scroll listener`)
			assert.equal(listenerCounts.after20Reinit, 1, `${variant}: reinit must keep one scroll listener`)
			assert.equal(listenerCounts.load, 0, `${variant}: completed initialization left a load listener attached`)
			assert.equal(listenerCounts.resize, 1, `${variant}: reinit duplicated the resize listener`)
			assert.equal(listenerCounts.orientationchange, 1, `${variant}: reinit duplicated the orientation listener`)
			assert.equal(listenerCounts.observersAfterInit, 1, `${variant}: expected one AOS mutation observer`)
			assert.equal(listenerCounts.observersAfter100RefreshHard, 1, `${variant}: refreshHard duplicated the mutation observer`)
			assert.equal(listenerCounts.observersAfter20Reinit, 1, `${variant}: reinit duplicated the mutation observer`)
			assert.equal(listenerCounts.observersDisabled, 0, `${variant}: disableMutationObserver did not disconnect`)
			assert.deepEqual(listenerCounts.updatedOptions, { duration: '250', easing: 'linear' }, `${variant}: reinit did not update global settings`)
		}
		const css = await page.locator('#subject').evaluate(element => getComputedStyle(element).opacity)
		assert.equal(css, '0', `${variant}: initial AOS CSS state`)

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
	return { variant, anchors: anchors.length, api: true, once: true, mirror: true, dynamicRefresh: true, externalOverride: true, customStartEventRebind: variant === 'candidate', listenerCounts }
}

async function benchmark(browser, base) {
	const samples = []
	const counts = (args.counts || '0,30,100,500,1000').split(',').map(Number)
	const viewports = args.viewport ? [{ name: args.viewport, width: args.viewport === 'mobile' ? 390 : 1280, height: args.viewport === 'mobile' ? 844 : 800 }] : [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]
	const cpus = args.cpu ? [Number(args.cpu)] : [1, 4]
	const repetitions = Number(args.samples || 5)
	assert(counts.length && counts.every(count => Number.isInteger(count) && count >= 0 && count <= 1000), 'Invalid --counts')
	assert(viewports.every(viewport => ['desktop', 'mobile'].includes(viewport.name)), 'Invalid --viewport')
	assert(cpus.every(cpu => [1, 4].includes(cpu)), 'Invalid --cpu')
	assert(Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 10, 'Invalid --samples')
	for (const count of counts) {
		for (const viewport of viewports) {
			for (const cpu of cpus) {
				for (let run = 0; run <= repetitions; run++) {
					for (const variant of ((run + count + cpu) % 2 ? ['candidate', 'control'] : ['control', 'candidate'])) {
						const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
						const session = await context.newCDPSession(await context.newPage())
						await session.send('Emulation.setCPUThrottlingRate', { rate: cpu })
						const page = context.pages()[0]
						await page.goto(`${base}/fixture?variant=${variant}&count=${count}`)
						await page.waitForFunction(() => window.AOS)
						const metrics = await page.evaluate(async () => {
							const resources = performance.getEntriesByType('resource').filter(r => /\/build\/(init|aos)\.js/.test(r.name))
							const start = performance.now(); AOS.refreshHard(); const refreshMs = performance.now() - start
							const refresh100Start = performance.now(); for (let i = 0; i < 100; i++) AOS.refresh(); const refresh100Ms = performance.now() - refresh100Start
							const refreshHard100Start = performance.now(); for (let i = 0; i < 100; i++) AOS.refreshHard(); const refreshHard100Ms = performance.now() - refreshHard100Start
							const scrollListenersAfter100 = window.__listeners.get('scroll')?.size || 0
							const scrollStart = performance.now(); window.scrollTo(0, document.body.scrollHeight / 2); window.dispatchEvent(new Event('scroll')); await new Promise(resolve => setTimeout(resolve, 130)); const scrollResponseMs = performance.now() - scrollStart
							return { aosReadyMs: window.__aosReadyMs, assetTransferMs: resources.reduce((sum, resource) => sum + resource.duration, 0), refreshMs, refresh100Ms, refreshHard100Ms, scrollResponseMs, scrollListenersAfter100 }
						})
						if (run > 0) samples.push({ variant, count, viewport: viewport.name, cpu, sample: run, ...metrics })
						await context.close()
					}
				}
			}
		}
	}
	return samples
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
