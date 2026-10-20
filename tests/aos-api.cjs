const { chromium } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const builds = {control: process.env.ANFB_CONTROL_BUILD, candidate: process.env.ANFB_CANDIDATE_BUILD}
if (process.env.ANFB_PLUGIN_BUILD) builds.plugin = process.env.ANFB_PLUGIN_BUILD
const selected = process.env.ANFB_ENGINES?.split(',')
if (selected) for (const engine of Object.keys(builds)) if (!selected.includes(engine)) delete builds[engine]
for (const [engine, build] of Object.entries(builds)) assert(build && fs.statSync(build).isDirectory(), `${engine} build directory is required`)
const files = {control: ['aos.css', 'aos.js', 'init.js'], candidate: ['aosio.css', 'aosio.js'], plugin: ['aos.css', 'aos.js', 'init.js']}
const options = [{once: false, mirror: false}, {once: false, mirror: true}, {once: true, mirror: false}, {once: true, mirror: true}]

;(async () => {
	const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true})
	const results = []
	try {
		for (const [engine, build] of Object.entries(builds)) for (const option of options) {
			const page = await browser.newPage({viewport: {width: 1280, height: 600}})
			await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{height:2400px}#target{position:absolute;top:1000px;height:100px;width:100px}</style><script>window.anfbAosSettings={offset:20};window.aosEvents=[];document.addEventListener('aos:in',e=>window.aosEvents.push(['in',e.detail?.node?.id]));document.addEventListener('aos:out',e=>window.aosEvents.push(['out',e.detail?.node?.id]));document.addEventListener('aos:in:probe',e=>window.aosEvents.push(['in-id',e.detail?.node?.id]));document.addEventListener('aos:out:probe',e=>window.aosEvents.push(['out-id',e.detail?.node?.id]))</script></head><body><div id="target" data-aos="fade-up" data-aos-once="${option.once}" data-aos-mirror="${option.mirror}" data-aos-id="probe"></div></body></html>`)
			await page.addStyleTag({path: path.join(build, files[engine][0])})
			for (const script of files[engine].slice(1)) await page.addScriptTag({path: path.join(build, script)})
			if (engine === 'candidate') await page.evaluate(() => window.AOS.init(window.anfbAosSettings))
			else await page.waitForFunction(() => document.documentElement.classList.contains('anfb-aos-running'))
			await page.evaluate(() => scrollTo(0, 1000))
			await page.waitForTimeout(150)
			const entered = await page.locator('#target').evaluate(el => el.classList.contains('aos-animate'))
			await page.evaluate(() => scrollTo(0, 0))
			await page.waitForTimeout(150)
			const result = await page.evaluate(() => ({
				animatedAfterExit: document.querySelector('#target').classList.contains('aos-animate'),
				events: window.aosEvents,
			}))
			results.push({engine, ...option, entered, ...result})
			await page.close()
		}
		process.stdout.write(JSON.stringify({chromium: browser.version(), results}, null, 2) + '\n')
	} finally {
		await browser.close()
	}
})().catch(error => { console.error(error); process.exitCode = 1 })
