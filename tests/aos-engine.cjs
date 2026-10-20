const { chromium } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const builds = {
	control: process.env.ANFB_CONTROL_BUILD,
	candidate: process.env.ANFB_CANDIDATE_BUILD,
}
if (process.env.ANFB_PLUGIN_BUILD) builds.plugin = process.env.ANFB_PLUGIN_BUILD
for (const [engine, root] of Object.entries(builds)) assert(root && fs.statSync(root).isDirectory(), `${engine} build directory is required`)

const assets = {
	control: ['aos.css', 'aos.js', 'init.js'],
	candidate: ['aosio.css', 'aosio.js'],
	plugin: ['aos.css', 'aos.js', 'init.js'],
}
const fixture = fs.readFileSync(path.join(__dirname, 'aos-engine.html'), 'utf8')

;(async () => {
	const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true})
	const results = []
	try {
		for (const engine of Object.keys(builds)) for (const count of [20, 100, 500]) {
			const page = await browser.newPage({viewport: {width: 1280, height: 800}})
			const errors = []
			page.on('pageerror', error => errors.push(error.message))
			const start = Date.now()
			const items = Array.from({length: count}, (_, i) => `<div id="item-${i}" class="item" data-aos="fade-up" data-aos-once="true">Item ${i}</div>`).join('')
			await page.setContent(fixture.replace('__ITEMS__', items))
			await page.addStyleTag({path: path.join(builds[engine], assets[engine][0])})
			for (const script of assets[engine].slice(1)) await page.addScriptTag({path: path.join(builds[engine], script)})
			if (engine === 'candidate') await page.evaluate(() => window.AOS.init(window.anfbAosSettings))
			else await page.waitForFunction(() => document.documentElement.classList.contains('anfb-aos-running'))
			const initializedMs = Date.now() - start
			const height = await page.evaluate(() => document.documentElement.scrollHeight)
			for (let y = 0; y < height; y += 700) {
				await page.evaluate(y => scrollTo(0, y), y)
				await page.waitForTimeout(60)
			}
			await page.evaluate(() => {
				const node = document.createElement('div')
				node.id = 'dynamic-item'
				node.className = 'item'
				node.dataset.aos = 'fade-up'
				node.textContent = 'Dynamic item'
				document.querySelector('#items').append(node)
				window.AOS.refreshHard()
				node.scrollIntoView()
			})
			await page.waitForTimeout(120)
			await page.waitForTimeout(500)
			const result = await page.evaluate(() => ({
				count: document.querySelectorAll('[data-aos]').length,
				animated: document.querySelectorAll('#items > .item:not(#dynamic-item).aos-animate').length,
				dynamicAnimated: document.querySelector('#dynamic-item').classList.contains('aos-animate'),
				dynamicVisible: getComputedStyle(document.querySelector('#dynamic-item')).opacity === '1',
				dynamicEvent: window.anfbEngineEvents.includes('dynamic-item'),
				visible: [...document.querySelectorAll('#items > .item:not(#dynamic-item)')].every(element => getComputedStyle(element).opacity === '1'),
			}))
			assert.equal(result.count, count + 1)
			assert.equal(result.animated, count, `${engine} animated ${result.animated}/${count} static items`)
			assert.equal(result.dynamicAnimated, engine !== 'candidate', `${engine} dynamic refresh result changed`)
			assert.equal(result.dynamicVisible, engine !== 'candidate', `${engine} dynamic visibility result changed`)
			assert.equal(result.dynamicEvent, engine !== 'candidate', `${engine} dynamic event result changed`)
			assert.equal(result.visible, true, `${engine} left content hidden`)
			assert.deepEqual(errors, [], `${engine} raised browser errors: ${errors.join('; ')}`)
			results.push({engine, elements: count, initializedMs, ...result})
			await page.close()
		}
		const output = {date: new Date().toISOString(), chromium: browser.version(), results}
		if (process.env.ANFB_RESULTS_DIR) {
			fs.mkdirSync(process.env.ANFB_RESULTS_DIR, {recursive: true})
			fs.writeFileSync(path.join(process.env.ANFB_RESULTS_DIR, 'smoke.json'), JSON.stringify(output, null, 2))
		}
		process.stdout.write(JSON.stringify(output, null, 2) + '\n')
	} finally {
		await browser.close()
	}
})().catch(error => { console.error(error); process.exitCode = 1 })
