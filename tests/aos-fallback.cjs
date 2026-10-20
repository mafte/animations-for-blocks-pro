const { chromium } = require('@playwright/test')
const assert = require('node:assert/strict')
const path = require('node:path')

const build = path.resolve(process.env.ANFB_PLUGIN_BUILD || 'build')
const fallback = 'html:not(.anfb-aos-ready):not(.anfb-aos-pending) [data-aos]{opacity:1!important;visibility:visible!important;transform:none!important;clip-path:none!important;transition:none!important;pointer-events:auto!important}'
const pending = '@media(prefers-reduced-motion:no-preference){html.anfb-aos-pending [data-aos]{opacity:0!important}}'

;(async () => {
	const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true})
	try {
		const results = []
		for (const scenario of ['no-js', 'reduced-motion', 'no-intersection-observer']) {
			const page = await browser.newPage({viewport: {width: 1280, height: 800}})
			if (scenario === 'reduced-motion') await page.emulateMedia({reducedMotion: 'reduce'})
			const rootClass = scenario === 'no-js' ? '' : 'anfb-aos-pending'
			await page.setContent(`<!doctype html><html class="${rootClass}"><head><style>body{margin:0;height:2000px}.target{margin-top:1000px;height:100px}</style></head><body><div class="target" data-aos="fade-up">Content</div></body></html>`)
			await page.addStyleTag({path: path.join(build, 'aos.css')})
			await page.addStyleTag({content: pending + fallback})
			if (scenario !== 'no-js') {
				if (scenario === 'no-intersection-observer') await page.evaluate(() => {
					Object.defineProperty(window, 'IntersectionObserver', {value: undefined})
					Object.defineProperty(window, 'IntersectionObserverEntry', {value: undefined})
				})
				await page.addScriptTag({path: path.join(build, 'aos.js')})
				await page.addScriptTag({path: path.join(build, 'init.js')})
				await page.waitForFunction(() => !document.documentElement.classList.contains('anfb-aos-pending') && (!document.documentElement.classList.contains('anfb-aos-ready') || document.documentElement.classList.contains('anfb-aos-running')))
			}
			const state = await page.locator('.target').evaluate(el => ({opacity: getComputedStyle(el).opacity, visibility: getComputedStyle(el).visibility, classes: document.documentElement.className}))
			assert.equal(state.opacity, '1', `${scenario} left content transparent: ${JSON.stringify(state)}`)
			assert.equal(state.visibility, 'visible', `${scenario} left content hidden`)
			results.push({scenario, ...state})
			await page.close()
		}
		process.stdout.write(JSON.stringify({chromium: browser.version(), results}, null, 2) + '\n')
	} finally {
		await browser.close()
	}
})().catch(error => { console.error(error); process.exitCode = 1 })
