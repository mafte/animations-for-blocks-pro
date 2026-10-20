const { chromium } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

;(async () => {
	const base = process.env.ANFB_TEST_URL || 'http://127.0.0.1:8765'
	const post = process.env.ANFB_TEST_POST || '4'
	const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
	let page
	try {
		const context = await browser.newContext()
		page = await context.newPage()
		page.setDefaultTimeout(20000)
		page.setDefaultNavigationTimeout(30000)
		const errors = []
		page.on('pageerror', error => { errors.push(error.message); console.error('Page error:', error.message) })
		if (process.env.ANFB_TEST_LOGIN_URL) {
			await page.goto(process.env.ANFB_TEST_LOGIN_URL)
			await page.waitForURL(/wp-admin/)
		} else {
			await page.goto(base + '/wp-login.php')
			// WordPress focuses the username after a 200 ms timeout on the login page.
			await page.waitForTimeout(250)
			await page.locator('#user_login').fill('anfb-test')
			await page.locator('#user_pass').fill('anfb-local-tests-only')
			await Promise.all([page.waitForURL(/wp-admin/), page.locator('#wp-submit').click()])
		}
		await page.goto(base + '/wp-admin/post.php?post=' + post + '&action=edit')
		await page.waitForFunction(() => window.wp?.data?.select('core/editor')?.getCurrentPostId())
		await page.waitForFunction(() => window.wp?.data?.select('core/rich-text')?.getFormatType('anfb/text'))
		assert.equal(await page.evaluate(() => wp.data.select('core/editor').getEditedPostAttribute('title')), 'ANFB acceptance fixture')
		const initial = await page.evaluate(() => {
			const blocks = wp.data.select('core/block-editor').getBlocks()
			const walk = items => items.flatMap(block => [{ name: block.name, valid: block.isValid }, ...walk(block.innerBlocks)])
			return walk(blocks)
		})
		assert(initial.every(block => block.valid !== false), JSON.stringify(initial))
		const welcomeClose = page.locator('.components-modal__frame button[aria-label="Close"]')
		if (await welcomeClose.count()) await welcomeClose.first().click()
		await page.evaluate(() => {
			wp.data.dispatch('core/edit-post').openGeneralSidebar('edit-post/block')
			wp.data.dispatch('core/block-editor').selectBlock(wp.data.select('core/block-editor').getBlocks()[0].clientId)
		})
		const panel = page.locator('.wsd-anfb.components-panel')
		const advancedPanel = page.getByRole('button', { name: 'Advanced', exact: true })
		if (!await panel.count() && await advancedPanel.count()) await advancedPanel.click()
		await panel.getByRole('button', { name: 'Sequence', exact: true }).click()
		await panel.getByLabel('Provide animation to children', { exact: true }).check()
		await panel.getByLabel('Interval (ms)', { exact: true }).fill('100')
		await page.screenshot({ path: '/private/tmp/anfb-sequence.png' })
		await page.evaluate(() => wp.data.dispatch('core/block-editor').selectBlock(wp.data.select('core/block-editor').getBlocks()[0].innerBlocks[0].clientId))
		const animationGroup = panel.getByRole('group', { name: 'Select animation', exact: true })
		await animationGroup.getByRole('button', { name: 'Curtain', exact: true }).focus()
		await page.keyboard.press('Enter')
		await panel.getByRole('group', { name: 'Animation variation', exact: true }).getByRole('button', { name: 'Left', exact: true }).click()
		assert.equal(await page.evaluate(() => (wp.data.select('core/block-editor').getSelectedBlock().attributes.metadata?.anfb?.entry || wp.data.select('core/block-editor').getSelectedBlock().attributes.animationsForBlocks).variation), 'left')
		await page.screenshot({ path: '/private/tmp/anfb-entry-controls.png' })
		await panel.getByRole('button', { name: 'More actions', exact: true }).click()
		await page.getByRole('menuitem', { name: 'Settings', exact: true }).click()
		const settingsModal = page.getByRole('dialog', { name: 'Animations for Blocks settings', exact: true })
		const originalSettings = await page.evaluate(() => wp.data.select('core').getEditedEntityRecord('root', 'site')['animations-for-blocks'])
		await settingsModal.getByRole('button', { name: 'Curtain', exact: true }).click()
		await settingsModal.getByRole('button', { name: 'Left', exact: true }).click()
		await settingsModal.getByRole('button', { name: 'Curtain', exact: true }).click()
		const savedSettings = await page.evaluate(async () => {
			const record = await wp.data.dispatch('core').saveEditedEntityRecord('root', 'site')
			return record['animations-for-blocks'].defaultAnimation
		})
		assert.equal(savedSettings.animation, 'curtain', 'Required global animation was deselected')
		assert.equal(savedSettings.variation, 'left', 'REST settings lost the selected variation')
		await page.screenshot({ path: '/private/tmp/anfb-global-settings.png' })
		await page.evaluate(async settings => {
			wp.data.dispatch('core').editEntityRecord('root', 'site', undefined, { 'animations-for-blocks': settings })
			await wp.data.dispatch('core').saveEditedEntityRecord('root', 'site')
		}, originalSettings)
		await settingsModal.getByRole('button', { name: 'Close', exact: true }).click()
		const canvas = page.frames().find(frame => frame.name() === 'editor-canvas') || page.mainFrame()
		const paragraphEditable = canvas.locator('[data-type="core/paragraph"][contenteditable="true"], [data-type="core/paragraph"] [contenteditable="true"]').first()
		await paragraphEditable.click()
		await paragraphEditable.evaluate(element => {
			const doc = element.ownerDocument
			const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT)
			while (walker.nextNode()) {
				const offset = walker.currentNode.textContent.indexOf('satisfacción')
				if (offset < 0) continue
				const range = doc.createRange()
				range.setStart(walker.currentNode, offset)
				range.setEnd(walker.currentNode, offset + 'satisfacción'.length)
				const selection = doc.getSelection()
				selection.removeAllRanges()
				selection.addRange(range)
				doc.dispatchEvent(new Event('selectionchange'))
				break
			}
		})
		await page.waitForTimeout(250)
		const animationButton = page.getByRole('button', { name: 'Text animation', exact: true })
		if (!await animationButton.isVisible()) await page.getByRole('button', { name: 'More', exact: true }).click()
		await page.screenshot({ path: '/private/tmp/anfb-ui-before.png' })
		await page.getByText('Text animation', { exact: true }).click()
		await page.getByLabel('Effect', { exact: true }).selectOption('words')
		await page.getByLabel('Duration (ms)', { exact: true }).fill('400')
		await page.getByRole('button', { name: 'Apply', exact: true }).click()
		assert((await page.evaluate(() => wp.data.select('core/editor').getEditedPostContent())).includes('satisfacción</span>'), 'Toolbar format was not applied')
		await page.screenshot({ path: '/private/tmp/anfb-toolbar.png' })
		// Exercise the registered format through the same RichText API used by its UI.
		await page.evaluate(() => {
			const editor = wp.data.dispatch('core/block-editor')
			const blocks = wp.data.select('core/block-editor').getBlocks()[0].innerBlocks
			const paragraph = blocks[1]
			const value = wp.richText.create({ html: paragraph.attributes.content })
			const text = '1.250,50'
			const start = value.text.indexOf(text)
			const config = { effect: 'count', duration: 400, delay: 0, start: 0, end: 1250.5, decimals: 2, decimal: ',', thousands: '.', prefix: '', suffix: '' }
			const next = wp.richText.applyFormat(value, { type: 'anfb/text', attributes: { config: JSON.stringify(config) } }, start, start + text.length)
			editor.updateBlockAttributes(paragraph.clientId, { content: wp.richText.toHTMLString({ value: next }) })
			const heading = blocks[0]
			const headingValue = wp.richText.create({ html: heading.attributes.content })
			const headingNext = wp.richText.applyFormat(headingValue, { type: 'anfb/text', attributes: { config: JSON.stringify({ effect: 'words', duration: 400, delay: 0 }) } }, 0, headingValue.text.length)
			editor.updateBlockAttributes(heading.clientId, { content: wp.richText.toHTMLString({ value: headingNext }), animationsForBlocks: undefined, metadata: { ...heading.attributes.metadata, anfb: { ...heading.attributes.metadata?.anfb, version: 1, entry: { animation: 'fade', variation: 'up', duration: 400, once: true } } } })
			const gb = blocks[2]
			const gbValue = wp.richText.create({ html: gb.attributes.content })
			const gbNext = wp.richText.applyFormat(gbValue, { type: 'anfb/text', attributes: { config: JSON.stringify({ effect: 'typing', duration: 400, delay: 0, cursor: true }) } }, 0, gbValue.text.length)
			editor.updateBlockAttributes(gb.clientId, { content: wp.richText.toHTMLString({ value: gbNext }) })
		})
		await page.evaluate(() => wp.data.dispatch('core/editor').savePost())
		await page.reload()
		await page.waitForFunction(() => window.wp?.data?.select('core/block-editor')?.getBlocks()?.length)
		const saved = await page.evaluate(() => {
			const blocks = wp.data.select('core/block-editor').getBlocks()
			return { valid: blocks[0].innerBlocks.every(block => block.isValid !== false), sequence: (blocks[0].attributes.metadata?.anfb?.sequence?.enabled ?? blocks[0].attributes.isAnimationProvider) && (blocks[0].attributes.metadata?.anfb?.sequence?.interval ?? blocks[0].attributes.animationStagger) === 100, content: wp.data.select('core/editor').getEditedPostContent() }
		})
		assert(saved.valid, 'Editor reloaded invalid blocks')
		assert(saved.sequence, 'Sequence settings did not survive save/reload')
		assert(saved.content.includes('data-anfb='))
		await page.waitForTimeout(600)
		await page.screenshot({ path: '/private/tmp/anfb-editor.png', fullPage: false })
		const aosResponses = []
		page.on('response', response => {
			const path = new URL(response.url()).pathname
			if (/\/build\/(aos\.js|init\.js|aos\.css)$/.test(path)) aosResponses.push({ path, status: response.status(), url: response.url() })
		})
		await page.goto(base + '/?page_id=' + post)
		await page.locator('span.anfb-text').first().waitFor()
		await page.waitForFunction(() => !!document.querySelector('.anfb-text-source'), null, { timeout: 2000 })
		await page.waitForTimeout(1600)
		for (const file of ['aos.js', 'init.js', 'aos.css']) {
			const responses = aosResponses.filter(response => response.path.endsWith('/' + file))
			assert.equal(responses.length, 1, `Expected exactly one HTTP response for ${file}`)
			assert.equal(responses[0].status, 200, `${file} returned HTTP ${responses[0].status}`)
		}
		const waterfall = await page.evaluate(() => performance.getEntriesByType('resource')
			.filter(entry => /\/build\/(aos\.js|init\.js|aos\.css)$/.test(new URL(entry.name).pathname))
			.map(({name, initiatorType, startTime, responseEnd, duration, transferSize, encodedBodySize, decodedBodySize}) => ({name, initiatorType, startTime, responseEnd, duration, transferSize, encodedBodySize, decodedBodySize})))
		assert.equal(waterfall.length, 3, 'Expected one browser resource entry for each AOS asset')
		fs.writeFileSync('/private/tmp/anfb-aos-waterfall.json', JSON.stringify({responses: aosResponses, resources: waterfall}, null, 2))
		assert.equal(await page.locator('.anfb-text-source').count(), 0, 'Temporary animation markup survived completion')
		assert((await page.locator('body').innerText()).includes('1.250,50'))
		assert.equal(await page.locator('script[src*="build/text.js"]').count(), 1)
		await page.screenshot({ path: '/private/tmp/anfb-desktop.png', fullPage: true })
		await page.setViewportSize({ width: 390, height: 844 })
		await page.reload()
		await page.waitForTimeout(1600)
		assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow on mobile')
		await page.screenshot({ path: '/private/tmp/anfb-mobile.png', fullPage: true })
		const reduced = await browser.newContext({ reducedMotion: 'reduce' })
		const reducedPage = await reduced.newPage()
		await reducedPage.goto(base + '/?page_id=' + post)
		assert.equal(await reducedPage.locator('.anfb-text-source').count(), 0)
		assert((await reducedPage.locator('body').innerText()).includes('1.250,50'))
		await reduced.close()
		const nojs = await browser.newContext({ javaScriptEnabled: false })
		const nojsPage = await nojs.newPage()
		await nojsPage.goto(base + '/?page_id=' + post)
		assert((await nojsPage.locator('body').innerText()).includes('1.250,50'))
		assert.equal(await nojsPage.locator('[data-aos]').first().evaluate(element => getComputedStyle(element).opacity), '1', 'AOS hid content without JavaScript')
		await nojs.close()
		const failed = await browser.newContext()
		const failedPage = await failed.newPage()
		await failedPage.route('**/build/init.js*', route => route.abort())
		await failedPage.goto(base + '/?page_id=' + post)
		await failedPage.waitForFunction(() => getComputedStyle(document.querySelector('[data-aos]')).opacity === '1', null, { timeout: 3000 })
		assert.equal(await failedPage.locator('[data-aos]').first().evaluate(element => getComputedStyle(element).opacity), '1', 'AOS hid content after initialization failure')
		await failed.close()
		assert.deepEqual(errors, [], 'Browser errors')
		console.log('Browser checks passed: entry controls and keyboard, global settings REST save, sequences, registered format, Gutenberg save/reload, GenerateBlocks, toolbar controls, active animations, desktop/mobile, reduced motion, JavaScript disabled and initialization failure.')
	} catch (error) {
		await page?.screenshot({ path: '/private/tmp/anfb-browser-error.png' }).catch(() => {})
		throw error
	} finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
