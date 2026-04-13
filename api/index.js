const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const qs = require('qs'); // Need qs for x-www-form-urlencoded

let config;
try {
    config = require('../config');
    // Handle case where config exports DEV/PROD objects
    if (config.DEV) {
        config = config.DEV;
    }
} catch (e) {
    console.log('config.js not found, using environment variables');
    config = {
        ADOBE_URL: process.env.ADOBE_URL,
        COLLECTION_URL: process.env.COLLECTION_URL,
        TOKEN_URL: process.env.TOKEN_URL,
        CLIENT_ID: process.env.CLIENT_ID,
        CLIENT_SECRET: process.env.CLIENT_SECRET,
        GRANT_TYPE: process.env.GRANT_TYPE,
        SCOPE: process.env.SCOPE,
        ORG_ID: process.env.ORG_ID,
        API_KEY: process.env.API_KEY,
        SANDBOX_NAME: process.env.SANDBOX_NAME,
        FLOW_ID: process.env.FLOW_ID,
        CUSTOM_HEADERS: process.env.CUSTOM_HEADERS ? JSON.parse(process.env.CUSTOM_HEADERS) : {}
    };
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Destructure configuration
const {
    ADOBE_URL,
    COLLECTION_URL,
    TOKEN_URL,
    CLIENT_ID,
    CLIENT_SECRET,
    GRANT_TYPE,
    SCOPE,
    ORG_ID,
    API_KEY,
    SANDBOX_NAME,
    FLOW_ID,
    CUSTOM_HEADERS
} = config;

// Token State
const tokenCache = {}; // Key: clientId, Value: { token, time }

function createHttpError(status, message, details = null) {
    const error = new Error(message);
    error.status = status;
    error.details = details;
    return error;
}

function findMissingRequiredFields(source, fields) {
    return fields.filter((field) => {
        const value = source[field];
        return value === undefined || value === null || value === '';
    });
}

async function getValidToken(overrides = {}) {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const currentClientId = overrides.CLIENT_ID || CLIENT_ID;
    const currentClientSecret = overrides.CLIENT_SECRET || CLIENT_SECRET;
    const currentTokenUrl = overrides.TOKEN_URL || TOKEN_URL || 'https://ims-na1.adobelogin.com/ims/token/v3';
    const currentGrantType = overrides.GRANT_TYPE || GRANT_TYPE || 'client_credentials';
    const currentScope = overrides.SCOPE || SCOPE;

    const tokenConfig = {
        CLIENT_ID: currentClientId,
        CLIENT_SECRET: currentClientSecret,
        TOKEN_URL: currentTokenUrl,
        GRANT_TYPE: currentGrantType,
        SCOPE: currentScope
    };
    const missingTokenFields = findMissingRequiredFields(tokenConfig, ['CLIENT_ID', 'CLIENT_SECRET', 'TOKEN_URL', 'GRANT_TYPE', 'SCOPE']);
    if (missingTokenFields.length > 0) {
        throw createHttpError(400, 'Missing token configuration', { missingFields: missingTokenFields });
    }

    // Check cache for this specific client ID
    if (tokenCache[currentClientId] && (now - tokenCache[currentClientId].time < twentyFourHours)) {
        console.log(`Using cached token for client ${currentClientId}`);
        return tokenCache[currentClientId].token;
    }

    console.log(`Fetching new token for client ${currentClientId}...`);
    console.log(`Using Token URL: ${currentTokenUrl}`);
    try {
        const response = await axios.post(currentTokenUrl, qs.stringify({
            client_id: currentClientId,
            client_secret: currentClientSecret,
            grant_type: currentGrantType,
            scope: currentScope
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const newToken = response.data.access_token;
        tokenCache[currentClientId] = {
            token: newToken,
            time: now
        };
        console.log('New token generated successfully');
        return newToken;
    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error('Error fetching token:', errorDetails);
        const newError = createHttpError(error.response?.status || 500, 'Failed to generate access token');
        newError.details = errorDetails;
        throw newError;
    }
}

app.post('/api/send', async (req, res) => {
    try {
        console.log('Received request body:', JSON.stringify(req.body, null, 2)); // Debug log

        const { clientId, variation, data, customHeaders, envVars } = req.body;
        let requestType = req.body.requestType;

        // Use overrides or defaults
        const currentAdobeUrl = envVars?.ADOBE_URL || ADOBE_URL;
        const currentCollectionUrl = envVars?.COLLECTION_URL || COLLECTION_URL;
        const currentApiKey = envVars?.API_KEY || API_KEY;
        const currentOrgId = envVars?.ORG_ID || ORG_ID;
        const currentSandboxName = envVars?.SANDBOX_NAME || SANDBOX_NAME;
        const currentFlowId = envVars?.FLOW_ID || FLOW_ID;
        const mergedCustomHeaders = {
            ...(CUSTOM_HEADERS || {}),
            ...(customHeaders || {})
        };

        // Auto-detect collection request based on kafkaTopic in root body (Flat Payload support)
        if (req.body.kafkaTopic) {
            requestType = 'collection';
        }

        // Determine requestType if not provided and not auto-detected
        if (!requestType) {
            if (variation >= 5 && variation !== 8) {
                requestType = 'collection';
            } else {
                requestType = 'interact';
            }
        }

        const commonConfig = {
            API_KEY: currentApiKey,
            ORG_ID: currentOrgId,
            SANDBOX_NAME: currentSandboxName
        };
        const missingCommonFields = findMissingRequiredFields(commonConfig, ['API_KEY', 'ORG_ID', 'SANDBOX_NAME']);
        if (missingCommonFields.length > 0) {
            return res.status(400).json({
                error: 'Missing API configuration',
                details: { missingFields: missingCommonFields }
            });
        }

        const token = await getValidToken(envVars);

        console.log('Using Adobe URL:', currentAdobeUrl);
        console.log('Using Collection URL:', currentCollectionUrl);

        if (requestType === 'collection') {
            if (!currentCollectionUrl) {
                return res.status(400).json({
                    error: 'Missing collection endpoint configuration',
                    details: { missingFields: ['COLLECTION_URL'] }
                });
            }

            // --- Collection API Logic ---
            let payload = data || req.body;
            let kafkaTopic = payload.kafkaTopic;

            const collectionPayload = {
                ...payload,
                kafkaTopic: kafkaTopic
            };

            if (collectionPayload.idCliente) {
                collectionPayload.idCliente = Number(collectionPayload.idCliente);
            }

            delete collectionPayload.requestType;
            delete collectionPayload.variation;
            delete collectionPayload.envVars;

            console.log('Sending Collection Payload:', JSON.stringify(collectionPayload, null, 2));

            const response = await axios.post(currentCollectionUrl, collectionPayload, {
                headers: {
                    ...mergedCustomHeaders,
                    'Authorization': `Bearer ${token}`,
                    'x-gw-ims-org-id': currentOrgId,
                    'x-api-key': currentApiKey,
                    'x-sandbox-name': currentSandboxName,
                    'x-adobe-flow-id': currentFlowId,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            res.json({
                adobeResponse: response.data,
                requestPayload: collectionPayload
            });

        } else {
            // --- Interact API Logic ---
            if (!clientId) {
                return res.status(400).json({ error: 'Client ID is required' });
            }

            if (!currentAdobeUrl) {
                return res.status(400).json({
                    error: 'Missing interact endpoint configuration',
                    details: { missingFields: ['ADOBE_URL'] }
                });
            }

            const timestamp = new Date().toISOString();
            let body = {};

            const identityMap = {
                "identityMap": {
                    "clientId": [
                        {
                            "id": clientId,
                            "authenticatedState": "authenticated",
                            "primary": true
                        }
                    ]
                }
            };

            switch (parseInt(variation)) {
                case 1: // Display
                    body = {
                        "event": {
                            "xdm": {
                                "identityMap": identityMap.identityMap,
                                "eventType": "inappmessageTracking.display",
                                "alerts": {
                                    "clicks": 1,
                                    "impressions": [{ "ID": "1234", "displays": 1, "type": "app:ventajas y beneficios:home:si" }]
                                },
                                "timestamp": timestamp
                            }
                        }
                    };
                    break;
                case 2: // Page View
                    body = {
                        "event": {
                            "xdm": {
                                "identityMap": identityMap.identityMap,
                                "eventType": "web.webpagedetails.pageViews",
                                "web": {
                                    "webPageDetails": {
                                        "pageViews": { "value": 1 },
                                        "isHomePage": true,
                                        "URL": "https://www.verti.es/hipotecas/seguros-de-hogar",
                                        "name": "seguros-de-hogar"
                                    }
                                },
                                "timestamp": timestamp
                            }
                        }
                    };
                    break;
                case 3: // Dismiss
                    body = {
                        "event": {
                            "xdm": {
                                "identityMap": identityMap.identityMap,
                                "eventType": "inappmessageTracking.dismissals",
                                "alerts": {
                                    "clicks": 1,
                                    "dismissals": 1,
                                    "impressions": [{ "ID": "1234", "type": "app:ventajas y beneficios:home:si" }]
                                },
                                "timestamp": timestamp
                            }
                        }
                    };
                    break;
                case 4: // Interact
                    body = {
                        "event": {
                            "xdm": {
                                "identityMap": identityMap.identityMap,
                                "eventType": "inappmessageTracking.interact",
                                "alerts": {
                                    "clicks": 1,
                                    "impressions": [{ "ID": "1234", "selected": 1, "type": "app:ventajas y beneficios:home:si" }]
                                },
                                "timestamp": timestamp
                            }
                        }
                    };
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid variation' });
            }

            let headers = {
                ...mergedCustomHeaders,
                'Authorization': `Bearer ${token}`,
                'x-gw-ims-org-id': currentOrgId,
                'x-api-key': currentApiKey,
                'x-sandbox-name': currentSandboxName,
                'Content-Type': 'application/json'
            };

            const response = await axios.post(currentAdobeUrl, body, { headers });
            res.json({
                adobeResponse: response.data,
                requestPayload: body
            });
        }
    } catch (error) {
        console.error('Error processing request:', error.message);
        const statusCode = error.status || error.response?.status || 500;
        res.status(statusCode).json({
            error: error.message,
            details: error.details || (error.response ? error.response.data : null)
        });
    }
});

// Batch Errors Recovery endpoint
app.post('/api/batch-errors', async (req, res) => {
    try {
        const { batchId, envVars } = req.body;

        if (!batchId) {
            return res.status(400).json({ error: 'batchId is required' });
        }

        // Use overrides or defaults
        const currentApiKey = envVars?.API_KEY || API_KEY;
        const currentOrgId = envVars?.ORG_ID || ORG_ID;
        const currentSandboxName = envVars?.SANDBOX_NAME || SANDBOX_NAME;
        
        // Determine the environment based on sandbox name
        let platformHost = 'platform-nld2.adobe.io';
        
        const token = await getValidToken(envVars);

        const listUrl = `https://${platformHost}/data/foundation/export/batches/${batchId}/failed`;

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': currentApiKey,
            'x-gw-ims-org-id': currentOrgId,
            'x-sandbox-name': currentSandboxName
        };

        // 1. Fetch the list of failed files
        const listResponse = await axios.get(listUrl, { headers });
        const data = listResponse.data.data;

        if (!data || data.length === 0) {
            return res.json({ bodies: [] });
        }

        let allBodies = [];

        // 2. Fetch each failed NDJSON file
        for (const file of data) {
            const fileHref = file._links.self.href;
            try {
                const fileResponse = await axios.get(fileHref, { headers, responseType: 'text' });
                
                // 3. Parse NDJSON and extract bodies
                const lines = fileResponse.data.split(/\r?\n/).filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed && parsed.body) {
                            allBodies.push(parsed.body);
                        }
                    } catch (e) {
                         console.error('Failed to parse line:', e.message);
                    }
                }
            } catch (fileError) {
                console.error(`Error fetching file ${fileHref}:`, fileError.message);
            }
        }

        res.json({ bodies: allBodies });

    } catch (error) {
        console.error('Error fetching batch errors:', error.response ? error.response.data : error.message);
        const statusCode = error.response ? error.response.status : 500;
        res.status(statusCode).json({
            error: error.message,
            details: error.details || (error.response ? error.response.data : null)
        });
    }
});

// Profile Check endpoint
app.post('/api/profile', async (req, res) => {
    try {
        const { clientId, envVars } = req.body;

        if (!clientId) {
            return res.status(400).json({ error: 'clientId is required' });
        }

        // Use overrides or defaults
        const currentApiKey = envVars?.API_KEY || API_KEY;
        const currentOrgId = envVars?.ORG_ID || ORG_ID;
        const currentSandboxName = envVars?.SANDBOX_NAME || SANDBOX_NAME;

        const token = await getValidToken(envVars);

        const profileUrl = `https://platform.adobe.io/data/core/ups/access/entities?schema.name=_xdm.context.profile&entityIdNS=clientId&entityId=${clientId}`;

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': currentApiKey,
            'x-gw-ims-org-id': currentOrgId,
            'x-sandbox-name': currentSandboxName
        };

        const response = await axios.get(profileUrl, { headers });

        // Extract the first entity (the key is dynamic, like "GlhYwEFgMQ")
        const entityKey = Object.keys(response.data)[0];
        const entityData = response.data[entityKey];
        const entity = entityData?.entity;

        if (!entity) {
            return res.json({ message: 'No profile data found' });
        }

        // Fetch Profile Events
        let events = [];
        let eventsDebug = null;
        try {
            const mergePolicyId = entityData.mergePolicy?.id || "d6419369-aef2-4c60-a856-5d91ce6a68eb"; // Fallback to hardcoded if not found

            const graphqlUrl = 'https://platform.adobe.io/data/xql/graphql';
            const graphqlBody = {
                "operationName": "profileExperienceEvent",
                "variables": {
                    "params": {
                        "mergePolicyId": mergePolicyId,
                        "profileId": entityKey,
                        "schemaName": "_xdm.context.experienceevent",
                        "relatedSchemaName": "_xdm.context.profile"
                    },
                    "page": {
                        "limit": 25,
                        "start": 1
                    }
                },
                "query": "query profileExperienceEvent($page: PageInput!, $params: ProfileExperienceEventInput!) {\n  profileExperienceEvent(page: $page, params: $params) {\n    children\n    _links\n    __typename\n  }\n}\n"
            };

            const graphqlHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-api-key': 'acp_ui_platform', // Using the specific API key from the cURL
                'x-gw-ims-org-id': currentOrgId,
                'x-sandbox-name': currentSandboxName,
                'Origin': 'https://experience.adobe.com',
                'Referer': 'https://experience.adobe.com/'
            };

            console.log('Fetching events for profile:', entityKey);
            const eventsResponse = await axios.post(graphqlUrl, graphqlBody, { headers: graphqlHeaders });

            if (eventsResponse.data.data && eventsResponse.data.data.profileExperienceEvent && eventsResponse.data.data.profileExperienceEvent.children) {
                events = eventsResponse.data.data.profileExperienceEvent.children;
            }

            if (events.length === 0) {
                // If no events found (or error), populate debug info
                eventsDebug = {
                    message: eventsResponse.data.errors ? "GraphQL Errors" : "No events returned",
                    errors: eventsResponse.data.errors,
                    profileIdUsed: entityKey,
                    mergePolicyIdUsed: mergePolicyId,
                    sandbox: currentSandboxName,
                    orgId: currentOrgId
                };
                console.log('Debug Info:', JSON.stringify(eventsDebug));
            }
        } catch (eventError) {
            console.error('Error fetching events:', eventError.response ? eventError.response.data : eventError.message);
            eventsDebug = {
                message: "Exception caught",
                error: eventError.response ? eventError.response.data : eventError.message,
                profileIdUsed: entityKey
            };
            // Don't fail the whole request if events fail, just log it
        }

        // Filter and return only the requested fields
        const filteredData = {
            email: entity.personalEmail?.address || null,
            firstName: entity.person?.name?.firstName || null,
            lastName: entity.person?.name?.lastName || null,
            middleName: entity.person?.name?.middleName || null,
            clientId: entity.identityMap?.clientid?.[0]?.id || null,
            customPersonalization: entity._mapfretechsa?.journeyOptimizer?.customPersonalization || null,
            activePolicies: entity._mapfretechsa?.journeyOptimizer?.activePolicies || null,
            events: events,
            debug: eventsDebug
        };

        res.json(filteredData);

    } catch (error) {
        console.error('Error fetching profile:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: error.message,
            details: error.details || (error.response ? error.response.data : null)
        });
    }
});





if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
