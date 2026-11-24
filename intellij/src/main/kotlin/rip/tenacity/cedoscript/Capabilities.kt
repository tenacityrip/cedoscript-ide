package rip.tenacity.cedoscript

/** Finds uses of gated API that the script header does not ask for. Mirrors vscode/src/capabilities.ts. */
object Capabilities {
    data class Problem(val capability: String, val use: String, val start: Int, val end: Int)

    data class Edit(val offset: Int, val text: String)

    private val header = Regex("""^﻿?\s*//\s*==Script==[^\n]*\n([\s\S]*?)//\s*==/Script==""")
    private val init = Regex("""\binitScript\s*\(""")
    private val declared = Regex("""\b(?:var|let|const)\s+(\w+)\s*=\s*initScript\s*\(""")
    private val capability = Regex("""^\s*//\s*@capability\s+(.+)$""", RegexOption.MULTILINE)
    private val member = Regex("""(?<![\w$.])(\w+)\s*\.\s*(\w+)""")
    private val event = Regex("""(?<![\w$.])on\s*\(\s*["'](\w+)["']""")
    private val quiet = Regex("""//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'""")

    private val members: Map<String, String>
    private val events: Map<String, String>

    init {
        val json = Capabilities::class.java.getResource("/cedoscript/capabilities.json")!!.readText()
        members = section(json, "members")
        events = section(json, "events")
    }

    fun isScript(source: String): Boolean = init.containsMatchIn(source) || header.containsMatchIn(source)

    fun requested(source: String): Set<String> {
        val block = header.find(source)?.groupValues?.get(1) ?: return emptySet()
        return capability.findAll(block)
            .flatMap { it.groupValues[1].lowercase().split(Regex("""[\s,]+""")) }
            .filter { it.isNotEmpty() }
            .toSet()
    }

    fun findProblems(source: String): List<Problem> {
        if (!isScript(source)) return emptyList()
        val have = requested(source)
        val found = mutableListOf<Problem>()
        fun add(needed: String?, use: String, range: IntRange) {
            if (needed != null && needed !in have) found += Problem(needed, use, range.first, range.last + 1)
        }
        val code = blank(source, true)
        val script = declared.find(code)?.groupValues?.get(1)
        for (m in member.findAll(code)) {
            val (name, called) = m.destructured
            if (name == "script" && script != name) continue
            val owner = if (name == script) "script" else name
            add(members["$owner.$called"], "$name.$called", m.range)
        }
        for (m in event.findAll(blank(source, false))) {
            add(events[m.groupValues[1]], "on(\"${m.groupValues[1]}\")", m.range)
        }
        return found
    }

    fun addCapability(source: String, capability: String): Edit {
        val block = header.find(source)
            ?: return Edit(0, "// ==Script==\n// @capability  $capability\n// ==/Script==\n\n")
        return Edit(block.value.lastIndexOf("//"), "// @capability  $capability\n")
    }

    private fun blank(source: String, strings: Boolean): String = quiet.replace(source) { m ->
        val text = m.value
        if (!strings && (text[0] == '"' || text[0] == '\'')) text else text.replace(Regex("""[^\n]"""), " ")
    }

    /** One capability-to-names section, inverted. The file is our own generated JSON, so a small reader is enough. */
    private fun section(json: String, name: String): Map<String, String> {
        val body = Regex("\"$name\"\\s*:\\s*\\{([^}]*)\\}").find(json)!!.groupValues[1]
        return Regex("\"(\\w+)\"\\s*:\\s*\\[([^\\]]*)\\]").findAll(body).flatMap { m ->
            Regex("\"([\\w.]+)\"").findAll(m.groupValues[2]).map { it.groupValues[1] to m.groupValues[1] }
        }.toMap()
    }
}
