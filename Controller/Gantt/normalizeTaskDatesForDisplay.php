<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\Gantt;

trait GanttNormalize
{
    protected function normalizeTaskDatesForDisplay(array $t, ?int $duration, \DateTimeImmutable $today): array
    {
        $tz = $today->getTimezone();

        $startTs = isset($t['date_started']) ? (int) $t['date_started'] : 0;
        $endTs   = isset($t['date_due'])     ? (int) $t['date_due']     : 0;

        $hadStartDB = $startTs > 0;
        $hadEndDB   = $endTs   > 0;
        $hadDurDB   = ($duration !== null && $duration > 0);

        $start = $hadStartDB ? (new \DateTimeImmutable('@'.$startTs))->setTimezone($tz) : null;
        $end   = $hadEndDB   ? (new \DateTimeImmutable('@'.$endTs))->setTimezone($tz)   : null;

        if ($hadStartDB && $hadEndDB) {
        } elseif (!$hadStartDB && $hadEndDB && $hadDurDB) {
            $start = $end->modify('-'.$duration.' days');
        } elseif ($hadStartDB && !$hadEndDB && $hadDurDB) {
            $end = $start->modify('+'.$duration.' days');
        } elseif (!$hadStartDB && !$hadEndDB && $hadDurDB) {
            $start = $today;
            $end   = $today->modify('+'.$duration.' days');
        } elseif ($hadStartDB && !$hadEndDB && !$hadDurDB) {
            $end = $start->modify('+1 day');
        } elseif (!$hadStartDB && $hadEndDB && !$hadDurDB) {
            $start = $today;
        } elseif (!$hadStartDB && !$hadEndDB && !$hadDurDB) {
            $start = $today;
            $end   = $today->modify('+1 day');
        }

        if (!$start) { $start = $today; }
        if (!$end)   { $end   = $start->modify('+1 day'); }
        if ($end <= $start) { $end = $start->modify('+1 day'); }

        return [
            'start' => $start,
            'end'   => $end,
            'flags' => [
                'had_start_db'        => $hadStartDB,
                'had_end_db'          => $hadEndDB,
                'had_dur_db'          => $hadDurDB,
                'originally_no_dates' => (!$hadStartDB && !$hadEndDB),
            ],
        ];
    }
}
