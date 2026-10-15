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

const counterSource = await readFile(new URL('../src/counter-config.js', import.meta.url), 'utf8')
const { counterConfig } = await import('data:text/javascript;base64,' + Buffer.from(counterSource).toString('base64'))
for (const [text, end] of [['98%', 98], ['20+', 20], ['1.250,50', 1250.5], ['C$1,250.50', 1250.5], ['1.250', 1250], ['1,250', 1250], ['1.234.567', 1234567], ['-25,5', -25.5], ['−25', -25], ['0.125', 0.125], ['1 250,50 €', 1250.5], ['1\u202f250,50 €', 1250.5]]) {
 const config = counterConfig(text)
 assert.equal(config.end, end, text)
 assert.equal(counterText(end, config), text.replace('−', '-'), text)
 assert.notEqual(config.decimal, config.thousands)
}
for (const invalid of ['hello', '20 y 30', '1,2,3', '1 2', '1.234,5,6']) assert.throws(() => counterConfig(invalid), undefined, invalid)
console.log('Counter inference checks passed: locale formats, suffixes, currencies, negatives and invalid selections.')
