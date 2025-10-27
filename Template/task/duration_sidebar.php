<?php
// Kommt aus attachCallable (Plugin.php)
$durationValue = isset($durationValue) ? $durationValue : '';
?>
<div class="task-summary-container">
    <h3><?= t('Frappe Gantt') ?></h3>
    <ul>
        <li><?= t('Duration (days)') ?>: <?= $this->text->e($durationValue) ?></li>
    </ul>
</div>

