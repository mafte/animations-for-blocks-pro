/** Infer display formatting from one selected number, never from the page locale. */
export function counterConfig(text) {
	const matches = [...text.matchAll(/[-−]?\d(?:[\d.,\s\u00a0\u202f]*\d)?/gu)]
	if (matches.length !== 1) throw new Error('Select a single number, for example 1.250,50 or 98%.')
	const match = matches[0]
	const raw = match[0].replace('−', '-')
	const compact = raw.replace(/[\s\u00a0\u202f]/gu, '')
	const separators = [...compact.matchAll(/[.,]/g)]
	let decimal = '.', thousands = '', decimals = 0
	if (separators.length) {
		const last = separators.at(-1)
		const fraction = compact.length - last.index - 1
		const mixed = compact.includes('.') && compact.includes(',')
		const grouping = !mixed && /^-?[1-9]\d{0,2}([.,])\d{3}(?:\1\d{3})*$/.test(compact)
		if (grouping) { thousands = last[0]; decimal = thousands === '.' ? ',' : '.' }
		else {
			decimal = last[0]
			decimals = fraction
			thousands = mixed ? (decimal === '.' ? ',' : '.') : ''
		}
	}
	const space = raw.match(/[\s\u00a0\u202f]/u)?.[0]
	if (space) {
		if (thousands) throw new Error('Use one consistent thousands separator.')
		thousands = space
	}
	const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const integerPattern = thousands ? `(?:\\d{1,3}(?:${escaped(thousands)}\\d{3})+|\\d+)` : '\\d+'
	const pattern = new RegExp(`^-?${integerPattern}${decimals ? escaped(decimal) + '\\d+' : ''}$`, 'u')
	if (!pattern.test(raw) || decimals > 10) throw new Error('The selected number has an unsupported format.')
	const numeric = (thousands ? raw.split(thousands).join('') : raw).replace(decimal, '.')
	const end = Number(numeric)
	if (!Number.isFinite(end) || Math.abs(end) > Number.MAX_SAFE_INTEGER) throw new Error('The selected number is too large.')
	return { start: 0, end, decimals, decimal, thousands, prefix: text.slice(0, match.index), suffix: text.slice(match.index + match[0].length) }
}
