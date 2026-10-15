import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source = fs.readFileSync(new URL('../src/init.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '')
function boot({ reduced = false, armed = true, fail = false } = {}) {
 const classes = new Set(armed ? ['anfb-aos-pending'] : [])
 const frames = [], calls = []
 const root = { classList: { contains: c => classes.has(c), add: (...cs) => cs.forEach(c => classes.add(c)), remove: (...cs) => cs.forEach(c => classes.delete(c)) } }
 const element = { hasAttribute: a => a === 'data-anfb-distance', getAttribute: () => '24', style: { setProperty: (k,v) => calls.push([k,v]) } }
 const AOS = { init: () => { calls.push({ready: classes.has('anfb-aos-ready'), pending: classes.has('anfb-aos-pending')}); if (fail) throw Error('fixture') } }
 vm.runInNewContext(source, { AOS, window: {}, document: {documentElement: root, readyState: 'complete', querySelectorAll: () => [element]}, matchMedia: () => ({matches: reduced}), requestAnimationFrame: cb => frames.push(cb), getComputedStyle: () => ({opacity: 0}), console: {error() {}} })
 return { classes, frames, calls }
}
const normal = boot()
assert.equal(normal.calls.some(c => c.ready), false)
assert(normal.classes.has('anfb-aos-ready'))
normal.frames.shift()()
assert.equal(normal.calls.some(c => c.ready), false)
normal.frames.shift()()
assert(normal.calls.some(c => c.ready && !c.pending))
assert(normal.classes.has('anfb-aos-running'))
assert(normal.calls.some(c => c[0] === '--anfb-distance' && c[1] === '24px'))
const failed = boot({fail:true}); failed.frames.shift()(); failed.frames.shift()()
assert.equal(failed.classes.size, 0)
assert.equal(boot({reduced:true}).classes.size, 0)
assert.equal(boot({armed:false}).frames.length, 0)
console.log('Boot checks passed: initial paint before AOS, reduced motion, failure and late initialization.')
