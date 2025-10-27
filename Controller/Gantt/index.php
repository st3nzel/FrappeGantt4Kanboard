<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\Gantt;

trait GanttIndexAction
{
    // Route handler for the main Gantt view.
    // This action is invoked via
    // `?controller=GanttController&action=index&plugin=FrappeGantt&project_id=...`.
    public function index()
    {
        $project   = $this->getProject();
        $projectId = (int) $project['id'];

        // URL used by the client‑side script to fetch Gantt data (read from the template in a CSP‑compliant way)
        $dataUrl = $this->helper->url->to(
            'GanttController',
            'data',
            ['plugin' => 'FrappeGantt', 'project_id' => $projectId]
        );

        return $this->response->html(
            $this->helper->layout->app(
                'FrappeGantt:gantt/index',
                [
                    'title' => sprintf('#%d · %s', (int) $project['id'], (string) $project['name']),
                    'project' => $project,
                    'filters' => [
                        'search' => $this->request->getStringParam('search', 'status:open'),
                    ],
                    'csrfToken'  => $this->token->getCSRFToken(),
                ]
            )
        );
    }
}
