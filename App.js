import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StatusBar, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import html from './adminHtml';

// App khula ho to beep/alert admin page khud karta hai, isliye yahan foreground par chup rakha hai.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false }),
});

// "rgb(r, g, b)" se dekhta hai ki background dark hai ya light (status bar ke icon ka rang chunne ke liye)
const isDark = (c) => {
  const m = String(c).match(/\d+/g);
  if (!m || m.length < 3) return true;
  return 0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2] < 140;
};

// Admin page se aaya PDF (base64) phone me save karke Share/Save sheet kholta hai
const savePdf = async (name, b64) => {
  try {
    const safe = String(name || 'report.pdf').replace(/[^\w.\-]/g, '_');
    const uri = FileSystem.cacheDirectory + safe;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Sales & GST Report', UTI: 'com.adobe.pdf' });
    else Alert.alert('PDF saved', uri);
  } catch (e) { Alert.alert('PDF', 'Could not save the PDF. Please try again.'); }
};

function Admin() {
  const web = useRef(null);
  const insets = useSafeAreaInsets(); // status bar + neeche ka Android navigation bar
  const [tok, setTok] = useState('');
  const [k, setK] = useState(0); // k badalne par WebView dobara load hota hai (lock/logout ke baad)
  const [bg, setBg] = useState('#f5f2fb');
  // Kuch phones par insets.bottom 0 aata hai aur content navigation key ke neeche chala jata hai, isliye minimum gap
  const bottom = insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 48 : 0;

  useEffect(() => {
    (async () => {
      try {
        await Notifications.setNotificationChannelAsync('orders_bell', {
          name: 'New orders (bell)',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'bell.wav',
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
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top || StatusBar.currentHeight || 0, paddingBottom: bottom }}>
      <StatusBar translucent backgroundColor="transparent" barStyle={isDark(bg) ? 'light-content' : 'dark-content'} />
      <WebView
        key={k}
        ref={web}
        source={{ html, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        javaScriptEnabled
        textZoom={100}
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        style={{ backgroundColor: bg }}
        onLoadEnd={give}
        onMessage={(e) => {
          const d = e.nativeEvent.data;
          if (d === 'reload') setK((x) => x + 1);
          else if (typeof d === 'string' && d.startsWith('bg:')) setBg(d.slice(3));
          else if (typeof d === 'string' && d.startsWith('{')) {
            try { const m = JSON.parse(d); if (m && m.type === 'pdf' && m.b64) savePdf(m.name, m.b64); } catch (err) {}
          }
        }}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Admin />
    </SafeAreaProvider>
  );
}
