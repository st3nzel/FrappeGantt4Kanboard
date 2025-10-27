<?php
declare(strict_types=1);

namespace Kanboard\Plugin\FrappeGantt\Controller\FGLinks;

use Kanboard\Plugin\FrappeGantt\Service\FGLinkSeedStore;

trait FGLinksSeedAction
{
    public function seed()
    {
    $project = $this->getProject();
    $this->checkProjectPermission((int) $project['id']);

    // 1) Read the request body robustly.  Values can come from an HTML form
    //    (POST) or from a raw x‑www‑form‑urlencoded body sent via fetch().
    $values = (array) $this->request->getValues();
    if (empty($values)) {
        $raw = file_get_contents('php://input');
        $tmp = [];
        parse_str($raw, $tmp);     // x-www-form-urlencoded aus fetch()
        $values = $tmp;
    }

    // 2) Extract parameters from the $values array instead of using
    //    getIntegerParam().  This allows multiple sources (POST, raw body).
    $taskLinkId = isset($values['task_link_id']) ? (int) $values['task_link_id'] : 0;
    $seedTaskId = isset($values['seed_task_id']) ? (int) $values['seed_task_id'] : 0;
    $active     = !empty($values['active']) && (int) $values['active'] === 1;

    if ($taskLinkId <= 0) {
        return $this->response->json([
            'ok'    => false,
            'error' => 'invalid_task_link_id',
            'debug' => [
                'task_link_id_raw' => $values['task_link_id'] ?? null,
                'task_id_raw'      => $values['task_id'] ?? null,
                'seed_task_id'     => $seedTaskId,
            ],
        ], 400);
    }
    $link = $this->taskLinkModel->getById($taskLinkId);

    if (!$link) {
        error_log("[FGLinksController::seed] link_not_found for task_link_id={$taskLinkId} (possible mix-up with task_id={$rawTaskId})");

        // Optionally include debug data in the error response
        return $this->response->json([
            'ok'    => false,
            'error' => 'link_not_found',
            'debug' => [
                'task_link_id' => $taskLinkId,
                'task_id_raw'  => $rawTaskId,
                'seed_task_id' => $seedTaskId,
            ],
        ], 404);
    }
        // Only allow the “relates to” link type.  This is enforced by
        // checking the link label (and optionally by link type ID from the
        // configuration).  Other link types are rejected with a 400 error.
        $label = strtolower((string) ($link['label'] ?? ''));
        $isRel = ($label === 'relates to' || $label === 'relates');
        if (!$isRel) {
            return $this->response->json(['ok' => false, 'error' => 'type_not_allowed'], 400);
        }

        $task = $this->taskFinderModel->getById((int) $link['task_id']);
        $opp  = $this->taskFinderModel->getById((int) $link['opposite_task_id']);
        if (!$task || !$opp) {
            return $this->response->json(['ok' => false, 'error' => 'task_not_found'], 404);
        }
        if ((int) $task['project_id'] !== (int) $project['id']) {
            return $this->response->json(['ok' => false, 'error' => 'project_mismatch'], 400);
        }

        $store = new FGLinkSeedStore($this->container);
        $ok = $active
            ? $store->setSeed((int) $project['id'], $taskLinkId, (int) $task['id'], (int) $opp['id'], $seedTaskId)
            : $store->clearSeed((int) $project['id'], $taskLinkId);

        return $this->response->json(['ok' => (bool) $ok]);
    }
}
