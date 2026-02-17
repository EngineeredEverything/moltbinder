/**
 * MoltBinder WebSocket Server
 * Real-time agent-to-agent communication
 */

import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';

export function createWebSocketServer(httpServer, db, saveDB) {
    const wss = new WebSocketServer({ server: httpServer });
    
    // Track connected agents
    const connections = new Map(); // agentId -> WebSocket
    
    wss.on('connection', (ws, req) => {
        let agentId = null;
        
        ws.on('message', async (data) => {
            try {
                const msg = JSON.parse(data.toString());
                
                switch (msg.type) {
                    case 'auth':
                        await handleAuth(ws, msg, connections, db);
                        agentId = msg.agentId;
                        break;
                    
                    case 'send_message':
                        await handleSendMessage(ws, msg, agentId, connections, db, saveDB);
                        break;
                    
                    case 'subscribe_channel':
                        await handleSubscribe(ws, msg, agentId, db);
                        break;
                    
                    case 'broadcast':
                        await handleBroadcast(ws, msg, agentId, connections, db);
                        break;
                    
                    default:
                        ws.send(JSON.stringify({ error: 'Unknown message type' }));
                }
            } catch (err) {
                console.error('WebSocket error:', err);
                ws.send(JSON.stringify({ error: err.message }));
            }
        });
        
        ws.on('close', () => {
            if (agentId) {
                connections.delete(agentId);
                console.log(`[WS] Agent ${agentId} disconnected`);
            }
        });
    });
    
    console.log('✅ WebSocket server initialized');
    
    return wss;
}

async function handleAuth(ws, msg, connections, db) {
    const { apiKey, agentId } = msg;
    
    // Verify API key
    const agent = db.agents[agentId];
    if (!agent || agent.api_key !== apiKey) {
        ws.send(JSON.stringify({ 
            type: 'auth_failed', 
            error: 'Invalid credentials' 
        }));
        ws.close();
        return;
    }
    
    // Store connection
    connections.set(agentId, ws);
    
    // Update agent status
    agent.last_active = Date.now();
    agent.online = true;
    
    ws.send(JSON.stringify({ 
        type: 'auth_success',
        agentId,
        name: agent.name
    }));
    
    console.log(`[WS] Agent ${agent.name} connected`);
}

async function handleSendMessage(ws, msg, fromAgentId, connections, db, saveDB) {
    const { to, content } = msg;
    
    if (!fromAgentId) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }));
        return;
    }
    
    if (!to || !content) {
        ws.send(JSON.stringify({ error: 'Missing recipient or content' }));
        return;
    }
    
    // Create message record
    const messageId = 'msg_' + nanoid(10);
    const timestamp = Date.now();
    
    if (!db.messages) db.messages = {};
    
    db.messages[messageId] = {
        id: messageId,
        from: fromAgentId,
        to,
        content,
        timestamp,
        read: false
    };
    
    await saveDB();
    
    // Send to recipient if online
    const recipientWs = connections.get(to);
    if (recipientWs && recipientWs.readyState === 1) {
        recipientWs.send(JSON.stringify({
            type: 'new_message',
            message: {
                id: messageId,
                from: fromAgentId,
                from_name: db.agents[fromAgentId]?.name,
                content,
                timestamp
            }
        }));
    }
    
    // Confirm to sender
    ws.send(JSON.stringify({
        type: 'message_sent',
        messageId,
        to,
        timestamp
    }));
}

async function handleSubscribe(ws, msg, agentId, db) {
    const { channel } = msg;
    
    if (!agentId) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }));
        return;
    }
    
    // Store subscription
    if (!db.subscriptions) db.subscriptions = {};
    if (!db.subscriptions[channel]) db.subscriptions[channel] = [];
    
    if (!db.subscriptions[channel].includes(agentId)) {
        db.subscriptions[channel].push(agentId);
    }
    
    ws.send(JSON.stringify({
        type: 'subscribed',
        channel
    }));
}

async function handleBroadcast(ws, msg, fromAgentId, connections, db) {
    const { channel, content } = msg;
    
    if (!fromAgentId) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }));
        return;
    }
    
    const subscribers = db.subscriptions?.[channel] || [];
    
    const broadcastMsg = {
        type: 'broadcast',
        channel,
        from: fromAgentId,
        from_name: db.agents[fromAgentId]?.name,
        content,
        timestamp: Date.now()
    };
    
    // Send to all subscribers
    for (const subscriberId of subscribers) {
        const subWs = connections.get(subscriberId);
        if (subWs && subWs.readyState === 1) {
            subWs.send(JSON.stringify(broadcastMsg));
        }
    }
    
    ws.send(JSON.stringify({
        type: 'broadcast_sent',
        channel,
        recipients: subscribers.length
    }));
}
