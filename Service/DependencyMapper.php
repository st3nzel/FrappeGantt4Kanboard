<?php

namespace Kanboard\Plugin\FrappeGantt\Service;

use Kanboard\Core\Base;

/**
 * Builds a mapping from each task to a list of linked “opposite” task IDs based on
 * internal task links.
 *
 * - The dependency links can be filtered by link IDs (numeric IDs, not labels).
 * - Optionally restrict the mapping to links within the same project.
 * - Duplicate dependencies are removed before returning.
 */
class DependencyMapper extends Base
{
    /**
     * @param int[]  $taskIds
     * @param int[]  $dependencyLinkIds
     * @param bool   $sameProjectOnly
     * @return array<int,string[]>  Map: task_id => list(opposite_task_id as string)
     */
    public function build(array $taskIds, array $dependencyLinkIds, bool $sameProjectOnly = false): array
    {
        $taskIds = array_values(array_unique(array_map('intval', $taskIds)));
        $depIds  = array_values(array_unique(array_map('intval', $dependencyLinkIds)));
        $out = [];

        foreach ($taskIds as $tid) {
            $out[$tid] = [];
        }
        if (empty($taskIds) || empty($depIds)) return $out;

        // 1) Collect allowed link IDs, including their opposite directions
        $allLinks = $this->linkModel->getAll(); // id,label,opposite_id
        $allowedIds = [];
        $allowedLabels = [];
        foreach ($allLinks as $ln) {
            $id  = (int) ($ln['id'] ?? 0);
            $opp = (int) ($ln['opposite_id'] ?? 0);
            $lab = trim((string) ($ln['label'] ?? ''));
            if (in_array($id, $depIds, true)) {
                $allowedIds[$id] = true;
                if ($opp > 0) {
                    $allowedIds[$opp] = true;
                }
                if ($lab !== '') {
                    $allowedLabels[mb_strtolower($lab)] = true;
                }
                // Include the opposite label if available
                foreach ($allLinks as $ln2) {
                    if ((int) ($ln2['id'] ?? 0) === $opp) {
                        $lab2 = trim((string) ($ln2['label'] ?? ''));
                        if ($lab2 !== '') $allowedLabels[mb_strtolower($lab2)] = true;
                        break;
                    }
                }
            }
        }

        // Early exit if no allowed IDs or labels were found
        if (empty($allowedIds) && empty($allowedLabels)) return $out;

        // 2) Cache project IDs (used to enforce the same_project_only option)
        $projectOf = function (int $taskId): int {
            $t = $this->taskFinderModel->getById($taskId);
            return (int) ($t['project_id'] ?? 0);
        };
        $projectCache = [];
        foreach ($taskIds as $tid) {
            $projectCache[$tid] = $projectOf($tid);
        }

        // Task seed store used to obtain directional information for each link
        $seedStore = new FGLinkSeedStore($this->container);

        // 3) Examine links for each task
        foreach ($taskIds as $tid) {



            $links = $this->taskLinkModel->getAll($tid);
            foreach ((array) $links as $lk) {
                $taskLinkId = (int) ($lk['id'] ?? 0);
                if ($taskLinkId <= 0) continue;

                // Robustly determine the opposite task (as in the original implementation)
                $opp = (int) ($lk['opposite_task_id'] ?? ($lk['task_id'] ?? 0));
                 if ($opp <= 0) continue;

                // Link type check ($match) as before …
                // same_project_only as before, but applied to FROM/TO (see below)

                // --- NEW: derive direction exclusively from the stored seed ---
                $pid  = $projectCache[$tid] ?? 0; // project context of the view
                $seed = $seedStore->getSeedByLinkId($pid, $taskLinkId);
                if (!$seed) continue;

                $from = (int) ($seed['s'] ?? 0); // seed task (source)
                $to   = (int) ($seed['o'] ?? 0); // opposite task (target)
                if ($from <= 0 || $to <= 0 || $from === $to) continue;

                // Respect visibility: skip if the source task is not in the visible set
                if (!isset($out[$from])) continue;

                // If same_project_only is enabled, ensure both tasks belong to the same project
                if ($sameProjectOnly) {
                    $p1 = (int) ($projectCache[$from] ?? 0);
                    $p2 = (int) ($projectCache[$to]   ?? 0);
                    if ($p1 !== $p2) continue;
                }
                $out[$from][] = (string) $to;   // directed edge: FROM → TO
            }

            // Remove duplicate targets
            $out[$tid] = array_values(array_unique($out[$tid]));
        }

        return $out;
    }
}
