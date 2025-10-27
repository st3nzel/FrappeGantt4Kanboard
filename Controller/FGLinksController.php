<?php

namespace Kanboard\Plugin\FrappeGantt\Controller;

use Kanboard\Controller\BaseController;
use Kanboard\Model\TaskLinkModel;
use Kanboard\Model\TaskModel;

require_once __DIR__.'/FGLinks/list.php';
require_once __DIR__.'/FGLinks/remove.php';
require_once __DIR__.'/FGLinks/create.php';
require_once __DIR__.'/FGLinks/search.php';
require_once __DIR__.'/FGLinks/checkProjectPermission.php';

use Kanboard\Plugin\FrappeGantt\Controller\FGLinks\FGLinksListAction;
use Kanboard\Plugin\FrappeGantt\Controller\FGLinks\FGLinksRemoveAction;
use Kanboard\Plugin\FrappeGantt\Controller\FGLinks\FGLinksCreateAction;
use Kanboard\Plugin\FrappeGantt\Controller\FGLinks\FGLinksSearchAction;
use Kanboard\Plugin\FrappeGantt\Controller\FGLinks\FGLinksPermission;

require_once __DIR__.'/FGLinks/seed.php';
use Kanboard\Plugin\FrappeGantt\Controller\FGLinks\FGLinksSeedAction;



class FGLinksController extends BaseController
{
    use FGLinksListAction,
        FGLinksRemoveAction,
        FGLinksCreateAction,
        FGLinksSearchAction,
        FGLinksPermission, 
        FGLinksSeedAction;
}
