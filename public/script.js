let currentVariation = null;

// Theme Management
const themeCheckbox = document.getElementById('checkbox');

function toggleTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
}

function setTheme(isDark) {
    themeCheckbox.checked = isDark;
    toggleTheme(isDark);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeCheckbox) themeCheckbox.checked = true;
}

const defaults = {
    5: {
        "kafkaTopic": "es-verti.gcp.neurona.fct.siniestro.situacion",
        "idSiniestro": 2405782,
        "numeroSiniestro": 1415379,
        "estado": "ABIE",
        "producto": "AU01",
        "idPoliza": 107989,
        "numeroPoliza": 20000006,
        "riesgo": "OPEL ASTRA 1.8 EDITION 140 AUTO",
        "fechaDeclaracion": "19/11/2025",
        "fechaOcurrencia": "1S11/2024",
        "horaOcurrencia": "19/11/2024 09:00:00",
        "modoDeclaracion": "Reclamación CICOS",
        "fechaAuditoria": "19/11/2025",
        "tipoSiniestro": "MSPC",
        "motivoSituacion": "APCI",
        "idCliente": "1" // Default to 1
    },
    6: {
        "kafkaTopic": "es-verti.gcp.neurona.fct.recibo-total.situacion",
        "anioRecibo": "2025",
        "numeroRecibo": "3640617",
        "tipoRecibo": "R",
        "fechaEfecto": "12/09/2025",
        "fechaVencimiento": "12/09/2026",
        "fechaEmisionPoliza": "12/11/2025",
        "fechaAlta": "12/11/2025",
        "idPoliza": 3363290,
        "numeroPoliza": 45134587,
        "importeTotal": 520.01,
        "importeNeto": 476.7,
        "nombreMediador": "VERTI TELEFONO",
        "numeroSitutacionRecibo": 9,
        "idCliente": "1",
        "medioPago": "OTRO",
        "fechaEnvioCobro": "19/11/2025",
        "estadoReciboCliente": "PIMP"
    },
    7: {
        "idCliente": "1",
        "nombre": "Juan",
        "apellido1": "Álvarez",
        "apellido2": "García",
        "telefonoMovilPrincipal": "6",
        "emailPrincipal": "juan_alvarez_9@email.com",
        "poblacion": "Madrid",
        "provincia": "Comunidad de Madrid",
        "codigoPostal": "28001",
        "kafkaTopic": "es-verti.gcp.neurona.fct.cliente.contacto"
    },
    9: {
        "kafkaTopic": "es-verti.gcp.neurona.fct.poliza.situacion",
        "idCliente": "1",
        "idPoliza": 1,
        "numeroPoliza": 2,
        "producto": "3",
        "riesgo": "4",
        "tipoSituacion": "ANUL"
    }
};

const fieldOrder = {
    5: ['idCliente', 'idSiniestro', 'estado', 'numeroSiniestro', 'numeroPoliza'],
    6: ['idCliente', 'numeroRecibo', 'estadoReciboCliente', 'numeroPoliza', 'importeTotal', 'idPoliza'],
    9: ['idCliente', 'numeroPoliza', 'tipoSituacion']
};

const fieldOptions = {
    'estado': ['ABIE', 'CERR'],
    'estadoReciboCliente': ['PIMP', 'COBR']
};

function selectGroup(groupName) {
    // Update active state
    document.querySelectorAll('.event-item').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');

    const container = document.getElementById('formContainer');
    const titleEl = document.getElementById('formTitle');
    const dynamicFields = document.getElementById('dynamicFields');
    const sendBtn = document.getElementById('sendBtn');
    const responseDiv = document.getElementById('response');

    document.getElementById('batch-container').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    container.style.display = 'block';
    titleEl.textContent = groupName;
    dynamicFields.innerHTML = '';
    responseDiv.style.display = 'none';
    sendBtn.style.display = 'none'; // Hide main send button for group view

    // Render group options
    if (groupName === 'inappmessageTracking') {
        const variations = [
            { id: 4, label: 'Interact' },
            { id: 1, label: 'Display' },
            { id: 3, label: 'Dismiss' }
        ];

        variations.forEach(v => {
            const card = document.createElement('div');
            card.className = 'event-card full-width'; // Use full-width to span grid
            card.style.border = '1px solid #d2d2d7';
            card.style.padding = '1.5rem';
            card.style.marginBottom = '1rem';
            card.style.borderRadius = '8px';
            card.style.backgroundColor = '#fbfbfd';

            const title = document.createElement('h3');
            title.textContent = v.label;
            title.style.marginTop = '0';
            title.style.fontSize = '16px';
            title.style.marginBottom = '1rem';

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.textContent = 'Client ID';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = '1';
            input.id = `clientId_${v.id}`;

            const btn = document.createElement('button');
            btn.textContent = `Send ${v.label}`;
            btn.onclick = () => sendInAppRequest(v.id, input.id, btn);

            formGroup.appendChild(label);
            formGroup.appendChild(input);

            card.appendChild(title);
            card.appendChild(formGroup);
            card.appendChild(btn);

            dynamicFields.appendChild(card);
        });
    }
}

async function sendInAppRequest(variation, inputId, btnElement) {
    const clientId = document.getElementById(inputId).value;
    const responseDiv = document.getElementById('response');

    if (!clientId) {
        alert('Please enter a Client ID');
        return;
    }

    const originalText = btnElement.textContent;
    btnElement.disabled = true;
    btnElement.textContent = 'Sending...';

    responseDiv.style.display = 'none';
    responseDiv.className = '';

    // Get active environment variables
    const env = environments.find(e => e.id === activeEnvId);
    const envVars = env ? env.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {}) : {};

    try {
        const res = await fetch('/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variation: variation,
                requestType: 'interact',
                clientId: clientId,
                envVars: envVars
            })
        });

        const data = await res.json();

        responseDiv.style.display = 'block';
        responseDiv.textContent = JSON.stringify(data, null, 2);

        if (res.ok) {
            responseDiv.classList.add('success');
        } else {
            responseDiv.classList.add('error');
        }
    } catch (error) {
        responseDiv.style.display = 'block';
        responseDiv.textContent = 'Error: ' + error.message;
        responseDiv.classList.add('error');
    } finally {
        btnElement.disabled = false;
        btnElement.textContent = originalText;
    }
}

function selectEvent(variation, title) {
    document.getElementById('batch-container').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    currentVariation = variation;

    // Update active state if not coming from group selection (internal call)
    if (event && event.target.classList.contains('event-item')) {
        document.querySelectorAll('.event-item').forEach(el => el.classList.remove('active'));
        event.target.classList.add('active');
    }

    // Show form
    const container = document.getElementById('formContainer');
    const titleEl = document.getElementById('formTitle');
    const dynamicFields = document.getElementById('dynamicFields');
    const sendBtn = document.getElementById('sendBtn');
    const responseDiv = document.getElementById('response');

    container.style.display = 'block';
    titleEl.textContent = title;
    dynamicFields.innerHTML = '';
    responseDiv.style.display = 'none';
    sendBtn.style.display = 'block'; // Show send button

    if (variation >= 5) {
        renderCollectionFields(variation);
    } else {
        renderInteractFields();
    }
}

function createField(key, value, isFullWidth = false) {
    const div = document.createElement('div');
    div.className = 'form-group';
    if (isFullWidth) div.classList.add('full-width');

    const label = document.createElement('label');
    label.textContent = key;
    label.htmlFor = key;

    let input;
    if (fieldOptions[key]) {
        input = document.createElement('select');
        input.id = key;
        input.name = key;
        fieldOptions[key].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === value) option.selected = true;
            input.appendChild(option);
        });
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.id = key;
        input.value = value;
        input.name = key;
    }

    div.appendChild(label);
    div.appendChild(input);
    return div;
}

function renderInteractFields() {
    const dynamicFields = document.getElementById('dynamicFields');
    // Interact events just need Client ID
    dynamicFields.appendChild(createField('clientId', '1', true));
}

function renderCollectionFields(variation) {
    const dynamicFields = document.getElementById('dynamicFields');
    const data = defaults[variation];
    const order = fieldOrder[variation] || [];

    // 1. Render ordered fields first
    order.forEach(key => {
        if (data.hasOwnProperty(key) && key !== 'kafkaTopic') {
            dynamicFields.appendChild(createField(key, data[key]));
        }
    });

    // 2. Render remaining fields
    for (const [key, value] of Object.entries(data)) {
        if (!order.includes(key) && key !== 'kafkaTopic') {
            dynamicFields.appendChild(createField(key, value));
        }
    }
}

function showProfileCheck() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('batch-container').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';

    // Highlight sidebar item
    document.querySelectorAll('.event-item').forEach(el => el.classList.remove('active'));
    const profileCheckItem = document.querySelector('.event-item[data-group="profileCheck"]');
    if (profileCheckItem) {
        profileCheckItem.classList.add('active');
    }
}

async function checkProfile() {
    const clientId = document.getElementById('profileClientId').value;
    const responseDiv = document.getElementById('profile-response');
    const dataDiv = document.getElementById('profile-data');

    if (!clientId) {
        alert('Please enter a Client ID');
        return;
    }

    // Get active environment variables
    const env = environments.find(e => e.id === activeEnvId);
    const envVars = env ? env.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {}) : {};

    try {
        const res = await fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientId, envVars })
        });

        const data = await res.json();

        if (res.ok) {
            let customPersonalizationHtml = 'N/A';
            if (data.customPersonalization) {
                try {
                    const parsed = JSON.parse(data.customPersonalization);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        customPersonalizationHtml = '<div style="display: grid; gap: 0.5rem;">';
                        parsed.forEach((item, index) => {
                            customPersonalizationHtml += `<div style="background: var(--card-bg); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--input-border);">
                                <div style="font-weight: 600; margin-bottom: 0.5rem; font-size: 11px; color: var(--label-color); text-transform: uppercase;">Objeto ${index + 1}</div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem;">`;
                            for (const [key, value] of Object.entries(item)) {
                                customPersonalizationHtml += `<div style="overflow: hidden; text-overflow: ellipsis;">
                                    <div style="font-weight: 500; font-size: 11px; color: var(--label-color); margin-bottom: 2px;">${key}</div>
                                    <div style="font-size: 13px; color: var(--text-color);">${value}</div>
                                </div>`;
                            }
                            customPersonalizationHtml += '</div></div>';
                        });
                        customPersonalizationHtml += '</div>';
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        customPersonalizationHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem;">';
                        for (const [key, value] of Object.entries(parsed)) {
                            customPersonalizationHtml += `<div style="overflow: hidden; text-overflow: ellipsis;">
                                <div style="font-weight: 500; font-size: 11px; color: var(--label-color); margin-bottom: 2px;">${key}</div>
                                <div style="font-size: 13px; color: var(--text-color);">${value}</div>
                            </div>`;
                        }
                        customPersonalizationHtml += '</div>';
                    } else {
                        customPersonalizationHtml = `<pre style="background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 4px; overflow-x: auto; margin-top: 0.25rem;">${data.customPersonalization}</pre>`;
                    }
                } catch (e) {
                    console.error("Error parsing customPersonalization", e);
                    customPersonalizationHtml = `<pre style="background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 4px; overflow-x: auto; margin-top: 0.25rem;">${data.customPersonalization}</pre>`;
                }
            }

            // Display the filtered profile data
            dataDiv.innerHTML = `
                <div style="display: grid; gap: 0.75rem;">
                    <div><strong style="color: var(--label-color);">Email:</strong> ${data.email || 'N/A'}</div>
                    <div><strong style="color: var(--label-color);">First Name:</strong> ${data.firstName || 'N/A'}</div>
                    <div><strong style="color: var(--label-color);">Last Name:</strong> ${data.lastName || 'N/A'}</div>
                    <div><strong style="color: var(--label-color);">Middle Name:</strong> ${data.middleName || 'N/A'}</div>
                    <div><strong style="color: var(--label-color);">Client ID:</strong> ${data.clientId || 'N/A'}</div>
                    <div>
                        <strong style="color: var(--label-color); display: block; margin-bottom: 0.5rem;">Custom Personalization:</strong> 
                        ${customPersonalizationHtml}
                    </div>
                </div>
            `;

            // Render Events
            const eventsDiv = document.getElementById('profile-events');
            if (data.events && data.events.length > 0) {
                let eventsHtml = '<div style="display: grid; gap: 1rem;">';
                data.events.forEach(event => {
                    const entity = event.entity;
                    const eventType = entity.eventType || 'Unknown Event';
                    const timestamp = new Date(event.timestamp).toLocaleString();

                    // Extract custom data (usually in _mapfretechsa or similar, but let's be generic or look for specific keys)
                    // The user example shows _mapfretechsa
                    let customData = {};
                    if (entity._mapfretechsa) {
                        customData = entity._mapfretechsa;
                    }

                    eventsHtml += `<div style="background: var(--card-bg); padding: 1rem; border-radius: 6px; border: 1px solid var(--input-border);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; align-items: center;">
                            <strong style="color: #0071e3; font-size: 13px;">${eventType}</strong>
                            <span style="font-size: 11px; color: var(--label-color);">${timestamp}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem;">`;

                    // Helper to recursively render object
                    function renderObject(obj, prefix = '') {
                        let html = '';
                        for (const [key, value] of Object.entries(obj)) {
                            if (typeof value === 'object' && value !== null) {
                                html += renderObject(value, prefix + key + '.');
                            } else {
                                html += `<div style="overflow: hidden; text-overflow: ellipsis;">
                                    <div style="font-weight: 500; font-size: 11px; color: var(--label-color); margin-bottom: 2px;">${prefix}${key}</div>
                                    <div style="font-size: 13px; color: var(--text-color);">${value}</div>
                                </div>`;
                            }
                        }
                        return html;
                    }

                    eventsHtml += renderObject(customData);
                    eventsHtml += `</div></div>`;
                });
                eventsHtml += '</div>';
                eventsDiv.innerHTML = eventsHtml;
            } else {
                let noEventsMsg = '<div style="color: var(--label-color); font-style: italic;">No events found</div>';
                if (data.debug) {
                    noEventsMsg += `<div style="margin-top: 0.5rem; color: #ff3b30; font-size: 11px;">Debug: ${JSON.stringify(data.debug)}</div>`;
                }
                eventsDiv.innerHTML = noEventsMsg;
            }

            responseDiv.style.display = 'grid';
        } else {
            dataDiv.innerHTML = `<div style="color: #ff3b30;">${data.error || 'Unknown error'}</div>`;
            responseDiv.style.display = 'grid';
        }

    } catch (error) {
        dataDiv.innerHTML = `<div style="color: #ff3b30;">Error: ${error.message}</div>`;
        responseDiv.style.display = 'grid';
    }
}

async function sendRequest() {
    const inputs = document.querySelectorAll('#dynamicFields input, #dynamicFields select');
    const data = {};
    inputs.forEach(input => {
        data[input.name] = input.value;
    });

    // Add kafkaTopic from defaults if available
    if (defaults[currentVariation] && defaults[currentVariation].kafkaTopic) {
        data.kafkaTopic = defaults[currentVariation].kafkaTopic;
    }

    const responseDiv = document.getElementById('response');
    const sendBtn = document.getElementById('sendBtn');
    const originalText = sendBtn.textContent;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    responseDiv.style.display = 'none';
    responseDiv.className = '';

    // Get active environment variables
    const env = environments.find(e => e.id === activeEnvId);
    const envVars = env ? env.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {}) : {};

    try {
        const res = await fetch('/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variation: currentVariation,
                data: data,
                clientId: data.clientId, // Pass clientId at top level too for Interact
                envVars: envVars
            })
        });

        const result = await res.json();

        responseDiv.style.display = 'block';
        responseDiv.textContent = JSON.stringify(result, null, 2);

        if (res.ok) {
            responseDiv.classList.add('success');
        } else {
            responseDiv.classList.add('error');
        }
    } catch (error) {
        responseDiv.style.display = 'block';
        responseDiv.textContent = 'Error: ' + error.message;
        responseDiv.classList.add('error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
    }
}

// Batch Upload Logic
function showBatchUpload() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('batch-container').style.display = 'block';

    // Highlight sidebar item
    document.querySelectorAll('.event-item').forEach(el => el.classList.remove('active'));
    const batchItem = document.querySelector('.event-item[data-group="batchUpload"]');
    if (batchItem) {
        batchItem.classList.add('active');
    }
}

function downloadTemplate() {
    const headers = ['DNI/NIE', 'idCliente', 'estado', 'importeTotal', 'idObjeto', 'numeroPoliza', 'numeroObjeto'];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Adobe_Batch_Template.xlsx");
}

let batchData = [];

function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        processPreview(json);
    };
    reader.readAsArrayBuffer(file);
}

function processPreview(json) {
    batchData = json;
    const tbody = document.querySelector('#preview-table tbody');
    tbody.innerHTML = '';

    json.forEach((row, index) => {
        const tr = document.createElement('tr');

        // Determine type based on importeTotal
        // If undefined or empty string -> Siniestro
        // If number -> Recibo
        let type = 'Unknown';
        if (row.importeTotal === 'undefined' || row.importeTotal === undefined || row.importeTotal === '') {
            type = 'Siniestro';
        } else if (!isNaN(parseFloat(row.importeTotal))) {
            type = 'Recibo';
        }

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${type}</td>
            <td>${row['DNI/NIE'] || ''}</td>
            <td>${row.idCliente || ''}</td>
            <td>${row.importeTotal || '-'}</td>
            <td>${row.estado || ''}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('preview-section').style.display = 'block';
}

async function processBatch() {
    const logDiv = document.getElementById('batch-log');
    logDiv.innerHTML = 'Starting batch process...<br>';

    for (let i = 0; i < batchData.length; i++) {
        const row = batchData[i];
        let payload = {};
        let kafkaTopic = '';

        // Logic to determine Siniestro vs Recibo
        if (row.importeTotal === 'undefined' || row.importeTotal === undefined || row.importeTotal === '') {
            // Siniestro
            kafkaTopic = 'es-verti.gcp.neurona.fct.siniestro.situacion';
            payload = {
                kafkaTopic: kafkaTopic,
                idSiniestro: row.idObjeto, // Mapping idObjeto to idSiniestro
                numeroSiniestro: row.numeroObjeto, // Mapping numeroObjeto to numeroSiniestro
                estado: row.estado,
                producto: "AU01", // Default or from Excel?
                idPoliza: 107989, // Default?
                numeroPoliza: row.numeroPoliza,
                riesgo: "BATCH UPLOAD",
                fechaDeclaracion: new Date().toLocaleDateString('es-ES'),
                fechaOcurrencia: new Date().toLocaleDateString('es-ES'),
                horaOcurrencia: new Date().toLocaleString('es-ES'),
                modoDeclaracion: "Reclamación CICOS",
                fechaAuditoria: new Date().toLocaleDateString('es-ES'),
                tipoSiniestro: "MSPC",
                motivoSituacion: "APCI",
                idCliente: row.idCliente
            };
        } else {
            // Recibo
            kafkaTopic = 'es-verti.gcp.neurona.fct.recibo-total.situacion';
            payload = {
                kafkaTopic: kafkaTopic,
                anioRecibo: new Date().getFullYear().toString(),
                numeroRecibo: row.numeroObjeto, // Mapping numeroObjeto to numeroRecibo?
                tipoRecibo: "R",
                fechaEfecto: new Date().toLocaleDateString('es-ES'),
                fechaVencimiento: new Date().toLocaleDateString('es-ES'),
                fechaEmisionPoliza: new Date().toLocaleDateString('es-ES'),
                fechaAlta: new Date().toLocaleDateString('es-ES'),
                idPoliza: 3363290, // Default?
                numeroPoliza: row.numeroPoliza,
                importeTotal: parseFloat(row.importeTotal),
                importeNeto: parseFloat(row.importeTotal) * 0.9, // Estimate
                nombreMediador: "VERTI TELEFONO",
                numeroSitutacionRecibo: 9,
                idCliente: row.idCliente,
                medioPago: "OTRO",
                fechaEnvioCobro: new Date().toLocaleDateString('es-ES'),
                estadoReciboCliente: row.estado || "PIMP"
            };
        }

        try {
            logDiv.innerHTML += `Sending row ${i + 1}... `;

            const res = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // Send flat payload
            });

            if (res.ok) {
                logDiv.innerHTML += `<span class="success">OK</span><br>`;
            } else {
                const err = await res.json();
                logDiv.innerHTML += `<span class="error">Failed: ${err.error}</span><br>`;
            }

        } catch (e) {
            logDiv.innerHTML += `<span class="error">Error: ${e.message}</span><br>`;
        }
    }

    logDiv.innerHTML += 'Batch process completed.';
}

// --- Environment Management ---

let environments = [];
let activeEnvId = null;

// Load environments from localStorage
function loadEnvironments() {
    const storedEnvs = localStorage.getItem('environments');
    if (storedEnvs) {
        environments = JSON.parse(storedEnvs);
    }

    const storedActiveId = localStorage.getItem('activeEnvId');
    if (storedActiveId) {
        activeEnvId = storedActiveId;
    }

    renderEnvSelector();
}

function saveEnvironments() {
    localStorage.setItem('environments', JSON.stringify(environments));
    localStorage.setItem('activeEnvId', activeEnvId || '');
    renderEnvSelector();
}

function renderEnvSelector() {
    const selector = document.getElementById('activeEnv');
    selector.innerHTML = '<option value="">None (Use Config)</option>';

    environments.forEach(env => {
        const option = document.createElement('option');
        option.value = env.id;
        option.textContent = env.name;
        if (env.id === activeEnvId) {
            option.selected = true;
        }
        selector.appendChild(option);
    });

    // Also update the editor if open
    if (activeEnvId) {
        renderEnvEditor(activeEnvId);
    } else {
        document.getElementById('envEditor').style.display = 'none';
    }
}

function createNewEnv() {
    const newEnv = {
        id: Date.now().toString(),
        name: 'New Environment',
        variables: [
            { key: 'CLIENT_ID', value: '' },
            { key: 'CLIENT_SECRET', value: '' },
            { key: 'ORG_ID', value: '' },
            { key: 'API_KEY', value: '' }
        ]
    };
    environments.push(newEnv);
    activeEnvId = newEnv.id;
    saveEnvironments();
    renderEnvEditor(newEnv.id);
}

function changeEnvironment() {
    const selector = document.getElementById('activeEnv');
    activeEnvId = selector.value || null;
    saveEnvironments();

    if (activeEnvId) {
        renderEnvEditor(activeEnvId);
    } else {
        document.getElementById('envEditor').style.display = 'none';
    }
}

function renderEnvEditor(envId) {
    const env = environments.find(e => e.id === envId);
    if (!env) return;

    document.getElementById('envEditor').style.display = 'block';
    document.getElementById('envName').value = env.name;

    const varsList = document.getElementById('envVarsList');
    varsList.innerHTML = '';

    env.variables.forEach((v, index) => {
        const row = document.createElement('div');
        row.className = 'var-row';
        row.innerHTML = `
            <input type="text" placeholder="Key" value="${v.key}" onchange="updateEnvVar(${index}, 'key', this.value)">
            <input type="text" placeholder="Value" value="${v.value}" onchange="updateEnvVar(${index}, 'value', this.value)">
            <span class="remove-var" onclick="removeEnvVar(${index})">&times;</span>
        `;
        varsList.appendChild(row);
    });
}

function updateEnvVar(index, field, value) {
    const env = environments.find(e => e.id === activeEnvId);
    if (env) {
        env.variables[index][field] = value;
    }
}

function removeEnvVar(index) {
    const env = environments.find(e => e.id === activeEnvId);
    if (env) {
        // Sync name before re-render
        const currentName = document.getElementById('envName').value;
        if (currentName) env.name = currentName;

        env.variables.splice(index, 1);
        renderEnvEditor(activeEnvId);
    }
}

function addEnvVarRow() {
    const env = environments.find(e => e.id === activeEnvId);
    if (env) {
        // Sync name before re-render
        const currentName = document.getElementById('envName').value;
        if (currentName) env.name = currentName;

        env.variables.push({ key: '', value: '' });
        renderEnvEditor(activeEnvId);
    }
}

function saveEnvironment() {
    const envName = document.getElementById('envName').value;
    const env = environments.find(e => e.id === activeEnvId);
    if (env) {
        env.name = envName;
        saveEnvironments();
        alert('Environment saved!');
    }
}

function deleteCurrentEnv() {
    if (!confirm('Are you sure you want to delete this environment?')) return;

    environments = environments.filter(e => e.id !== activeEnvId);
    activeEnvId = null;
    saveEnvironments();
}

// UI Handlers
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    loadEnvironments();
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function openTab(evt, tabName) {
    const tabContent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none";
    }

    const tabLinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].className = tabLinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('settingsModal');
    if (event.target == modal) {
        closeSettings();
    }
}

// Initialize
loadEnvironments();
