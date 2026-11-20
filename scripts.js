const MAPTILER_KEY = '8M9v3nasBcdcVFQfAOpt';
const ICONS = { obra: '🚧', acidente: '💥', incendio: '🔥', perigo: '⚠️', outros: '🗒️' };
const STORAGE_KEY = 'ufrn-avisos';
const THEME_KEY = 'ufrn-tema';
const DEFAULT_HINT = 'Toque dentro da área da UFRN para colocar o aviso';

const THEMES = {
    dark: {
        style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
        bg: '#182438', land: '#1b2940', water: '#0f1c30', building: '#21324d',
        park: '#172b3a', casing: '#132033', majorRoad: '#4c7ec4', minorRoad: '#2c466e',
        mask: '#0b1320', border: '#3898ff', btnLabel: '☀️ Claro'
    },
    light: {
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
        bg: '#f2f4f1', land: '#f4f6f3', water: '#a8d1f0', building: '#e2e6e1',
        park: '#cde6c7', casing: '#c8d1ca', majorRoad: '#ffffff', minorRoad: '#dfe5e0',
        mask: '#e4eae6', border: '#5c4dff', btnLabel: '🌙 Escuro'
    }
};

let currentTheme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';

const UFRN_POLYGON = [
    [-35.211996, -5.833532], [-35.21196, -5.83418], [-35.211832, -5.834958], [-35.211692, -5.835514], [-35.211481, -5.836102],
    [-35.211484, -5.836209], [-35.211563, -5.836333], [-35.211442, -5.836762], [-35.211294, -5.836828], [-35.211228, -5.836911],
    [-35.211143, -5.837419], [-35.210997, -5.837944], [-35.210973, -5.837953], [-35.210958, -5.83809], [-35.210779, -5.838729],
    [-35.210513, -5.83869], [-35.210315, -5.838549], [-35.209406, -5.838446], [-35.209399, -5.838502], [-35.207948, -5.838278],
    [-35.207728, -5.838208], [-35.207127, -5.8381], [-35.205888, -5.837922], [-35.205765, -5.837948], [-35.205706, -5.837994],
    [-35.205586, -5.838208], [-35.203998, -5.841147], [-35.202763, -5.843346], [-35.202677, -5.843662], [-35.202558, -5.843739],
    [-35.202248, -5.843828], [-35.198569, -5.84421], [-35.197254, -5.844311], [-35.1965, -5.84425], [-35.19575, -5.8441],
    [-35.195613, -5.84401], [-35.195443, -5.843823], [-35.195202, -5.8434], [-35.194846, -5.84265], [-35.194715, -5.840971],
    [-35.194741, -5.840582], [-35.194801, -5.840294], [-35.194964, -5.839906], [-35.195213, -5.839464], [-35.196868, -5.837053],
    [-35.197211, -5.836643], [-35.198394, -5.835689], [-35.200288, -5.834267], [-35.200991, -5.833685], [-35.202441, -5.832593],
    [-35.202849, -5.832337], [-35.202896, -5.832309], [-35.203236, -5.832613], [-35.204324, -5.832186], [-35.204392, -5.832209],
    [-35.205709, -5.831664], [-35.205767, -5.83169], [-35.205902, -5.832888], [-35.205773, -5.83297], [-35.205632, -5.833228],
    [-35.204728, -5.835035], [-35.204048, -5.835376], [-35.20369, -5.835673], [-35.202964, -5.83644], [-35.203307, -5.83704],
    [-35.203558, -5.837232], [-35.203787, -5.837349], [-35.206542, -5.836435], [-35.206654, -5.836186], [-35.20704, -5.83606],
    [-35.2077, -5.835885], [-35.209961, -5.835402], [-35.209718, -5.834382], [-35.211187, -5.833767], [-35.211996, -5.833532]
];

function isInsideUFRN(lng, lat) {
    let inside = false;
    for (let i = 0, j = UFRN_POLYGON.length - 1; i < UFRN_POLYGON.length; j = i++) {
        const [xi, yi] = UFRN_POLYGON[i], [xj, yj] = UFRN_POLYGON[j];
        if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

const themeBtn = document.getElementById('theme-toggle');
function syncThemeUI() {
    document.body.classList.toggle('light', currentTheme === 'light');
    themeBtn.textContent = THEMES[currentTheme].btnLabel;
}
syncThemeUI();

const map = new maplibregl.Map({
    container: 'map',
    style: THEMES[currentTheme].style,
    center: [-35.2020, -5.8388],
    zoom: 15.9,
    minZoom: 14.8,
    maxZoom: 20,
    maxBounds: [[-35.2140, -5.8465], [-35.1930, -5.8300]]
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true
}), 'top-right');
map.on('error', (e) => console.error('Erro no mapa:', e.error || e));

let selectedType = null;
let hintTimeout = null;
const markers = {};
const hint = document.getElementById('hint');
const toolbarButtons = document.querySelectorAll('#toolbar button');

const saveAlerts = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
const loadAlerts = () => {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return list.map(a => ({ ...a, id: a.id || crypto.randomUUID(), description: a.description || '' }));
};

const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function popupHTML(aviso) {
    const when = new Date(aviso.createdAt).toLocaleString('pt-BR');
    return `
        <strong>${ICONS[aviso.type] || '📍'} ${escapeHTML(aviso.type)}</strong><br>
        <small>${when}</small><br>
        <textarea id="desc-${aviso.id}" rows="3" style="width:100%;margin:6px 0"
            placeholder="Descreva o aviso...">${escapeHTML(aviso.description || '')}</textarea><br>
        <button data-action="save" data-id="${aviso.id}">Salvar</button>
        <button data-action="remove" data-id="${aviso.id}">Remover</button>`;
}

function updateBubble(bubble, text) {
    const trimmed = (text || '').trim();
    bubble.textContent = trimmed;
    bubble.classList.toggle('visible', Boolean(trimmed));
}

function addMarker(aviso) {
    const el = document.createElement('div');
    el.className = 'alert-marker';

    const icon = document.createElement('span');
    icon.className = 'alert-marker-icon';
    icon.textContent = ICONS[aviso.type] || '📍';

    const bubble = document.createElement('div');
    bubble.className = 'alert-bubble';
    bubble.id = `bubble-${aviso.id}`;
    updateBubble(bubble, aviso.description);

    el.append(bubble, icon);

    const popup = new maplibregl.Popup({ offset: 20 }).setHTML(popupHTML(aviso));
    const marker = new maplibregl.Marker({ element: el })
        .setLngLat([aviso.lng, aviso.lat])
        .setPopup(popup)
        .addTo(map);
    markers[aviso.id] = marker;

    popup.on('open', () => { bubble.style.visibility = 'hidden'; });
    popup.on('close', () => { bubble.style.visibility = 'visible'; });

    el.addEventListener('click', (e) => {
        e.stopPropagation();
        const latest = loadAlerts().find(a => a.id === aviso.id) || aviso;
        popup.setHTML(popupHTML(latest));
        marker.togglePopup();
    });
}

function applyMapThemeAndMask() {
    const t = THEMES[currentTheme];
    const layers = map.getStyle()?.layers || [];
    for (const layer of layers) {
        if (layer.id.startsWith('ufrn-')) continue;
        const id = layer.id.toLowerCase();
        try {
            if (layer.type === 'background') {
                map.setPaintProperty(layer.id, 'background-color', t.bg);
            } else if (layer.type === 'fill') {
                if (id.includes('water')) {
                    map.setPaintProperty(layer.id, 'fill-color', t.water);
                } else if (id.includes('building')) {
                    map.setPaintProperty(layer.id, 'fill-color', t.building);
                } else if (id.includes('park') || id.includes('grass') || id.includes('wood') || id.includes('forest')) {
                    map.setPaintProperty(layer.id, 'fill-color', t.park);
                } else {
                    map.setPaintProperty(layer.id, 'fill-color', t.land);
                }
            } else if (layer.type === 'fill-extrusion' && id.includes('building')) {
                map.setPaintProperty(layer.id, 'fill-extrusion-color', t.building);
            } else if (layer.type === 'line') {
                if (id.includes('casing')) {
                    map.setPaintProperty(layer.id, 'line-color', t.casing);
                } else if (id.includes('motorway') || id.includes('trunk') || id.includes('primary') || id.includes('secondary')) {
                    map.setPaintProperty(layer.id, 'line-color', t.majorRoad);
                } else if (id.includes('road') || id.includes('street') || id.includes('minor') || id.includes('service') || id.includes('tertiary') || id.includes('path')) {
                    map.setPaintProperty(layer.id, 'line-color', t.minorRoad);
                }
            }
        } catch (_) {}
    }

    if (!map.getSource('ufrn-mask')) {
        map.addSource('ufrn-mask', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
                        UFRN_POLYGON
                    ]
                }
            }
        });
    }

    if (!map.getLayer('ufrn-mask-fill')) {
        map.addLayer({
            id: 'ufrn-mask-fill',
            type: 'fill',
            source: 'ufrn-mask',
            paint: { 'fill-color': t.mask, 'fill-opacity': 0.96 }
        });
    } else {
        map.setPaintProperty('ufrn-mask-fill', 'fill-color', t.mask);
    }

    if (!map.getLayer('ufrn-border-line')) {
        map.addLayer({
            id: 'ufrn-border-line',
            type: 'line',
            source: 'ufrn-mask',
            paint: { 'line-color': t.border, 'line-width': 2.5, 'line-dasharray': [2, 2] }
        });
    } else {
        map.setPaintProperty('ufrn-border-line', 'line-color', t.border);
    }
}

map.on('style.load', applyMapThemeAndMask);

map.on('load', () => {
    applyMapThemeAndMask();
    const alerts = loadAlerts();
    saveAlerts(alerts);
    alerts.forEach(addMarker);
});

themeBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, currentTheme);
    syncThemeUI();
    map.setStyle(THEMES[currentTheme].style);
    map.once('idle', applyMapThemeAndMask);
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { id, action } = btn.dataset;
    const marker = markers[id];
    if (!marker) return;

    if (action === 'save') {
        const description = document.getElementById(`desc-${id}`).value;
        const list = loadAlerts().map(a => a.id === id ? { ...a, description } : a);
        saveAlerts(list);
        updateBubble(document.getElementById(`bubble-${id}`), description);
        marker.getPopup().remove();
    } else if (action === 'remove') {
        marker.remove();
        delete markers[id];
        saveAlerts(loadAlerts().filter(a => a.id !== id));
    }
});

function showHint(msg, temporary = false) {
    clearTimeout(hintTimeout);
    hint.textContent = msg;
    hint.style.display = msg ? 'block' : 'none';
    if (temporary) {
        hintTimeout = setTimeout(() => showHint(selectedType ? DEFAULT_HINT : ''), 2200);
    }
}

toolbarButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        selectedType = selectedType === btn.dataset.type ? null : btn.dataset.type;
        toolbarButtons.forEach(b => b.classList.toggle('active', b.dataset.type === selectedType));
        showHint(selectedType ? DEFAULT_HINT : '');
    });
});

map.on('click', (e) => {
    if (!selectedType) return;
    const { lng, lat } = e.lngLat;
    if (!isInsideUFRN(lng, lat)) {
        showHint('⚠️ Só é permitido criar avisos dentro da zona da UFRN!', true);
        return;
    }
    const aviso = { id: crypto.randomUUID(), type: selectedType, description: '', lng, lat, createdAt: Date.now() };
    saveAlerts([...loadAlerts(), aviso]);
    addMarker(aviso);
    markers[aviso.id].togglePopup();
});

// Prédios, centros, setores, laboratórios e locais mapeados dentro da UFRN (com siglas e apelidos)
const UFRN_PLACES = [
    ["588 - Expresso C&T",-35.202805,-5.840734], ["Anel Viário da UFRN",-35.209058,-5.838112], ["Anfiteatro",-35.210188,-5.837823],
    ["Anfiteatros do CCET",-35.199375,-5.841493], ["Avenida Doutor Solon de Miranda Galvão",-35.195947,-5.843755], ["Avenida Odilon Gomes de Lima",-35.196421,-5.844211],
    ["Avenida Passeio dos Girassóis",-35.200958,-5.841604], ["Avenida Santos Dumont",-35.203889,-5.841262], ["Avenida Senador Salgado Filho",-35.211908,-5.83426],
    ["Banco do Brasil",-35.199881,-5.839043], ["Berlim",-35.199259,-5.837785], ["Biblioteca Central Zila Mamede (BCZM)",-35.199242,-5.839701],
    ["Biblioteca Setorial da Escola de Música",-35.206635,-5.837496], ["Biblioteca Setorial do CB",-35.201932,-5.841852], ["Biblioteca Setorial do CCET",-35.19881,-5.840991],
    ["Biblioteca Setorial do CCHLA",-35.198096,-5.839352], ["Biblioteca Setorial NEPSA",-35.19788,-5.837824], ["Setor 2 (Setor II / Bloco de Aulas do Setor II)",-35.196995,-5.838307],
    ["Caixa Econômica Federal",-35.19989,-5.839076], ["Capela Ecumênica do Campus",-35.208568,-5.837188], ["CB (Centro de Biociências)",-35.201928,-5.84187],
    ["CCET (Centro de Ciências Exatas e da Terra)",-35.198537,-5.840935], ["CCHLA UFRN (Azulão, Chichila)",-35.198139,-5.839244], ["CCSA (Centro de Ciências Socias Aplicadas)",-35.198571,-5.837892],
    ["Centro de Convivência Djalma Marinho",-35.200048,-5.839286], ["Centro de Educação",-35.196774,-5.838707], ["Centro de Tecnologia - CT",-35.198867,-5.842767],
    ["Comperve (Comissão Permanente do Vestibular)",-35.21167,-5.833923], ["Complexo Tecnológico de Engenharia (CTEC) (CTEC - UFRN)",-35.198011,-5.843142], ["Comunica (Superintendência de Comunicação)",-35.200637,-5.838112],
    ["Cooperativa Cultural da UFRN",-35.200163,-5.839456], ["Coordenação de Engenharia de Computação",-35.197195,-5.84281], ["Copiadora BCZM UFRN",-35.199139,-5.840036],
    ["Correios (Empresa Brasileira de Correios e Telégrafos)",-35.199871,-5.839026], ["DAS",-35.2109,-5.835219], ["DCA",-35.197459,-5.8429],
    ["DDRH - Departamento de Desenvolvimento de Recursos Humanos",-35.210304,-5.835432], ["DEART - Prédio Anexo",-35.211277,-5.835303], ["DEART (Departamento de Artes, DART)",-35.211205,-5.834722],
    ["DECOM - Departamento de Comunicação Social",-35.200635,-5.837811], ["Departamento de Arquitetura (Galinheiro, DARQ)",-35.199102,-5.842242], ["Departamento de Artes (DEART)",-35.211069,-5.835931],
    ["Departamento de Biofísica e Farmacologia",-35.201886,-5.841499], ["Departamento de Biologia e Genética",-35.201873,-5.841316], ["Departamento de Bioquímica",-35.201871,-5.841286],
    ["Departamento de Botânica, Ecologia e Zoologia",-35.201883,-5.841468], ["Departamento de Desenvolvimento de Recursos Humanos (DDRH)",-35.210238,-5.835701], ["Departamento de Ecologia",-35.201669,-5.8411],
    ["Departamento de Educação Física",-35.201817,-5.836103], ["Departamento de Fisiologia",-35.201879,-5.841408], ["Departamento de Fisioterapia",-35.200282,-5.83517],
    ["Departamento de Geologia",-35.195663,-5.8417], ["Departamento de Microbiologia e Parasitologia",-35.201877,-5.841377], ["Departamento de Morfologia",-35.201875,-5.841347],
    ["Departamento de Nutrição",-35.202663,-5.834555], ["Departamento de Oceanografia e Limnologia",-35.201881,-5.841438], ["DFTE (Departamento de Física Teórica e Experimental)",-35.196819,-5.841652],
    ["DIMAp",-35.198291,-5.84154], ["Diretório Central dos Estudantes (DCE)",-35.199323,-5.838193], ["DMP",-35.204563,-5.837941],
    ["Educação Física",-35.201873,-5.836491], ["Escola de Ciência e Tecnologia (ECT)",-35.199434,-5.843426], ["Escola de Enfermagem",-35.202349,-5.834058],
    ["Escola de Música da UFRN (EMUFRN, Escola de Música)",-35.206679,-5.83729], ["Estacionamento do CCHLA",-35.197058,-5.839387], ["Estacionamento I NTI na Rua das Engenharias",-35.197129,-5.842192],
    ["Estacionamento II NTI na Rua das Engenharias",-35.196712,-5.842333], ["FUNPEC",-35.210863,-5.834803], ["Gabinete do Reitor",-35.201562,-5.839826],
    ["Ginasinho",-35.199341,-5.835946], ["Ginásio da UFRN",-35.202353,-5.835231], ["INPE - Centro Regional Nordeste",-35.20786,-5.836241],
    ["Instituto Ágora",-35.19775,-5.840312], ["Instituto do Cérebro",-35.204916,-5.833629], ["Instituto Internacional de Física",-35.195641,-5.840185],
    ["Instituto Metrópole Digital (IMD)",-35.205354,-5.832298], ["Lab. de Física Experimental I",-35.197442,-5.841477], ["Lab. de Física Experimental II",-35.197585,-5.841477],
    ["Lab. de Química II",-35.199322,-5.840881], ["Labcom (Laboratório de Comunicação)",-35.200564,-5.837796], ["Laboratório de Combustíveis e Lubrificantes",-35.199171,-5.841132],
    ["Laboratório de Computadores",-35.197429,-5.841833], ["Laboratório de Física do Petróleo",-35.197054,-5.841887], ["Laboratório de Geologia e Geofísica do Petróleo",-35.195502,-5.840786],
    ["Laboratório de Química I",-35.198269,-5.840384], ["Laboratório de Recursos Hídricos e Saneamento Ambiental (LARHISA)",-35.198094,-5.842334], ["Laboratório de Sensoriamento e Controle (LASC)",-35.197329,-5.842907],
    ["LAMP (Laboratório de Automação da Medição em Petróleo)",-35.197363,-5.84348], ["Lanchonete da ECT",-35.198997,-5.84329], ["Lanchonete do Setor 1",-35.199306,-5.837962],
    ["Lanchonete do Setor 2",-35.197703,-5.840932], ["Lanchonete do Setor 5",-35.198048,-5.838677], ["Lanchonete do Setor de Fisica",-35.196968,-5.841692],
    ["Lanchonete O Campeão",-35.200222,-5.841803], ["LAUT (Laboratório de Automação em Petróleo)",-35.197268,-5.843236], ["LIsboa",-35.19996,-5.841938],
    ["Mata dos Saguis",-35.201187,-5.842702], ["Museu de Morfologia",-35.20303,-5.84177], ["NEI UFRN (Núcleo de Educação Infantil)",-35.206028,-5.837053],
    ["NEPGN (Núcleo de Estudos em Petróleo e Gás Natural)",-35.198686,-5.840307], ["nPITI",-35.197574,-5.842612], ["Núcleo de Estudos e Pesquisas em Ciências Sociais Aplicadas (NEPSA 2)",-35.197389,-5.837927],
    ["Núcleo de Prática Jurídica (NPJ)",-35.200188,-5.837498], ["Núcleo de Yoga",-35.201761,-5.834182], ["Núcleo Temático da Seca (NutSeca)",-35.199643,-5.838325],
    ["NUPEG - PRH-ANP 14",-35.195726,-5.842904], ["NUPEG 2",-35.196343,-5.843504], ["NUPLAM (Núcleo de Pesquisa em Alimentos e Medicamentos)",-35.203313,-5.839876],
    ["NUPPRAR (NUPRAR, Núcleo de Processamento Primário e Reuso de Água Produzida e Resíduos)",-35.199681,-5.841505], ["Oca",-35.199679,-5.841829], ["Paris",-35.200179,-5.837837],
    ["Pavilhão de Manutenção de Instalações",-35.203588,-5.834908], ["PET - Física",-35.1977,-5.841835], ["Piscina Olímpica",-35.20153,-5.834381],
    ["POP-RN (Ponto de Presença RN)",-35.199786,-5.839141], ["PPG",-35.201775,-5.840025], ["Praça Cívica da UFRN",-35.21005,-5.837595],
    ["Praça da Biblioteca",-35.199585,-5.839646], ["Praça do Servidor José Wilson de Souza",-35.202078,-5.83906], ["Praça do Setor V (Praça do Setor 5)",-35.198149,-5.838662],
    ["Praça Interna do CCHLA",-35.198394,-5.839131], ["PRH",-35.201779,-5.839845], ["PROAD",-35.201778,-5.83989],
    ["PROAE",-35.201773,-5.84016], ["PROEX",-35.201776,-5.83998], ["PROGRAD",-35.201777,-5.839935],
    ["PROIN",-35.197507,-5.841833], ["Projeto Pau e Lata",-35.211224,-5.834717], ["PROPESQ",-35.201775,-5.84007],
    ["PROPLAN",-35.201774,-5.840115], ["Refeitório do Setor 03",-35.200486,-5.841744], ["Reitoria",-35.201657,-5.838654],
    ["Reservatório R1.01",-35.207927,-5.836781], ["Reservatório R10",-35.199218,-5.838983], ["Reservatório R2.01",-35.202503,-5.841028],
    ["Reservatório R3.01",-35.19943,-5.843034], ["Reservatório R3.02",-35.196177,-5.841037], ["Reservatório R3.03",-35.197925,-5.842589],
    ["Reservatório R3.04",-35.200905,-5.841353], ["Reservatório R3.05",-35.199496,-5.841791], ["Reservatório R4.01",-35.198248,-5.838673],
    ["Reservatório R4.02",-35.200186,-5.837229], ["Reservatório R5.01",-35.20281,-5.83408], ["Residência de Pós-Graduação",-35.202101,-5.836724],
    ["Residência Universitária",-35.204711,-5.83252], ["Residência Universitária Campus I",-35.204881,-5.832283], ["Residência Universitária Campus II",-35.204537,-5.832369],
    ["Residência Universitária Campus III",-35.204624,-5.83268], ["Residência Universitária Campus IV",-35.204747,-5.833035], ["Restaurante da APURN",-35.200206,-5.839808],
    ["Restaurante da Reitoria UFRN",-35.201564,-5.8398], ["Restaurante Nordestino",-35.199766,-5.844027], ["Restaurante Universitário (RU)",-35.203743,-5.833264],
    ["Rua da Biblioteca",-35.198929,-5.839442], ["Rua da Capela",-35.209599,-5.836969], ["Rua da Convivência",-35.200123,-5.840377],
    ["Rua da Praça",-35.210594,-5.836024], ["Rua da Reitoria",-35.201024,-5.839537], ["Rua da Saúde",-35.201631,-5.836859],
    ["Rua da Tecnologia",-35.198464,-5.843005], ["Rua das Artes",-35.210701,-5.835254], ["Rua das Biociências",-35.200818,-5.841832],
    ["Rua das Engenharias",-35.196649,-5.84206], ["Rua das Exatas",-35.198703,-5.841267], ["Rua das Humanidades",-35.197425,-5.839888],
    ["Rua das Sociais",-35.199844,-5.838524], ["Rua do Ágora",-35.198016,-5.840905], ["Rua do Esporte",-35.201192,-5.837154],
    ["Rua do Horto",-35.203497,-5.835787], ["Rua do Meio Ambiente",-35.205073,-5.837488], ["Rua do NUPLAM",-35.204647,-5.839235],
    ["Rua do Observatório",-35.196645,-5.84129], ["Salão Nordeste",-35.197704,-5.841645], ["Santander",-35.20026,-5.83893],
    ["Secretaria de Educação à Distância (SEDIS)",-35.208697,-5.836266], ["SEPA UFRN (Serviço de Psicologia Aplicada)",-35.198597,-5.838612], ["Setor 1 (Setor I)",-35.199622,-5.837461],
    ["Setor 3 (Setor III)",-35.200427,-5.841138], ["Setor 4 (Setor IV)",-35.199852,-5.842456], ["Setor V (Setor 5, Setor de Aulas Teóricas V)",-35.197535,-5.838504],
    ["Subestação UFRN",-35.200812,-5.843255], ["Superintendência de Informática UFRN (SINFO, Superintendência de Informática)",-35.198682,-5.841486], ["Superintendência de Infraestrutura",-35.203338,-5.834233],
    ["Unidade de Armazenamento e Tratamento de Resíduos (UATR)",-35.203981,-5.834281]
];

const searchBox = document.getElementById('search-box');
const searchToggle = document.getElementById('search-toggle');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const placesList = document.getElementById('ufrn-places-list');

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Preenche a lista de sugestões (autocomplete) com todos os locais do campus
placesList.innerHTML = UFRN_PLACES.map(([name]) => `<option value="${escapeHTML(name)}"></option>`).join('');

function findLocalPlace(query) {
    const q = normalize(query);
    const tokens = q.split(/\s+/).filter(Boolean);
    let best = null, bestScore = -1;

    for (const place of UFRN_PLACES) {
        const nameNorm = normalize(place[0]);
        if (!tokens.every(t => nameNorm.includes(t))) continue;

        const words = nameNorm.split(/[^a-z0-9]+/);
        let score = 0;
        if (nameNorm === q) score += 100;
        if (nameNorm.startsWith(q)) score += 50;
        if (words.includes(q)) score += 40;
        score -= nameNorm.length * 0.1; // prioriza nomes mais diretos (ex: "Setor 1" antes de "Lanchonete do Setor 1")

        if (score > bestScore) {
            bestScore = score;
            best = place;
        }
    }
    return best;
}

searchToggle.addEventListener('click', () => {
    const isOpen = searchBox.classList.toggle('open');
    if (isOpen) searchInput.focus();
});

// Se o usuário clicar numa sugestão do autocomplete, já leva a câmera direto
searchInput.addEventListener('change', () => {
    const exact = UFRN_PLACES.find(([name]) => normalize(name) === normalize(searchInput.value.trim()));
    if (exact) {
        map.flyTo({ center: [exact[1], exact[2]], zoom: 20, essential: true });
        showHint(`📍 ${exact[0]}`, true);
    }
});

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    // 1) Busca instantânea no catálogo completo de locais da UFRN + avisos criados pelos usuários
    const localMatch = findLocalPlace(query);
    if (localMatch) {
        map.flyTo({ center: [localMatch[1], localMatch[2]], zoom: 20, essential: true });
        showHint(`📍 ${localMatch[0]}`, true);
        return;
    }

    const alertMatch = loadAlerts().find(a => normalize(a.description || '').includes(normalize(query)));
    if (alertMatch) {
        map.flyTo({ center: [alertMatch.lng, alertMatch.lat], zoom: 20, essential: true });
        showHint(`📍 Aviso: ${alertMatch.description}`, true);
        return;
    }

    // 2) Fallback: consulta na API do OpenStreetMap sem sufixo restritivo
    showHint('🔍 Buscando local na UFRN...');
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=10&bounded=1&viewbox=-35.2140,-5.8300,-35.1930,-5.8465&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const results = await res.json();
        const match = results.find(r => isInsideUFRN(Number(r.lon), Number(r.lat))) || results[0];

        if (!match) {
            showHint('⚠️ Local não encontrado na UFRN.', true);
            return;
        }

        map.flyTo({ center: [Number(match.lon), Number(match.lat)], zoom: 20, essential: true });
        showHint(`📍 ${match.name || match.display_name.split(',')[0]}`, true);
    } catch (_) {
        showHint('⚠️ Erro ao pesquisar o local.', true);
    }
});
