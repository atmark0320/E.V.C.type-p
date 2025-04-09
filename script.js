let savedBets = [];
let probabilities = { win: {}, place: {}, show: {} };
let passwordAttempts = 0;
const correctPassword = "Ptool"; // パスワード設定

// ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", () => {
    // index.htmlの場合のみパスワードモーダルを表示
    const passwordModal = document.getElementById("passwordModal");
    if (passwordModal) {
        document.getElementById("passwordOverlay").style.display = "block";
        passwordModal.style.display = "block";
        document.getElementById("passwordInput").focus();
    }
});

// パスワードチェック
function checkPassword() {
    const inputPasswordElement = document.getElementById("passwordInput");
    const attemptMessageElement = document.getElementById("attemptMessage");

    // index.html以外では実行しない
    if (!inputPasswordElement || !attemptMessageElement) return;

    const inputPassword = inputPasswordElement.value;

    if (inputPassword === correctPassword) {
        console.log("パスワード正解、リダイレクトを試みます"); // デバッグ用
        try {
            window.location.href = "main.html";
        } catch (e) {
            console.error("リダイレクトに失敗しました:", e);
            alert("リダイレクトに失敗しました。main.htmlへのパスを確認してください。");
        }
    } else {
        passwordAttempts++;
        if (passwordAttempts >= 3) {
            console.log("試行回数超過、Googleにリダイレクト"); // デバッグ用
            window.location.href = "https://www.google.com";
        } else {
            attemptMessageElement.textContent = `パスワードが間違っています。残り${3 - passwordAttempts}回`;
            inputPasswordElement.value = "";
            inputPasswordElement.focus();
        }
    }
}

// Enterキーでパスワード送信
const passwordInput = document.getElementById("passwordInput");
if (passwordInput) {
    passwordInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            checkPassword();
        }
    });
}

// 以下は既存の関数（main.html用、変更なし）
function generateCarInputs() { /* 既存の内容 */ }
function updateProbabilityInputs() { /* 既存の内容 */ }
function updateSums() { /* 既存の内容 */ }
function fillRemaining(type) { /* 既存の内容 */ }
function calculateOdds() { /* 既存の内容 */ }
function saveSelectedBets() { /* 既存の内容 */ }
function updateSavedBetsDisplay(combinedOdds) { /* 既存の内容 */ }
function resetForm() { /* 既存の内容 */ }
function getBetTypeName(type) { /* 既存の内容 */ }
function showErrorModal(message) { /* 既存の内容 */ }
function closeModal() { /* 既存の内容 */ }
function showManualModal() { /* 既存の内容 */ }
function closeManualModal() { /* 既存の内容 */ }
