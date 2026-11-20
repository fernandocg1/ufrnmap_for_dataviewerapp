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
    maxZoom: 19,
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
