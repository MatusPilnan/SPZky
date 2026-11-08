import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Run with `npm run icons` after changing static/favicon.svg.
export default defineConfig({
	headLinkOptions: { preset: '2023' },
	preset: {
		...minimal2023Preset,
		maskable: {
			...minimal2023Preset.maskable,
			padding: 0.1,
			resizeOptions: { background: '#003399' }
		},
		apple: {
			...minimal2023Preset.apple,
			padding: 0.1,
			resizeOptions: { background: '#003399' }
		}
	},
	images: ['static/favicon.svg']
});
