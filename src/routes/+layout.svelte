<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { i18n, t } from '#lib/i18n/i18n.svelte.js';
	import type { MessageKey } from '#lib/i18n/messages.js';
	import UpdatePrompt from '#lib/components/UpdatePrompt.svelte';

	let { children } = $props();

	i18n.init();

	const nav: { href: '/' | '/add' | '/history' | '/settings'; label: MessageKey; icon: string }[] = [
		{ href: '/', label: 'nav.home', icon: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z' },
		{ href: '/add', label: 'nav.add', icon: 'M12 5v14M5 12h14' },
		{ href: '/history', label: 'nav.history', icon: 'M12 7v5l3 3M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z' },
		{
			href: '/settings',
			label: 'nav.settings',
			icon: 'M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4'
		}
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname.replace(/\/$/, '') || '/';
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<div class="app">
	<header>
		<a href={resolve('/')} class="brand">{t('app.name')}</a>
	</header>

	<main>
		{@render children()}
	</main>

	<nav aria-label="Main">
		{#each nav as item (item.href)}
			<a href={resolve(item.href)} class:active={isActive(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.icon} /></svg>
				<span>{t(item.label)}</span>
			</a>
		{/each}
	</nav>

	<UpdatePrompt />
</div>

<style>
	.app {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		padding: calc(0.75rem + env(safe-area-inset-top)) 1rem 0.75rem;
		background: var(--eu-blue);
		color: #fff;
	}
	.brand {
		color: inherit;
		text-decoration: none;
		font-family: var(--font-plate);
		font-weight: 700;
		font-size: 1.35rem;
		letter-spacing: 0.04em;
	}
	main {
		flex: 1;
		width: 100%;
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem 1rem calc(var(--nav-height) + 1.5rem + env(safe-area-inset-bottom));
	}
	nav {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		height: calc(var(--nav-height) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--surface);
		border-top: 1px solid var(--border);
	}
	nav a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 600;
	}
	nav a.active {
		color: var(--accent);
	}
	nav svg {
		width: 1.5rem;
		height: 1.5rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
