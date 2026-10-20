const { chromium } = require('@playwright/test')
const assert = require('node:assert/strict')
const schema = require('../includes/animation-schema.json')
const path = require('node:path')

const animations = Object.entries(schema.variations).flatMap(([family, variations]) =>
	variations.map(variation => [family, variation, family === variation ? family : `${family}-${variation}`])
)
const easings = schema.easings
const markup = animations.map(([family, variation, name], i) =>
	`<div id="a${i}" data-aos="${name}" data-anfb-init data-anfb-distance data-aos-duration="500" data-aos-delay="100" style="--anfb-distance:24px;--anfb-distance-mobile:16px"></div>`
).join('') + easings.map((easing, i) => `<div id="e${i}" data-aos="fade" data-aos-easing="${easing}"></div>`).join('')

;(async () => {
	const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true})
	try {
		const page = await browser.newPage({viewport: {width: 1280, height: 800}})
		await page.setContent(`<main class="editor-styles-wrapper">${markup}</main>`)
		await page.addStyleTag({path: path.resolve('build/editor.css')})
		const initial = await page.evaluate(() => [...document.querySelectorAll('[data-aos]')].map(el => {
			const style = getComputedStyle(el)
			return {name: el.dataset.aos, opacity: style.opacity, visibility: style.visibility, transform: style.transform, clipPath: style.clipPath, transition: style.transitionProperty}
		}))
		for (let i = 0; i < animations.length; i++) {
			const [family, , name] = animations[i]
			const state = initial[i]
			if (['fade', 'zoom', 'scale'].includes(family)) assert.equal(state.opacity, '0', `${name} initial opacity`)
			if (family === 'slide') assert.equal(state.visibility, 'hidden', `${name} initial visibility`)
			if (family === 'curtain') assert.notEqual(state.clipPath, 'none', `${name} initial mask`)
			if (family === 'flip') assert.notEqual(state.transform, 'none', `${name} initial transform`)
		}

		await page.evaluate(() => document.querySelectorAll('[data-aos]').forEach(el => {
			el.setAttribute('data-anfb-animate', '')
			el.classList.add('aos-animate')
		}))
		await page.waitForTimeout(800)
		const final = await page.evaluate(() => [...document.querySelectorAll('[data-aos]')].map(el => {
			const style = getComputedStyle(el)
			return {name: el.dataset.aos, opacity: style.opacity, visibility: style.visibility, clipPath: style.clipPath, transition: style.transitionProperty}
		}))
		for (let i = 0; i < animations.length; i++) {
			const [family, , name] = animations[i]
			assert.match(final[i].transition, /clip-path/, `${name} transition properties`)
			if (['fade', 'zoom', 'scale'].includes(family)) assert.equal(final[i].opacity, '1', `${name} preview opacity`)
			if (family === 'slide') assert.equal(final[i].visibility, 'visible', `${name} preview visibility`)
			if (family === 'curtain') assert.match(final[i].clipPath, /inset\(0px\)/, `${name} preview mask`)
		}
		const fadeUp = initial.find(state => state.name === 'fade-up').transform
		assert.match(fadeUp, /24\)$/,'desktop distance')
		const timing = await page.locator('#a0').evaluate(el => [getComputedStyle(el).transitionDuration, getComputedStyle(el).transitionDelay])
		assert.deepEqual(timing, ['0.5s', '0.1s'])
		for (const easing of easings) {
			const timingFunction = await page.locator(`[data-aos-easing="${easing}"]`).evaluate(el => getComputedStyle(el).transitionTimingFunction)
			assert.notEqual(timingFunction, 'ease-out-soft', `${easing} resolves to a valid CSS timing function`)
			if (easing.includes('back') || easing.includes('sine') || easing.includes('quad') || easing.includes('cubic') || easing.includes('quart') || easing === 'ease-out-soft') assert.match(timingFunction, /^cubic-bezier\(/, `${easing} custom curve`)
		}

		await page.locator('[data-aos="fade-up"]').evaluate(el => {
			el.classList.remove('aos-animate')
			el.removeAttribute('data-anfb-animate')
		})
		await page.setViewportSize({width: 390, height: 844})
		const mobileDistance = await page.locator('[data-aos="fade-up"]').evaluate(el => getComputedStyle(el).transform)
		assert.match(mobileDistance, /16\)$/,'mobile distance')
		process.stdout.write(`Editor CSS checks passed for ${animations.length} schema animations, ${easings.length} easings, previews, timing, and desktop/mobile distance.\n`)
	} finally {
		await browser.close()
	}
})().catch(error => { console.error(error); process.exitCode = 1 })
