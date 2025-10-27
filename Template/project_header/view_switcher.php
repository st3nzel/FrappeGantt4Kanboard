<?php
/*
 * Render the entry for the Frappe Gantt view in the project header
 * switcher.  Use checkMenuSelection() to highlight the current
 * controller/action and preserve the search query across views.  The
 * standard shortcut pattern “v g” mirrors other Kanboard views.
 */
if ($this->user->hasProjectAccess('GanttController', 'index', $project['id'])): ?>
<li <?= $this->app->checkMenuSelection('GanttController') ?>>
    <?= $this->url->icon(
        'calendar',
        t('Gantt (Frappe)'),
        'GanttController',
        'index',
        [
            'plugin'     => 'FrappeGantt',
            'project_id' => $project['id'],
            'search'     => $filters['search'] ?? '',
        ]
    ) ?>
</li>
<?php endif; ?>
