package rip.tenacity.cedoscript

import com.intellij.codeInspection.InspectionManager
import com.intellij.codeInspection.LocalInspectionTool
import com.intellij.codeInspection.LocalQuickFix
import com.intellij.codeInspection.ProblemDescriptor
import com.intellij.codeInspection.ProblemHighlightType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile

private const val MAX_LENGTH = 500_000

class CapabilityInspection : LocalInspectionTool() {
    override fun checkFile(file: PsiFile, manager: InspectionManager, isOnTheFly: Boolean): Array<ProblemDescriptor>? {
        if (file.virtualFile?.extension != "js" || file.textLength > MAX_LENGTH) return null
        return Capabilities.findProblems(file.text).map { p ->
            manager.createProblemDescriptor(
                file,
                TextRange(p.start, p.end),
                "${p.use} needs \"// @capability ${p.capability}\" in the script header",
                ProblemHighlightType.WARNING,
                isOnTheFly,
                AddCapabilityFix(p.capability),
            )
        }.toTypedArray()
    }
}

private class AddCapabilityFix(private val capability: String) : LocalQuickFix {
    override fun getFamilyName(): String = "Request the $capability capability"

    override fun applyFix(project: Project, descriptor: ProblemDescriptor) {
        val file = descriptor.psiElement.containingFile ?: return
        val document = PsiDocumentManager.getInstance(project).getDocument(file) ?: return
        val edit = Capabilities.addCapability(document.text, capability)
        document.insertString(edit.offset, edit.text)
    }
}
