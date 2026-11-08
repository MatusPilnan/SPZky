/**
 * A message is either a plain string or a set of plural forms selected by
 * Intl.PluralRules for the `count` param. Placeholders use `{name}` syntax.
 */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Message = string | PluralMessage;

export const en = {
	'app.name': 'ŠPZ-ky',
	'app.tagline': 'Hunt license plates from every region',

	'nav.home': 'Home',
	'nav.add': 'Add',
	'nav.history': 'History',
	'nav.settings': 'Settings',

	'home.total': { one: '{count} plate spotted', other: '{count} plates spotted' },
	'home.empty': 'No plates yet. Spot one and add it!',
	'home.addCta': 'Add a plate',
	'home.collectionsSoon': 'Per-country progress is coming in the next phase.',

	'add.title': 'Add a sighting',
	'add.plate': 'Plate number',
	'add.platePlaceholder': 'e.g. BA-123AB',
	'add.collection': 'Country',
	'add.region': 'Region code',
	'add.regionPlaceholder': 'e.g. BA',
	'add.save': 'Save',
	'add.saved': 'Saved {plate}',
	'add.duplicate': 'You already have this plate.',
	'add.temporaryNote': 'Temporary form: automatic country and region detection is coming next.',

	'history.title': 'History',
	'history.empty': 'Nothing here yet.',
	'history.delete': 'Delete',
	'history.confirmDelete': 'Delete this sighting?',
	'history.quickEntry': 'quick entry',

	'settings.title': 'Settings',
	'settings.language': 'Language',
	'settings.storage': 'Storage',
	'settings.storagePersisted': 'Data is stored persistently on this device.',
	'settings.storageNotPersisted': 'The browser may clear data when storage runs low.',
	'settings.storageRequest': 'Keep data permanently',
	'settings.storageUsage': 'Used {used} of {quota}',
	'settings.account': 'Account & sync',
	'settings.accountSoon': 'Signing in and syncing between devices is coming in a later phase.',
	'settings.version': 'Version {version}',

	'pwa.offlineReady': 'The app is ready to work offline.',
	'pwa.needRefresh': 'A new version is available.',
	'pwa.reload': 'Update',
	'pwa.close': 'Close',

	'collection.sk': 'Slovakia',
	'collection.cz': 'Czechia',
	'collection.cz-vintage': 'Czechia (pre-2001)'
} satisfies Record<string, Message>;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, Message>;

export const sk: Messages = {
	'app.name': 'ŠPZ-ky',
	'app.tagline': 'Zbieraj ŠPZ-ky zo všetkých okresov',

	'nav.home': 'Domov',
	'nav.add': 'Pridať',
	'nav.history': 'História',
	'nav.settings': 'Nastavenia',

	'home.total': {
		one: '{count} zaznamenaná ŠPZ',
		few: '{count} zaznamenané ŠPZ',
		other: '{count} zaznamenaných ŠPZ'
	},
	'home.empty': 'Zatiaľ žiadne ŠPZ. Nejakú zbadaj a pridaj!',
	'home.addCta': 'Pridať ŠPZ',
	'home.collectionsSoon': 'Postup po krajinách príde v ďalšej fáze.',

	'add.title': 'Nový úlovok',
	'add.plate': 'Evidenčné číslo',
	'add.platePlaceholder': 'napr. BA-123AB',
	'add.collection': 'Krajina',
	'add.region': 'Kód okresu',
	'add.regionPlaceholder': 'napr. BA',
	'add.save': 'Uložiť',
	'add.saved': 'Uložené: {plate}',
	'add.duplicate': 'Túto ŠPZ už máš.',
	'add.temporaryNote': 'Dočasný formulár: automatické rozpoznanie krajiny a okresu príde v ďalšom kroku.',

	'history.title': 'História',
	'history.empty': 'Zatiaľ tu nič nie je.',
	'history.delete': 'Zmazať',
	'history.confirmDelete': 'Zmazať tento záznam?',
	'history.quickEntry': 'rýchly záznam',

	'settings.title': 'Nastavenia',
	'settings.language': 'Jazyk',
	'settings.storage': 'Úložisko',
	'settings.storagePersisted': 'Dáta sú v tomto zariadení uložené natrvalo.',
	'settings.storageNotPersisted': 'Prehliadač môže dáta zmazať, keď mu dôjde miesto.',
	'settings.storageRequest': 'Uchovať dáta natrvalo',
	'settings.storageUsage': 'Využité {used} z {quota}',
	'settings.account': 'Účet a synchronizácia',
	'settings.accountSoon': 'Prihlásenie a synchronizácia medzi zariadeniami prídu v neskoršej fáze.',
	'settings.version': 'Verzia {version}',

	'pwa.offlineReady': 'Aplikácia je pripravená fungovať offline.',
	'pwa.needRefresh': 'Je dostupná nová verzia.',
	'pwa.reload': 'Aktualizovať',
	'pwa.close': 'Zavrieť',

	'collection.sk': 'Slovensko',
	'collection.cz': 'Česko',
	'collection.cz-vintage': 'Česko (do 2001)'
};
