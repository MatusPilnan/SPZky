import type { Message } from './messages';

export type Params = Record<string, string | number>;

/** Resolves plural forms and fills `{placeholders}`. Pure, so it is unit-testable. */
export function formatMessage(message: Message, locale: string, params?: Params): string {
	let text: string;
	if (typeof message === 'string') {
		text = message;
	} else {
		const rule = new Intl.PluralRules(locale).select(Number(params?.count ?? 0));
		text = message[rule] ?? message.other;
	}
	if (!params) return text;
	return text.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in params ? String(params[name]) : match
	);
}
