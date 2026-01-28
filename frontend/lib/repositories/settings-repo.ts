import { db } from '@/lib/db';

export const settingsRepo = {
    async get(key: string): Promise<any> {
        try {
            // @ts-ignore: SystemSetting might not be in generated client yet due to file lock
            const setting = await db.systemSetting.findUnique({
                where: { key },
            });
            return setting ? JSON.parse(setting.value) : null;
        } catch (error) {
            console.error('[SettingsRepo] Get error:', error);
            return null;
        }
    },

    async set(key: string, value: any): Promise<void> {
        try {
            const stringValue = JSON.stringify(value);
            // @ts-ignore
            await db.systemSetting.upsert({
                where: { key },
                update: { value: stringValue },
                create: { key, value: stringValue },
            });
        } catch (error) {
            console.error('[SettingsRepo] Set error:', error);
            throw error;
        }
    },
};
