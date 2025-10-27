<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\Gantt;

trait GanttComputeProgress
{
    private function computeProgressFromKanboard($t)
    {
        $total = isset($t['nb_subtasks']) ? (int) $t['nb_subtasks'] : null;
        $done  = isset($t['nb_completed_subtasks']) ? (int) $t['nb_completed_subtasks'] : null;

        if ($total !== null && $total > 0) {
            return max(0, min(100, (int) floor(($done / $total) * 100)));
        }

        if (isset($t['id'])) {
            $subs = $this->subtaskModel->getAll($t['id']);
            if (is_array($subs) && !empty($subs)) {
                $tot = count($subs);
                $done = 0;
                foreach ($subs as $s) {
                    $status = isset($s['status']) ? (int) $s['status'] : 0;
                    if ($status === 2) $done++;
                }
                return max(0, min(100, (int) floor(($done / $tot) * 100)));
            }
        }

        if (isset($t['score'])) {
            $sc = (int) $t['score'];
            if ($sc >= 0 && $sc <= 100) return $sc;
        }

        return 0;
    }
}
