// O `tsc` não reprova `styles.naoExiste`: um módulo CSS é tipado como
// Record<string,string>. O estilo some sem erro, e só aparece olhando a tela.
// Esta regra fecha o buraco lendo o .module.css que o import aponta.
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const CSS_CLASS = /\.(-?[_a-zA-Z][\w-]*)/g;
const cache = new Map();

function definedClasses(modulePath) {
  const stamp = statSync(modulePath).mtimeMs;
  const hit = cache.get(modulePath);
  if (hit?.stamp === stamp) return hit.names;
  const names = new Set([...readFileSync(modulePath, "utf8").matchAll(CSS_CLASS)].map(match => match[1]));
  cache.set(modulePath, { stamp, names });
  return names;
}

export const cssModuleClasses = {
  meta: {
    type: "problem",
    docs: { description: "Só permite classe que o módulo CSS importado realmente define." },
    schema: [],
    messages: { missing: "{{alias}}.{{name}} não existe em {{module}}. O estilo sairia vazio, sem erro de compilação." },
  },
  create(context) {
    const modules = new Map();
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string" || !source.endsWith(".module.css")) return;
        const local = node.specifiers.find(specifier => specifier.type === "ImportDefaultSpecifier")?.local.name;
        if (!local) return;
        const modulePath = path.resolve(path.dirname(context.filename), source);
        try { modules.set(local, { modulePath, names: definedClasses(modulePath), source }); }
        catch { /* arquivo ausente já é erro de build do bundler */ }
      },
      MemberExpression(node) {
        if (node.computed || node.object.type !== "Identifier" || node.property.type !== "Identifier") return;
        const module = modules.get(node.object.name);
        if (!module || module.names.has(node.property.name)) return;
        if (context.sourceCode.getScope(node).references.some(reference => reference.identifier === node.object && reference.resolved?.defs.some(definition => definition.type !== "ImportBinding"))) return;
        context.report({ node: node.property, messageId: "missing", data: { alias: node.object.name, name: node.property.name, module: path.basename(module.source) } });
      },
    };
  },
};
