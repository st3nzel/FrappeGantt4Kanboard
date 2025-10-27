<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\FGLinks;

trait FGLinksCreateAction
{
    // Create a new internal task link.  Accepts task_id, opposite_task_id,
    // link_id and csrf_token parameters via POST.  Returns the new
    // task_link_id on success or an error message on failure.
    public function create()
    {
        $project = $this->getProject();
        $this->checkProjectPermission((int) $project['id']);

        $values = $this->request->getValues();
        if (!is_array($values) || empty($values)) { $values = $_POST; }
        if (!is_array($values) || empty($values)) {
            $raw = file_get_contents('php://input');
            $tmp = [];
            if (is_string($raw) && $raw !== '') { parse_str($raw, $tmp); }
            if (!empty($tmp)) { $values = $tmp; }
        }

        $taskId = (int) ($values['task_id'] ?? $this->request->getIntegerParam('task_id', 0));
        $oppId  = (int) ($values['opposite_task_id'] ?? $this->request->getIntegerParam('opposite_task_id', 0));
        $linkId = (int) ($values['link_id'] ?? $this->request->getIntegerParam('link_id', 0));

        if ($taskId <= 0 || $oppId <= 0 || $linkId <= 0) {
            return $this->response->json(['ok' => false, 'error' => 'invalid_params'], 400);
        }
        if ($taskId === $oppId) {
            return $this->response->json(['ok' => false, 'error' => 'self_link'], 400);
        }

        $task = $this->taskFinderModel->getById($taskId);
        $opp  = $this->taskFinderModel->getById($oppId);
        if (!$task || !$opp) {
            return $this->response->json(['ok' => false, 'error' => 'task_not_found'], 404);
        }
        if ((int) $task['project_id'] !== (int) $project['id'] || (int) $opp['project_id'] !== (int) $project['id']) {
            return $this->response->json(['ok' => false, 'error' => 'project_mismatch'], 400);
        }

        $newId = $this->taskLinkModel->create($taskId, $oppId, $linkId);
        if (!$newId) {
            return $this->response->json(['ok' => false, 'error' => 'create_failed'], 400);
        }

        return $this->response->json(['ok' => true, 'task_link_id' => (int) $newId]);
    }
}
