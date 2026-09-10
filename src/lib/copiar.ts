// `navigator.clipboard` es API de contexto seguro y el server de CSI sirve
// esta app por HTTP plano, sin TLS delante: ahí `navigator.clipboard` no
// existe. `document.execCommand('copy')` sí funciona sin contexto seguro, así
// que es el mecanismo real; `navigator.clipboard` queda como mejora cuando sí
// hay HTTPS (localhost en desarrollo, por ejemplo).
export async function copiarTexto(texto: string): Promise<boolean> {
	if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(texto);
			return true;
		} catch {
			// cae al fallback de abajo
		}
	}

	try {
		const ta = document.createElement('textarea');
		ta.value = texto;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		const ok = document.execCommand('copy');
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
}
