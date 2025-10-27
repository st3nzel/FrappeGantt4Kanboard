<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\Gantt;

trait GanttDepsAction
{
    public function deps()
    {
        $project = $this->getProject();
        $projectId = (int) $project['id'];

        $taskIdsCsv = (string) $this->request->getStringParam('task_ids', '');
        $taskIds = array_values(array_filter(array_map('intval', preg_split('/\s*,\s*/', $taskIdsCsv, -1, PREG_SPLIT_NO_EMPTY))));
        if (empty($taskIds)) {
            $rows = $this->taskFinderModel->getAll($projectId, 1);
            $taskIds = array_map(static fn($t) => (int) $t['id'], $rows);
        }

        $linkIdsCsv = (string) $this->request->getStringParam('link_ids', '');
        $linkIds = array_values(array_filter(array_map('intval', preg_split('/\s*,\s*/', $linkIdsCsv, -1, PREG_SPLIT_NO_EMPTY))));
        if (empty($linkIds)) {
            return $this->response->json([
                'ok' => false,
                'error' => 'Missing link_ids (IDs, not labels)',
            ], 400);
        }

        $sameOnly = (int) $this->request->getIntegerParam('same_project_only', 0) === 1;

        $mapper = new \Kanboard\Plugin\FrappeGantt\Service\DependencyMapper($this->container);
        $map = $mapper->build($taskIds, $linkIds, $sameOnly);

        return $this->response->json([
            'ok' => true,
            'project_id' => $projectId,
            'count_tasks' => count($taskIds),
            'same_project_only' => $sameOnly,
            'map' => $map,
        ]);
    }
}
