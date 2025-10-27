<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\FGLinks;

trait FGLinksRemoveAction
{
    // Remove an internal task link.  Expects a POST request with
    // `task_link_id` and `csrf_token` parameters.  Responds with a JSON
    // object indicating success or failure.
    public function remove()
    {
        $project = $this->getProject();
        $this->checkProjectPermission($project['id']);

        $taskLinkId = (int) $this->request->getIntegerParam('task_link_id');
        if ($taskLinkId <= 0) {
            $values = $this->request->getValues();
            if (isset($values['task_link_id'])) {
                $taskLinkId = (int) $values['task_link_id'];
            }
        }

        if ($taskLinkId <= 0) {
            return $this->response->json(['ok' => false, 'error' => 'invalid task_link_id'], 400);
        }

        $link = $this->taskLinkModel->getById($taskLinkId);
        if (!$link) {
            return $this->response->json(['ok' => false, 'error' => 'link_not_found'], 404);
        }

        $task = $this->taskFinderModel->getById((int) $link['task_id']);
        if (!$task || (int) $task['project_id'] !== (int) $project['id']) {
            return $this->response->json(['ok' => false, 'error' => 'task_not_found'], 404);
        }

        $ok = $this->taskLinkModel->remove($taskLinkId);
        return $this->response->json(['ok' => (bool) $ok]);
    }
}
