import { animationAttributes, animationUpdate } from '../src/persistence'

test('new writes retain other metadata and have no legacy animation properties', () => {
 const attrs = {metadata:{name:'Keep',bindings:{keep:true}},animationsForBlocks:{animation:'fade',variation:'up'}}
 const next = animationUpdate(attrs,{animationStagger:100,isAnimationProvider:true})
 expect(next.metadata.name).toBe('Keep')
 expect(next.metadata.bindings).toEqual({keep:true})
 expect(next.animationsForBlocks).toBeUndefined()
 expect(next.metadata.anfb).toEqual({version:1,entry:attrs.animationsForBlocks,sequence:{enabled:true,interval:100}})
 expect(animationAttributes(next).animationStagger).toBe(100)
})
test('reset removes only plugin metadata and never restores stale legacy options', () => {
 const attrs = {metadata:{name:'Keep',anfb:{version:1,entry:{animation:'fade',variation:'up'}}},animationsForBlocks:{animation:'zoom'}}
 const next=animationUpdate(attrs,{animationsForBlocks:undefined})
 expect(next.metadata).toEqual({name:'Keep'})
 expect(animationAttributes(next).animationsForBlocks).toBeUndefined()
})
test('future versions are neither animated nor overwritten', () => {
 const attrs={metadata:{anfb:{version:9,entry:{animation:'fade'}}},animationsForBlocks:{animation:'zoom'}}
 expect(animationAttributes(attrs).animationsForBlocks).toBeUndefined()
 expect(animationUpdate(attrs,{animationsForBlocks:{animation:'fade'}})).toEqual({})
})

test.each([null, false, 0, '', {version:1,entry:'invalid'}, {version:1,sequence:{enabled:'yes',interval:-50}}])('malformed metadata is preserved rather than rewritten: %p', anfb => {
 const attrs={metadata:{name:'Keep',anfb},animationsForBlocks:{animation:'zoom'}}
 expect(animationUpdate(attrs,{animationsForBlocks:{animation:'fade'}})).toEqual({})
 expect(animationAttributes(attrs).animationsForBlocks).toBeUndefined()
 expect(animationAttributes(attrs).isAnimationProvider).toBeUndefined()
})
