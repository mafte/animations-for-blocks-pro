import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = await readFile(new URL('../src/text-runtime.js', import.meta.url), 'utf8')
const { segments, counterText } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
assert.deepEqual(segments('café 👩🏽‍💻 🇳🇮', 'grapheme'), ['c', 'a', 'f', 'é', ' ', '👩🏽‍💻', ' ', '🇳🇮'])
const segmenter = Intl.Segmenter
Intl.Segmenter = undefined
assert.deepEqual(segments('e\u0301👩🏽‍💻🇳🇮', 'grapheme'), ['e\u0301', '👩🏽‍💻', '🇳🇮'])
assert.equal(segments('Hola  mundo', 'word').join(''), 'Hola  mundo')
Intl.Segmenter = segmenter
assert.equal(counterText(1250.5, { decimals: 2, decimal: ',', thousands: '.' }), '1.250,50')
assert.equal(counterText(1250.5, { decimals: 2, decimal: '.', thousands: ',' }), '1,250.50')
assert.equal(counterText(-1250.5, { decimals: 2, decimal: ',', thousands: '.', prefix: 'C$', suffix: ' netos' }), 'C$-1.250,50 netos')
assert.equal(counterText(98, { suffix: '%' }), '98%')
assert.equal(counterText(25, { prefix: '$', thousands: '' }), '$25')
console.log('Runtime checks passed: segmentation, Unicode fallback, number formatting.')
