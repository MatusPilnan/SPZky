import type { Region } from './types';

// Polish regional codes (wyróżniki) of the system since 2000. Checked 2026-11-16.
//
// Sources:
// - https://pl.wikipedia.org/wiki/Tablice_rejestracyjne_w_Polsce (codes, secondary codes,
//   which ones are "not in use", formats)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Poland (full code table)
//
// Structure: first letter = voivodeship (D/V dolnośląskie, C kujawsko-pomorskie,
// L lubelskie, F lubuskie, E łódzkie, K/J małopolskie, W/A mazowieckie, O opolskie,
// R/Y podkarpackie, B podlaskie, G/X pomorskie, S/I śląskie, T świętokrzyskie,
// N warmińsko-mazurskie, P/M wielkopolskie, Z zachodniopomorskie); one or two more letters
// = county (powiat) or city county. Many counties have secondary codes once the first ran
// out, sometimes with the voivodeship's second letter (e.g. Kraków KR, KK, JR).
//
// What's in: every code both sources list as used, incl. secondary codes, and codes no
// longer issued but still valid on cars: DB (Wałbrzych 2003–2012), PKO (Konin until
// 2001), SRS (Ruda Śląska, older), POZ (Poznań county, before PZ), NOG (Olecko-Gołdap
// county until 2002; very rare now; no map area).
// What's out: codes pl.wikipedia marks as never used by the office (BIB, SBN, CBC, KBA,
// PA, TKC, TKM, TKP, LVB, NOX, PX, WPX, RZR, ZZ, SWZ, DWW, VWW); STY (listed by
// en.wikipedia as "Tychy County", which does not exist; not in pl.wikipedia); special
// series: army (U…), police and services (H…), diplomatic (W + 6 digits), and personalised
// plates (voivodeship letter + digit + free text: no county).
// Warsaw's district codes (WA…WY, AE) all count as "Warszawa" (one city county on the map).
// Plausibility: 441 codes for the 380 counties/city counties on the map (every area has at
// least one code; 60 more are secondary codes, 15 of them Warsaw's further district codes) + NOG
// without an area. The maps test checks that every area has a code and vice versa.
//
// Table: code | name | map area (dataset name, without diacritics; same-named counties of
// two voivodeships carry the voivodeship, see scripts/build-maps.mjs).
const TABLE = `
DB|Wałbrzych (miasto)|Walbrzych
DBA|Wałbrzych|Walbrzyski
DBL|Bolesławiec|Boleslawiecki
DDZ|Dzierżoniów|Dzierzoniowski
DGL|Głogów|Glogowski
DGR|Góra|Gorowski
DJ|Jelenia Góra (miasto)|Jelenia Gora
DJA|Jawor|Jaworski
DJE|Karkonosze|Jeleniogorski
DKA|Kamienna Góra|Kamiennogorski
DKL|Kłodzko|Klodzki
DL|Legnica (miasto)|Legnica
DLB|Lubań|Lubanski
DLE|Legnica|Legnicki
DLU|Lubin|Lubinski
DLW|Lwówek Śląski|Lwowecki
DMI|Milicz|Milicki
DOA|Oława|Olawski
DOL|Oleśnica|Olesnicki
DPL|Polkowice|Polkowicki
DSR|Środa Śląska|Sredzki (Dolnośląskie)
DST|Strzelin|Strzelinski
DSW|Świdnica|Swidnicki (Dolnośląskie)
DTR|Trzebnica|Trzebnicki
DW|Wrocław (miasto)|Wroclaw
DX|Wrocław (miasto)|Wroclaw
VW|Wrocław (miasto)|Wroclaw
DWL|Wołów|Wolowski
DWR|Wrocław|Wroclawski
VWR|Wrocław|Wroclawski
DZA|Ząbkowice Śląskie|Zabkowicki
DZG|Zgorzelec|Zgorzelecki
DZL|Złotoryja|Zlotoryjski
CAL|Aleksandrów Kujawski|Aleksandrowski
CB|Bydgoszcz (miasto)|Bydgoszcz
CBR|Brodnica|Brodnicki
CBY|Bydgoszcz|Bydgoski
CCH|Chełmno|Chelminski
CG|Grudziądz (miasto)|Grudziadz
CGD|Golub-Dobrzyń|Golubsko-Dobrzynski
CGR|Grudziądz|Grudziadzki
CIN|Inowrocław|Inowroclawski
CLI|Lipno|Lipnowski
CMG|Mogilno|Mogilenski
CNA|Nakło nad Notecią|Nakielski
CRA|Radziejów|Radziejowski
CRY|Rypin|Rypinski
CSE|Sępólno Krajeńskie|Sepolenski
CSW|Świecie|Swiecki
CT|Toruń (miasto)|Torun
CTR|Toruń|Torunski
CTU|Tuchola|Tucholski
CW|Włocławek (miasto)|Wloclawek
CWA|Wąbrzeźno|Wabrzeski
CWL|Włocławek|Wloclawski
CZN|Żnin|Zninski
EBE|Bełchatów|Belchatowski
EBR|Brzeziny|Brzezinski
EKU|Kutno|Kutnowski
EL|Łódź (miasto)|Lodz
ED|Łódź (miasto)|Lodz
ELA|Łask|Laski
ELC|Łowicz|Lowicki
ELE|Łęczyca|Leczycki
ELW|Łódź wschodni|Lodzki Wschodni
EOP|Opoczno|Opoczynski
EP|Piotrków Trybunalski (miasto)|Piotrkow Trybunalski
EPA|Pabianice|Pabianicki
EPD|Poddębice|Poddebicki
EPI|Piotrków Trybunalski|Piotrkowski
EPJ|Pajęczno|Pajeczanski
ERA|Radomsko|Radomszczanski
ERW|Rawa Mazowiecka|Rawski
ES|Skierniewice (miasto)|Skierniewice
ESI|Sieradz|Sieradzki
ESK|Skierniewice|Skierniewicki
ETM|Tomaszów Mazowiecki|Tomaszowski (Łódzkie)
EWE|Wieruszów|Wieruszowski
EWI|Wieluń|Wielunski
EZD|Zduńska Wola|Zdunskowolski
EZG|Zgierz|Zgierski
LB|Biała Podlaska (miasto)|Biala Podlaska
LBI|Biała Podlaska|Bialski
LBL|Biłgoraj|Bilgorajski
LC|Chełm (miasto)|Chelm
LCH|Chełm|Chelmski
LHR|Hrubieszów|Hrubieszowski
LJA|Janów Lubelski|Janowski
LKR|Kraśnik|Krasnicki
LKS|Krasnystaw|Krasnostawski
LLB|Lubartów|Lubartowski
LLE|Łęczna|Leczynski
LLU|Łuków|Lukowski
LOP|Opole Lubelskie|Opolski (Lubelskie)
LPA|Parczew|Parczewski
LPU|Puławy|Pulawski
LRA|Radzyń Podlaski|Radzynski
LRY|Ryki|Rycki
LSW|Świdnik|Swidnicki (Lubelskie)
LTM|Tomaszów Lubelski|Tomaszowski (Lubelskie)
LU|Lublin (miasto)|Lublin
LUB|Lublin|Lubelski
LWL|Włodawa|Wlodawski
LZ|Zamość (miasto)|Zamosc
LZA|Zamość|Zamojski
FG|Gorzów Wielkopolski (miasto)|Gorzow Wielkopolski
FGW|Gorzów Wielkopolski|Gorzowski
FKR|Krosno Odrzańskie|Krosnienski (Lubuskie)
FMI|Międzyrzecz|Miedzyrzecki
FNW|Nowa Sól|Nowosolski
FSD|Strzelce Krajeńskie|Strzelecko-Drezdenecki
FSL|Słubice|Slubicki
FSU|Sulęcin|Sulecinski
FSW|Świebodzin|Swiebodzinski
FWS|Wschowa|Wschowski
FZ|Zielona Góra (miasto)|Zielona Gora
FZA|Żary|Zarski
FZG|Żagań|Zaganski
FZI|Zielona Góra|Zielonogorski
KBC|Bochnia|Bochenski
KBR|Brzesko|Brzeski (Małopolskie)
KCH|Chrzanów|Chrzanowski
KDA|Dąbrowa Tarnowska|Dabrowski
KGR|Gorlice|Gorlicki
KLI|Limanowa|Limanowski
KMI|Miechów|Miechowski
KMY|Myślenice|Myslenicki
KN|Nowy Sącz (miasto)|Nowy Sacz
KNS|Nowy Sącz|Nowosadecki
KNT|Nowy Targ|Nowotarski
KOL|Olkusz|Olkuski
KOS|Oświęcim|Oswiecimski
KPR|Proszowice|Proszowicki
KR|Kraków (miasto)|Krakow
KK|Kraków (miasto)|Krakow
JR|Kraków (miasto)|Krakow
KRA|Kraków|Krakowski
KRK|Kraków|Krakowski
KSU|Sucha Beskidzka|Suski
KT|Tarnów (miasto)|Tarnow
KTA|Tarnów|Tarnowski
JTA|Tarnów|Tarnowski
KTT|Zakopane (tatrzański)|Tatrzanski
KWA|Wadowice|Wadowicki
JWA|Wadowice|Wadowicki
KWI|Wieliczka|Wielicki
WA|Warszawa|Warszawa
WB|Warszawa|Warszawa
WD|Warszawa|Warszawa
WE|Warszawa|Warszawa
AE|Warszawa|Warszawa
WF|Warszawa|Warszawa
WH|Warszawa|Warszawa
WI|Warszawa|Warszawa
WJ|Warszawa|Warszawa
WK|Warszawa|Warszawa
WN|Warszawa|Warszawa
WT|Warszawa|Warszawa
WU|Warszawa|Warszawa
WW|Warszawa|Warszawa
WX|Warszawa|Warszawa
WY|Warszawa|Warszawa
WBR|Białobrzegi|Bialobrzeski
WCI|Ciechanów|Ciechanowski
WG|Garwolin|Garwolinski
WGM|Grodzisk Mazowiecki|Grodziski (Mazowieckie)
AGM|Grodzisk Mazowiecki|Grodziski (Mazowieckie)
WGR|Grójec|Grojecki
AGR|Grójec|Grojecki
WGS|Gostynin|Gostyninski
WKZ|Kozienice|Kozienicki
WL|Legionowo|Legionowski
WLI|Lipsko|Lipski
WLS|Łosice|Losicki
WM|Mińsk Mazowiecki|Minski
WMA|Maków Mazowiecki|Makowski
WML|Mława|Mlawski
WND|Nowy Dwór Mazowiecki|Nowodworski (Mazowieckie)
WO|Ostrołęka (miasto)|Ostroleka
WOR|Ostrów Mazowiecka|Ostrowski (Mazowieckie)
WOS|Ostrołęka|Ostrolecki
WOT|Otwock|Otwocki
WP|Płock (miasto)|Plock
WPI|Piaseczno|Piaseczynski
WPA|Piaseczno|Piaseczynski
WPW|Piaseczno|Piaseczynski
WPL|Płock|Plocki
APL|Płock|Plocki
WPN|Płońsk|Plonski
WPR|Pruszków|Pruszkowski
WPP|Pruszków|Pruszkowski
WPS|Pruszków|Pruszkowski
APR|Pruszków|Pruszkowski
WPU|Pułtusk|Pultuski
WPY|Przysucha|Przysuski
WPZ|Przasnysz|Przasnyski
WR|Radom (miasto)|Radom
WRA|Radom|Radomski
WS|Siedlce (miasto)|Siedlce
WSC|Sochaczew|Sochaczewski
WSE|Sierpc|Sierpecki
WSI|Siedlce|Siedlecki
WSK|Sokołów Podlaski|Sokolowski
WSZ|Szydłowiec|Szydlowiecki
WWE|Węgrów|Wegrowski
WWL|Wołomin|Wolominski
WV|Wołomin|Wolominski
WWY|Wyszków|Wyszkowski
WZ|Warszawa zachodni|Warszawski Zachodni
WZU|Żuromin|Zurominski
WZW|Zwoleń|Zwolenski
WZY|Żyrardów|Zyrardowski
OB|Brzeg|Brzeski (Opolskie)
OGL|Głubczyce|Glubczycki
OK|Kędzierzyn-Koźle|Kedzierzynsko-Kozielski
OKL|Kluczbork|Kluczborski
OKR|Krapkowice|Krapkowicki
ONA|Namysłów|Namyslowski
ONY|Nysa|Nyski
ONX|Nysa|Nyski
OOL|Olesno|Oleski
OP|Opole (miasto)|Opole
OPO|Opole|Opolski (Opolskie)
OPR|Prudnik|Prudnicki
OST|Strzelce Opolskie|Strzelecki
RBI|Bieszczady|Bieszczadzki
RBR|Brzozów|Brzozowski
RDE|Dębica|Debicki
RJA|Jarosław|Jaroslawski
RJS|Jasło|Jasielski
YJS|Jasło|Jasielski
RK|Krosno (miasto)|Krosno
RKL|Kolbuszowa|Kolbuszowski
RKR|Krosno|Krosnienski (Podkarpackie)
YKR|Krosno|Krosnienski (Podkarpackie)
RLA|Łańcut|Lancucki
RLE|Leżajsk|Lezajski
RLS|Lesko|Leski
RLU|Lubaczów|Lubaczowski
RMI|Mielec|Mielecki
RNI|Nisko|Nizanski
RP|Przemyśl (miasto)|Przemysl
RPR|Przemyśl|Przemyski
RPZ|Przeworsk|Przeworski
RRS|Ropczyce|Ropczycko-Sedziszowski
RSA|Sanok|Sanocki
RSR|Strzyżów|Strzyzowski
RST|Stalowa Wola|Stalowowolski
RT|Tarnobrzeg (miasto)|Tarnobrzeg
RTA|Tarnobrzeg|Tarnobrzeski
RZ|Rzeszów (miasto)|Rzeszow
YZ|Rzeszów (miasto)|Rzeszow
RZE|Rzeszów|Rzeszowski
RZZ|Rzeszów|Rzeszowski
BAU|Augustów|Augustowski
BBI|Bielsk Podlaski|Bielski (Podlaskie)
BGR|Grajewo|Grajewski
BHA|Hajnówka|Hajnowski
BI|Białystok (miasto)|Bialystok
BIA|Białystok|Bialostocki
BKL|Kolno|Kolnenski
BL|Łomża (miasto)|Lomza
BLM|Łomża|Lomzynski
BMN|Mońki|Moniecki
BS|Suwałki (miasto)|Suwalki
BSE|Sejny|Sejnenski
BSI|Siemiatycze|Siemiatycki
BSK|Sokółka|Sokolski
BSU|Suwałki|Suwalski
BWM|Wysokie Mazowieckie|Wysokomazowiecki
BZA|Zambrów|Zambrowski
GA|Gdynia|Gdynia
GBY|Bytów|Bytowski
GCH|Chojnice|Chojnicki
GCZ|Człuchów|Czluchowski
GD|Gdańsk (miasto)|Gdansk
XD|Gdańsk (miasto)|Gdansk
GDA|Gdańsk|Gdanski
XDA|Gdańsk|Gdanski
GKA|Kartuzy|Kartuski
GKY|Kartuzy|Kartuski
GKZ|Kartuzy|Kartuski
GKS|Kościerzyna|Koscierski
GKW|Kwidzyn|Kwidzynski
GLE|Lębork|Leborski
GMB|Malbork|Malborski
GND|Nowy Dwór Gdański|Nowodworski (Pomorskie)
GPU|Puck|Pucki
GS|Słupsk (miasto)|Slupsk
GSL|Słupsk|Slupski
GSP|Sopot|Sopot
GST|Starogard Gdański|Starogardzki
XST|Starogard Gdański|Starogardzki
GSZ|Sztum|Sztumski
GTC|Tczew|Tczewski
GWE|Wejherowo|Wejherowski
GWO|Wejherowo|Wejherowski
SB|Bielsko-Biała (miasto)|Bielsko-Biala
SBE|Będzin|Bedzinski
SE|Będzin|Bedzinski
SBI|Bielsko-Biała|Bielski (Śląskie)
IBI|Bielsko-Biała|Bielski (Śląskie)
SBL|Bieruń|Bierunsko-Ledzinski
SC|Częstochowa (miasto)|Czestochowa
SCI|Cieszyn|Cieszynski
SCN|Cieszyn|Cieszynski
ICI|Cieszyn|Cieszynski
SCZ|Częstochowa|Czestochowski
SD|Dąbrowa Górnicza|Dabrowa Gornicza
SG|Gliwice (miasto)|Gliwice
SGL|Gliwice|Gliwicki
IGL|Gliwice|Gliwicki
SH|Chorzów|Chorzow
SI|Siemianowice Śląskie|Siemianowice Slaskie
SJ|Jaworzno|Jaworzno
SJZ|Jastrzębie-Zdrój|Jastrzebie-Zdroj
SK|Katowice|Katowice
IK|Katowice|Katowice
SKL|Kłobuck|Klobucki
SL|Ruda Śląska|Ruda Slaska
SRS|Ruda Śląska|Ruda Slaska
SLU|Lubliniec|Lubliniecki
SM|Mysłowice|Myslowice
SMI|Mikołów|Mikolowski
SMY|Myszków|Myszkowski
SO|Sosnowiec|Sosnowiec
SPI|Piekary Śląskie|Piekary Slaskie
SPS|Pszczyna|Pszczynski
IPS|Pszczyna|Pszczynski
SR|Rybnik (miasto)|Rybnik
SRB|Rybnik|Rybnicki
SRC|Racibórz|Raciborski
IRC|Racibórz|Raciborski
ST|Tychy|Tychy
STA|Tarnowskie Góry|Tarnogorski
ITA|Tarnowskie Góry|Tarnogorski
SW|Świętochłowice|Swietochlowice
SWD|Wodzisław Śląski|Wodzislawski
SY|Bytom|Bytom
SZ|Zabrze|Zabrze
SZA|Zawiercie|Zawiercianski
SZO|Żory|Zory
SZY|Żywiec|Zywiecki
TBU|Busko-Zdrój|Buski
TJE|Jędrzejów|Jedrzejowski
TK|Kielce (miasto)|Kielce
TKA|Kazimierza Wielka|Kazimierski
TKI|Kielce|Kielecki
TKN|Końskie|Konecki
TLW|Włoszczowa|Wloszczowski
TOP|Opatów|Opatowski
TOS|Ostrowiec Świętokrzyski|Ostrowiecki
TPI|Pińczów|Pinczowski
TSA|Sandomierz|Sandomierski
TSK|Skarżysko-Kamienna|Skarzyski
TST|Starachowice|Starachowicki
TSZ|Staszów|Staszowski
NBA|Bartoszyce|Bartoszycki
NBR|Braniewo|Braniewski
NDZ|Działdowo|Dzialdowski
NE|Elbląg (miasto)|Elblag
NEB|Elbląg|Elblaski
NEL|Ełk|Elcki
NGI|Giżycko|Gizycki
NGO|Gołdap|Goldapski
NIL|Iława|Ilawski
NKE|Kętrzyn|Ketrzynski
NLI|Lidzbark Warmiński|Lidzbarski
NMR|Mrągowo|Mragowski
NNI|Nidzica|Nidzicki
NNM|Nowe Miasto Lubawskie|Nowomiejski
NO|Olsztyn (miasto)|Olsztyn
NOE|Olecko|Olecki
NOG|Olecko-Gołdap (do 2002)|
NOL|Olsztyn|Olsztynski
NOS|Ostróda|Ostrodzki
NOT|Ostróda|Ostrodzki
NPI|Pisz|Piski
NSZ|Szczytno|Szczycienski
NWE|Węgorzewo|Wegorzewski
PCH|Chodzież|Chodzieski
PCT|Czarnków|Czarnkowsko-Trzcianecki
PGN|Gniezno|Gnieznienski
PGO|Grodzisk Wielkopolski|Grodziski (Wielkopolskie)
PGS|Gostyń|Gostynski
PJA|Jarocin|Jarocinski
PK|Kalisz (miasto)|Kalisz
PKA|Kalisz|Kaliski
PKE|Kępno|Kepinski
PKL|Koło|Kolski
PKN|Konin|Koninski
PKO|Konin (miasto)|Konin
PN|Konin (miasto)|Konin
PKR|Krotoszyn|Krotoszynski
PKS|Kościan|Koscianski
PL|Leszno (miasto)|Leszno
PLE|Leszno|Leszczynski
PMI|Międzychód|Miedzychodzki
PNT|Nowy Tomyśl|Nowotomyski
PO|Poznań (miasto)|Poznan
PY|Poznań (miasto)|Poznan
MO|Poznań (miasto)|Poznan
POB|Oborniki|Obornicki
POS|Ostrów Wielkopolski|Ostrowski (Wielkopolskie)
POT|Ostrzeszów|Ostrzeszowski
POZ|Poznań|Poznanski
PZ|Poznań|Poznanski
PP|Piła|Pilski
PPL|Pleszew|Pleszewski
PRA|Rawicz|Rawicki
PSE|Śrem|Sremski
PSL|Słupca|Slupecki
PSR|Środa Wielkopolska|Sredzki (Wielkopolskie)
PSZ|Szamotuły|Szamotulski
PTU|Turek|Turecki
MTU|Turek|Turecki
PWA|Wągrowiec|Wagrowiecki
PWL|Wolsztyn|Wolsztynski
PWR|Września|Wrzesinski
PZL|Złotów|Zlotowski
ZBI|Białogard|Bialogardzki
ZCH|Choszczno|Choszczenski
ZDR|Drawsko Pomorskie|Drawski
ZGL|Goleniów|Goleniowski
ZGR|Gryfino|Gryfinski
ZGY|Gryfice|Gryficki
ZK|Koszalin (miasto)|Koszalin
ZKA|Kamień Pomorski|Kamienski
ZKL|Kołobrzeg|Kolobrzeski
ZKO|Koszalin|Koszalinski
ZLO|Łobez|Lobeski
ZMY|Myślibórz|Mysliborski
ZPL|Police|Policki
ZPY|Pyrzyce|Pyrzycki
ZS|Szczecin|Szczecin
ZSD|Świdwin|Swidwinski
ZSL|Sławno|Slawienski
ZST|Stargard|Stargardzki
ZSW|Świnoujście|Swinoujscie
ZSZ|Szczecinek|Szczecinecki
ZWA|Wałcz|Walecki
`;

export const plRegions: Region[] = TABLE.trim()
	.split('\n')
	.map((line) => {
		const [code, name, area] = line.split('|');
		const region: Region = area ? { code, name, area } : { code, name };
		// NOG: county dissolved in 2002, plates still valid but hardly seen.
		return code === 'NOG' ? { ...region, rare: 'olecko-goldap' as const } : region;
	});

/** Codes without a map area (county dissolved before the map data). */
export const plUnmappedCodes = new Set(['NOG']);
