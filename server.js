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
    const { clientId, variation, requestType, payload } = req.body;

    let token;
    try {
        token = await getValidToken();
    } catch (error) {
        return res.status(500).json({ error: 'Token generation failed', details: error.message });
    }

    // Handle Collection API requests (Variations 5, 6, 7)
    if (requestType === 'collection') {
        try {
            const response = await axios.post(COLLECTION_URL, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-gw-ims-org-id': ORG_ID,
                    'x-api-key': API_KEY,
                    'x-sanbox-name': SANDBOX_NAME,
                    'x-adobe-flow-id': FLOW_ID,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            return res.json(response.data);
        } catch (error) {
            console.error('Error sending collection request:', error.response ? error.response.data : error.message);
            return res.status(500).json({
                error: error.message,
                details: error.response ? error.response.data : null
            });
        }
    }

    // Handle Interact API requests (Variations 1-4, 8)
    if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required' });
    }

    const timestamp = new Date().toISOString();
    let body = {};

    // Common structure
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
        case 1:
            body = {
                "event": {
                    "xdm": {
                        "identityMap": identityMap.identityMap,
                        "eventType": "inappmessageTracking.display",
                        "alerts": {
                            "clicks": 1,
                            "impressions": [
                                {
                                    "ID": "1234",
                                    "displays": 1,
                                    "type": "app:ventajas y beneficios:home:si"
                                }
                            ]
                        },
                        "timestamp": timestamp
                    }
                }
            };
            break;
        case 2:
        case 8: // Variation 8 is PageView with Custom Headers
            body = {
                "event": {
                    "xdm": {
                        "identityMap": identityMap.identityMap,
                        "eventType": "web.webpagedetails.pageViews",
                        "web": {
                            "webPageDetails": {
                                "pageViews": {
                                    "value": 1
                                },
                                "isHomePage": true
                            }
                        },
                        "timestamp": timestamp
                    }
                }
            };
            break;
        case 3:
            body = {
                "event": {
                    "xdm": {
                        "identityMap": identityMap.identityMap,
                        "eventType": "inappmessageTracking.dismissals",
                        "alerts": {
                            "clicks": 1,
                            "dismissals": 1,
                            "impressions": [
                                {
                                    "ID": "1234",
                                    "type": "app:ventajas y beneficios:home:si"
                                }
                            ]
                        },
                        "timestamp": timestamp
                    }
                }
            };
            break;
        case 4:
            body = {
                "event": {
                    "xdm": {
                        "identityMap": identityMap.identityMap,
                        "eventType": "inappmessageTracking.interact",
                        "alerts": {
                            "clicks": 1,
                            "impressions": [
                                {
                                    "ID": "1234",
                                    "selected": 1,
                                    "type": "app:ventajas y beneficios:home:si"
                                }
                            ]
                        },
                        "timestamp": timestamp
                    }
                }
            };
            break;
        default:
            return res.status(400).json({ error: 'Invalid variation' });
    }

    try {
        let headers = {
            'Authorization': `Bearer ${token}`,
            'x-gw-ims-org-id': ORG_ID,
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
        };

        if (parseInt(variation) === 8) {
            headers = {
                ...CUSTOM_HEADERS,
                'Authorization': `Bearer ${token}`,
                'x-gw-ims-org-id': ORG_ID,
                'x-api-key': API_KEY
            };
        }

        const response = await axios.post(ADOBE_URL, body, { headers });
        res.json(response.data);
    } catch (error) {
        console.error('Error sending request:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: error.message,
            details: error.response ? error.response.data : null
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
