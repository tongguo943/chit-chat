import { initializeApp } from "firebase/app";
import Constants from "expo-constants";

export const getFirebaseApp = () => {
  const firebaseConfig = {
    apiKey: Constants.expoConfig.extra.FIREBASE_API_KEY,
    authDomain: Constants.expoConfig.extra.FIREBASE_AUTH_DOMAIN,
    projectId: Constants.expoConfig.extra.FIREBASE_PROJECT_ID,
    storageBucket: Constants.expoConfig.extra.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: Constants.expoConfig.extra.FIREBASE_MESSAGING_SENDER_ID,
    appId: Constants.expoConfig.extra.FIREBASE_APP_ID,
  };

  // Initialize Firebase
  return initializeApp(firebaseConfig);
};
