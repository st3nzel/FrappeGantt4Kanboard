<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\Gantt;

trait GanttDetailAction
{
    public function detail()
    {
        $taskId = (int) $this->request->getIntegerParam('task_id', 0);
        if ($taskId <= 0) {
            return $this->response->json(['ok' => false, 'error' => 'Missing task_id'], 400);
        }

        $task = $this->taskFinderModel->getById($taskId);
        if (!$task) {
            return $this->response->json(['ok' => false, 'error' => 'Task not found'], 404);
        }

        if (method_exists($this->helper, 'projectRole') && !$this->helper->projectRole->canViewTask($task)) {
            return $this->response->json(['ok' => false, 'error' => 'Forbidden'], 403);
        }

        $durationRaw = $this->taskMetadataModel->get($taskId, 'duration', '');
        $duration = is_numeric($durationRaw) ? max(0, (int)$durationRaw) : 0;

        $projectId = (int)($task['project_id'] ?? 0);
        $assignee  = ($task['assignee_name'] ?? '') ?: ($task['assignee_username'] ?? '');
        $startYmd  = !empty($task['date_started']) ? date('Y-m-d', (int)$task['date_started']) : '';
        $endYmd    = !empty($task['date_due'])     ? date('Y-m-d', (int)$task['date_due'])     : '';

        return $this->response->json([
            'ok'   => true,
            'task' => [
                'id'        => (int)$task['id'],
                'title'     => (string)$task['title'],
                'status'    => !empty($task['is_active']) ? 'open' : 'closed',
                'priority'  => (int)($task['priority'] ?? 0),
                'assignee'  => $assignee,
                'start'     => $startYmd,
                'end'       => $endYmd,
                'duration'  => $duration,
                'url'       => $this->helper->url->to('TaskViewController', 'show', [
                                  'task_id' => $taskId, 'project_id' => $projectId
                              ]),
                'edit_url'  => $this->helper->url->to('TaskModificationController', 'edit', [
                                  'task_id' => $taskId, 'project_id' => $projectId
                              ]),
            ]
        ], 200);
    }
}
