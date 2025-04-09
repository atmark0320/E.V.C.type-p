let savedBets = [];
let probabilities = { win: {}, place: {}, show: {} };
let passwordAttempts = 0;
const correctPassword = "Ptool"; // パスワード設定

// ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", () => {
    const manualLink = document.querySelector(".manual-link");
    if (manualLink) {
        manualLink.addEventListener("click", showManualModal);
        manualLink.addEventListener("touchstart", (e) => {
            e.preventDefault();
            showManualModal();
        });
    }

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

    if (!inputPasswordElement || !attemptMessageElement) return;

    const inputPassword = inputPasswordElement.value;

    if (inputPassword === correctPassword) {
        console.log("パスワード正解、リダイレクトを試みます");
        try {
            window.location.href = "main.html";
        } catch (e) {
            console.error("リダイレクトに失敗しました:", e);
            alert("リダイレクトに失敗しました。main.htmlへのパスを確認してください。");
        }
    } else {
        passwordAttempts++;
        if (passwordAttempts >= 3) {
            console.log("試行回数超過、Googleにリダイレクト");
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

// マニュアルモーダルを表示
function showManualModal() {
    document.getElementById('manualModal').style.display = 'block';
    document.getElementById('manualOverlay').style.display = 'block';
}

// マニュアルモーダルを閉じる
function closeManualModal() {
    document.getElementById('manualModal').style.display = 'none';
    document.getElementById('manualOverlay').style.display = 'none';
}

// 未実装関数の仮実装
function generateCarInputs() { console.log("generateCarInputs called"); }
function updateProbabilityInputs() { console.log("updateProbabilityInputs called"); }
function updateSums() { console.log("updateSums called"); }
function fillRemaining(type) { console.log("fillRemaining called with:", type); }
function calculateOdds() { console.log("calculateOdds called"); }
function saveSelectedBets() { console.log("saveSelectedBets called"); }
function updateSavedBetsDisplay(combinedOdds) { console.log("updateSavedBetsDisplay called with:", combinedOdds); }
function resetForm() { console.log("resetForm called"); }
function getBetTypeName(type) { return type; }
function showErrorModal(message) { console.log("Error:", message); }
function closeModal() { console.log("closeModal called"); }
