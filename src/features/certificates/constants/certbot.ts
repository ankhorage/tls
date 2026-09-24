export const CERTBOT_IMAGE = 'certbot/certbot:v5.8.0';
export const CERTBOT_STORAGE_VOLUME = 'ankhorage-tls';
export const CERTBOT_DATA_ROOT = '/data/certbot';
export const CERTBOT_WEBROOT = `${CERTBOT_DATA_ROOT}/webroot`;
export const CERTBOT_CONFIG_DIR = `${CERTBOT_DATA_ROOT}/config`;
export const CERTBOT_WORK_DIR = `${CERTBOT_DATA_ROOT}/work`;
export const CERTBOT_LOGS_DIR = `${CERTBOT_DATA_ROOT}/logs`;
