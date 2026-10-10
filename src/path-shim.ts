// Kuromoji only needs join for local dictionary URLs. Preserve extension:// schemes.
export const join = (base: string, file: string) => new URL(file, base.endsWith('/') ? base : base + '/').href;
