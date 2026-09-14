import { redirect } from "react-router";

/** Endereço antigo dos campos personalizados. Vale como atalho gravado em favorito. */
export async function clientLoader() {
  return redirect("/admin/data/custom-fields");
}

export default function SettingsRedirect() { return null; }
