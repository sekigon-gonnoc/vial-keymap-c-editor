
export function generateRulesMk(content: string): string {
    const additionalRule = 'LDFLAGS += -Wl,-wrap=dynamic_keymap_reset';
    if (content.includes(additionalRule)) {
        return content;
    }
    return content + '\n'+ "\n# Override dynamic_keymap_reset\n" + additionalRule;
}