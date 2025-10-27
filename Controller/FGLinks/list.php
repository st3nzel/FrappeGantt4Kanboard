<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\FGLinks;

use Kanboard\Plugin\FrappeGantt\Service\FGLinkSeedStore;

trait FGLinksListAction
{
    // Handles requests to list all internal links for the given task.
    // Accepts GET or POST requests via the project‑scoped route
    // `/project/:project_id/frappe-gantt/links/list?task_id=123` or the
    // legacy `/fg/links/list?task_id=123` API.  Returns the link
    // definitions and link types as JSON.
    public function list()
    {
        // 1) Validate the project and ensure the current user has access.  The
        //    task_id parameter must be a positive integer; otherwise a 400
        //    response is returned.
        $project = $this->getProject();
        $this->checkProjectPermission((int) $project['id']);

        $taskId = (int) $this->request->getIntegerParam('task_id', 0);
        if ($taskId <= 0) {
            return $this->response->json(['ok' => false, 'error' => 'missing_task_id'], 400);
        }

        // 2) Fetch all internal link records for the task.  This is
        //    equivalent to the JSON‑RPC method `getAllTaskLinks`.  The
        //    method name varies between Kanboard versions, so both
        //    `getAll()` and `getAllByTaskId()` are tried.
        $rows = [];
        if (method_exists($this->taskLinkModel, 'getAll')) {
            $rows = (array) $this->taskLinkModel->getAll($taskId);
        } elseif (method_exists($this->taskLinkModel, 'getAllByTaskId')) {
            $rows = (array) $this->taskLinkModel->getAllByTaskId($taskId);
        }

        // 3) Collect seed information for each link (optional).  Seed
        //    records are used to determine the direction of arrows for
        //    “relates to” links.
        $seedStore = new FGLinkSeedStore($this->container);
        $linkIds   = array_map(static fn ($x) => (int) ($x['id'] ?? 0), $rows);
        $seedMap   = [];
        if (method_exists($seedStore, 'getSeedsBulk')) {
            $seedMap = (array) $seedStore->getSeedsBulk((int) $project['id'], $linkIds);
        }

        // 4) Build the response array.  Each element contains the link
        //    identifier, its type and label, the opposite task and
        //    project, and whether the link currently has an active seed.
        $links = [];
foreach ($rows as $r) {
    // Determine the opposite task ID from the processed view (`task_id`) or from
    // the raw row (`opposite_task_id`).  Fall back to 0 if missing.
    $oppId       = isset($r['task_id']) ? (int)$r['task_id'] : (int)($r['opposite_task_id'] ?? 0);
    $oppTitle    = (string)($r['title'] ?? $r['opposite_title'] ?? '');
    $oppProject  = (int)($r['project_id'] ?? $r['opposite_project'] ?? 0);

    // `link_id` is not returned by `getAllTaskLinks`; load it on demand
    // using getById() when necessary.
    $linkId = (int)($r['link_id'] ?? 0);
    if ($linkId === 0 && method_exists($this->taskLinkModel, 'getById')) {
        $raw = $this->taskLinkModel->getById((int)($r['id'] ?? 0));
        if ($raw) $linkId = (int)($raw['link_id'] ?? 0);
    }

    // Determine the seed record for this link as before.  A seed is active
    // when its stored task ID matches the current task ID.
    $seed = $seedMap[(int)($r['id'] ?? 0)] ?? (method_exists($seedStore,'getSeedByLinkId') ? $seedStore->getSeedByLinkId((int)$project['id'], (int)($r['id'] ?? 0)) : null);
    $seedActive = $seed && (int)($seed['s'] ?? 0) === $taskId;

    $links[] = [
        'task_link_id'     => (int)($r['id'] ?? 0),
        'link_id'          => $linkId,                 // Optional; the label alone suffices for "relates to" links
        'link_label'       => (string)($r['label'] ?? ''),
        'opposite_task_id' => $oppId,
        'opposite_title'   => $oppTitle,
        'opposite_project' => $oppProject,
        'seed_active'      => (bool)$seedActive,
        'seed_task_id'     => $seed['s'] ?? null,
    ];
}

        // 5) Retrieve all link types for the UI/filter.  This is the
        //    equivalent of the JSON‑RPC `getAllLinks` method.
        $types = (array) $this->linkModel->getAll();

        // 6) Return a clean JSON response.  The payload contains a flag
        //    indicating success along with the list of links and link types.
        return $this->response->json([
            'ok'    => true,
            'links' => $links,
            'types' => $types,
        ]);
    }
}
