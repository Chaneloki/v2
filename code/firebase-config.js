/**
 * Firebase 設定檔（留言系統共用）
 * 用途：讓玩家送出的留言能存到雲端 Firestore，跨裝置都看得到。
 *
 * 共用自 owe-my-money 專案的 Firestore，留言存在獨立的 'feedback' collection，
 * 不會與該專案既有的 oweMyMoney collection 互相干擾。
 *
 * Firestore 規則需確保 /feedback 路徑可讀寫，例如：
 *   match /feedback/{commentId} {
 *     allow read, create, delete: if true;
 *   }
 */
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyClMqJvin8QDHy5HxcEmaYQvcQ47J8e7Ug",
    authDomain: "owe-my-money.firebaseapp.com",
    projectId: "owe-my-money",
    storageBucket: "owe-my-money.firebasestorage.app",
    messagingSenderId: "278852411102",
    appId: "1:278852411102:web:89ff96c529f11b39536c4f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}
window.db = firebase.firestore();
window.FEEDBACK_COLLECTION = 'feedback';
