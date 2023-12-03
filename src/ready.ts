import _sodium from 'libsodium-wrappers-sumo';

export const ready: () => Promise<void> = async () => {
    try {
        await _sodium.ready;
    } catch (e) {
        await _sodium.ready;
    }
};
