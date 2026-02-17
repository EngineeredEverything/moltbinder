/**
 * MoltBinder Token & Resource Ledger
 * Tracks actual balances, transfers, and escrow
 */

import { nanoid } from 'nanoid';

// Initialize wallet for new agent
export function initializeWallet(agentId, db) {
    if (!db.wallets) db.wallets = {};
    
    if (!db.wallets[agentId]) {
        db.wallets[agentId] = {
            agentId,
            balances: {
                BIND: 100,  // Starting token allocation
                compute_credits: 50,
                api_quota: 1000,
                storage_gb: 10
            },
            created_at: Date.now()
        };
    }
    
    return db.wallets[agentId];
}

// Get agent's wallet
export function getWallet(agentId, db) {
    if (!db.wallets) db.wallets = {};
    
    if (!db.wallets[agentId]) {
        return initializeWallet(agentId, db);
    }
    
    return db.wallets[agentId];
}

// Transfer resources between agents
export async function transfer(fromAgentId, toAgentId, asset, amount, db, saveDB) {
    if (!db.wallets) db.wallets = {};
    
    const fromWallet = getWallet(fromAgentId, db);
    const toWallet = getWallet(toAgentId, db);
    
    // Check balance
    if (!fromWallet.balances[asset] || fromWallet.balances[asset] < amount) {
        throw new Error(`Insufficient ${asset} balance`);
    }
    
    // Execute transfer
    fromWallet.balances[asset] -= amount;
    if (!toWallet.balances[asset]) toWallet.balances[asset] = 0;
    toWallet.balances[asset] += amount;
    
    // Record transaction
    if (!db.transactions) db.transactions = {};
    
    const txId = 'tx_' + nanoid(10);
    db.transactions[txId] = {
        id: txId,
        from: fromAgentId,
        to: toAgentId,
        asset,
        amount,
        timestamp: Date.now(),
        status: 'completed'
    };
    
    await saveDB();
    
    return db.transactions[txId];
}

// Create escrow for pending deal
export async function createEscrow(dealId, fromAgentId, resources, db, saveDB) {
    if (!db.escrows) db.escrows = {};
    
    const escrowId = 'escrow_' + nanoid(10);
    const wallet = getWallet(fromAgentId, db);
    
    // Lock resources
    const lockedResources = {};
    
    for (const [asset, amount] of Object.entries(resources)) {
        if (!wallet.balances[asset] || wallet.balances[asset] < amount) {
            throw new Error(`Insufficient ${asset} for escrow`);
        }
        
        wallet.balances[asset] -= amount;
        lockedResources[asset] = amount;
    }
    
    db.escrows[escrowId] = {
        id: escrowId,
        dealId,
        agentId: fromAgentId,
        resources: lockedResources,
        status: 'locked',
        created_at: Date.now()
    };
    
    await saveDB();
    
    return db.escrows[escrowId];
}

// Release escrow on deal completion
export async function releaseEscrow(escrowId, toAgentId, db, saveDB) {
    if (!db.escrows || !db.escrows[escrowId]) {
        throw new Error('Escrow not found');
    }
    
    const escrow = db.escrows[escrowId];
    
    if (escrow.status !== 'locked') {
        throw new Error('Escrow already released or cancelled');
    }
    
    const toWallet = getWallet(toAgentId, db);
    
    // Transfer locked resources to recipient
    for (const [asset, amount] of Object.entries(escrow.resources)) {
        if (!toWallet.balances[asset]) toWallet.balances[asset] = 0;
        toWallet.balances[asset] += amount;
    }
    
    escrow.status = 'released';
    escrow.released_at = Date.now();
    escrow.released_to = toAgentId;
    
    await saveDB();
    
    return escrow;
}

// Cancel escrow and return resources
export async function cancelEscrow(escrowId, db, saveDB) {
    if (!db.escrows || !db.escrows[escrowId]) {
        throw new Error('Escrow not found');
    }
    
    const escrow = db.escrows[escrowId];
    
    if (escrow.status !== 'locked') {
        throw new Error('Escrow already released or cancelled');
    }
    
    const wallet = getWallet(escrow.agentId, db);
    
    // Return locked resources
    for (const [asset, amount] of Object.entries(escrow.resources)) {
        wallet.balances[asset] += amount;
    }
    
    escrow.status = 'cancelled';
    escrow.cancelled_at = Date.now();
    
    await saveDB();
    
    return escrow;
}

// Get transaction history
export function getTransactionHistory(agentId, db, limit = 50) {
    if (!db.transactions) return [];
    
    return Object.values(db.transactions)
        .filter(tx => tx.from === agentId || tx.to === agentId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)
        .map(tx => ({
            ...tx,
            from_name: db.agents[tx.from]?.name,
            to_name: db.agents[tx.to]?.name
        }));
}

// Add custom resource type
export function addCustomResource(agentId, resourceType, amount, db) {
    const wallet = getWallet(agentId, db);
    
    if (!wallet.balances[resourceType]) {
        wallet.balances[resourceType] = 0;
    }
    
    wallet.balances[resourceType] += amount;
    
    return wallet;
}

// Get all unique resource types in system
export function getResourceTypes(db) {
    if (!db.wallets) return [];
    
    const types = new Set();
    
    for (const wallet of Object.values(db.wallets)) {
        for (const asset of Object.keys(wallet.balances)) {
            types.add(asset);
        }
    }
    
    return Array.from(types);
}

// Get richest agents by asset
export function getLeaderboardByAsset(asset, db, limit = 10) {
    if (!db.wallets) return [];
    
    return Object.values(db.wallets)
        .filter(w => w.balances[asset] > 0)
        .map(w => ({
            agentId: w.agentId,
            agentName: db.agents[w.agentId]?.name,
            balance: w.balances[asset]
        }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, limit);
}
