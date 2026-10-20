const { chromium } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const builds = {control: process.env.ANFB_CONTROL_BUILD, candidate: process.env.ANFB_CANDIDATE_BUILD}
if (process.env.ANFB_PLUGIN_BUILD) builds.plugin = process.env.ANFB_PLUGIN_BUILD
const selected = process.env.ANFB_ENGINES?.split(',')
if (selected) for (const engine of Object.keys(builds)) if (!selected.includes(engine)) delete builds[engine]
const placements = ['top-bottom', 'center-bottom', 'bottom-bottom', 'top-center', 'center-center', 'bottom-center', 'top-top', 'center-top', 'bottom-top']
const offset = 20
const height = 100
for (const [name, build] of Object.entries(builds)) assert(build && fs.statSync(build).isDirectory(), `${name} build directory is required`)
const files = {control: ['aos.css', 'aos.js', 'init.js'], candidate: ['aosio.css', 'aosio.js'], plugin: ['aos.css', 'aos.js', 'init.js']}

;(async () => {
	const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true})
	const results = []
	try {
		for (const [engine, build] of Object.entries(builds)) {
			const page = await browser.newPage({viewport: {width: 1280, height: 600}})
			const targets = placements.map((placement, i) => `<div id="${placement}" class="target" data-aos="fade-up" data-aos-offset="${offset}" data-aos-once="true" data-aos-anchor-placement="${placement}" style="top:${2200 + i * 1600}px"></div>`).join('')
			await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{height:20000px}.target{position:absolute;height:${height}px;width:100px}</style><script>window.anfbAosSettings={once:true,offset:${offset}};window.anchorEvents=[];document.addEventListener('aos:in',e=>window.anchorEvents.push({id:e.detail?.node?.id||e.detail?.id,y:scrollY}))</script></head><body>${targets}</body></html>`)
			await page.addStyleTag({path: path.join(build, files[engine][0])})
			for (const script of files[engine].slice(1)) await page.addScriptTag({path: path.join(build, script)})
			if (engine === 'candidate') await page.evaluate(() => window.AOS.init(window.anfbAosSettings))
			else await page.waitForFunction(() => document.documentElement.classList.contains('anfb-aos-running'))
			for (let i = 0; i < placements.length; i++) {
				const adjustment = [0, height / 2, height, 300, 300 + height / 2, 300 + height, 600, 600 + height / 2, 600 + height][i]
				const top = 2200 + i * 1600
				const expected = top - 600 + adjustment + offset
				for (let y = expected - 120; y <= expected + 120; y += 2) {
					await page.evaluate(y => scrollTo(0, y), y)
					await page.waitForTimeout(8)
				}
			}
			await page.waitForTimeout(150)
			const {events, animated} = await page.evaluate(() => ({events: window.anchorEvents, animated: [...document.querySelectorAll('.target.aos-animate')].map(el => el.id)}))
			for (let i = 0; i < placements.length; i++) {
				const id = placements[i]
				const event = events.find(item => item.id === id)
				const adjustment = [0, height / 2, height, 300, 300 + height / 2, 300 + height, 600, 600 + height / 2, 600 + height][i]
				const expected = 2200 + i * 1600 - 600 + adjustment + offset
				results.push({engine, placement: id, expectedY: expected, observedY: event?.y ?? null, delta: event ? event.y - expected : null, animated: animated.includes(id)})
			}
			await page.close()
		}
		const output = {date: new Date().toISOString(), chromium: browser.version(), offset, elementHeight: height, tolerancePx: 5, results}
		if (process.env.ANFB_RESULTS_DIR) {
			fs.mkdirSync(process.env.ANFB_RESULTS_DIR, {recursive: true})
			fs.writeFileSync(path.join(process.env.ANFB_RESULTS_DIR, 'anchors.json'), JSON.stringify(output, null, 2))
		}
		process.stdout.write(JSON.stringify(output, null, 2) + '\n')
	} finally {
		await browser.close()
	}
})().catch(error => { console.error(error); process.exitCode = 1 })
