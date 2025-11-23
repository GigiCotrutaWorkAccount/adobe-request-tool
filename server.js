const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const qs = require('qs'); // Need qs for x-www-form-urlencoded

let config;
try {
    config = require('./config');
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
app.use(express.static(path.join(__dirname, 'public')));

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
let accessToken = null;
let tokenGenerationTime = null;

async function getValidToken() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (accessToken && tokenGenerationTime && (now - tokenGenerationTime < twentyFourHours)) {
        console.log('Using cached token');
        return accessToken;
    }

    console.log('Fetching new token...');
    try {
        const response = await axios.post(TOKEN_URL, qs.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: GRANT_TYPE,
            scope: SCOPE
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = response.data.access_token;
        tokenGenerationTime = now;
        console.log('New token generated successfully');
        return accessToken;
    } catch (error) {
        console.error('Error fetching token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to generate access token');
    }
}

app.post('/api/send', async (req, res) => {
    try {
        console.log('Received request body:', JSON.stringify(req.body, null, 2)); // Debug log

        const { clientId, variation, data, customHeaders } = req.body;
        let requestType = req.body.requestType;

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

        const token = await getValidToken();

        if (requestType === 'collection') {
            // --- Collection API Logic ---

            // Determine payload: 
            // 1. If 'data' exists, use it (Legacy/Form mode)
            // 2. Otherwise, use req.body (Flat/Batch mode)
            let payload = data || req.body;

            // Ensure kafkaTopic is present
            let kafkaTopic = payload.kafkaTopic;
            // Removed redundant server-side mapping. Frontend now sends the correct topic.


            // Construct final payload
            // If using flat body, we might want to strip internal fields if they were sent (like requestType)
            // But for now, we assume the client sends exactly what is needed.
            const collectionPayload = {
                ...payload,
                kafkaTopic: kafkaTopic
            };

            // Ensure idCliente is a number if present
            if (collectionPayload.idCliente) {
                collectionPayload.idCliente = Number(collectionPayload.idCliente);
            }

            // Remove internal fields if they ended up in payload (e.g. from flat body)
            delete collectionPayload.requestType;
            delete collectionPayload.variation;
            // Note: idCliente IS part of the payload for these events, so don't delete it unless it's the top-level auth clientId (which is not used for Collection)
            // The user said "clientId shouldn't be there" referring to the wrapper clientId. 
            // But inside the payload, idCliente is required for Siniestro/Recibo.

            console.log('Sending Collection Payload:', JSON.stringify(collectionPayload, null, 2)); // Debug log

            const response = await axios.post(COLLECTION_URL, collectionPayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-gw-ims-org-id': ORG_ID,
                    'x-api-key': API_KEY,
                    'x-sandbox-name': SANDBOX_NAME, // Fixed typo
                    'x-adobe-flow-id': FLOW_ID,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            return res.json(response.data);

        } else {
            // --- Interact API Logic ---
            if (!clientId) {
                return res.status(400).json({ error: 'Client ID is required' });
            }

            const timestamp = new Date().toISOString();
            let body = {};

            // Common Identity Map
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
                case 8: // Page View (Custom Headers)
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
                'Authorization': `Bearer ${token}`,
                'x-gw-ims-org-id': ORG_ID,
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            };

            if (parseInt(variation) === 8) {
                // Merge custom headers, but ensure auth is present
                headers = {
                    ...headers, // Base headers
                    ...CUSTOM_HEADERS, // Config headers
                    ...customHeaders // Request headers
                };
                // Re-enforce auth if it was overwritten by empty custom headers (though spread order above protects it mostly, unless customHeaders has nulls)
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-gw-ims-org-id'] = ORG_ID;
                headers['x-api-key'] = API_KEY;
            }

            const response = await axios.post(ADOBE_URL, body, { headers });
            res.json(response.data);
        }

    } catch (error) {
        console.error('Error sending request:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: error.message,
            details: error.response ? error.response.data : null
        });
    }
});

// Profile Check endpoint
app.post('/api/profile', async (req, res) => {
    try {
        const { clientId } = req.body;

        if (!clientId) {
            return res.status(400).json({ error: 'clientId is required' });
        }

        const token = await getValidToken();

        const profileUrl = `https://platform.adobe.io/data/core/ups/access/entities?schema.name=_xdm.context.profile&entityIdNS=clientId&entityId=${clientId}`;

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY,
            'x-gw-ims-org-id': ORG_ID,
            'x-sandbox-name': SANDBOX_NAME
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
                'x-gw-ims-org-id': ORG_ID,
                'x-sandbox-name': SANDBOX_NAME,
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
                    sandbox: SANDBOX_NAME,
                    orgId: ORG_ID
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
            events: events,
            debug: eventsDebug
        };

        res.json(filteredData);

    } catch (error) {
        console.error('Error fetching profile:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: error.message,
            details: error.response ? error.response.data : null
        });
    }
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
