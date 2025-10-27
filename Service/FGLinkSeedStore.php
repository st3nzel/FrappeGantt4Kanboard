<?php

namespace Kanboard\Plugin\FrappeGantt\Service;

use Kanboard\Core\Base;

class FGLinkSeedStore extends Base
{
    private function key(int $taskLinkId): string
    {
        return 'fg_relseed:' . $taskLinkId;
    }

    public function getSeedByLinkId(int $projectId, int $taskLinkId): ?array
    {
        $raw = $this->projectMetadataModel->get($projectId, $this->key($taskLinkId), null);
        if (!$raw) return null;
        $val = json_decode($raw, true);
        return is_array($val) && isset($val['t'], $val['o'], $val['s']) ? $val : null;
    }

    public function setSeed(int $projectId, int $taskLinkId, int $taskId, int $oppTaskId, int $seedTaskId): bool
    {
        $val = json_encode(['t' => $taskId, 'o' => $oppTaskId, 's' => $seedTaskId], JSON_UNESCAPED_SLASHES);
        return $this->projectMetadataModel->save($projectId, [$this->key($taskLinkId) => $val]);
    }

    public function clearSeed(int $projectId, int $taskLinkId): bool
    {
        return $this->projectMetadataModel->remove($projectId, $this->key($taskLinkId));
    }

    /** @return array<int, array|null> map<linkId => seed or null> */
    public function getSeedsBulk(int $projectId, array $linkIds): array
    {
        $out = [];
        foreach ($linkIds as $lid) {
            $out[(int)$lid] = $this->getSeedByLinkId($projectId, (int)$lid);
        }
        return $out;
    }
}
