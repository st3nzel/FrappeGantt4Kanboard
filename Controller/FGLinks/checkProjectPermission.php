<?php
namespace Kanboard\Plugin\FrappeGantt\Controller\FGLinks;

trait FGLinksPermission
{
    /**
     * Ensure the current user is allowed to access the specified project.
     *
     * This helper wraps the projectPermissionModel check and sends a
     * JSON 403 response if the user is not allowed.  Execution is
     * terminated immediately after sending the response.
     *
     * @param int $projectId The project identifier to validate
     * @return void
     */
    private function checkProjectPermission(int $projectId): void
    {
        if (!$this->projectPermissionModel->isUserAllowed($projectId, $this->userSession->getId())) {
            $this->response->json(['ok' => false, 'error' => 'forbidden'], 403);
            exit;
        }
    }
}
