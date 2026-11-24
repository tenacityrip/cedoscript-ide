package rip.tenacity.cedoscript

import org.junit.Assert.assertEquals
import org.junit.Test

class CapabilitiesTest {
    private val init = "const s = initScript({ name: \"a\", description: \"\", author: \"\" });\n"

    @Test
    fun reportsGatedMembersAndEvents() {
        val found = Capabilities.findProblems("${init}s.onMotion(() => player.jump());\non(\"packetSend\", () => {});")
        assertEquals(
            listOf("s.onMotion" to "movement", "player.jump" to "movement", "on(\"packetSend\")" to "packets"),
            found.map { it.use to it.capability },
        )
    }

    @Test
    fun ignoresCommentsStringsAndOtherFiles() {
        assertEquals(emptyList<Any>(), Capabilities.findProblems("$init// player.jump()\nconst t = \"player.jump()\";"))
        assertEquals(emptyList<Any>(), Capabilities.findProblems("player.jump();"))
    }

    @Test
    fun theFixClearsTheProblem() {
        for (header in listOf("", "// ==Script==\n// @name A\n// ==/Script==\n")) {
            val source = "$header${init}player.jump();"
            val edit = Capabilities.addCapability(source, "movement")
            val fixed = source.substring(0, edit.offset) + edit.text + source.substring(edit.offset)
            assertEquals(emptyList<Any>(), Capabilities.findProblems(fixed))
        }
    }
}
