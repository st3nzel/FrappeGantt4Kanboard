<?php
/**
 * Gantt (Frappe) – Projektansicht (v1 UMD, CSP-konform)
 * Erwartet: $project, $csrf, $options, $dataUrl, $saveUrlPattern
 */

if (!isset($dataUrl)) {
    $dataUrl = $this->url->to('GanttController', 'data', [
        'plugin'     => 'FrappeGantt',
        'project_id' => isset($project['id']) ? $project['id'] : (int) ($_GET['project_id'] ?? 0),
    ]);
}
if (!isset($saveUrlPattern)) {
    $saveUrlPattern = $this->url->to('GanttController', 'save', [
        'plugin'  => 'FrappeGantt',
        'task_id' => '__TASK__',
    ]);
}


?>
<?= $this->render('kanboard:project_header/header', [
    'project' => $project,
    'filters' => $filters,                     // ['search' => 'status:open']
    'title'   => t('Gantt (Frappe)'),
    'board_view' => false,
]) ?>



<div class="gantt-toolbar" style="margin:8px 0; display:flex; gap:.5rem; align-items:center;">
    <label><?= t('View') ?>:</label>
    <button type="button" class="gantt-mode-btn btn btn-inline" data-view="Day">Day</button>
    <button type="button" class="gantt-mode-btn btn btn-inline" data-view="Week">Week</button>
    <button type="button" class="gantt-mode-btn btn btn-inline" data-view="Month">Month</button>
    <button type="button" class="gantt-mode-btn btn btn-inline" data-view="Year">Year</button>


    <span class="gt-toolbar-sep" aria-hidden="true"></span>

    <a href="<?= $this->url->to('TaskCreationController', 'show', ['project_id' => $project['id']]) ?>"
    class="btn js-modal-large btn-add-task" title="<?= t('Add task') ?>">
    <i class="fa fa-plus fa-fw" aria-hidden="true"></i> <?= t('Add task') ?>
    </a>

    <a href="#"
   id="fg-export-pdf"
   class="btn btn-inline"
   title="<?= t('Export PDF') ?>">
   <i class="fa fa-download fa-fw" aria-hidden="true"></i> <?= t('Export') ?>
    </a>



    <label style="margin-left:1rem;">
        <input type="checkbox" id="toggle-show-no-date" <?= !empty($options['show_no_date']) ? 'checked' : '' ?>>
        <?= t('Show tasks without dates') ?>
    </label>
</div>


<!-- Konfiguration CSP-freundlich als data-Attribut -->
<div id="frappe-gantt" data-config='<?= json_encode([
    "projectId"        => (int) $project['id'],
    "csrfToken"        => $csrfToken,
    "dataUrl"          => $this->url->to('GanttController', 'data', ['plugin' => 'FrappeGantt', 'project_id' => $project['id']]),
    "saveUrlPattern"   => $this->url->to('GanttController', 'save', ['plugin' => 'FrappeGantt', 'task_id' => '__TASK__']),
    "detailUrlPattern" => $this->url->to('GanttController', 'detail', ['plugin' => 'FrappeGantt', 'task_id' => '__TASK__']),
    "defaultViewMode"  => "Week",
    "showNoDate"       => false,
    "showDependencies" => false,
    "messages"         => ["saved" => t('Saved'), "errorSave" => t('Unable to save changes.')],
      "dependencyLinkIds" => "1", // For example, the ID of the "relates to" link type; can later be populated via settings
  "sameProjectOnly"   => false,
"links" => [
  "list"   => $this->url->href('FGLinksController','list',   ['plugin'=>'FrappeGantt','project_id'=>$project['id']]),
  "create" => $this->url->href('FGLinksController','create', ['plugin'=>'FrappeGantt','project_id'=>$project['id']]),
  "remove" => $this->url->href('FGLinksController','remove', ['plugin'=>'FrappeGantt','project_id'=>$project['id']]),
  "search" => $this->url->href('FGLinksController','search', ['plugin'=>'FrappeGantt','project_id'=>$project['id']]),
  "seed"   => $this->url->href('FGLinksController','seed', ['plugin'=>'FrappeGantt','project_id'=>$project['id']]),
],
]) ?>' style=""></div>
<?php // Load assets only here (do not load them again globally via hooks) ?>

<?= $this->asset->css('plugins/FrappeGantt/Assets/css/frappe-gantt.css') ?>
<?= $this->asset->css('plugins/FrappeGantt/Assets/css/gantt.css') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/vendor/frappe-gantt.umd.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/iife-start.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/utils.pad2.toYMD.esc.escapeHtml.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/notifications.showToast.toastOk.toastError.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/config.parseConfigFromDataAttr.normalizeBool.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/colors.parseRgb.toRgbString.darkenRgb.injectKanboardColorCSS.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/links.api.fgLoadLinks.fgOnRemoveLink.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/links.ui.fgRenderLinksList.fgFillTypeDropdown.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/links.search.fgWireSearch.wireLinkSearch.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/panel.renderTaskPanel.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/data.buildDataUrl.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/chart.initGantt.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/chart.loadChart.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/bootstrap.dom.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/iife-end.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/vendor/jspdf.umd.min.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/vendor/svg2pdf.umd.min.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/vendor/html-to-image.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/vendor/svg-export.umd.standalone.min.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/vendor/umd.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/export.pdf.js') ?>
<?= $this->asset->js('plugins/FrappeGantt/Assets/js/gantt/sidebar.render.js') ?>



