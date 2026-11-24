package rip.tenacity.cedoscript

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.runWriteAction
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.guessProjectDir
import com.intellij.openapi.vfs.VfsUtil
import java.io.IOException

/** Writes the bundled declarations into a project, where the JavaScript support picks them up. */
object Typings {
    private const val FOLDER = ".cedoscript"
    private const val FILE = "cedoscript.d.ts"

    fun install(project: Project): Boolean {
        val root = project.guessProjectDir() ?: return false
        val text = Typings::class.java.getResource("/cedoscript/$FILE")!!.readText()
        return try {
            runWriteAction {
                val folder = VfsUtil.createDirectoryIfMissing(root, FOLDER)
                VfsUtil.saveText(folder.findChild(FILE) ?: folder.createChildData(this, FILE), text)
            }
            true
        } catch (e: IOException) {
            false
        }
    }
}

class InstallTypingsAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val ok = Typings.install(project)
        NotificationGroupManager.getInstance().getNotificationGroup("CedoScript")
            .createNotification(
                if (ok) "CedoScript typings installed" else "Could not write the CedoScript typings",
                if (ok) NotificationType.INFORMATION else NotificationType.WARNING,
            )
            .notify(project)
    }
}
