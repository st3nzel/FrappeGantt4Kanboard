<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\Gantt;

trait GanttDataAction
{
    // /?controller=GanttController&action=data&plugin=FrappeGantt&project_id=...
    public function data()
    {
        $project   = $this->getProject();
        $projectId = (int) $project['id'];

        $tz    = new \DateTimeZone(date_default_timezone_get());
        $today = new \DateTimeImmutable('today', $tz);

        $showNoDate = (int) $this->request->getIntegerParam('show_no_date', 0) === 1;

        $tasks = $this->taskFinderModel->getAll($projectId, 1);

        $taskIds = array_map(static fn($t) => (int)$t['id'], $tasks);
        $linkIds = array_values(array_filter(array_map('intval', preg_split('/\s*,\s*/',
            (string)$this->request->getStringParam('link_ids',''), -1, PREG_SPLIT_NO_EMPTY))));
        $sameOnly = (int)$this->request->getIntegerParam('same_project_only', 0) === 1;

        $depsMap = [];
        if (!empty($taskIds) && !empty($linkIds)) {
            $mapper  = new \Kanboard\Plugin\FrappeGantt\Service\DependencyMapper($this->container);
            $depsMap = $mapper->build($taskIds, $linkIds, $sameOnly);   // task_id => [oppId, ...]
        }

        // directed edges: seed → opposite (preserve direction)
        $present = [];
        foreach (array_values($tasks) as $idx => $row) {
            $tid = (int) $row['id'];
            $present[$tid] = true;
        }

 
        $reduced = [];
        foreach ($present as $tid => $_) { $reduced[$tid] = []; } // bottom => set(top)

        $seenDirected = []; // "from>to" → true
        foreach ($depsMap as $from => $list) {
            $from = (int)$from; // = Seed
            foreach ((array)$list as $toStr) {
                $to = (int)$toStr; // = Opposite
                if (!isset($present[$from]) || !isset($present[$to]) || $from === $to) continue;
                $key = $from.'>'.$to;
                if (isset($seenDirected[$key])) continue; // deduplicate directed duplicates only
                $seenDirected[$key] = true;
                // “to” depends on “from” → draw an arrow from → to
                $reduced[$to][$from] = true;
            }
        }

        $out = [];
        foreach ($tasks as $t) {
            $raw = $this->taskMetadataModel->get((int) $t['id'], 'duration', '');
            $hasDurDB = is_numeric($raw) && (int) $raw > 0;
            $duration = $hasDurDB ? (int) $raw : null;

            $norm = $this->normalizeTaskDatesForDisplay($t, $duration, $today);

            if (!$showNoDate && $norm['flags']['originally_no_dates']) {
                continue;
            }

            $dbCount = ($norm['flags']['had_start_db'] ? 1 : 0)
                     + ($norm['flags']['had_end_db']   ? 1 : 0)
                     + ($norm['flags']['had_dur_db']   ? 1 : 0);
            $customClass = $dbCount >= 2 ? '' : 'bar-no-dates';

            $tid  = (int) $t['id'];
            $depsStr = '';
            if (!empty($reduced[$tid])) {
                $depsStr = implode(',', array_map('strval', array_keys($reduced[$tid])));
            }

            $out[] = [
                'id'           => (string) $t['id'],
                'name'         => $t['title'],
                'url'          => $this->helper->url->to(
                                    'TaskViewController', 'show',
                                    ['task_id' => $t['id'], 'project_id' => $t['project_id']]
                                  ),
                'start'        => $norm['start']->format('Y-m-d'),
                'end'          => $norm['end']->format('Y-m-d'),
                'duration'     => $duration ?: 0,
                'custom_class' => $customClass,
                'color_id'     => isset($t['color_id']) ? (string) $t['color_id'] : '',
                'color'        => $this->colorModel->getColorProperties($t['color_id'] ?? ''),
                'flags'        => $norm['flags'],
                'progress'     => $this->computeProgressFromKanboard($t),
                'dependencies' => $depsStr,
            ];
        }
/* ======== HIERARCHICAL ORDER (Kanboard internal link IDs; IDs fixed in code) ======== */

/* 0) Define link type IDs here (only numeric IDs, not labels!) */
// Link type IDs for the hierarchical relationships.  Assign the numeric ID for
// “is a parent of” to $LINK_PARENT_OF_ID.  The opposite link type (i.e. “is a child of”)
// is looked up automatically via getOppositeLinkId().
$LINK_PARENT_OF_ID = 7;
$LINK_CHILD_OF_ID  = (int)$this->linkModel->getOppositeLinkId($LINK_PARENT_OF_ID);

/* 1) Collect visible task IDs and their date values */
$present   = [];
$idToStart = [];
$idToEnd   = [];
foreach ($out as $row) {
    $tid = (int)($row['id'] ?? 0);
    if ($tid <= 0) continue;
    $present[$tid]   = true;
    $idToStart[$tid] = (string)($row['start'] ?? '9999-12-31');
    $idToEnd[$tid]   = (string)($row['end']   ?? '9999-12-31');
}
$visibleIds = array_keys($present);

/* 2) Build a parent→children map from raw internal task links */
$children = [];
$indeg    = [];
foreach ($visibleIds as $id) { $children[$id] = []; $indeg[$id] = 0; }

foreach ($visibleIds as $tid) {
    $rows = $this->taskLinkModel->getAll($tid) ?: [];
    foreach ($rows as $L) {
        $rid = (int)($L['id'] ?? 0);
        if ($rid <= 0) continue;

        // Retrieve the raw row: contains task_id, opposite_task_id and link_id
        $raw = $this->taskLinkModel->getById($rid);
        if (!$raw) continue;

        $a   = (int)($raw['task_id'] ?? 0);
        $b   = (int)($raw['opposite_task_id'] ?? 0);
        $lid = (int)($raw['link_id'] ?? 0);

        if ($a <= 0 || $b <= 0 || $lid <= 0) continue;
        if (!isset($present[$a]) || !isset($present[$b]) || $a === $b) continue;

        // Determine direction solely by link IDs (not labels)
        if ($lid === $LINK_PARENT_OF_ID) {
            $p = $a; $c = $b;                 // a “is a parent of” b
        } elseif ($lid === $LINK_CHILD_OF_ID) {
            $p = $b; $c = $a;                 // a “is a child of” b → b is the parent
        } else {
            continue;                         // ignore other link types
        }

        if (!in_array($c, $children[$p], true)) {
            $children[$p][] = $c;
            $indeg[$c] = ($indeg[$c] ?? 0) + 1;
        }

    }
}
$LINK_BLOCKS_ID =  2;
$LINK_BLOCKED_BY_ID = (int) $this->linkModel->getOppositeLinkId($LINK_BLOCKS_ID);
/* 3) Determine root tasks (tasks with no parents in the visible set) */
$roots = [];
foreach ($visibleIds as $id) {
    if (($indeg[$id] ?? 0) === 0) $roots[] = (int)$id;
}

/* 4) Stable sorting of children: by start date ascending, end date ascending, then ID ascending */
$cmpIds = function (int $a, int $b) use ($idToStart, $idToEnd) {
    $sa = $idToStart[$a] ?? '9999-12-31';
    $sb = $idToStart[$b] ?? '9999-12-31';
    if ($sa !== $sb) return strcmp($sa, $sb);
    $ea = $idToEnd[$a] ?? '9999-12-31';
    $eb = $idToEnd[$b] ?? '9999-12-31';
    if ($ea !== $eb) return strcmp($ea, $eb);
    return $a <=> $b;
};

/* 5) Depth‑first pre‑order traversal: visit the parent first, then its children (each sorted stably) */
$seen = []; $order = []; $levelMap = [];
$visit = function (int $u, int $d) use (&$visit, &$seen, &$order, &$levelMap, &$children, $cmpIds) {
    if (isset($seen[$u])) return;
    $seen[$u] = true; $order[] = $u; $levelMap[$u] = $d;
    $kids = $children[$u] ?? [];
    if ($kids) { usort($kids, $cmpIds); foreach ($kids as $v) $visit((int)$v, $d+1); }
};
usort($roots, $cmpIds);
foreach ($roots as $r) $visit((int)$r, 0);
// Catch cycles or disconnected components by visiting any unseen nodes
foreach ($visibleIds as $id) if (!isset($seen[$id])) $visit((int)$id, 0);

/* 6) Assign _row_index/_level and perform final server‑side sorting */
$pos = array_flip($order);
foreach ($out as &$row) {
    $tid = (int)($row['id'] ?? 0);
    $row['_row_index'] = isset($pos[$tid]) ? (int)$pos[$tid] : PHP_INT_MAX;
    $row['_level']     = (int)($levelMap[$tid] ?? 0);

    // IMPORTANT: do not append additional class tokens here (Frappe expects a single token)
    if (isset($row['custom_class'])) {
        $row['custom_class'] = trim(preg_replace('/\s+/', '-', (string)$row['custom_class']));
    }
}
unset($row);

usort($out, function ($a, $b) {
    $ai = $a['_row_index'] ?? PHP_INT_MAX;
    $bi = $b['_row_index'] ?? PHP_INT_MAX;
    if ($ai !== $bi) return $ai <=> $bi;
    return (int)($a['id'] ?? 0) <=> (int)($b['id'] ?? 0);
});
/* ======== /HIERARCHICAL ORDER ======== */


/* ======== BLOCKERS: Enforce start dates ≥ the maximum end of their blockers ======== */

// 1) Collect IDs of tasks that are visible in the final output
$visibleIds = [];
foreach ($out as $row) {
    $tid = (int)($row['id'] ?? 0);
    if ($tid > 0) $visibleIds[$tid] = true;
}

// 2) A map of end dates already exists above:
//    $idToEnd[taskId] = end date in 'Y‑m‑d' string form

// 3) Collect blocker relationships for visible tasks (pure IDs, no labels)
$blockedToBlockers = []; // blocked_id => [blocker_id, ...]
foreach (array_keys($visibleIds) as $tid) {
    $links = $this->taskLinkModel->getAll($tid);
    foreach ((array)$links as $lk) {
        $tlid = (int)($lk['id'] ?? 0);
        if ($tlid <= 0) continue;

        // Look up the full row: provides link_id, task_id and opposite_task_id
        $raw = $this->taskLinkModel->getById($tlid);
        if (!$raw) continue;

        $typeId = (int)($raw['link_id'] ?? 0);
        $a = (int)($raw['task_id'] ?? 0);
        $b = (int)($raw['opposite_task_id'] ?? 0);

        // Cases: either a --(blocks)--> b or a <--(is blocked by)--> b
        if ($typeId === $LINK_BLOCKS_ID   && isset($visibleIds[$a], $visibleIds[$b])) {
            $blocker = $a; $blocked = $b;
        } elseif ($typeId === $LINK_BLOCKED_BY_ID && isset($visibleIds[$a], $visibleIds[$b])) {
            $blocker = $b; $blocked = $a;
        } else {
            continue;
        }

        // Optional: restrict to the same project (similar to the existing same_project_only option)
        if (($sameProjectOnly ?? false) && ($projectCache[$blocker] ?? 0) !== ($projectCache[$blocked] ?? 0)) {
            continue;
        }

        $blockedToBlockers[$blocked][] = $blocker;
    }
}

// 4) Compute the earliest feasible start date per task that is blocked
$minStartByBlocked = []; // taskId => DateTimeImmutable
foreach ($blockedToBlockers as $blocked => $blockers) {
    $maxEnd = null;
    foreach (array_unique($blockers) as $bid) {
        $eStr = $idToEnd[$bid] ?? null;             // 'Y-m-d'
        if (!$eStr) continue;
        $e = new \DateTimeImmutable($eStr);         // DateTime
        if ($maxEnd === null || $e > $maxEnd) {
            $maxEnd = $e;
        }
    }
    if ($maxEnd) $minStartByBlocked[(int)$blocked] = $maxEnd;
}
// a) Create an index of all blocker tasks (used to mark the right edge)
$blockerIndex = [];
foreach ($blockedToBlockers as $blocked => $blockers) {
    foreach ($blockers as $bid) $blockerIndex[(int)$bid] = true;
}

// b) Attach CSS classes to each outgoing task object to mark block relationships
foreach ($out as &$row) {
    $tid = (int)($row['id'] ?? 0);
    if ($tid <= 0) continue;

    $classes = trim((string)($row['custom_class'] ?? ''));

    if (isset($minStartByBlocked[$tid])) {              // has at least one blocker → mark left edge
        $classes .= ' fg-blocked-start';
    }
    if (isset($blockerIndex[$tid])) {                   // blocks at least one other task → mark right edge
        $classes .= ' fg-blocker-end';
    }

    if ($classes !== '') $row['custom_class'] = trim($classes);
}
unset($row);

// 5) Raise the start date in $out if needed
foreach ($out as &$row) {
    $tid = (int)($row['id'] ?? 0);
    if ($tid <= 0) continue;

    if (isset($minStartByBlocked[$tid])) {
        $mustStart = $minStartByBlocked[$tid];               // DateTimeImmutable
        $curStart  = new \DateTimeImmutable((string)$row['start']);
        if ($curStart < $mustStart) {
            // Rule: Set start exactly equal to the blocker's end; database correction is handled by a hook
            $row['start'] = $mustStart->format('Y-m-d');

            // Safety net for rendering: ensure end ≥ start
            $curEnd = new \DateTimeImmutable((string)$row['end']);
            if ($curEnd < $mustStart) {
                $row['end'] = $mustStart->format('Y-m-d');
            }
        }
    }
}
unset($row);
/* ======== /BLOCKERS ======== */




        return $this->response->json($out);
    }
}
