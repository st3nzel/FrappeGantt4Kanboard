<?php
$durationValue = isset($durationValue) ? $durationValue : '';
$values = ['duration' => $durationValue];
$errors = [];
?>
<div class="form-row">
  <?= $this->form->label(t('Duration (days)'), 'duration') ?>
  <?= $this->form->number('duration', $values, $errors, ['min' => 0, 'step' => 1]) ?>
  <p class="form-help">
    <?= t('Used by Frappe Gantt when no end date is set. If no start date exists, today is used.') ?>
  </p>
</div>
