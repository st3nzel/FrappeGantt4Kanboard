<?php

namespace Kanboard\Plugin\FrappeGantt\Controller;

use Kanboard\Controller\BaseController;
use Kanboard\Plugin\FrappeGantt\Service\DependencyMapper;

// Trait-Dateien einbinden (Datei-Ebene, NICHT im Klassenrumpf!)
require_once __DIR__.'/Gantt/index.php';
require_once __DIR__.'/Gantt/computeProgressFromKanboard.php';
require_once __DIR__.'/Gantt/data.php';
require_once __DIR__.'/Gantt/normalizeTaskDatesForDisplay.php';
require_once __DIR__.'/Gantt/detail.php';
require_once __DIR__.'/Gantt/save.php';
require_once __DIR__.'/Gantt/deps.php';

use Kanboard\Plugin\FrappeGantt\Controller\Gantt\GanttIndexAction;
use Kanboard\Plugin\FrappeGantt\Controller\Gantt\GanttComputeProgress;
use Kanboard\Plugin\FrappeGantt\Controller\Gantt\GanttDataAction;
use Kanboard\Plugin\FrappeGantt\Controller\Gantt\GanttNormalize;
use Kanboard\Plugin\FrappeGantt\Controller\Gantt\GanttDetailAction;
use Kanboard\Plugin\FrappeGantt\Controller\Gantt\GanttSaveAction;
use Kanboard\Plugin\FrappeGantt\Controller\Gantt\GanttDepsAction;

class GanttController extends BaseController
{
    use GanttIndexAction,
        GanttComputeProgress,
        GanttDataAction,
        GanttNormalize,
        GanttDetailAction,
        GanttSaveAction,
        GanttDepsAction;
}
