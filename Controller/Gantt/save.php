<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\Gantt;

trait GanttSaveAction
{
    public function save()
    {
        $rid = bin2hex(random_bytes(6));
        $taskId = (int) $this->request->getIntegerParam('task_id', 0);

        $this->logger->debug("[FrappeGantt][save][$rid] ENTER method=".$this->request->getMethod()." task_id=".$taskId);

        $values   = $this->request->getValues();
        $startStr = isset($values['start']) ? trim((string)$values['start']) : '';
        $endStr   = isset($values['end'])   ? trim((string)$values['end'])   : '';
        $durStr   = isset($values['duration']) ? trim((string)$values['duration']) : '';

        $update = ['id' => $taskId];

        if ($startStr !== null && $startStr !== '') {
            $ts = strtotime($startStr.' 00:00:00');
            if ($ts !== false) $update['date_started'] = $ts;
        }
        if ($endStr !== null && $endStr !== '') {
            $ts = strtotime($endStr.' 00:00:00');
            if ($ts !== false) $update['date_due'] = $ts;
        }

        if (count($update) > 1) {
            if (!$this->taskModificationModel->update($update)) {
                return $this->response->json(['ok' => false, 'error' => 'Update failed'], 500);
            }
        }

        if ($durStr !== null && $durStr !== '') {
            $dur = max(0, (int) $durStr);
            $this->taskMetadataModel->save($taskId, ['duration' => $dur], true);
        }

        return $this->response->json(['ok' => true]);
    }
}
