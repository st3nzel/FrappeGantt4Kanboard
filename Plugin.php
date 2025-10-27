<?php

namespace Kanboard\Plugin\FrappeGantt;

use Kanboard\Core\Plugin\Base;
use Kanboard\Core\Security\Role;
use Kanboard\Core\Translator;

/**
 * FrappeGantt Plugin
 *
 * This plugin provides an interactive Gantt chart view for each project based
 * on the open‑source Frappe Gantt library. The chart allows users with edit
 * permissions to drag and resize task bars in order to change the start and
 * due dates of tasks. All assets are bundled locally in this plugin – no
 * external CDNs are used. See the controller class for the routing and
 * business logic.
 */
class Plugin extends Base
{
    /**
     * Register plugin components
     */
    public function initialize()
    {


        $this->applicationAccessMap->add('GanttController', ['save'], Role::APP_USER);
        $this->applicationAccessMap->add('FGLinksController', ['create', 'remove'], Role::APP_USER);
        $this->projectAccessMap->add('GanttController', ['save'], Role::PROJECT_MEMBER);
        $this->projectAccessMap->add('FGLinksController', ['list', 'search'],   Role::PROJECT_VIEWER);
        $this->projectAccessMap->add('FGLinksController', ['create', 'remove'], Role::PROJECT_MEMBER);


        // Inject a new tab into the project header view switcher
        $this->template->hook->attach('template:project-header:view-switcher', 'FrappeGantt:project_header/view_switcher');
        $this->route->addRoute('/project/:project_id/frappe-gantt', 'GanttController', 'index');
        $this->route->addRoute('/project/:project_id/frappe-gantt', 'GanttController', 'save');


        $this->route->addRoute('/project/:project_id/frappe-gantt/links',        'FGLinksController', 'list',   'FrappeGantt');
        $this->route->addRoute('/project/:project_id/frappe-gantt/links/create', 'FGLinksController', 'create', 'FrappeGantt');
        $this->route->addRoute('/project/:project_id/frappe-gantt/links/remove', 'FGLinksController', 'remove', 'FrappeGantt');
        $this->route->addRoute('/project/:project_id/frappe-gantt/links/search', 'FGLinksController', 'search', 'FrappeGantt');
        $this->route->addRoute('/project/:project_id/frappe-gantt/links/seed', 'FGLinksController', 'seed', 'FrappeGantt');

        
        
        $c = $this->container;

        // Render and pre-fill the custom "duration" field in the task creation form.
        // The field is stored in task metadata under the key "duration" and remains
        // named "duration" in the HTML form. When editing a task, values posted by
        // the user take precedence over existing metadata.
        $this->template->hook->attachCallable(
            'template:task:form:third-column',
            'FrappeGantt:task/duration_field',
            function (array $values, array $errors) use ($c) {
                $duration = '';
                if (!empty($values['id'])) {
                    $duration = (string) $c['taskMetadataModel']->get((int) $values['id'], 'duration', '');
                }
                if (isset($values['duration'])) {           // POST-Vorrang
                    $duration = (string) $values['duration'];
                }
                return ['durationValue' => $duration];
            }
        );

        // Before task creation remove the "duration" field from the values array.
        // Kanboard tasks have no native "duration" column, so this prevents a
        // “no such column” error during INSERT.
        $this->hook->on('model:task:creation:prepare', function (array &$values) use ($c) {
            if (isset($values['duration'])) {
                // Remove the duration field during creation to prevent "no such column" errors
                unset($values['duration']);
            }
        });

        // After a task is created write the duration into task metadata.  By this
        // point the task ID exists and can be used to store the duration as a
        // positive integer (clamped to 0 if negative).
        $this->hook->on('model:task:creation:aftersave', function (int $taskId) use ($c) {
            $d = (int) $c['request']->getIntegerParam('duration', 0);
            if ($d < 0) {
                $d = 0;
            }
            $c['taskMetadataModel']->save($taskId, ['duration' => $d]);
        });

        // Before a task is updated update the duration metadata and always remove
        // the "duration" field from the update array.  This ensures the field
        // never appears in the SQL UPDATE statement while still persisting to
        // metadata.
        $this->hook->on('model:task:modification:prepare', function (array &$values) use ($c) {
            $post = (array) $c['request']->getValues();

            // Determine the duration value (POST parameter takes precedence over existing values)
            $d = null;
            if (array_key_exists('duration', $post)) {
                $d = (int) $post['duration'];
            } elseif (array_key_exists('duration', $values)) {
                $d = (int) $values['duration'];
            }
            if ($d !== null && $d < 0) {
                $d = 0;
            }

            // Robustly determine the task ID since request fields vary by controller
            $taskId = (int) $c['request']->getIntegerParam('id', 0);
            if ($taskId === 0) {
                $taskId = (int) $c['request']->getIntegerParam('task_id', 0);
            }
            if ($taskId === 0 && !empty($values['id'])) {
                $taskId = (int) $values['id'];
            }

            // Store metadata if we have both a duration and a task ID
            if ($d !== null && $taskId > 0) {
                $c['taskMetadataModel']->save($taskId, ['duration' => $d]);
            }

            // Always remove the duration field so it never ends up in the SQL UPDATE statement
            unset($values['duration']);
        });

        // Optionally display the duration in places like the task sidebar.  This
        // hook reads the stored metadata and exposes it to the sidebar template.
        $this->template->hook->attachCallable(
            'template:task:sidebar:information',
            'FrappeGantt:task/duration_sidebar',
            function (array $task) use ($c) {
                $v = (string) $c['taskMetadataModel']->get((int)$task['id'], 'duration', '');
                return ['durationValue' => $v];
            }
        );

$LINK_BLOCKS_ID = 2;
$LINK_BLOCKED_BY_ID = (int) $c['linkModel']->getOppositeLinkId($LINK_BLOCKS_ID);


        $this->hook->on('model:task:modification:prepare', function (array &$values) use ($c, $LINK_BLOCKS_ID, $LINK_BLOCKED_BY_ID) {

    // Helper functions for retrieving tasks and computing due dates
    $getTask = function (int $id) use ($c) { return $c['taskFinderModel']->getById($id); };
    $getEnd  = function (int $id) use ($getTask) {
        $t = $getTask($id);
        $ts = (int)($t['date_due'] ?? 0);
        return $ts > 0 ? $ts : 0;
    };

    $taskId = (int)($values['id'] ?? 0);
    if ($taskId <= 0) return;

    // Current (new) start/end values come from POST if provided, otherwise fall back to DB values
    $newStart = isset($values['date_started']) ? (int)$values['date_started'] : (int)($getTask($taskId)['date_started'] ?? 0);
    $newEnd   = isset($values['date_due'])     ? (int)$values['date_due']     : (int)($getTask($taskId)['date_due'] ?? 0);

    // --- A) If this task is blocked by others → ensure start ≥ max(end of blockers)
    $rows = $c['taskLinkModel']->getAll($taskId);
    $blockerEnds = [];

    foreach ((array)$rows as $lk) {
        $tlid = (int)($lk['id'] ?? 0);
        if ($tlid <= 0) continue;
        $raw = $c['taskLinkModel']->getById($tlid);
        if (!$raw) continue;

        $typeId = (int)($raw['link_id'] ?? 0);
        $a = (int)($raw['task_id'] ?? 0);
        $b = (int)($raw['opposite_task_id'] ?? 0);

        if ($typeId === $LINK_BLOCKS_ID && $b === $taskId) {
            $blockerEnds[] = $getEnd($a);
        } elseif ($typeId === $LINK_BLOCKED_BY_ID && $a === $taskId) {
            $blockerEnds[] = $getEnd($b);
        }
    }

    $maxBlockerEnd = 0;
    foreach ($blockerEnds as $e) { if ($e > $maxBlockerEnd) $maxBlockerEnd = $e; }

    if ($maxBlockerEnd > 0 && ($newStart === 0 || $newStart < $maxBlockerEnd)) {
        // Apply the rule: start = max(end of blockers)
        $values['date_started'] = $maxBlockerEnd;
        $newStart = $maxBlockerEnd;
    }

    // --- B) If this task blocks others → shift directly blocked tasks forward when necessary
    // Note: Kanboard lacks a documented "modification:aftersave" hook, so we implement this carefully as a side effect, performing minimal updates only when needed.
    if ($newEnd > 0) {
        // Find all tasks that are blocked by this blocker
        $rows2 = $c['taskLinkModel']->getAll($taskId);
        $blockedIds = [];
        foreach ((array)$rows2 as $lk) {
            $tlid = (int)($lk['id'] ?? 0);
            if ($tlid <= 0) continue;
            $raw = $c['taskLinkModel']->getById($tlid);
            if (!$raw) continue;

            $typeId = (int)($raw['link_id'] ?? 0);
            $a = (int)($raw['task_id'] ?? 0);
            $b = (int)($raw['opposite_task_id'] ?? 0);

            if ($typeId === $LINK_BLOCKS_ID && $a === $taskId) {
                $blockedIds[$b] = true;
            } elseif ($typeId === $LINK_BLOCKED_BY_ID && $b === $taskId) {
                $blockedIds[$a] = true;
            }
        }

        foreach (array_keys($blockedIds) as $bid) {
            $bt = $getTask($bid);
            $bStart = (int)($bt['date_started'] ?? 0);
            if ($bStart === 0 || $bStart < $newEnd) {
                // Perform a minimal update: only raise the start date to align with this blocker's new end
                $c['taskModificationModel']->update([
                    'id' => $bid,
                    'date_started' => $newEnd,
                ]);
            }
        }
    }
});

    }



    /**
     * Load translations
     */
    public function onStartup()
    {
        Translator::load($this->languageModel->getCurrentLanguage(), __DIR__ . '/Locale');
    }

    /**
     * Plugin metadata
     */
    public function getPluginName()
    {
        return 'FrappeGantt';
    }

    public function getPluginDescription()
    {
        return t('Interactive Gantt chart view for projects using the Frappe Gantt library');
    }

    public function getPluginAuthor()
    {
        return 'OpenAI ChatGPT';
    }

    public function getPluginVersion()
    {
        return '0.1.0';
    }

    public function getPluginHomepage()
    {
        return 'https://github.com/frappe/gantt';
    }

    public function getCompatibleVersion()
    {
        // Minimum Kanboard version required for this plugin
        return '>=1.2.20';
    }
}
