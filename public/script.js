let currentVariation = null;
const formState = {}; // Store form values

// Theme Management - Dark theme is default, toggle enables light mode
const themeCheckbox = document.getElementById('checkbox');

function toggleTheme(isLight) {
    if (isLight) {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    }
}

function setTheme(isLight) {
    themeCheckbox.checked = isLight;
    toggleTheme(isLight);
}

// Load saved theme (dark is default)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    if (themeCheckbox) themeCheckbox.checked = true;
}


const defaults = {
    5: {
        "kafkaTopic": "es-verti.gcp.neurona.fct.siniestro.situacion",
        "idSiniestro": "",
        "numeroSiniestro": "",
        "estado": "",
        "producto": "",
        "idPoliza": "",
        "numeroPoliza": "",
        "riesgo": "",
        "fechaDeclaracion": "",
        "fechaOcurrencia": "",
        "horaOcurrencia": "",
        "modoDeclaracion": "",
        "fechaAuditoria": "",
        "tipoSiniestro": "",
        "motivoSituacion": "",
        "idCliente": ""
    },
    6: {
        "kafkaTopic": "es-verti.gcp.neurona.fct.recibo-total.situacion",
        "anioRecibo": "",
        "numeroRecibo": "",
        "tipoRecibo": "",
        "fechaEfecto": "",
        "fechaVencimiento": "",
        "fechaEmisionPoliza": "",
        "fechaAlta": "",
        "idPoliza": "",
        "numeroPoliza": "",
        "importeTotal": "",
        "importeNeto": "",
        "nombreMediador": "",
        "numeroSitutacionRecibo": "",
        "idCliente": "",
        "medioPago": "",
        "fechaEnvioCobro": "",
        "estadoReciboCliente": ""
    },
    7: {
        "idCliente": "",
        "nombre": "",
        "apellido1": "",
        "apellido2": "",
        "telefonoMovilPrincipal": "",
        "emailPrincipal": "",
        "poblacion": "",
        "provincia": "",
        "codigoPostal": "",
        "kafkaTopic": "es-verti.gcp.neurona.fct.cliente.contacto"
    },
    8: {
        "kafkaTopic": "es-verti.gcp.neurona.fct.cotizacion.situacion",
        "idPoliza": "",
        "numeroPoliza": "",
        "idCotizacion": "",
        "producto": "",
        "estado": "",
        "canalOrigen": "",
        "canalCierre": "",
        "mediador": "",
        "numeroCotizacion": "",
        "tipoCotizacion": "",
        "fechaEfecto": "",
        "FechaVencimiento": "",
        "modalidad": "",
        "precio": "",
        "periodicidadPago": "",
        "medioPago": "",
        "riesgo": "",
        "numeroDocumento": "",
        "nombre": "",
        "apellido1": "",
        "apellido2": "",
        "email": "",
        "telefono": "",
        "combinacion": "",
        "tipoDocumento": "",
        "usuarioSituacion": ""
    },
    9: {
        "kafkaTopic": "es-verti.gcp.neurona.fct.poliza.situacion",
        "idCliente": "",
        "idPoliza": "",
        "numeroPoliza": "",
        "producto": "",
        "riesgo": "",
        "tipoSituacion": ""
    }
};

const fieldOrder = {
    5: ['idCliente', 'idSiniestro', 'estado', 'numeroSiniestro', 'numeroPoliza'],
    6: ['idCliente', 'numeroRecibo', 'estadoReciboCliente', 'numeroPoliza', 'importeTotal', 'idPoliza'],
    8: ['numeroDocumento', 'idCotizacion', 'numeroCotizacion', 'estado', 'precio'],
    9: ['idCliente', 'numeroPoliza', 'tipoSituacion']
};

const fieldOptions = {
    'estado': ['ABIE', 'CERR', 'ESTIMADA'],
    'estadoReciboCliente': ['PIMP', 'COBR'],
    'tipoSituacion': ['ANUL']
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

    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('batch-errors-container').style.display = 'none';
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
            card.className = 'event-card full-width';

            const title = document.createElement('h3');
            title.textContent = v.label;


            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'event-card-actions';

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.style.marginBottom = '0';
            formGroup.style.width = '100%';

            const label = document.createElement('label');
            label.textContent = 'Client ID';
            label.style.display = 'none';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `clientId_${v.id}`;
            input.placeholder = 'Enter Client ID';

            // Load state
            if (formState[groupName] && formState[groupName][input.id]) {
                input.value = formState[groupName][input.id];
            } else {
                input.value = '';
            }

            // Save state
            input.addEventListener('input', (e) => {
                if (!formState[groupName]) formState[groupName] = {};
                formState[groupName][input.id] = e.target.value;
            });

            const btn = document.createElement('button');
            btn.textContent = `Send ${v.label}`;
            btn.style.marginTop = '0';
            btn.style.width = '100%';
            btn.onclick = () => sendInAppRequest(v.id, input.id, btn);

            formGroup.appendChild(label);
            formGroup.appendChild(input);

            actionsDiv.appendChild(formGroup);
            actionsDiv.appendChild(btn);

            card.appendChild(title);
            card.appendChild(actionsDiv);

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
        // Use the new formatter
        responseDiv.innerHTML = formatResponseDisplay(data, parseInt(variation));

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
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('batch-errors-container').style.display = 'none';
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

function createField(key, defaultValue, isFullWidth = false) {
    const div = document.createElement('div');
    div.className = 'form-group';
    if (isFullWidth) div.classList.add('full-width');

    const label = document.createElement('label');
    label.textContent = key;
    label.htmlFor = key;

    // Determine value from state or default
    let value = defaultValue;
    if (formState[currentVariation] && formState[currentVariation][key] !== undefined) {
        value = formState[currentVariation][key];
    }

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

    // Add state listener
    input.addEventListener('input', (e) => {
        if (!formState[currentVariation]) formState[currentVariation] = {};
        formState[currentVariation][key] = e.target.value;
    });

    div.appendChild(label);
    div.appendChild(input);
    return div;
}

function renderInteractFields() {
    const dynamicFields = document.getElementById('dynamicFields');
    // Interact events just need Client ID
    dynamicFields.appendChild(createField('clientId', '', true));
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
    document.getElementById('batch-errors-container').style.display = 'none';
    document.getElementById('profile-container').style.display = 'flex';

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
            // Helper to render attribute rows
            const renderAttribute = (label, value) => {
                return `
                <div class="attribute-row">
                    <span class="attribute-label">${label}</span>
                    <span class="attribute-value">${value || 'N/A'}</span>
                </div>`;
            };

            // 1. Basic Profile Attributes
            let basicProfileHtml = `
                <div class="profile-section">
                    <div class="profile-section-title">Profile Attributes</div>
                    <div class="attribute-list">
                        ${renderAttribute('Client ID', data.clientId)}
                        ${renderAttribute('First Name', data.firstName)}
                        ${renderAttribute('Last Name', data.lastName)}
                        ${renderAttribute('Middle Name', data.middleName)}
                        ${renderAttribute('Email', data.email)}
                    </div>
                </div>
            `;

            // 2. Custom Personalization
            let customPersonalizationHtml = '';
            if (data.customPersonalization) {
                try {
                    const parsed = JSON.parse(data.customPersonalization);
                    let objects = [];
                    if (Array.isArray(parsed)) objects = parsed;
                    else if (typeof parsed === 'object' && parsed !== null) objects = [parsed];

                    if (objects.length > 0) {
                        customPersonalizationHtml = `
                        <div class="profile-section">
                            <div class="profile-section-title">Custom Personalization</div>
                            <div class="objects-list">`;

                        objects.forEach((obj, index) => {
                            customPersonalizationHtml += `<div class="object-container">
                                <div class="object-title">Object ${index + 1}</div>
                                <div class="attribute-list">`;

                            for (const [key, value] of Object.entries(obj)) {
                                customPersonalizationHtml += renderAttribute(key, value);
                            }

                            customPersonalizationHtml += `</div></div>`;
                        });

                        customPersonalizationHtml += `</div></div>`;
                    }
                } catch (e) {
                    console.error("Error parsing customPersonalization", e);
                }
            }

            // 3. Active Policies
            let activePoliciesHtml = '';
            if (data.activePolicies) {
                try {
                    const parsed = JSON.parse(data.activePolicies);
                    let policies = [];
                    if (Array.isArray(parsed)) policies = parsed;
                    else if (typeof parsed === 'object' && parsed !== null) policies = [parsed];

                    if (policies.length > 0) {
                        activePoliciesHtml = `
                        <div class="profile-section">
                            <div class="profile-section-title">Active Policies</div>
                            <div class="objects-list">`;

                        policies.forEach((policy, index) => {
                            activePoliciesHtml += `<div class="object-container">
                                <div class="object-title">Policy ${index + 1}</div>
                                <div class="attribute-list">`;

                            for (const [key, value] of Object.entries(policy)) {
                                activePoliciesHtml += renderAttribute(key, value);
                            }

                            activePoliciesHtml += `</div></div>`;
                        });

                        activePoliciesHtml += `</div></div>`;
                    }
                } catch (e) {
                    console.error("Error parsing activePolicies", e);
                }
            }

            // Combine Data Sections
            dataDiv.innerHTML = basicProfileHtml + customPersonalizationHtml + activePoliciesHtml;

            // 4. Render Events
            const eventsDiv = document.getElementById('profile-events');
            if (data.events && data.events.length > 0) {
                let eventsHtml = `<div class="profile-section"><div class="profile-section-title">Profile Events</div>`;

                data.events.forEach((event, index) => {
                    let jsonString = JSON.stringify(event, null, 2);
                    // Highlight "eventType"
                    jsonString = jsonString.replace(/"eventType":\s*"([^"]+)"/g, '<span class="key-highlight">"eventType": "$1"</span>');

                    eventsHtml += `
                    <div class="event-container">
                        <div class="event-title">Event ${index + 1}</div>
                        <pre class="json-display">${jsonString}</pre>
                    </div>`;
                });

                eventsHtml += `</div>`;
                eventsDiv.innerHTML = eventsHtml;
            } else {
                eventsDiv.innerHTML = '<div class="profile-section"><p style="color: var(--text-secondary); padding: 1rem;">No events found.</p></div>';
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
        // Use the new formatter
        responseDiv.innerHTML = formatResponseDisplay(result, parseInt(currentVariation));

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

// --- Batch Errors Recovery Logic ---

// --- Batch Errors Recovery Logic ---
let extractedBatchBodies = [];

function showBatchErrors() {
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('batch-errors-container').style.display = 'flex';
    document.getElementById('batch-errors-container').style.flexDirection = 'column';

    // Highlight sidebar item
    document.querySelectorAll('.event-item').forEach(el => el.classList.remove('active'));
    const batchErrorsItem = document.querySelector('.event-item[data-group="batchErrors"]');
    if (batchErrorsItem) {
        batchErrorsItem.classList.add('active');
    }
}

async function fetchBatchErrors() {
    const batchId = document.getElementById('recoveryBatchId').value.trim();
    if (!batchId) {
        alert("Please enter a Batch ID.");
        return;
    }

    const responseDiv = document.getElementById('batch-errors-response');
    const countEl = document.getElementById('batch-errors-count');
    const outputEl = document.getElementById('batch-errors-output');
    const fetchBtn = document.getElementById('fetchErrorsBtn');

    responseDiv.style.display = 'none';
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Fetching...';
    
    // Get active environment variables
    const env = environments.find(e => e.id === activeEnvId);
    const envVars = env ? env.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {}) : {};

    try {
        const res = await fetch('/api/batch-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId, envVars })
        });

        const data = await res.json();

        if (res.ok) {
            const bodies = data.bodies || [];
            extractedBatchBodies = bodies; // Store globally for resending
            countEl.textContent = `Extracted Payloads: ${bodies.length}`;
            outputEl.textContent = JSON.stringify(bodies, null, 2);
            responseDiv.style.display = 'block';
        } else {
            alert(`Error: ${data.error || 'Failed to fetch batch errors'}`);
        }
    } catch (e) {
        alert(`Request failed: ${e.message}`);
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch Errors';
    }
}

function copyBatchErrors() {
    const outputEl = document.getElementById('batch-errors-output');
    const text = outputEl.textContent;
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById('copyErrorsBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

async function resendBatchErrors() {
    if (!extractedBatchBodies || extractedBatchBodies.length === 0) {
        alert("No payloads to resend. Please fetch a batch first.");
        return;
    }

    const resendBtn = document.getElementById('resendErrorsBtn');
    if (!resendBtn) return;
    
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    // Get active environment variables
    const env = environments.find(e => e.id === activeEnvId);
    const envVars = env ? env.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {}) : {};

    let successCount = 0;
    let failCount = 0;
    
    // Create a console-like experience or just a simple alert at the end
    for (const body of extractedBatchBodies) {
        try {
            // Forward the payload back to the /api/send endpoint
            // It auto-detects requestType: 'collection' if kafkaTopic is present
            const res = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...body,
                    envVars: envVars
                })
            });
            
            if (res.ok) {
                successCount++;
            } else {
                failCount++;
                console.error('Failed to resend object:', body);
            }
        } catch (e) {
            failCount++;
            console.error('Network error resending object:', e, body);
        }
    }

    alert(`Resend Complete!\nSuccessful: ${successCount}\nFailed: ${failCount}\n\nCheck the browser console for any failed payloads.`);
    
    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend All';
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
            { key: 'API_KEY', value: '' },
            { key: 'SCOPE', value: '' },
            { key: 'COLLECTION_URL', value: '' },
            { key: 'FLOW_ID', value: '' },
            { key: 'SANDBOX_NAME', value: '' }
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
        closeSettings();
    }
}

function toggleBulkEdit() {
    const container = document.getElementById('bulkEditContainer');
    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';

    if (isHidden) {
        // Populate textarea with current vars
        const env = environments.find(e => e.id === activeEnvId);
        if (env) {
            const text = env.variables.map(v => `${v.key}:${v.value}`).join('\n');
            document.getElementById('bulkEditText').value = text;
        }
    }
}

function applyBulkEdit() {
    const text = document.getElementById('bulkEditText').value;
    const lines = text.split('\n');
    const newVars = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        // Split by first colon
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            // Join the rest back in case value contains colons
            const value = parts.slice(1).join(':').trim();
            // Remove {{ }} if present
            const cleanValue = value.replace(/^{{|}}$/g, '');
            newVars.push({ key, value: cleanValue });
        }
    });

    const env = environments.find(e => e.id === activeEnvId);
    if (env) {
        // Merge with existing vars or replace? 
        // Let's replace/update existing keys and add new ones
        newVars.forEach(newVar => {
            const existingIndex = env.variables.findIndex(v => v.key === newVar.key);
            if (existingIndex >= 0) {
                env.variables[existingIndex].value = newVar.value;
            } else {
                env.variables.push(newVar);
            }
        });

        renderEnvEditor(activeEnvId);
        toggleBulkEdit(); // Close editor
        saveEnvironments();
    }
}

function showDeleteConfirm() {
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('confirmDeleteBtn').style.display = 'inline-flex';
    document.getElementById('cancelDeleteBtn').style.display = 'inline-flex';
}

function cancelDeleteEnv() {
    document.getElementById('deleteBtn').style.display = 'inline-flex';
    document.getElementById('confirmDeleteBtn').style.display = 'none';
    document.getElementById('cancelDeleteBtn').style.display = 'none';
}

function confirmDeleteEnv() {
    environments = environments.filter(e => e.id !== activeEnvId);
    activeEnvId = null;
    saveEnvironments();
    cancelDeleteEnv(); // Reset the buttons
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

function formatResponseDisplay(data, variation) {
    const { adobeResponse, requestPayload } = data;
    let displayContent = '';

    // 1. Display Request Details based on variation
    if (requestPayload) {
        displayContent += '<h3>Request Details</h3>';

        // Siniestro (5) & Recibo (6, 9)
        if (variation === 5 || variation === 6 || variation === 9) {
            const mapfreData = requestPayload.event?.xdm?.kafkaReciboSituacion?._mapfretechsa ||
                requestPayload.event?.xdm?.kafkaSiniestroSituacion?._mapfretechsa ||
                requestPayload.event?.xdm?.kafkaPolizaSituacion?._mapfretechsa;

            if (mapfreData) {
                displayContent += `<pre>${JSON.stringify(mapfreData, null, 2)}</pre>`;
            } else {
                displayContent += '<p>No _mapfretechsa data found.</p>';
            }
        }
        // Cliente Contacto (7)
        else if (variation === 7) {
            const contactData = requestPayload.event?.xdm?.kafkaClienteContacto?._mapfretechsa?.customer?.contact;
            if (contactData) {
                const filteredData = {
                    homeAddress: contactData.homeAddress,
                    person: contactData.person,
                    personalEmail: {
                        address: contactData.personalEmail?.address
                    }
                };
                displayContent += `<pre>${JSON.stringify(filteredData, null, 2)}</pre>`;
            } else {
                displayContent += '<p>No contact data found.</p>';
            }
        }
        // InApp (1, 3, 4)
        else if (variation === 1 || variation === 3 || variation === 4) {
            const impressions = requestPayload.event?.xdm?.alerts?.impressions;
            if (impressions) {
                const filteredImpressions = impressions.map(imp => ({
                    type: imp.type,
                    ID: imp.ID
                }));
                displayContent += `<pre>"impressions": ${JSON.stringify(filteredImpressions, null, 2)}</pre>`;
            } else {
                displayContent += '<p>No impressions found.</p>';
            }
        }
        // Default: Show full payload for others
        else {
            displayContent += `<pre>${JSON.stringify(requestPayload, null, 2)}</pre>`;
        }
    }

    // 2. Display Adobe Response
    displayContent += '<h3>Adobe Response</h3>';
    displayContent += `<pre>${JSON.stringify(adobeResponse, null, 2)}</pre>`;

    return displayContent;
}
