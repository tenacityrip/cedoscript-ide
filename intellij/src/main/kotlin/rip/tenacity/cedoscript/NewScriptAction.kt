package rip.tenacity.cedoscript

import com.intellij.ide.actions.CreateFileFromTemplateAction
import com.intellij.ide.actions.CreateFileFromTemplateDialog
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.psi.PsiDirectory
import com.intellij.psi.PsiFile

private const val TEMPLATE = "CedoScript"
private val ICON = IconLoader.getIcon("/icons/cedoscript.svg", NewScriptAction::class.java)

class NewScriptAction : CreateFileFromTemplateAction(TEMPLATE, "Creates a Tenacity script", ICON), DumbAware {
    override fun buildDialog(project: Project, directory: PsiDirectory, builder: CreateFileFromTemplateDialog.Builder) {
        builder.setTitle("New CedoScript").addKind(TEMPLATE, ICON, TEMPLATE)
    }

    override fun getActionName(directory: PsiDirectory, newName: String, templateName: String): String =
        "Create CedoScript $newName"

    override fun postProcess(createdElement: PsiFile, templateName: String, customProperties: Map<String, String>?) {
        super.postProcess(createdElement, templateName, customProperties)
        Typings.install(createdElement.project)
    }
}
