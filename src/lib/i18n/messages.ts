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
	'home.collectionsSoon': 'Per-country progress screens are coming in the next phase.',

	'add.title': 'Add a sighting',
	'add.modePlate': 'Plate number',
	'add.modeQuick': 'Quick tap',
	'add.plate': 'Plate number',
	'add.platePlaceholder': 'BA-123AB',
	'add.unrecognized': 'Plate not recognised. Choose the region manually:',
	'add.chooseManually': 'Different region? Choose manually',
	'add.newRegion': 'New!',
	'add.duplicate': 'You already logged this plate on {date}.',
	'add.save': 'Save',
	'add.saved': 'Saved {plate}',
	'add.newRegionToast': 'New region: {code} – {name}',
	'add.details': 'Time & note',
	'add.seenAt': 'Spotted at',
	'add.note': 'Note',
	'add.notePlaceholder': 'e.g. highway D1, red Škoda',
	'add.collection': 'Country',
	'add.region': 'Region',
	'add.undo': 'Undo',
	'add.quickHint': 'Tap the region code you just saw.',
	'add.quickSaved': 'Logged {code} – {name}',

	'add.chooseCountry': 'This plate fits more than one country. Which one did you see?',
	'add.evColorHint': 'Tip: Slovak EV plates have green letters, Czech ones black.',
	'add.notCounted': 'not counted toward progress',
	'add.savedNationwide': 'Saved {plate} (nationwide)',
	'add.quickSavedNationwide': 'Logged nationwide: {type}',

	'nationwide.title': 'Nationwide',
	'nationwide.hint': 'Plates without a region. They don’t count toward progress.',
	'nationwide.count': { one: '{count} plate', other: '{count} plates' },
	'nationwideType.sk-2023': 'Standard (since 2023)',
	'nationwideType.sk-personalized': 'Personalised',
	'nationwideType.ev': 'Electric',
	'nationwideType.cz-personalized': 'Personalised',

	'format.sk-district': 'district plate',
	'format.sk-district-special': 'special / personalised plate',
	'format.sk-2023': 'plate since 2023',
	'format.sk-personalized': 'personalised plate',
	'format.ev': 'electric vehicle',
	'format.cz-standard': 'standard plate',
	'format.cz-historic': 'historic vehicle',
	'format.cz-personalized': 'personalised plate',
	'format.cz-vintage': 'plate before 2001',

	'location.idle': 'Location is not saved (enable in Settings)',
	'location.waiting': 'Getting location…',
	'location.ok': 'Location will be saved (±{accuracy} m)',
	'location.denied': 'Location permission denied',
	'location.unavailable': 'Location unavailable',

	'grid.found': '{found} / {total} found',

	'history.title': 'History',
	'history.empty': 'Nothing here yet.',
	'history.quickEntry': 'quick entry',

	'edit.title': 'Edit sighting',
	'edit.notFound': 'This sighting doesn’t exist (anymore).',
	'edit.save': 'Save changes',
	'edit.saved': 'Changes saved',
	'edit.delete': 'Delete sighting',
	'edit.confirmDelete': 'Delete this sighting?',
	'edit.deleted': 'Sighting deleted',
	'edit.location': 'Location',
	'edit.noLocation': 'No location saved.',
	'edit.showOnMap': 'Show on map',
	'edit.removeLocation': 'Remove location',
	'edit.back': 'Back',
	'edit.changeRegion': 'Change',
	'edit.closePicker': 'Close',

	'settings.title': 'Settings',
	'settings.language': 'Language',
	'settings.adding': 'Adding plates',
	'settings.returnHomeAfterAdd': 'Return to the home screen after adding a plate',
	'settings.returnHomeAfterAddHint':
		'When off, the Add screen stays open so you can log the next plate right away.',
	'settings.location': 'Location',
	'settings.saveLocation': 'Save location with new sightings',
	'settings.saveLocationHint':
		'The position is read only while the Add screen is open and stays on this device (until sync is set up).',
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
	'home.collectionsSoon': 'Prehľad postupu po krajinách príde v ďalšej fáze.',

	'add.title': 'Nový úlovok',
	'add.modePlate': 'Evidenčné číslo',
	'add.modeQuick': 'Rýchly ťuk',
	'add.plate': 'Evidenčné číslo',
	'add.platePlaceholder': 'BA-123AB',
	'add.unrecognized': 'ŠPZ nerozpoznaná. Vyber okres ručne:',
	'add.chooseManually': 'Iný okres? Vybrať ručne',
	'add.newRegion': 'Nový!',
	'add.duplicate': 'Túto ŠPZ si už zaznamenal(a) {date}.',
	'add.save': 'Uložiť',
	'add.saved': 'Uložené: {plate}',
	'add.newRegionToast': 'Nový okres: {code} – {name}',
	'add.details': 'Čas a poznámka',
	'add.seenAt': 'Videné',
	'add.note': 'Poznámka',
	'add.notePlaceholder': 'napr. diaľnica D1, červená Škoda',
	'add.collection': 'Krajina',
	'add.region': 'Okres / kraj',
	'add.undo': 'Späť',
	'add.quickHint': 'Ťukni na kód, ktorý si práve videl(a).',
	'add.quickSaved': 'Zaznamenané {code} – {name}',

	'add.chooseCountry': 'Táto ŠPZ sedí na viac krajín. Ktorú si videl(a)?',
	'add.evColorHint': 'Tip: slovenské ŠPZ elektromobilov majú zelené písmo, české čierne.',
	'add.notCounted': 'nezapočítava sa do postupu',
	'add.savedNationwide': 'Uložené: {plate} (celoštátna)',
	'add.quickSavedNationwide': 'Zaznamenaná celoštátna: {type}',

	'nationwide.title': 'Celoštátne',
	'nationwide.hint': 'ŠPZ bez okresu či kraja. Nezapočítavajú sa do postupu.',
	'nationwide.count': { one: '{count} ŠPZ', few: '{count} ŠPZ', other: '{count} ŠPZ' },
	'nationwideType.sk-2023': 'Bežná (od 2023)',
	'nationwideType.sk-personalized': 'Personalizovaná',
	'nationwideType.ev': 'Elektromobil',
	'nationwideType.cz-personalized': 'Personalizovaná',

	'format.sk-district': 'okresná ŠPZ',
	'format.sk-district-special': 'špeciálna / personalizovaná ŠPZ',
	'format.sk-2023': 'ŠPZ od roku 2023',
	'format.sk-personalized': 'personalizovaná ŠPZ',
	'format.ev': 'elektromobil',
	'format.cz-standard': 'štandardná ŠPZ',
	'format.cz-historic': 'historické vozidlo',
	'format.cz-personalized': 'personalizovaná ŠPZ',
	'format.cz-vintage': 'ŠPZ spred roku 2001',

	'location.idle': 'Poloha sa neukladá (zapni v Nastaveniach)',
	'location.waiting': 'Zisťujem polohu…',
	'location.ok': 'Poloha sa uloží (±{accuracy} m)',
	'location.denied': 'Prístup k polohe bol zamietnutý',
	'location.unavailable': 'Poloha nie je dostupná',

	'grid.found': '{found} / {total} nájdených',

	'history.title': 'História',
	'history.empty': 'Zatiaľ tu nič nie je.',
	'history.quickEntry': 'rýchly záznam',

	'edit.title': 'Upraviť záznam',
	'edit.notFound': 'Tento záznam neexistuje (už).',
	'edit.save': 'Uložiť zmeny',
	'edit.saved': 'Zmeny uložené',
	'edit.delete': 'Zmazať záznam',
	'edit.confirmDelete': 'Zmazať tento záznam?',
	'edit.deleted': 'Záznam zmazaný',
	'edit.location': 'Poloha',
	'edit.noLocation': 'Poloha nebola uložená.',
	'edit.showOnMap': 'Zobraziť na mape',
	'edit.removeLocation': 'Odstrániť polohu',
	'edit.back': 'Späť',
	'edit.changeRegion': 'Zmeniť',
	'edit.closePicker': 'Zavrieť',

	'settings.title': 'Nastavenia',
	'settings.language': 'Jazyk',
	'settings.adding': 'Pridávanie ŠPZ',
	'settings.returnHomeAfterAdd': 'Po pridaní ŠPZ sa vrátiť na domovskú obrazovku',
	'settings.returnHomeAfterAddHint':
		'Keď je vypnuté, obrazovka Pridať zostane otvorená, aby si mohol(a) hneď zapísať ďalšiu ŠPZ.',
	'settings.location': 'Poloha',
	'settings.saveLocation': 'Ukladať polohu k novým záznamom',
	'settings.saveLocationHint':
		'Poloha sa zisťuje len kým je otvorená obrazovka Pridať a zostáva v tomto zariadení (kým nepribudne synchronizácia).',
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
