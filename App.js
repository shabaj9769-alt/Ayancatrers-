import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import html from './adminHtml';

// App khula ho to beep/alert admin page khud karta hai, isliye yahan foreground par chup rakha hai.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false }),
});

export default function App() {
  const web = useRef(null);
  const [tok, setTok] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Orders',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 300, 150, 300],
        });
        const p = await Notifications.requestPermissionsAsync();
        if (p.status === 'granted') setTok((await Notifications.getDevicePushTokenAsync()).data);
      } catch (e) {}
    })();
  }, []);

  const give = () => {
    if (tok && web.current) web.current.injectJavaScript(`window.__PUSH_TOKEN=${JSON.stringify(tok)};true;`);
  };
  useEffect(() => { give(); }, [tok]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: StatusBar.currentHeight || 0 }}>
      <WebView
        ref={web}
        source={{ html, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        onLoadEnd={give}
      />
    </View>
  );
}
