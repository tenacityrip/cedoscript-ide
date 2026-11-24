// ==Script==
// @name        Target HUD
// @capability  movement
// ==/Script==

const script = initScript({ name: "Target HUD", description: "Shows the target's health", author: "you" });
const showBar = script.booleanSetting("Show bar", true);
const tint = script.colorSetting("Tint", color({ red: 255, green: 90, blue: 0 }));
tint.addParent(showBar, (setting) => setting.isEnabled());
const mode = script.modeSetting("Mode", "one", ["one", "two"]);
const anim = render.newContinualAnimation();
const drag = createDrag({ initialX: 100, initialY: 100 });
const GL11 = Java.type("org.lwjgl.opengl.GL11");
const Pair = Java.type("dev.cedo.tuples.Pair");
const Keyboard = Java.type("org.lwjgl.input.Keyboard");

script.onRender2D((event) => {
    const target = client.getAuraTarget();
    if (!target || !showBar.isEnabled() || Keyboard.isKeyDown(Keyboard.KEY_TAB)) return;
    drag.setWidth(event.getWidth() / 10);
    drag.setHeight(20);
    anim.animate((100 * target.getHealth()) / target.getMaxHealth(), 18);
    render.drawRoundedRect(drag.getX(), drag.getY(), anim.getOutput(), 20, 4, tint.getColor());
    const colors = client.getClientColors();
    const [a, b] = [colors.getFirst(), colors.getSecond()];
    GL11.glPushMatrix();
    render.applyGradient(0, 0, 50, 10, 1, a, a, b, b, () => {
        font.getTenacityFont16().drawString(target.getName(), 0, 0, color({ hex: -1 }));
    });
    GL11.glPopMatrix();
});

script.onMotion((event) => {
    if (event.isPre() && player.onGround() && mode.is("one")) player.jump();
});

on("tick", () => print(Pair.of(1, 2).getFirst(), world.getLivingEntities().size()));
