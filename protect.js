// 許可元
const allowedReferrer = 'https://atmark0320.github.io/password-auth/';
const denyUrl = 'https://www.google.com';

// トークン確認（password-auth からの認証成功時に設定）
const authToken = localStorage.getItem('authToken');

// チェック
if (!authToken || document.referrer !== allowedReferrer) {
    window.location.href = denyUrl;
}
