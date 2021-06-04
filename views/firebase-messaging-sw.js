importScripts('https://www.gstatic.com/firebasejs/8.4.3/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.4.3/firebase-messaging.js');


var firebaseConfig = {
    apiKey: "AIzaSyDYA_oEe0AteFLr0oxq89vkaX_yqQ8nUgE",
    authDomain: "remindercrm-9188a.firebaseapp.com",
    projectId: "remindercrm-9188a",
    storageBucket: "remindercrm-9188a.appspot.com",
    messagingSenderId: "534067415409",
    appId: "1:534067415409:web:b6ae14d9e04b58502b0ed0",
    measurementId: "G-3MQTYVM4QM"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();
  
messaging.onBackgroundMessage((m) => {
  console.log("onBackgroundMessage", m);
});

