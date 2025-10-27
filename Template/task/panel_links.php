<div id="fg-links-panel"
     data-list-url="<?= $this->url->href('FGLinksController','list',['plugin'=>'FrappeGantt']) ?>"
     data-create-url="<?= $this->url->href('FGLinksController','create',['plugin'=>'FrappeGantt']) ?>"
     data-remove-url="<?= $this->url->to('FGLinksController','remove',['plugin'=>'FrappeGantt','project_id'=>$task['project_id']]) ?>"
     data-search-url="<?= $this->url->href('FGLinksController','search',['plugin'=>'FrappeGantt']) ?>"
     data-csrf-token="<?= $this->token->getCSRFToken() ?>"
     data-task-id="<?= $task['id'] ?>"
     data-project-id="<?= $task['project_id'] ?>">

  <h4>Interne Links</h4>

  <div class="fg-links-list"></div>

  <div class="fg-links-add">
    <label>Link-Typ</label>
    <select class="fg-link-type"></select>

    <label>Ziel-Task</label>
    <input type="text" class="fg-task-search" placeholder="#ID · Titel (Projekt)">
    <input type="hidden" class="fg-task-id">
    <div class="fg-search-results" style="display:none;"></div>
  </div>
</div>
