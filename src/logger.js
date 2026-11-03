const debugEnabled = () => ['true', '1'].includes(process.env.DEBUG);

export const log = {
    debug: (tag, msg) => debugEnabled() && console.log(`[${tag}] ${msg}`),
    info: (tag, msg) => console.log(`[${tag}] ${msg}`),
    warn: (tag, msg) => console.warn(`[${tag}] ${msg}`),
    error: (tag, msg) => console.error(`[${tag}] ${msg}`),
};
