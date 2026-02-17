import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DB } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_DB_PATH = path.join(__dirname, '../db/database.json');

async function migrate() {
    console.log('🔄 Starting migration from JSON to SQLite...');
    
    try {
        // Load existing JSON data
        const jsonData = await fs.readFile(JSON_DB_PATH, 'utf8');
        const oldDb = JSON.parse(jsonData);
        
        console.log(`📊 Found ${Object.keys(oldDb.agents || {}).length} agents to migrate`);
        
        // Migrate agents
        for (const agent of Object.values(oldDb.agents || {})) {
            try {
                DB.createAgent(agent);
                console.log(`  ✓ Migrated agent: ${agent.name}`);
            } catch (err) {
                console.error(`  ✗ Failed to migrate agent ${agent.name}:`, err.message);
            }
        }
        
        // Migrate alliances
        for (const alliance of Object.values(oldDb.alliances || {})) {
            try {
                DB.createAlliance(alliance);
                console.log(`  ✓ Migrated alliance: ${alliance.id}`);
            } catch (err) {
                console.error(`  ✗ Failed to migrate alliance ${alliance.id}:`, err.message);
            }
        }
        
        // Migrate deals
        for (const deal of Object.values(oldDb.deals || {})) {
            try {
                DB.createDeal(deal);
                if (deal.status === 'executed') {
                    DB.updateDealStatus(deal.id, 'executed', deal.executed_at);
                }
                console.log(`  ✓ Migrated deal: ${deal.id}`);
            } catch (err) {
                console.error(`  ✗ Failed to migrate deal ${deal.id}:`, err.message);
            }
        }
        
        // Migrate alliance requests
        for (const request of Object.values(oldDb.alliance_requests || {})) {
            try {
                DB.createAllianceRequest(request);
                console.log(`  ✓ Migrated alliance request: ${request.id}`);
            } catch (err) {
                console.error(`  ✗ Failed to migrate request ${request.id}:`, err.message);
            }
        }
        
        // Migrate reputation events
        for (const event of (oldDb.reputation_events || [])) {
            try {
                DB.addReputationEvent(event);
            } catch (err) {
                console.error(`  ✗ Failed to migrate reputation event:`, err.message);
            }
        }
        
        console.log('\n✅ Migration complete!');
        console.log('📊 Verifying data...');
        
        const stats = DB.getStats();
        console.log(`  Agents: ${stats.total_agents}`);
        console.log(`  Alliances: ${stats.active_alliances}`);
        console.log(`  Deals: ${stats.total_deals}`);
        
        // Backup old JSON file
        const backupPath = JSON_DB_PATH + '.backup.' + Date.now();
        await fs.copyFile(JSON_DB_PATH, backupPath);
        console.log(`\n💾 Backed up old database to: ${backupPath}`);
        
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
    
    DB.close();
    console.log('\n🎉 Migration successful! Server can now use SQLite.');
}

migrate();
