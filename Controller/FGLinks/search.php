<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\FGLinks;

trait FGLinksSearchAction
{
    // Search for tasks to link.  Accepts a query string `q` and optional
    // `project_id`, `cross`, and `limit` parameters.  Returns matching
    // task IDs, titles and project IDs for use in autocomplete lists.
    public function search()
    {
        $query     = trim((string) $this->request->getStringParam('q', ''));
        $projectId = (int) $this->request->getIntegerParam('project_id', 0);
        $cross     = (int) $this->request->getIntegerParam('cross', 1) === 1;
        $limit     = (int) $this->request->getIntegerParam('limit', 20);
        $userId    = (int) $this->userSession->getId();

        if ($query === '') {
            return $this->response->json(['ok' => true, 'items' => []]);
        }

        $results = []; // id => row

        if (\ctype_digit($query)) {
            $t = $this->taskFinderModel->getById((int) $query);
            if ($t) {
                $allowed = false;
                if ($projectId > 0) {
                    $allowed = ((int) $t['project_id'] === $projectId);
                } elseif ($cross) {
                    $visible = $this->projectUserRoleModel->getActiveProjectsByUser($userId);
                    $allowed = \array_key_exists((int) $t['project_id'], $visible);
                }
                if ($allowed) {
                    $results[(int) $t['id']] = $t;
                }
            }
        }

        $table = \Kanboard\Model\TaskModel::TABLE;

        $projectIds = [];
        if ($projectId > 0) {
            $projectIds = [$projectId];
        } elseif ($cross) {
            $projectIds = \array_keys($this->projectUserRoleModel->getActiveProjectsByUser($userId));
        }

        if (!empty($projectIds)) {
            $like = str_replace(['%', '_'], ['\\%', '\\_'], $query);

            foreach ($projectIds as $pid) {
                $rows = $this->db->table($table)
                    ->eq('project_id', (int) $pid)
                    ->ilike('title', '%' . $like . '%')
                    ->limit(max(1, $limit))
                    ->findAll() ?: [];

                foreach ($rows as $t) {
                    $results[(int) $t['id']] = $t;
                    if (\count($results) >= $limit) {
                        break 2;
                    }
                }
            }
        }

        $out = [];
        foreach ($results as $t) {
            $id  = (int) ($t['id'] ?? 0);
            $pid = (int) ($t['project_id'] ?? 0);
            $out[] = [
                'id'         => $id,
                'title'      => (string) ($t['title'] ?? ''),
                'project_id' => $pid,
                'url'        => $this->helper->url->to(
                    'TaskViewController',
                    'show',
                    ['task_id' => $id, 'project_id' => $pid],
                    false,
                    '',
                    true
                ),
            ];
        }

        return $this->response->json(['ok' => true, 'items' => \array_values($out)]);
    }
}
