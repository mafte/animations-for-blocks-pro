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

function fixture(override = false, anchor = '', count = 0) {
	const placement = anchors.includes(anchor) ? ` data-aos-anchor-placement="${anchor}"` : ''
	const items = Array.from({ length: Math.min(1000, Math.max(0, count)) }, (_, i) => `<div class="bench" data-aos="fade-up" style="height:12px">${i}</div>`).join('')
	return `<!doctype html><html class="no-js"><head><meta charset="utf-8"><link rel="stylesheet" href="/VARIANT/build/aos.css"><style>#spacer{height:1600px}[data-aos]{transition-duration:0s}</style><script>document.documentElement.classList.remove('no-js');window.anfbAosSettings={offset:0,duration:0,delay:0};window.__scrollListeners=[];const __add=window.addEventListener;window.addEventListener=function(type,listener,options){if(type==='scroll')window.__scrollListeners.push(listener);return __add.call(this,type,listener,options)};let __aos;Object.defineProperty(window,'AOS',{configurable:true,get(){return __aos},set(engine){__aos=engine;window.__aosReadyMs=performance.now()}});${override ? 'window.AOS={init:function(){window.__externalInit=(window.__externalInit||0)+1}};' : ''}</script></head><body><div id="spacer"></div><div id="subject" data-aos="fade-up" data-aos-id="contract" data-aos-offset="0"${placement} style="height:80px"></div>${items}<div style="height:1800px"></div><script defer src="/VARIANT/build/aos.js"></script><script defer src="/VARIANT/build/init.js"></script></body></html>`
}

function createServer() {
	return http.createServer((request, response) => {
		const url = new URL(request.url, 'http://localhost')
		if (url.pathname === '/fixture') {
			response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
			return response.end(fixture(url.searchParams.get('override') === '1', url.searchParams.get('anchor'), Number(url.searchParams.get('count'))).replaceAll('/VARIANT', `/${url.searchParams.get('variant') || 'control'}`))
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
			const afterInit = window.__scrollListeners.length
			for (let i = 0; i < 20; i++) AOS.refreshHard()
			return { afterInit, after20RefreshHard: window.__scrollListeners.length }
		})
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
			window.AOS.refreshHard()
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
	return { variant, anchors: anchors.length, api: true, once: true, mirror: true, dynamicRefresh: true, externalOverride: true, listenerCounts }
}

async function benchmark(browser, base) {
	const samples = []
	for (const count of [0, 30, 100, 500, 1000]) {
		for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
			for (const cpu of [1, 4]) {
				for (let run = 0; run <= 5; run++) {
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
							const scrollStart = performance.now(); window.scrollTo(0, document.body.scrollHeight / 2); window.dispatchEvent(new Event('scroll')); await new Promise(resolve => setTimeout(resolve, 130)); const scrollResponseMs = performance.now() - scrollStart
							return { aosReadyMs: window.__aosReadyMs, assetTransferMs: resources.reduce((sum, resource) => sum + resource.duration, 0), refreshMs, scrollResponseMs, scrollListenersAfterRefresh: window.__scrollListeners.length }
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
