export class SecretManager {
    /**
     * Centralized accessor for all production secrets.
     * In a real industrial environment, this might connect to AWS Secret Manager or HashiCorp Vault.
     */
    static getSecret(key: string): string {
        const val = process.env[key];
        if (!val) {
            console.warn(`[SecretManager] Missing environment variable: ${key}`);
            return '';
        }
        return val;
    }

    static get encryptionKey(): string {
        return this.getSecret('ENCRYPTION_KEY') || 'fallback_32_char_key_for_dev_only_!!';
    }

    static get geminiKey(): string {
        return this.getSecret('GEMINI_API_KEY');
    }

    static get openaiKey(): string {
        return this.getSecret('OPENAI_API_KEY');
    }

    static get databaseUrl(): string {
        return this.getSecret('DATABASE_URL');
    }
}
