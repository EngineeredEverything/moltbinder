<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dbPath = '/root/.openclaw/workspace-moltbinder/moltbinder/db/database.json';

if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database not found']);
    exit;
}

$data = json_decode(file_get_contents($dbPath), true);

$stats = [
    'agents' => count($data['agents']),
    'alliances' => count($data['alliances']),
    'deals' => count($data['deals']),
    'online_agents' => count(array_filter($data['agents'], function($agent) {
        return isset($agent['online']) && $agent['online'] === true;
    }))
];

echo json_encode($stats);
